# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SpotiSwipe is a music discovery social app built on the T3 Stack. Users authenticate via **Spotify** or **Last.fm** OAuth, swipe to discover music, build custom playlists, and share them on a social shareboard. Uses **Spotify** for playback/playlists and **Last.fm** for discovery recommendations and track metadata.

## Commands

```bash
# Development
bun dev                    # Start dev server at http://127.0.0.1:3000 (turbo mode)
bun run build              # Production build
bun start                  # Start production server

# Database
./start-database.sh        # Start local PostgreSQL
bun run db:push            # Push schema to DB (no migration file)
bun run db:generate        # Create migration and generate client
bun run db:migrate         # Deploy migrations
bun run db:studio          # Open Prisma Studio GUI
bunx prisma generate       # Regenerate Prisma client (output: ./generated/prisma)

# Code Quality
bun run check              # Biome lint + format check
bun run check:write        # Auto-fix safe issues
bun run check:unsafe       # Auto-fix all (including unsafe)
bun run typecheck          # TypeScript type check (tsc --noEmit)
```

## Architecture

### Stack
- **Next.js 16** App Router, React 19, Node.js runtime (no Edge)
- **tRPC 11** type-safe API with SuperJSON transformer + React Query
- **Prisma 6** with PostgreSQL, custom client output at `./generated/prisma`
- **better-auth** with Spotify OAuth (built-in) + custom Last.fm OAuth callback + Prisma adapter
- **Mantine 8** UI framework (dark mode default) + Tailwind CSS 4
- **Biome 2** for linting/formatting (replaces ESLint + Prettier)
- **Bun** as package manager

### Path Alias
`~/*` maps to `./src/*`

### Key Directories
```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── _components/        # Shared layout: Navbar, AuthProvider, HeaderSearch, SignIn, ColorSchemeToggle
│   ├── api/auth/           # better-auth catch-all handler ([...all]) + custom Last.fm callback
│   ├── api/trpc/           # tRPC HTTP handler
│   └── (app)/              # Route group for authenticated pages
│       ├── dashboard/      # Swipe/discover page (PlayerCard, PlaylistStack, LyricsPanel, ProviderSwitcher)
│       ├── playlist/       # Playlist management page
│       ├── shareboard/     # Social sharing page (ShareboardGrid, ShareboardDetail)
│       ├── profile/        # User profile page
│       └── admin/          # Admin panel (stats, user management)
├── lib/
│   ├── services/           # Client-side API wrappers (spotify.ts, lastfm.ts, discovery.ts)
│   ├── hooks/              # Custom hooks (useDiscoveryFeed, useSpotifyPlayer, useSessionState)
│   └── contexts/           # React contexts (app-shell-context)
├── server/
│   ├── auth/               # better-auth config + Last.fm API client
│   │   ├── index.ts        # betterAuth() init with Spotify + Google + generic-oauth Last.fm
│   │   └── lastfm.ts       # Last.fm API wrapper functions
│   ├── spotify/            # Spotify API integration
│   │   ├── api.ts          # Spotify API wrapper (search, playback, playlists, token refresh)
│   │   ├── types.ts        # Spotify API response types
│   │   ├── mappers.ts      # SpotifyTrack → Song mapping utilities
│   │   └── index.ts        # Barrel export
│   ├── api/
│   │   ├── root.ts         # Root router (merges sub-routers)
│   │   ├── trpc.ts         # tRPC context, middleware, procedures
│   │   └── routers/        # admin, lastfm, playlist, social, spotify, swipe, token, user
│   ├── db.ts               # Prisma client singleton
│   ├── logger.ts           # Structured logging utility (createLogger, withTiming)
│   └── errors.ts           # ErrorCode enum, AppError class, toTRPCError helper
├── trpc/                   # Client-side tRPC setup (react.tsx, server.ts, query-client.ts)
├── styles/                 # CSS modules and global styles
└── env.js                  # Zod-validated environment variables
```

### Auth Flow

**Spotify (primary):**
1. User clicks "Sign in with Spotify" → `authClient.signIn.social({ provider: "spotify" })`
2. better-auth redirects to Spotify with explicit `redirectURI: "http://127.0.0.1:3000/api/auth/callback/spotify"`
3. Access token + refresh token stored in Account model (camelCase fields) via Prisma adapter
4. Token auto-refreshes via `getSpotifyToken()` in `src/server/spotify/api.ts`

**Last.fm (secondary, for scrobbling/discovery):**
1. User clicks "Sign in with Last.fm" → redirects to Last.fm authorization
2. Last.fm redirects to `/api/auth/callback/lastfm` with token
3. Custom handler exchanges token for session key via Last.fm API (MD5 signature auth)
4. If user already signed in via Spotify, Last.fm Account is linked to existing user
5. Session cookie set as `better-auth.session_token`, redirect to `/dashboard`

**Critical**: All auth URLs must use `127.0.0.1` (not `localhost`) — Spotify banned `localhost` redirect URIs. better-auth `baseURL` and `redirectURI` are hardcoded to `http://127.0.0.1:3000`.

### tRPC Pattern
- Define routers in `src/server/api/routers/` and merge in `root.ts`
- Use `publicProcedure` (no auth) or `protectedProcedure` (requires session)
- Client hooks via `api` from `~/trpc/react`
- Server-side calls via `api` from `~/trpc/server`
- `timingMiddleware` adds artificial delay in dev + logs execution time

### Database Schema (Prisma)
Located at `prisma/schema.prisma`. Generated client at `./generated/prisma`.

**Auth models**: User, Account (camelCase fields: providerId, accountId, accessToken, refreshToken, accessTokenExpiresAt), Session (token, expiresAt), Verification
**Core models**: Song (externalId unique, optional spotifyId/spotifyUrl/previewUrl), Playlist (optional spotifyPlaylistId for sync), PlaylistSong (position-ordered, unique per playlist+song)
**Discovery models**: SwipeAction (liked/skipped/superliked, unique per user+song)
**Social models**: SocialPost (one per playlist), Like, Comment, Follow

### Logger & Error Handling
- `src/server/logger.ts`: `createLogger(context)` returns debug/info/warn/error/timed methods. Supports child loggers, request IDs, colored dev output, JSON production output. `withTiming()` wraps async functions with duration logging.
- `src/server/errors.ts`: `AppError` class with `ErrorCode` enum maps to HTTP status codes and tRPC error codes. `toTRPCError()` converts AppError to TRPCError.

### Environment Variables
Validated by Zod in `src/env.js`. Server: `AUTH_SECRET`, `AUTH_SPOTIFY_ID`, `AUTH_SPOTIFY_SECRET`, `LASTFM_API_KEY`, `LASTFM_API_SECRET`, `DATABASE_URL`.

### Styling
Mantine components + CSS Modules (`.module.css` files). Tailwind available but Mantine is primary. PostCSS with `postcss-preset-mantine` and `postcss-simple-vars`. Dark mode is default.

### Current Implementation State

**Working**:
- Dual auth: Spotify OAuth (via better-auth) + Last.fm OAuth (custom callback)
- Account linking: Last.fm can be linked to existing Spotify-authenticated user (better-auth trustedProviders)
- Spotify token auto-refresh (centralized in `src/server/spotify/api.ts`)
- Dashboard: PlayerCard (swipe to discover), PlaylistStack (create/manage playlists), LyricsPanel (track info + liked songs)
- Swipe mechanics: like/skip/superlike with animated card transitions
- Discovery feed: client-side pipeline in `src/lib/services/discovery.ts` (Spotify or Last.fm based)
- Playlist CRUD: create, edit, delete, add/remove songs, share to shareboard
- Social shareboard: browse shared playlists, like/comment on posts, follow users, copy playlists
- Music search: debounced search in HeaderSearch, Enter/option-select navigates to `/dashboard?q=` for search-based discovery feed
- Spotify integration: search, playback control (Web Playback SDK), playlist sync, recently played
- Responsive dashboard layout (flex-based, adapts to screen size)
- Navigation: Navbar with Discover/Playlists/Shareboard
- Mantine AppShell layout with sidebar + header + dark mode toggle

**tRPC Routers** (all in `src/server/api/routers/`):
- `admin`: getStats, getUsers, deleteUser, getReports
- `lastfm`: getTopArtists, getSimilarArtists, searchTracks
- `playlist`: getAll, getById, create, update, delete, addSong, removeSong
- `social`: sharePlaylist, getFeed, getPost, likePost, addComment, deleteComment, followUser, addPlaylistFromPost
- `spotify`: search, getPlayback, play, pause, skip, getPlaylists, createPlaylist, syncPlaylistToSpotify, recentlyPlayed
- `swipe`: recordSwipe, getHistory
- `token`: getSpotifyToken, getLastfmSession
- `user`: getMusicProvider, setMusicProvider, getConnectedProviders

**Not Yet Implemented**:
- Song reordering within playlists (drag-and-drop)
