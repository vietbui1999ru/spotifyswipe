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

### New tRPC Router: `demo`

**Endpoint: `demo.startDemo`** (public procedure)

1. Create `User`:
   - `name`: "Demo User #" + random 4-digit suffix
   - `email`: `demo-{uuid}@spotiswipe.demo`
   - `isDemo: true`
   - `demoExpiresAt`: `new Date(Date.now() + 24 * 60 * 60 * 1000)`
   - `musicProvider`: "lastfm"

2. Create `Account`:
   - `providerId`: "demo"
   - `accountId`: user's UUID
   - Satisfies OnboardingGuard provider check

3. Create `Session` via better-auth internal API, set session cookie

4. Return `{ success: true }`, client redirects to `/dashboard`

### Client Changes (SignIn.tsx)

Below the OAuth buttons, add:
```
─── just browsing? ───
[ 🎵 Try Demo — No account needed ]
```

Button calls `demo.startDemo` mutation → on success → `router.push("/dashboard")`

### OnboardingGuard Change

`getConnectedProviders` in `user.ts` also checks for `providerId === "demo"`. Demo users skip onboarding entirely.

---

## 3. Discovery Feed for Demo Users

### New Endpoint: `demo.getDiscoveryFeed` (protected procedure)

- Checks `ctx.session.user.isDemo`
- Queries `Song` table for pre-seeded songs, excluding already-swiped
- Returns songs in randomized order, paginated
- Each song includes `lastfmUrl` for external listening

### Hook Integration (`useDiscoveryFeed`)

- Early return path: if user `isDemo`, call `demo.getDiscoveryFeed` instead of Spotify/Last.fm APIs
- No Spotify player SDK initialization for demo users
- Cards show album art + metadata + "Listen on Last.fm" link

### Search for Demo Users

**Endpoint: `demo.searchSongs`** (protected procedure)
- Full-text search against seeded `Song` records (title, artist)
- Used when demo user searches via HeaderSearch

---

## 4. Feature Behavior Matrix

| Feature | Demo Behavior | Change Required |
|---------|---------------|-----------------|
| Swipe/Discovery | Seeded songs from DB | Yes — demo feed path in hook |
| Playlist CRUD | Works as-is | No |
| Add song to playlist | Works as-is (songs in DB) | No |
| Shareboard browse | Pre-seeded social posts visible | No |
| Like/Comment/Follow | Full interaction with seeded data | No |
| Share playlist | Demo user can share to shareboard | No |
| Copy playlist from post | Works as-is | No |
| Spotify sync | Early-return with "demo mode" notice | Yes — guard in router |
| Spotify playback | Skip SDK, show Last.fm link | Yes — guard in hook |
| Profile | Pre-populated, editable | No |
| Search | Query seeded songs in DB | Yes — demo search path |
| Admin panel | Block demo user access | Yes — isDemo check |

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

### Demo Personas (6)

| Name | Taste | Playlists | Swipes |
|------|-------|-----------|--------|
| Alex Rivera | Indie + Electronic | "Midnight Drive", "Festival Season" | 25 |
| Jordan Kim | Hip-Hop + R&B | "Late Night R&B", "Bars Only" | 22 |
| Sam Chen | Electronic + Pop | "Deep Focus", "Weekend Energy" | 20 |
| Maya Patel | Rock + Indie | "Vinyl Classics", "New Discoveries" | 28 |
| Chris Okafor | R&B + Hip-Hop | "Smooth Vibes", "Workout Mix" | 18 |
| Taylor Nguyen | Pop + Electronic | "Feel Good Hits", "Chill Beats" | 24 |

Each persona: `isDemo: true`, `demoExpiresAt: null` (permanent), profile image via UI Avatars API or similar placeholder.

### Social Activity

- Each persona shares 1-2 playlists → 8-10 social posts total
- 3-5 likes per post (cross-persona interactions)
- 2-4 comments per post (realistic messages like "This playlist is fire", "Adding this to my rotation")
- Random follow network between all 6 personas

---

## 6. Cleanup Mechanism

### Admin Endpoint: `admin.cleanupDemoUsers`

1. Find users where `isDemo = true AND demoExpiresAt IS NOT NULL AND demoExpiresAt < now`
2. Cascade delete for each expired user:
   - Comments, Likes (by userId)
   - PlaylistSongs → Playlists (by userId)
   - SocialPosts (by userId)
   - SwipeActions (by userId)
   - Follow records (follower or following)
   - Sessions, Accounts (by userId)
   - User record
3. Return `{ deletedCount }`

### Cron Route: `/api/cron/cleanup-demo`

- Protected by `CRON_SECRET` env var (header check)
- Callable by Vercel Cron (daily schedule) or external cron service
- Calls same cleanup logic as admin endpoint

### Permanent seed personas are never deleted

They have `demoExpiresAt: null`, so the cleanup query never matches them.

---

## 7. File Change Summary

### New Files
| File | Purpose |
|------|---------|
| `prisma/seed-demo.ts` | Seed script for demo personas, songs, playlists, social activity |
| `src/server/api/routers/demo.ts` | Demo router: `startDemo`, `getDiscoveryFeed`, `searchSongs` |
| `src/app/api/cron/cleanup-demo/route.ts` | Cron endpoint for expired demo user cleanup |

### Modified Files
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `isDemo`, `demoExpiresAt` to User model |
| `src/app/_components/SignIn.tsx` | Add "just browsing?" divider + "Try Demo" button |
| `src/server/api/root.ts` | Register `demoRouter` |
| `src/server/api/routers/user.ts` | `getConnectedProviders` recognizes "demo" provider |
| `src/server/api/routers/spotify.ts` | `syncPlaylistToSpotify` early-returns for demo users |
| `src/server/api/routers/admin.ts` | Add `cleanupDemoUsers` endpoint |
| `src/lib/hooks/useDiscoveryFeed.ts` | Demo user path (fetch from DB instead of APIs) |
| `src/lib/hooks/useSpotifyPlayer.ts` | Skip SDK init for demo users |
| `src/app/(app)/dashboard/` | Last.fm link instead of play controls for demo users |
| `package.json` | Add `db:seed-demo` script |
| `src/env.js` | Add optional `CRON_SECRET` env var |

### Unchanged
- Middleware (demo users have valid sessions)
- Playlist CRUD, Social features, Profile page, Shareboard components
