# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SpotiSwipe is a music discovery social app built on the T3 Stack. Users authenticate via Last.fm OAuth, swipe to discover music, build custom playlists, and share them on a social shareboard. Uses **Last.fm** as the music data provider.

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
- **NextAuth 5 beta** with custom Last.fm OAuth provider + Prisma adapter
- **Mantine 8** UI framework (dark mode default) + Tailwind CSS 4
- **Biome 2** for linting/formatting (replaces ESLint + Prettier)
- **Bun** as package manager

### Path Alias
`~/*` maps to `./src/*`

### Key Directories
```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── _components/        # Shared layout: Navbar, AuthProvider, HeaderSearch, SignIn
│   ├── api/auth/           # NextAuth handlers + custom Last.fm callback
│   ├── api/music/          # REST endpoints: current, top-tracks, recommendations
│   ├── api/trpc/           # tRPC HTTP handler
│   ├── dashboard/          # Main swipe/discover page (PlayerCard, PlaylistStack, LyricsPanel)
│   ├── playlist/           # Playlist management page
│   └── shareboard/         # Social sharing page
├── server/
│   ├── auth/               # NextAuth config, Last.fm provider, Last.fm API client
│   │   ├── index.ts        # Exports auth() and signIn/signOut helpers
│   │   ├── config.ts       # NextAuth config with callbacks
│   │   ├── lastfm-provider.ts  # Custom OAuth provider definition
│   │   └── lastfm.ts       # Last.fm API wrapper functions
│   ├── api/
│   │   ├── root.ts         # Root router (merges sub-routers)
│   │   ├── trpc.ts         # tRPC context, middleware, procedure definitions
│   │   └── routers/        # Individual tRPC routers
│   ├── db.ts               # Prisma client singleton
│   ├── logger.ts           # Structured logging utility (createLogger, withTiming)
│   └── errors.ts           # ErrorCode enum, AppError class, toTRPCError helper
├── trpc/                   # Client-side tRPC setup (react.tsx, server.ts, query-client.ts)
├── styles/                 # CSS modules and global styles
└── env.js                  # Zod-validated environment variables
```

### Auth Flow
1. User clicks "Sign in with Last.fm" → redirects to Last.fm authorization
2. Last.fm redirects to `/api/auth/callback/lastfm` with token
3. Custom handler exchanges token for session key via Last.fm API (MD5 signature auth)
4. User upserted in DB via Prisma, session cookie set manually
5. Redirect to `/dashboard`

**Critical**: All auth URLs must use `127.0.0.1` (not `localhost`) to avoid redirect_uri mismatch. `NEXTAUTH_TRUST_HOST=true` is required.

### tRPC Pattern
- Define routers in `src/server/api/routers/` and merge in `root.ts`
- Use `publicProcedure` (no auth) or `protectedProcedure` (requires session)
- Client hooks via `api` from `~/trpc/react`
- Server-side calls via `api` from `~/trpc/server`
- `timingMiddleware` adds artificial delay in dev + logs execution time

### Database Schema (Prisma)
Located at `prisma/schema.prisma`. Generated client at `./generated/prisma`.

**Auth models**: User, Account, Session, VerificationToken
**Core models**: Song (externalId unique), Playlist, PlaylistSong (position-ordered, unique per playlist+song)
**Discovery models**: SwipeAction (liked/skipped/superliked, unique per user+song)
**Social models**: SocialPost (one per playlist), Like, Comment, Follow

### Logger & Error Handling
- `src/server/logger.ts`: `createLogger(context)` returns debug/info/warn/error/timed methods. Supports child loggers, request IDs, colored dev output, JSON production output. `withTiming()` wraps async functions with duration logging.
- `src/server/errors.ts`: `AppError` class with `ErrorCode` enum maps to HTTP status codes and tRPC error codes. `toTRPCError()` converts AppError to TRPCError.

### Environment Variables
Validated by Zod in `src/env.js`. Server: `AUTH_SECRET`, `LASTFM_API_KEY`, `LASTFM_API_SECRET`, `DATABASE_URL`. See `.env.example` for full list including `NEXT_PUBLIC_NEXTAUTH_URL`, `NEXTAUTH_URL`, `NEXTAUTH_TRUST_HOST`.

### Styling
Mantine components + CSS Modules (`.module.css` files). Tailwind available but Mantine is primary. PostCSS with `postcss-preset-mantine` and `postcss-simple-vars`. Dark mode is default.

### Current Implementation State

**Working**:
- Last.fm OAuth login flow (custom callback handler)
- REST API: `/api/music/current`, `/api/music/top-tracks`, `/api/music/recommendations`
- Dashboard layout with PlayerCard (current track), PlaylistStack (top tracks), LyricsPanel
- Basic navigation (Navbar with Discover/Playlists/Shareboard)
- Mantine AppShell layout with sidebar + header

**Placeholder/Hardcoded**:
- Shareboard page uses hardcoded mock data (6 fake playlists, not connected to DB)
- Playlist page uses hardcoded songs (PlaylistSongList) and static header (PlaylistHeader)
- Search bar is a TODO placeholder
- MusicExploreArea component is essentially empty
- Swipe buttons exist in PlayerCard but have no functionality

**Missing Features**:
- Swipe mechanics (accept/reject/superlike with gesture support)
- Song discovery engine (recommendations feed for swiping)
- Playlist CRUD operations (create, edit, delete, reorder songs)
- Social features (share playlist, like/comment on posts, follow users)
- tRPC routers for playlist, song, swipe, social operations (only `postRouter` exists with demo endpoints)
- Music search functionality
- User profile page

**Known Issues**:
- Duplicated code between `lastfm-provider.ts` and `/api/auth/callback/lastfm/route.ts` (generateApiSig, getSessionKey, getUserProfile)
- `postRouter` references a `Post` model that no longer exists in schema
- Logger/error utilities (`logger.ts`, `errors.ts`) exist but aren't used in any routes
- `debug` import in `config.ts` is unused
- REST music routes don't use the structured logger
