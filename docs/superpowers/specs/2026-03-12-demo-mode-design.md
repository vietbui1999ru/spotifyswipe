# Demo Mode for SpotiSwipe

**Date:** 2026-03-12
**Status:** Approved
**Purpose:** Allow recruiters and engineers to explore all SpotiSwipe features without creating an account or connecting Spotify/Last.fm.

---

## Overview

Add a "Try Demo" button to the sign-in page that creates an ephemeral anonymous session. Demo users get full access to swipe, build playlists, and interact with a pre-seeded social shareboard. Sessions expire after 24 hours and are cleaned up automatically.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Identity model | Ephemeral anonymous sessions | Each visitor gets isolated sandbox; real traffic metrics per unique visitor |
| Access level | Full read + write | Recruiters need to interact with all features to evaluate the app |
| Music playback | Visual cards + Last.fm links | Spotify preview URLs deprecated; Last.fm links provide listen-through |
| Session lifetime | 24 hours | Long enough to revisit, short enough to prevent data accumulation |
| Entry point | Below OAuth buttons with "just browsing?" divider | Low-pressure, doesn't overshadow real auth flow |

---

## 1. Database Changes

### User Model Additions

```prisma
model User {
  // ...existing fields...
  isDemo        Boolean   @default(false)
  demoExpiresAt DateTime?
}
```

- `isDemo: true` marks all demo users (both permanent seed personas and ephemeral visitor accounts)
- `demoExpiresAt`: set to `now + 24h` for visitor accounts; `null` for permanent seed personas
- Cleanup targets: `isDemo = true AND demoExpiresAt IS NOT NULL AND demoExpiresAt < now`

---

## 2. Demo Auth Flow

### Next.js API Route (NOT tRPC)

**Route: `POST /api/demo/start`** (`src/app/api/demo/start/route.ts`)

tRPC procedures cannot set `Set-Cookie` headers on the response (they only receive request headers in context). Following the same pattern as the existing Last.fm callback (`src/app/api/auth/callback/lastfm/route.ts`), demo session creation is a Next.js Route Handler.

**Flow:**

1. **Rate-limit check:** Look for existing `better-auth.session_token` cookie. If present and the session belongs to a valid, non-expired demo user, reuse it — return `{ success: true }` without creating a new user. Additionally, apply IP-based soft limit: max 5 demo sessions per IP per hour (tracked in-memory or via DB query on recent demo users).

2. **Create `User`:**
   - `name`: "Demo User #" + random 4-digit suffix
   - `email`: `demo-{uuid}@spotiswipe.demo`
   - `isDemo: true`
   - `demoExpiresAt`: `new Date(Date.now() + 24 * 60 * 60 * 1000)`
   - `musicProvider`: "auto" (not "lastfm" — avoids misleading Last.fm-specific UI)

3. **Create `Account`:**
   - `providerId`: "demo"
   - `accountId`: user's UUID
   - Satisfies OnboardingGuard provider check

4. **Create `Session`:** Use better-auth's internal session creation (or direct Prisma insert + crypto token generation, matching the Last.fm callback pattern). Set `better-auth.session_token` cookie via `NextResponse`.

5. **Return** `NextResponse.json({ success: true })` with cookie set. Client redirects to `/dashboard`.

### Client Changes (SignIn.tsx)

Below the OAuth buttons, add:
```
─── just browsing? ───
[ Try Demo — No account needed ]
```

Button calls `fetch("/api/demo/start", { method: "POST" })`. On success, `router.push("/dashboard")`. Button is disabled on click + debounced to prevent double-creation.

### OnboardingGuard Changes

Two modifications required:

1. **`getConnectedProviders`** in `src/server/api/routers/user.ts`: Add `demo: providerIds.has("demo")` to the return object.

2. **`OnboardingGuard`** in `src/app/_components/OnboardingGuard.tsx`: Change condition from `providers.spotify || providers.lastfm` to `providers.spotify || providers.lastfm || providers.demo`.

---

## 3. Discovery Feed for Demo Users

### New tRPC Endpoint: `demo.getDiscoveryFeed` (protected procedure)

- Checks `ctx.session.user.isDemo`
- Queries `Song` table for pre-seeded songs, excluding any the user has already swiped
- Returns songs in randomized order, paginated
- Each song includes `lastfmUrl` for external listening
- **Response mapping:** Song model fields (`title`, `artist`, `albumArt`, `lastfmUrl`, `externalId`) are mapped to the `DiscoveryTrack` interface shape (`name`, `artist`, `url`, `image`, `externalId`) via a mapper function in the router

### Hook Integration (`useDiscoveryFeed`)

- **Demo check placement:** The `isDemo` check must be the **very first check** in the hook, BEFORE `effectiveProvider` resolution and token fetching. This prevents the hook from attempting Last.fm/Spotify token lookups that would fail for demo users.
- If `isDemo`, call `api.demo.getDiscoveryFeed` and return early
- No Spotify player SDK initialization for demo users
- Cards show album art + metadata + "Listen on Last.fm" link

### Search for Demo Users

**Endpoint: `demo.searchSongs`** (protected procedure)
- Simple `contains` / case-insensitive query against `title` and `artist` fields (NOT PostgreSQL full-text search — unnecessary for 60 rows)
- Used when demo user searches via HeaderSearch

---

## 4. Feature Behavior Matrix

| Feature | Demo Behavior | Change Required |
|---------|---------------|-----------------|
| Swipe/Discovery | Seeded songs from DB | Yes — demo feed path as first check in hook |
| Playlist CRUD | Works as-is | No |
| Add song to playlist | Works as-is (songs in DB) | No |
| Shareboard browse | Pre-seeded social posts visible | No |
| Like/Comment/Follow | Full interaction with seeded data | No |
| Share playlist | Demo user can share to shareboard | No |
| Copy playlist from post | Works as-is | No |
| Spotify sync | Early-return with "demo mode" notice | Yes — guard in `syncPlaylistToSpotify` |
| Spotify playback | Skip SDK, show Last.fm link | Yes — guard in `useSpotifyPlayer` |
| Profile | Pre-populated name; demo banner shown; connect-provider buttons hidden, replaced with "Sign up for full access" CTA | Yes — demo-aware profile UI |
| Search | Query seeded songs in DB via `demo.searchSongs` | Yes — demo search path |
| Admin panel | Already blocked by `role !== "admin"` check | No (UI-only: hide admin nav link for demo users) |

---

## 5. Seed Data Specification

### Script: `prisma/seed-demo.ts`

Run via `bun run db:seed-demo`. Idempotent — upserts on `externalId` for songs, checks existing personas before creating.

### Songs (60 tracks, 6 genres)

| Genre | Count | Example Artists |
|-------|-------|-----------------|
| Indie/Alternative | 10 | Arctic Monkeys, Tame Impala, Radiohead |
| Hip-Hop | 10 | Kendrick Lamar, Tyler the Creator, MF DOOM |
| Electronic | 10 | Daft Punk, Aphex Twin, Bonobo |
| R&B/Soul | 10 | Frank Ocean, SZA, Daniel Caesar |
| Rock/Classic | 10 | Led Zeppelin, Pink Floyd, Queen |
| Pop | 10 | Dua Lipa, The Weeknd, Billie Eilish |

All tracks use real Last.fm metadata: title, artist, album, albumArt (Last.fm CDN), lastfmUrl. No Spotify IDs (`spotifyId` left null).

**`externalId` format:** `{artist}:{title}` lowercased (matching the existing Last.fm convention in `src/lib/services/discovery.ts`). If a real user later encounters the same song via Last.fm discovery, deduplication works correctly — this is desirable.

### Demo Personas (6)

| Name | Taste | Playlists | Swipes |
|------|-------|-----------|--------|
| Alex Rivera | Indie + Electronic | "Midnight Drive", "Festival Season" | 25 |
| Jordan Kim | Hip-Hop + R&B | "Late Night R&B", "Bars Only" | 22 |
| Sam Chen | Electronic + Pop | "Deep Focus", "Weekend Energy" | 20 |
| Maya Patel | Rock + Indie | "Vinyl Classics", "New Discoveries" | 28 |
| Chris Okafor | R&B + Hip-Hop | "Smooth Vibes", "Workout Mix" | 18 |
| Taylor Nguyen | Pop + Electronic | "Feel Good Hits", "Chill Beats" | 24 |

Each persona: `isDemo: true`, `demoExpiresAt: null` (permanent), `musicProvider: "auto"`, profile image via UI Avatars API or similar placeholder.

### Social Activity

- Each persona shares 1-2 playlists → 8-10 social posts total
- 3-5 likes per post (cross-persona interactions — these form the "floor" count that persists even after ephemeral demo users are cleaned up)
- 2-4 comments per post from other personas (e.g., "This playlist is fire", "Adding this to my rotation")
- Random follow network between all 6 personas
- Ephemeral demo user interactions (likes/comments) sit on top of the floor counts and are removed on cleanup

---

## 6. Cleanup Mechanism

### Admin Endpoint: `admin.cleanupDemoUsers`

**Simplified cascade:** Delete expired demo `User` records directly. All related records (Comments, Likes, Playlists, PlaylistSongs, SocialPosts, SwipeActions, Follows, Sessions, Accounts) are cascade-deleted via Prisma's `onDelete: Cascade` on all FK relations — no manual ordered deletion needed.

```sql
DELETE FROM "User" WHERE "isDemo" = true AND "demoExpiresAt" IS NOT NULL AND "demoExpiresAt" < now()
```

Returns `{ deletedCount }`.

### Cron Route: `/api/cron/cleanup-demo`

- **Header validation:** `request.headers.get("authorization") === \`Bearer ${process.env.CRON_SECRET}\``
- Vercel Cron configuration in `vercel.json`:
  ```json
  { "crons": [{ "path": "/api/cron/cleanup-demo", "schedule": "0 0 * * *" }] }
  ```
- Calls same cleanup logic as admin endpoint

### Demo Session Expiry UX

When a demo user's session is active but approaching expiry:

1. **Expose `demoExpiresAt`** in the session context (or via a `demo.getTimeRemaining` query)
2. **Warning banner:** Show "Your demo session expires in X minutes" when < 1 hour remains
3. **Graceful expiry:** When a 401/UNAUTHORIZED error is returned and the user was previously a demo user, show a friendly "Your demo session has expired" modal with two CTAs: "Start New Demo" and "Sign Up for Full Access" — instead of a cryptic redirect to `/sign-in`
4. **Grace period:** Cleanup deletes users expired by > 1 hour (effectively 25h lifetime) to avoid race conditions with active sessions

### Permanent seed personas are never deleted

They have `demoExpiresAt: null`, so the cleanup query never matches them.

---

## 7. File Change Summary

### New Files
| File | Purpose |
|------|---------|
| `prisma/seed-demo.ts` | Seed script for demo personas, songs, playlists, social activity |
| `src/app/api/demo/start/route.ts` | Demo session creation API route (sets cookie) |
| `src/server/api/routers/demo.ts` | Demo router: `getDiscoveryFeed`, `searchSongs` |
| `src/app/api/cron/cleanup-demo/route.ts` | Cron endpoint for expired demo user cleanup |

### Modified Files
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `isDemo`, `demoExpiresAt` to User model |
| `src/app/_components/SignIn.tsx` | Add "just browsing?" divider + "Try Demo" button (debounced, fetch-based) |
| `src/server/api/root.ts` | Register `demoRouter` |
| `src/server/api/routers/user.ts` | `getConnectedProviders` returns `{ spotify, lastfm, demo }` |
| `src/app/_components/OnboardingGuard.tsx` | Check `providers.demo` in addition to spotify/lastfm |
| `src/server/api/routers/spotify.ts` | `syncPlaylistToSpotify` early-returns for demo users |
| `src/server/api/routers/admin.ts` | Add `cleanupDemoUsers` endpoint |
| `src/lib/hooks/useDiscoveryFeed.ts` | Demo check as FIRST check, before provider resolution |
| `src/lib/hooks/useSpotifyPlayer.ts` | Skip SDK init for demo users |
| `src/app/(app)/dashboard/` | Last.fm link instead of play controls for demo users |
| `src/app/(app)/profile/` | Demo mode banner; hide connect-provider buttons; show "Sign up for full access" CTA |
| `package.json` | Add `db:seed-demo` script |
| `src/env.js` | Add optional `CRON_SECRET` env var |
| `vercel.json` | Add cron entry for daily cleanup |

### Unchanged
- Middleware (demo users have valid sessions)
- Playlist CRUD, Social features (likes/comments/follows), Shareboard components
