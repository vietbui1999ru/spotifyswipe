# SpotiSwipe

A music discovery social app where you swipe to discover new music, build custom playlists, and share them with a community. Powered by Last.fm for music data and recommendations.

## Features

- **Swipe to Discover** - Tinder-style card swiping to like, skip, or superlike songs from personalized recommendations
- **Custom Playlists** - Create and manage playlists from your liked songs with drag-to-reorder
- **Social Shareboard** - Share playlists publicly, like and comment on others' playlists, follow users
- **Last.fm Integration** - OAuth login, scrobble history, top tracks, similar artists, and recommendations
- **Dark Mode UI** - Beautiful dark-themed interface built with Mantine components

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| API | tRPC 11 (type-safe RPC) |
| Database | PostgreSQL + Prisma 6 ORM |
| Auth | NextAuth 5 (Last.fm OAuth) |
| UI | Mantine 8 + Tailwind CSS 4 |
| State | TanStack React Query 5 |
| Linting | Biome 2 |
| Runtime | Bun |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Bun](https://bun.sh/) (package manager)
- [PostgreSQL](https://www.postgresql.org/) 14+

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd spotiswipe

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env
# Edit .env with your credentials (see Environment Variables below)

# Start PostgreSQL (or use the helper script)
./start-database.sh

# Push database schema
bun run db:push

# Start development server
bun dev
```

The app runs at **http://127.0.0.1:3000** (must use 127.0.0.1, not localhost, for OAuth compatibility).

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AUTH_SECRET` | NextAuth secret (generate with `npx auth secret`) |
| `NEXT_PUBLIC_NEXTAUTH_URL` | Auth URL exposed to browser (`http://127.0.0.1:3000`) |
| `NEXTAUTH_URL` | Server-side auth URL (`http://127.0.0.1:3000`) |
| `NEXTAUTH_URL_INTERNAL` | Internal server URL (`http://127.0.0.1:3000`) |
| `NEXTAUTH_TRUST_HOST` | Trust host header (`true`) |
| `LASTFM_API_KEY` | Last.fm API key ([create here](https://www.last.fm/api/account/create)) |
| `LASTFM_API_SECRET` | Last.fm API secret |
| `LASTFM_CALLBACK_URL` | OAuth callback (`http://127.0.0.1:3000/api/auth/callback/lastfm`) |
| `DATABASE_URL` | PostgreSQL connection string |

## Scripts

```bash
bun dev              # Start dev server (turbo mode, 127.0.0.1:3000)
bun run build        # Production build
bun start            # Start production server
bun run check        # Biome lint + format check
bun run check:write  # Auto-fix safe issues
bun run typecheck    # TypeScript type check
bun run db:push      # Push schema to database
bun run db:generate  # Create migration + generate client
bun run db:studio    # Open Prisma Studio GUI
```

## Project Structure

```
src/
  app/                  # Next.js App Router (pages + API routes)
    api/auth/           # NextAuth + Last.fm OAuth callback
    api/music/          # REST endpoints (current track, top tracks, recommendations)
    api/trpc/           # tRPC HTTP handler
    dashboard/          # Swipe discovery page
    playlist/           # Playlist management
    shareboard/         # Social feed
  server/
    auth/               # NextAuth config, Last.fm provider + API client
    api/routers/        # tRPC router definitions
    db.ts               # Prisma client singleton
    logger.ts           # Structured logging utility
    errors.ts           # Error codes and AppError class
  trpc/                 # Client-side tRPC + React Query setup
prisma/schema.prisma    # Database schema
```

## Architecture

```
Browser  -->  Next.js App Router  -->  tRPC Routers  -->  Prisma  -->  PostgreSQL
                    |                       |
              Mantine UI            Last.fm API Client
              React Query           (MD5 signature auth)
                    |
              NextAuth Session
              (Last.fm OAuth)
```

- **Pages** use React Server Components with client components for interactivity
- **tRPC** provides end-to-end type safety between client and server
- **Prisma** manages database access with generated TypeScript client
- **NextAuth** handles Last.fm OAuth with custom provider and Prisma adapter
- **Path alias**: `~/*` maps to `./src/*`

## License

MIT
