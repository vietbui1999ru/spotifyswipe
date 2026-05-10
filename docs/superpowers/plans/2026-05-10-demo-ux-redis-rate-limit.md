# Demo UX Overhaul + Redis Rate Limiting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove demo expiry friction, replace DemoBanner with one-time toasts, silence the Last.fm console error, and move discovery server-side with Redis caching and per-IP rate limiting.

**Architecture:** A new `lastfm.getDiscoveryFeed` tRPC procedure replaces client-side Last.fm calls — it checks an Upstash Redis rate limit (100 req/IP/hour sliding window), reads/writes a Redis feed cache (10-min TTL), falls back to seeded DB songs when rate-limited. Demo sessions no longer have a time expiry; a `useDemoNotifications` hook shows one-time toasts instead of the old `DemoBanner`.

**Tech Stack:** `@upstash/redis`, `@upstash/ratelimit`, `@mantine/notifications`, tRPC 11, Prisma 6, Next.js 16 App Router, Bun

**Spec:** `docs/superpowers/specs/2026-05-10-demo-ux-redis-rate-limit-design.md`

---

## Execution Map

```
Task 0 (sequential, run first)
  └── Install all packages

Task A1–A3 (Agent A, parallel with B)     Task B1–B5 (Agent B, parallel with A)
  ├── A1: env + redis.ts + rate-limit.ts    ├── B1: demo router (remove expiresAt)
  ├── A2: lastfm.getDiscoveryFeed proc      ├── B2: demo/start route (no expiry)
  └── A3: useDiscoveryFeed refactor         ├── B3: cleanup-demo cron (30-day)
                                            ├── B4: Notifications in root layout
                                            └── B5: useDemoNotifications + wire up

Task 99 (sequential, after A+B merge)
  └── Verify build + smoke test
```

Agent A owns: `src/env.js`, `src/server/redis.ts`, `src/server/rate-limit.ts`, `src/server/api/routers/lastfm.ts`, `src/lib/hooks/useDiscoveryFeed.ts`

Agent B owns: `src/server/api/routers/demo.ts`, `src/app/api/demo/start/route.ts`, `src/app/api/cron/cleanup-demo/route.ts`, `src/app/layout.tsx`, `src/lib/hooks/useDemoNotifications.ts`, `src/app/_components/DemoBanner.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/dashboard/page.tsx`

---

## Task 0: Install Packages (Sequential — Run Before Agents)

**Files:** `package.json`, `bun.lock`

- [ ] **Install all new dependencies in one command**

```bash
cd /path/to/spotiswipe
bun add @upstash/redis @upstash/ratelimit @mantine/notifications
```

Expected output: lines showing packages added, no errors.

- [ ] **Verify**

```bash
grep -E "upstash|mantine/notifications" package.json
```

Expected: three lines showing `@upstash/redis`, `@upstash/ratelimit`, `@mantine/notifications`.

- [ ] **Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add upstash redis, ratelimit, mantine/notifications"
```

---

## ── AGENT A: Infrastructure + Discovery ──

### Task A1: Redis Client + Rate Limiter + Env Vars

**Files:**
- Create: `src/server/redis.ts`
- Create: `src/server/rate-limit.ts`
- Modify: `src/env.js`

- [ ] **Create `src/server/redis.ts`**

```ts
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;
```

- [ ] **Create `src/server/rate-limit.ts`**

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

export const lastfmRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "1 h"),
      prefix: "rl:lastfm",
    })
  : null;
```

- [ ] **Add env vars to `src/env.js`**

In the `server:` block, add after `CRON_SECRET`:

```js
UPSTASH_REDIS_REST_URL: z.string().url().optional(),
UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
```

In the `runtimeEnv:` block, add:

```js
UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
```

- [ ] **Verify typecheck passes**

```bash
bun run typecheck
```

Expected: no new errors (one pre-existing test error in `__tests__/server/router-helpers.ts` is OK to ignore).

- [ ] **Commit**

```bash
git add src/server/redis.ts src/server/rate-limit.ts src/env.js
git commit -m "feat: add upstash redis client and lastfm rate limiter"
```

---

### Task A2: `lastfm.getDiscoveryFeed` Procedure

**Files:**
- Modify: `src/server/api/routers/lastfm.ts`

- [ ] **Add imports at the top of `src/server/api/routers/lastfm.ts`**

Add after the existing imports:

```ts
import {
  type DiscoveryTrack,
  getDiscoveryFeed,
} from "~/lib/services/discovery";
import { redis } from "~/server/redis";
import { lastfmRatelimit } from "~/server/rate-limit";
```

- [ ] **Add `getDiscoveryFeed` procedure inside `createTRPCRouter({...})`**

Append before the closing `})` of `createTRPCRouter`:

```ts
getDiscoveryFeed: protectedProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(50).default(20),
      searchQuery: z.string().optional(),
      lastfmUsername: z.string().nullable(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const log = createLogger("lastfm.getDiscoveryFeed", {
      userId: ctx.session.user.id,
    });

    const ip =
      ctx.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      ctx.headers.get("x-real-ip") ??
      "unknown";

    // Fetch swipe history once — used by both rate-limited and normal paths
    const swipedHistory = await ctx.db.swipeAction.findMany({
      where: { userId: ctx.session.user.id },
      select: { song: { select: { externalId: true } } },
      take: 50,
      orderBy: { createdAt: "desc" },
    });
    const swipedExternalIds = new Set(
      swipedHistory.map((s) => s.song.externalId),
    );

    // Rate limit check — falls back to seeded DB songs when exceeded
    if (lastfmRatelimit) {
      const { success } = await lastfmRatelimit.limit(ip);
      if (!success) {
        log.warn("Rate limit exceeded, falling back to seeded songs", { ip });
        const fallback = await ctx.db.song.findMany({
          where:
            swipedExternalIds.size > 0
              ? { externalId: { notIn: [...swipedExternalIds] } }
              : {},
          take: input.limit,
        });
        for (let i = fallback.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [fallback[i], fallback[j]] = [fallback[j]!, fallback[i]!];
        }
        return {
          tracks: fallback.map(
            (s): DiscoveryTrack => ({
              name: s.title,
              artist: s.artist,
              image: s.albumArt,
              url: s.lastfmUrl ?? "",
              externalId: s.externalId,
            }),
          ),
          rateLimited: true,
        };
      }
    }

    // Redis cache check
    const cacheKey = `feed:${input.lastfmUsername ?? "anon"}:${input.searchQuery ?? ""}:${input.limit}`;
    if (redis) {
      const cached = await redis.get<DiscoveryTrack[]>(cacheKey);
      if (cached) {
        log.debug("Cache hit", { cacheKey });
        return { tracks: cached, rateLimited: false };
      }
    }

    // Live Last.fm fetch
    const tracks = await getDiscoveryFeed({
      lastfmUsername: input.lastfmUsername,
      swipedExternalIds,
      limit: input.limit,
      searchQuery: input.searchQuery,
    });

    // Write to Redis cache (10-minute TTL)
    if (redis && tracks.length > 0) {
      await redis.set(cacheKey, tracks, { ex: 600 });
    }

    log.info("Discovery feed served", { count: tracks.length });
    return { tracks, rateLimited: false };
  }),
```

- [ ] **Add `z` import** — `z` is already imported in this file via existing procedures, verify with:

```bash
grep "^import.*zod" src/server/api/routers/lastfm.ts
```

If missing, add `import { z } from "zod";` at the top.

- [ ] **Verify typecheck**

```bash
bun run typecheck
```

Expected: no new errors.

- [ ] **Commit**

```bash
git add src/server/api/routers/lastfm.ts
git commit -m "feat: add lastfm.getDiscoveryFeed procedure with redis cache and rate limiting"
```

---

### Task A3: Refactor `useDiscoveryFeed`

**Files:**
- Modify: `src/lib/hooks/useDiscoveryFeed.ts`

The current hook does client-side Last.fm fetches via `getDiscoveryFeed()` and `api.swipe.getHistory`. Replace both with the new `api.lastfm.getDiscoveryFeed` procedure. Also fix the `enabled` gate on `getLastfmSession` and remove sessionStorage cache logic (Redis handles server-side caching; React Query handles client-side caching).

- [ ] **Replace the entire file content of `src/lib/hooks/useDiscoveryFeed.ts`**

```ts
"use client";

import { notifications } from "@mantine/notifications";
import { useEffect } from "react";
import { api } from "~/trpc/react";

export function useDiscoveryFeed(limit = 20, searchQuery?: string) {
  const { data: demoStatus } = api.demo.getTimeRemaining.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const isDemo = demoStatus?.isDemo ?? false;

  const demoFeedQuery = api.demo.getDiscoveryFeed.useQuery(
    { limit },
    { enabled: isDemo && !searchQuery, staleTime: 10 * 60 * 1000 },
  );
  const demoSearchQuery = api.demo.searchSongs.useQuery(
    { query: searchQuery ?? "" },
    { enabled: isDemo && !!searchQuery, staleTime: 5 * 60 * 1000 },
  );

  // Wait for demoStatus to resolve before querying lastfm session —
  // prevents a console error for demo users who have no lastfm account.
  const { data: lastfmSessionData } = api.token.getLastfmSession.useQuery(
    undefined,
    {
      enabled: demoStatus !== undefined && !isDemo,
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  );

  const lastfmUsername = lastfmSessionData?.username ?? null;

  const regularQuery = api.lastfm.getDiscoveryFeed.useQuery(
    { limit, searchQuery, lastfmUsername },
    {
      enabled: demoStatus !== undefined && !isDemo,
      refetchOnWindowFocus: false,
      staleTime: searchQuery ? 5 * 60 * 1000 : 10 * 60 * 1000,
    },
  );

  // Show one-time toast when the server signals rate limiting
  useEffect(() => {
    if (!regularQuery.data?.rateLimited) return;
    try {
      if (sessionStorage.getItem("spotiswipe:rate-limit-toasted")) return;
      notifications.show({
        title: "Discovery limited",
        message:
          "Showing popular tracks — personalized discovery is temporarily limited.",
        color: "yellow",
        autoClose: 6000,
      });
      sessionStorage.setItem("spotiswipe:rate-limit-toasted", "1");
    } catch {
      // sessionStorage unavailable
    }
  }, [regularQuery.data?.rateLimited]);

  if (isDemo) {
    const activeQuery = searchQuery ? demoSearchQuery : demoFeedQuery;
    return {
      data: activeQuery.data,
      isLoading: activeQuery.isLoading,
      error: activeQuery.error,
      refetch: activeQuery.refetch,
      isDemo: true,
    };
  }

  return {
    data: regularQuery.data?.tracks,
    isLoading: regularQuery.isLoading,
    error: regularQuery.error,
    refetch: regularQuery.refetch,
    isDemo: false,
  };
}
```

- [ ] **Verify typecheck**

```bash
bun run typecheck
```

Expected: no new errors.

- [ ] **Verify build succeeds**

```bash
bun run build
```

Expected: exits 0. `/dashboard` should show as `○ (Static)` in the route table.

- [ ] **Commit**

```bash
git add src/lib/hooks/useDiscoveryFeed.ts
git commit -m "feat: move discovery to server-side tRPC procedure, fix lastfm session gate"
```

---

## ── AGENT B: Demo Cleanup + Notifications ──

### Task B1: Update `demo.getTimeRemaining` — Remove `expiresAt`

**Files:**
- Modify: `src/server/api/routers/demo.ts`

- [ ] **In `src/server/api/routers/demo.ts`, update `getTimeRemaining`**

Find:

```ts
getTimeRemaining: protectedProcedure.query(async ({ ctx }) => {
  const user = await ctx.db.user.findUnique({
    where: { id: ctx.session.user.id },
    select: { isDemo: true, demoExpiresAt: true },
  });
  if (!user?.isDemo) return null;
  return {
    isDemo: true,
    expiresAt: user.demoExpiresAt,
  };
}),
```

Replace with:

```ts
getTimeRemaining: protectedProcedure.query(async ({ ctx }) => {
  const user = await ctx.db.user.findUnique({
    where: { id: ctx.session.user.id },
    select: { isDemo: true },
  });
  if (!user?.isDemo) return null;
  return { isDemo: true };
}),
```

- [ ] **Verify typecheck**

```bash
bun run typecheck
```

- [ ] **Commit**

```bash
git add src/server/api/routers/demo.ts
git commit -m "feat: remove expiresAt from demo.getTimeRemaining — demos are now unlimited"
```

---

### Task B2: Remove Expiry from `demo/start` Route

**Files:**
- Modify: `src/app/api/demo/start/route.ts`

- [ ] **Remove `demoExpiresAt` from the user creation call**

Find:

```ts
const user = await db.user.create({
  data: {
    name: `Demo User #${suffix}`,
    email: `demo-${uuid}@spotiswipe.demo`,
    isDemo: true,
    demoExpiresAt: new Date(Date.now() + DEMO_SESSION_DURATION),
  },
});
```

Replace with:

```ts
const user = await db.user.create({
  data: {
    name: `Demo User #${suffix}`,
    email: `demo-${uuid}@spotiswipe.demo`,
    isDemo: true,
  },
});
```

- [ ] **Remove the expiry-based reuse check**

Find and delete this entire block (the early return that reuses an existing session):

```ts
if (
  existingUser?.isDemo &&
  existingUser.demoExpiresAt &&
  existingUser.demoExpiresAt > new Date()
) {
  log.info("Reusing existing demo session", {
    userId: existingSession.user.id,
  });
  return NextResponse.json({ success: true });
}
```

Replace with a simpler check — if caller already has any valid session, just return success:

```ts
if (existingSession?.user?.id) {
  log.info("Caller already has a session", {
    userId: existingSession.user.id,
  });
  return NextResponse.json({ success: true });
}
```

- [ ] **Remove the `DEMO_SESSION_DURATION` constant** (no longer used for user creation)

Find and delete:

```ts
const DEMO_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
```

The session itself still lives for 24 hours (the cookie `maxAge` and the `Session.expiresAt` are fine to keep — a new demo session is always created on the next visit anyway).

- [ ] **Verify typecheck**

```bash
bun run typecheck
```

- [ ] **Commit**

```bash
git add src/app/api/demo/start/route.ts
git commit -m "feat: demo sessions no longer expire — unlimited demos"
```

---

### Task B3: Update Cleanup Cron — 30-Day Account Deletion

**Files:**
- Modify: `src/app/api/cron/cleanup-demo/route.ts`

- [ ] **Update `cleanupExpiredDemoUsers` to use `createdAt` instead of `demoExpiresAt`**

Find:

```ts
export async function cleanupExpiredDemoUsers() {
  const gracePeriod = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

  const result = await db.user.deleteMany({
    where: {
      isDemo: true,
      demoExpiresAt: {
        not: null,
        lt: gracePeriod,
      },
    },
  });

  return result.count;
}
```

Replace with:

```ts
export async function cleanupExpiredDemoUsers() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const result = await db.user.deleteMany({
    where: {
      isDemo: true,
      createdAt: { lt: thirtyDaysAgo },
    },
  });

  return result.count;
}
```

- [ ] **Verify typecheck**

```bash
bun run typecheck
```

- [ ] **Commit**

```bash
git add src/app/api/cron/cleanup-demo/route.ts
git commit -m "feat: cleanup cron deletes demo accounts older than 30 days"
```

---

### Task B4: Wire `@mantine/notifications` into Root Layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Add the CSS import** at the top of `src/app/layout.tsx`, after the existing `@mantine/core/styles.css` import:

```ts
import "@mantine/notifications/styles.css";
```

- [ ] **Add `<Notifications />` inside `MantineProvider`**

Find:

```tsx
<MantineProvider defaultColorScheme="dark">
  <BugMonitorProvider>
    <AppShellWrapper>{children}</AppShellWrapper>
  </BugMonitorProvider>
</MantineProvider>
```

Replace with:

```tsx
import { Notifications } from "@mantine/notifications";

// ...

<MantineProvider defaultColorScheme="dark">
  <Notifications position="top-right" />
  <BugMonitorProvider>
    <AppShellWrapper>{children}</AppShellWrapper>
  </BugMonitorProvider>
</MantineProvider>
```

(Add the `Notifications` import at the top of the file with the other imports.)

- [ ] **Verify typecheck**

```bash
bun run typecheck
```

- [ ] **Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: add mantine/notifications to root layout"
```

---

### Task B5: Create `useDemoNotifications` Hook

**Files:**
- Create: `src/lib/hooks/useDemoNotifications.ts`

- [ ] **Create `src/lib/hooks/useDemoNotifications.ts`**

```ts
"use client";

import { notifications } from "@mantine/notifications";
import { useEffect } from "react";
import { api } from "~/trpc/react";

export function useDemoNotifications() {
  const { data: demoStatus } = api.demo.getTimeRemaining.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const isDemo = demoStatus?.isDemo ?? false;

  const lastfmQuery = api.token.getLastfmSession.useQuery(undefined, {
    enabled: demoStatus !== undefined && !isDemo,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // One-time welcome toast for demo users
  useEffect(() => {
    if (demoStatus === undefined || !isDemo) return;
    try {
      if (sessionStorage.getItem("spotiswipe:demo-welcomed")) return;
      notifications.show({
        title: "Demo mode",
        message: "You're in demo mode — sign up to save your playlists.",
        color: "blue",
        autoClose: 6000,
      });
      sessionStorage.setItem("spotiswipe:demo-welcomed", "1");
    } catch {
      // sessionStorage unavailable
    }
  }, [isDemo, demoStatus]);

  // One-time nudge for non-demo users without Last.fm connected
  useEffect(() => {
    if (isDemo) return;
    if (lastfmQuery.isLoading || lastfmQuery.data !== undefined) return;
    if (!lastfmQuery.error) return;
    try {
      if (sessionStorage.getItem("spotiswipe:lastfm-nudged")) return;
      notifications.show({
        title: "Connect Last.fm",
        message:
          "Connect Last.fm in your profile for personalized recommendations.",
        color: "grape",
        autoClose: 6000,
      });
      sessionStorage.setItem("spotiswipe:lastfm-nudged", "1");
    } catch {
      // sessionStorage unavailable
    }
  }, [isDemo, lastfmQuery.isLoading, lastfmQuery.data, lastfmQuery.error]);
}
```

- [ ] **Verify typecheck**

```bash
bun run typecheck
```

- [ ] **Commit**

```bash
git add src/lib/hooks/useDemoNotifications.ts
git commit -m "feat: add useDemoNotifications hook — one-time toasts for demo and lastfm"
```

---

### Task B6: Remove DemoBanner, Wire Notifications into Dashboard

**Files:**
- Delete: `src/app/_components/DemoBanner.tsx`
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Delete `src/app/_components/DemoBanner.tsx`**

```bash
rm src/app/_components/DemoBanner.tsx
```

- [ ] **Update `src/app/(app)/layout.tsx` — remove DemoBanner**

Find:

```tsx
"use client";

import type { ReactNode } from "react";
import { DemoBanner } from "../_components/DemoBanner";
import OnboardingGuard from "../_components/OnboardingGuard";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <OnboardingGuard>
      <DemoBanner />
      {children}
    </OnboardingGuard>
  );
}
```

Replace with:

```tsx
"use client";

import type { ReactNode } from "react";
import OnboardingGuard from "../_components/OnboardingGuard";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <OnboardingGuard>{children}</OnboardingGuard>;
}
```

- [ ] **Update `src/app/(app)/dashboard/page.tsx` — call `useDemoNotifications`**

Find the current `DashboardContent` function opening (the function signature line):

```tsx
function DashboardContent() {
```

Add the hook call as the first line inside the function body. First add the import at the top of the file:

```tsx
import { useDemoNotifications } from "~/lib/hooks/useDemoNotifications";
```

Then inside `DashboardContent`:

```tsx
function DashboardContent() {
  useDemoNotifications();

  const searchParams = useSearchParams();
  // ... rest unchanged
```

- [ ] **Verify typecheck**

```bash
bun run typecheck
```

- [ ] **Verify build**

```bash
bun run build
```

Expected: exits 0, no prerender errors.

- [ ] **Commit**

```bash
git add src/app/_components/ src/app/(app)/layout.tsx src/app/(app)/dashboard/page.tsx
git commit -m "feat: replace DemoBanner with useDemoNotifications one-time toasts"
```

---

## Task 99: Final Verification (Sequential — After A+B Merge)

- [ ] **Run typecheck across full codebase**

```bash
bun run typecheck
```

Expected: only the pre-existing test error in `__tests__/server/router-helpers.ts` (unrelated UUID type mismatch). No new errors.

- [ ] **Run build**

```bash
bun run build
```

Expected: exits 0. Route table shows `/dashboard` as `○ (Static)`.

- [ ] **Smoke-test in browser**

```bash
bun dev
```

Navigate to `http://127.0.0.1:3000`.

Check:
- [ ] Demo flow: click "Try Demo" → dashboard loads → welcome toast appears once → no console errors
- [ ] Reload dashboard → toast does NOT appear again (sessionStorage flag set)
- [ ] No `DemoBanner` / expiry countdown visible anywhere
- [ ] Discovery feed loads (may be slow first load — Redis cache cold)
- [ ] No `getLastfmSession` console error in browser devtools

- [ ] **Run linter**

```bash
bun run check:write
```

Expected: clean or only pre-existing warnings (SuperJSON, seed.ts).

- [ ] **Final commit**

```bash
git add -A
git commit -m "chore: lint cleanup after demo UX + redis rate limit feature"
```
