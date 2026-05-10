# Demo UX Overhaul + Redis Rate Limiting

**Date:** 2026-05-10
**Status:** Approved

## Problem

Three related issues with the current demo system:

1. `token.getLastfmSession` fires before `demoStatus` resolves, producing a console error for every demo user (Last.fm account not connected).
2. `DemoBanner` shows session expiry warnings and an "expired" state that creates unnecessary friction — demos should be unlimited.
3. Last.fm discovery calls happen client-side with no rate limiting, exposing the API to abuse from demo users and making caching impossible.

## Goals

- Silence the `getLastfmSession` console error for demo users.
- Replace the expiry-based DemoBanner with context-aware one-time toasts.
- Make demos unlimited (no time expiry).
- Rate-limit Last.fm API calls per IP (100/hour sliding window).
- Cache discovery feed results in Redis (10-minute TTL) to reduce Last.fm API load.

## Out of Scope

- Spotify playback changes.
- Authenticated Last.fm (scrobbling) rate limiting — only public discovery calls.
- Changing demo user creation flow.

---

## Section 1 — Demo Session: Remove Expiry

**`src/app/api/demo/start/route.ts`**
- Stop setting `demoExpiresAt` on new demo users (`demoExpiresAt: null` or omit the field).
- Remove expiry-reuse check (the block that returns early if an existing demo session hasn't expired). Replace with: if the caller already has a valid session of any kind, return `{ success: true }` immediately.

**`prisma/schema.prisma`**
- Keep `demoExpiresAt DateTime?` column — no migration needed, just stops being populated.

**`src/app/api/cron/cleanup-demo/route.ts`**
- Change cleanup predicate from `demoExpiresAt < gracePeriod` to `createdAt < 30 days ago && isDemo = true`.
- Also add a second `deleteMany` call to clean stale `DemoRateLimit` rows older than 2 hours (see Section 4).

**`src/server/api/routers/demo.ts`**
- `getTimeRemaining` procedure: if user is demo, return `{ isDemo: true, expiresAt: null }` (drop the `demoExpiresAt` field from the response). Client currently uses `expiresAt` only for the countdown — removing it is safe once `DemoBanner` is gone.

---

## Section 2 — Notifications: Replace DemoBanner

**Delete**
- `src/app/_components/DemoBanner.tsx`

**Modify**
- `src/app/(app)/layout.tsx` — remove `DemoBanner` import and JSX.

**New hook: `src/lib/hooks/useDemoNotifications.ts`**

Called from `DashboardContent` in `page.tsx`. Uses `@mantine/notifications` (already bundled with Mantine 8 — requires `Notifications` rendered in the app shell, which needs to be added to the root layout or `AppShell`).

Logic:

```
isDemo  →  if sessionStorage['spotiswipe:demo-welcomed'] is unset:
              show notification: "You're in demo mode — sign up to save your playlists."
              set sessionStorage['spotiswipe:demo-welcomed'] = '1'

!isDemo && lastfmSession is null  →  if sessionStorage['spotiswipe:lastfm-nudged'] is unset:
              show notification: "Connect Last.fm in your profile for personalized recommendations."
              set sessionStorage['spotiswipe:lastfm-nudged'] = '1'
```

Both toasts are dismissible, positioned top-right, auto-close after 6 seconds.

**Add `Notifications` to app shell**
- `src/app/layout.tsx` (root layout) or `src/app/_components/AppShell.tsx` — add `<Notifications />` from `@mantine/notifications`.

---

## Section 3 — Fix `token.getLastfmSession` Console Error

**`src/lib/hooks/useDiscoveryFeed.ts`**

Change the `enabled` option on `api.token.getLastfmSession.useQuery`:

```ts
// Before
enabled: !isDemo

// After
enabled: demoStatus !== undefined && !isDemo
```

`demoStatus` is `undefined` while loading, `null` when the user is not demo, or `{ isDemo: true }` when they are. Gating on `demoStatus !== undefined` prevents the query from firing before demo status is known, eliminating the console error for demo users.

---

## Section 4 — Redis + Rate Limiting + Discovery Cache

### New Dependencies

```
@upstash/redis
@upstash/ratelimit
```

### New Environment Variables

```
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

Add to `src/env.js` (server-only, required in production, optional in dev — rate limiting degrades gracefully if Redis is unavailable).

### Redis Client Singleton

**New file: `src/server/redis.ts`**

```ts
import { Redis } from "@upstash/redis";
import { env } from "~/env";

export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});
```

If env vars are absent (local dev without Redis), export a `null` sentinel and skip cache/rate-limit checks in callers.

### Rate Limiter

**New file: `src/server/rate-limit.ts`**

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

// 100 Last.fm discovery calls per IP per sliding hour
export const lastfmRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "1 h"),
      prefix: "rl:lastfm",
    })
  : null;
```

### Architecture Change: Discovery Moves Server-Side

**Current**: `useDiscoveryFeed` calls `getDiscoveryFeed()` from `src/lib/services/discovery.ts` directly in the browser. Last.fm API calls happen client-side.

**New**: A tRPC procedure `lastfm.getDiscoveryFeed` handles discovery server-side. The client hook calls this procedure instead.

**Why**: Rate limiting and caching require server-side execution. The IP is only available in request context. Moving to tRPC also keeps the Last.fm API key off the client.

### New tRPC Procedure: `lastfm.getDiscoveryFeed`

**`src/server/api/routers/lastfm.ts`** — add procedure:

```
Input:
  limit: number (1–50, default 20)
  searchQuery: string | undefined
  lastfmUsername: string | null

Output:
  tracks: DiscoveryTrack[]
  rateLimited: boolean

Procedure type: protectedProcedure

Steps:
  1. Extract IP from ctx.headers (x-forwarded-for → first segment, fallback "unknown")
  2. If lastfmRatelimit is non-null:
       check = await lastfmRatelimit.limit(ip)
       if !check.success → fall back to seeded songs, return { tracks, rateLimited: true }
  3. Check Redis cache: key = `feed:{lastfmUsername ?? "anon"}:{searchQuery ?? ""}:{limit}`
       cache hit → return { tracks: cached, rateLimited: false }
  4. Call existing getDiscoveryFeed() server-side (move import to server context)
  5. Write result to Redis with TTL 600 (10 minutes)
  6. Return { tracks, rateLimited: false }
```

Swipe history (`swipedExternalIds`) is passed in from the client (already loaded by `useDiscoveryFeed`) to avoid an extra DB query inside the procedure.

### Update `useDiscoveryFeed`

- Replace `useQuery({ queryFn: getDiscoveryFeed })` with `api.lastfm.getDiscoveryFeed.useQuery(...)`.
- When response has `rateLimited: true`, call `useDemoNotifications` (or a separate effect) to show the toast: *"Showing popular tracks — personalized discovery is temporarily limited."*
- Remove the `sessionStorage` `initialData` pattern (already fixed in the hydration patch) — the new procedure result is cached by React Query with `staleTime: 10 * 60 * 1000`.

### `getDiscoveryFeed` Utility

`src/lib/services/discovery.ts` currently exports a function that makes fetch calls. It needs to be importable server-side without breaking the client bundle boundary. Options:
- Move it to `src/server/services/discovery.ts` (server-only).
- Or keep it in `src/lib/services/discovery.ts` but remove any browser-only imports — it only uses `fetch`, which runs in Node.js too.

The simpler path: keep the file in `src/lib/services/`, mark it as safe for server import (no `"use client"` directive). The tRPC router imports it directly.

---

## Data Flow After Changes

```
DashboardContent mounts
  → useDemoNotifications (one-time toasts)
  → useDiscoveryFeed
      isDemo? → api.demo.getDiscoveryFeed (seeded DB songs, no Redis)
      !isDemo → api.lastfm.getDiscoveryFeed
                  → rate limit check (Redis)
                  → cache check (Redis)
                  → Last.fm API (on cache miss)
                  → response: { tracks, rateLimited }
                     rateLimited=true → show "temporarily limited" toast
```

---

## Files Changed / Created

| Action | Path |
|--------|------|
| Delete | `src/app/_components/DemoBanner.tsx` |
| Modify | `src/app/(app)/layout.tsx` |
| Modify | `src/app/layout.tsx` (add `<Notifications />`) |
| Modify | `src/app/api/demo/start/route.ts` |
| Modify | `src/app/api/cron/cleanup-demo/route.ts` |
| Modify | `src/server/api/routers/demo.ts` |
| Modify | `src/server/api/routers/lastfm.ts` |
| Modify | `src/lib/hooks/useDiscoveryFeed.ts` |
| Modify | `src/env.js` |
| New | `src/server/redis.ts` |
| New | `src/server/rate-limit.ts` |
| New | `src/lib/hooks/useDemoNotifications.ts` |

---

## Acceptance Criteria

- [ ] No console error when a demo user loads `/dashboard`
- [ ] No expiry banner or countdown shown anywhere
- [ ] Demo users see a one-time welcome toast on first dashboard load
- [ ] Non-demo users without Last.fm see a one-time "connect Last.fm" toast
- [ ] Demo sessions are created without `demoExpiresAt`
- [ ] Cron deletes demo accounts older than 30 days
- [ ] `api.lastfm.getDiscoveryFeed` returns tracks and a `rateLimited` flag
- [ ] Redis cache is checked before calling Last.fm API
- [ ] When rate limit exceeded, seeded songs are returned and a toast is shown
- [ ] All existing discovery and swipe behavior is unchanged for normal users
