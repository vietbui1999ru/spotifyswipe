# Remove Spotify — Last.fm Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all Spotify integration from SpotiSwipe, replacing it with a Last.fm-only discovery pipeline backed by iTunes album art enrichment and Last.fm chart cold-start.

**Architecture:** Email/password + Google remain as primary auth. Last.fm is a linked account (optional), not a login path. Discovery uses `getLastfmDiscoveryFeed` (personalized) or `chart.getTopTracks` (cold-start for new/unlinked users). Playback is replaced with an external "Listen on Last.fm" link. Scrobbling fires on like/superlike as a background operation.

**Tech Stack:** Next.js 16 App Router, tRPC 11, Prisma 6 + PostgreSQL, better-auth, Mantine 8, Vitest (new), Bun

---

## File Map

### Delete
- `src/server/spotify/` (entire directory: api.ts, types.ts, mappers.ts, index.ts)
- `src/lib/services/spotify.ts`
- `src/lib/hooks/useSpotifyPlayer.ts`
- `src/types/spotify-sdk.d.ts`
- `src/server/api/routers/spotify.ts`
- `src/app/(app)/dashboard/_components/ProviderSwitcher.tsx`

### Create
- `vitest.config.ts`
- `src/lib/services/itunes.ts`
- `src/__tests__/services/itunes.test.ts`
- `src/__tests__/services/discovery.test.ts`
- `src/__tests__/server/scrobble.test.ts`

### Modify
- `package.json` — add vitest, test script
- `prisma/schema.prisma` — drop `spotifyId`, `spotifyUrl`, `previewUrl` on Song; drop `spotifyPlaylistId` on Playlist; drop `musicProvider` on User
- `src/env.js` — remove `AUTH_SPOTIFY_ID`, `AUTH_SPOTIFY_SECRET`
- `src/server/auth/index.ts` — remove Spotify socialProvider
- `src/server/api/trpc.ts` — remove `getSpotifyToken` import + context field
- `src/server/api/root.ts` — remove `spotifyRouter`
- `src/server/api/routers/token.ts` — delete `getSpotifyToken` procedure
- `src/server/api/routers/user.ts` — remove `getMusicProvider`, `setMusicProvider`; update `getConnectedProviders` (drop spotify); update `getProfile` (drop hasSpotify)
- `src/server/api/routers/swipe.ts` — remove Spotify fields from input schema; export `buildScrobbleParams`; add scrobble on like/superlike
- `src/server/api/utils.ts` — update `SongData`: drop `spotifyId`, `spotifyUrl`, `previewUrl`
- `src/lib/services/lastfm.ts` — add `getChartTopTracks()`
- `src/lib/services/discovery.ts` — simplify to Last.fm-only + iTunes enrichment + cold-start
- `src/lib/hooks/useDiscoveryFeed.ts` — remove Spotify token logic, simplify provider resolution
- `src/app/(app)/dashboard/_components/PlayerCard.tsx` — remove `useSpotifyPlayer`, simplify playback to Last.fm link button
- `src/app/(app)/dashboard/page.tsx` — remove `ProviderSwitcher` import + JSX
- `src/app/onboarding/page.tsx` — remove Spotify button, add Skip, make Last.fm optional
- `src/app/_components/OnboardingGuard.tsx` — remove hard gate (render children always)
- `src/app/_components/SignIn.tsx` — remove Spotify + Last.fm sign-in buttons (Last.fm stays as linked-account only)

---

## Task 0: Install Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Vitest**

```bash
bun add -d vitest @vitest/coverage-v8
```

Expected output: packages added to devDependencies.

- [ ] **Step 2: Add test script to package.json**

In `package.json` scripts, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create vitest config**

Create `vitest.config.ts`:
```ts
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 4: Verify setup works**

```bash
bun test
```

Expected: "No test files found" or "0 tests passed" — not an error. Confirms Vitest is wired correctly.

- [ ] **Step 5: Commit**

```bash
git add package.json vitest.config.ts bun.lockb
git commit -m "chore: add vitest test runner"
```

---

## Task 1: iTunes Album Art Service (TDD)

**Files:**
- Create: `src/lib/services/itunes.ts`
- Create: `src/__tests__/services/itunes.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/services/itunes.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAlbumArt } from "~/lib/services/itunes";

describe("fetchAlbumArt", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns a larger artwork URL when iTunes finds a match", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            artworkUrl100:
              "https://example.mzstatic.com/thumb/Music/100x100bb.jpg",
          },
        ],
      }),
    } as Response);

    const result = await fetchAlbumArt("Radiohead", "Creep");
    expect(result).toBe(
      "https://example.mzstatic.com/thumb/Music/300x300bb.jpg",
    );
  });

  it("returns null when iTunes returns no results", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    } as Response);

    const result = await fetchAlbumArt("Unknown", "Untitled");
    expect(result).toBeNull();
  });

  it("returns null on non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
    } as Response);

    const result = await fetchAlbumArt("Artist", "Track");
    expect(result).toBeNull();
  });

  it("returns null on network error without throwing", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("Network error"),
    );

    const result = await fetchAlbumArt("Artist", "Track");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
bun test src/__tests__/services/itunes.test.ts
```

Expected: `FAIL — Cannot find module '~/lib/services/itunes'`

- [ ] **Step 3: Implement `fetchAlbumArt`**

Create `src/lib/services/itunes.ts`:
```ts
const ITUNES_API = "https://itunes.apple.com/search";

export async function fetchAlbumArt(
  artist: string,
  track: string,
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      term: `${artist} ${track}`,
      entity: "song",
      limit: "1",
    });
    const response = await fetch(`${ITUNES_API}?${params}`);
    if (!response.ok) return null;
    const data = (await response.json()) as {
      results?: Array<{ artworkUrl100?: string }>;
    };
    const art = data.results?.[0]?.artworkUrl100;
    if (!art) return null;
    return art.replace("100x100bb", "300x300bb");
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
bun test src/__tests__/services/itunes.test.ts
```

Expected: `4 tests passed`

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/itunes.ts src/__tests__/services/itunes.test.ts
git commit -m "feat: add iTunes album art lookup service"
```

---

## Task 2: Last.fm Cold-Start Feed (TDD)

**Files:**
- Modify: `src/lib/services/lastfm.ts`
- Create: `src/__tests__/services/discovery.test.ts` (partial — cold-start tests)

- [ ] **Step 1: Write failing cold-start tests**

Create `src/__tests__/services/discovery.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/lib/services/itunes", () => ({
  fetchAlbumArt: vi.fn().mockResolvedValue(null),
}));

import * as lastfm from "~/lib/services/lastfm";
import { getDiscoveryFeed } from "~/lib/services/discovery";

describe("getDiscoveryFeed — cold start", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls getChartTopTracks when lastfmUsername is null", async () => {
    vi.spyOn(lastfm, "getChartTopTracks").mockResolvedValueOnce([
      {
        name: "Bohemian Rhapsody",
        artist: { name: "Queen", url: "https://last.fm/Queen" },
        url: "https://last.fm/music/Queen/Bohemian+Rhapsody",
        image: [],
        playcount: "1000",
        listeners: "500",
      },
    ]);

    const result = await getDiscoveryFeed({
      lastfmUsername: null,
      swipedExternalIds: new Set(),
      limit: 20,
    });

    expect(lastfm.getChartTopTracks).toHaveBeenCalledOnce();
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Bohemian Rhapsody");
    expect(result[0]?.artist).toBe("Queen");
  });

  it("filters out already-swiped tracks", async () => {
    vi.spyOn(lastfm, "getChartTopTracks").mockResolvedValueOnce([
      {
        name: "Song A",
        artist: { name: "Artist X", url: "" },
        url: "https://last.fm/...",
        image: [],
        playcount: "100",
        listeners: "50",
      },
      {
        name: "Song B",
        artist: { name: "Artist X", url: "" },
        url: "https://last.fm/...",
        image: [],
        playcount: "100",
        listeners: "50",
      },
    ]);

    const result = await getDiscoveryFeed({
      lastfmUsername: null,
      swipedExternalIds: new Set(["chart:artist x:song a"]),
      limit: 20,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Song B");
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
bun test src/__tests__/services/discovery.test.ts
```

Expected: `FAIL — getChartTopTracks is not a function` (doesn't exist yet on lastfm module)

- [ ] **Step 3: Add `getChartTopTracks` to `src/lib/services/lastfm.ts`**

Append to the end of `src/lib/services/lastfm.ts`:
```ts
export interface LastfmChartTrack {
  name: string;
  artist: { name: string; url: string };
  url: string;
  image: LastfmImage[];
  playcount: string;
  listeners: string;
}

export async function getChartTopTracks(
  limit = 50,
): Promise<LastfmChartTrack[]> {
  const result = await callLastfm<{
    tracks: { track: LastfmChartTrack[] };
  }>("chart.getTopTracks", { limit: String(limit) });
  return result.tracks?.track ?? [];
}
```

- [ ] **Step 4: Run tests — still fail (discovery.ts not updated yet)**

```bash
bun test src/__tests__/services/discovery.test.ts
```

Expected: Tests still fail because `getDiscoveryFeed` still has old signature (with `provider`/`spotifyToken`). Correct failure — proceed to Task 3.

---

## Task 3: Simplify Discovery Pipeline (TDD)

**Files:**
- Modify: `src/lib/services/discovery.ts`

- [ ] **Step 1: Run current failing discovery tests to confirm baseline**

```bash
bun test src/__tests__/services/discovery.test.ts
```

Expected: Tests fail because current `getDiscoveryFeed` requires `provider` + `spotifyToken`.

- [ ] **Step 2: Rewrite `src/lib/services/discovery.ts`**

Replace the entire file:
```ts
import { fetchAlbumArt } from "./itunes";
import * as lastfm from "./lastfm";

export interface DiscoveryTrack {
  name: string;
  artist: string;
  url: string;
  image: string | null;
  externalId: string;
}

export interface DiscoveryFeedOptions {
  lastfmUsername: string | null;
  swipedExternalIds: Set<string>;
  limit?: number;
  searchQuery?: string;
}

async function processBatches<TItem, TResult>(
  items: TItem[],
  batchSize: number,
  fn: (item: TItem) => Promise<TResult>,
): Promise<TResult[]> {
  const results: TResult[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}
```

- [ ] **Step 3: Add enrichment + feed functions (continue same file)**

Append to `src/lib/services/discovery.ts`:
```ts
async function enrichWithAlbumArt(
  candidates: DiscoveryTrack[],
): Promise<void> {
  const toEnrich = candidates.filter((c) => !c.image).slice(0, 15);
  await processBatches(toEnrich, 5, async (candidate) => {
    const art = await fetchAlbumArt(candidate.artist, candidate.name);
    if (art) candidate.image = art;
  });
}

async function getColdStartFeed(): Promise<DiscoveryTrack[]> {
  const tracks = await lastfm.getChartTopTracks(50);
  return tracks.map((track) => {
    const artist =
      typeof track.artist === "object"
        ? track.artist.name
        : String(track.artist);
    return {
      name: track.name,
      artist,
      url: track.url,
      image: lastfm.getImageUrl(track.image),
      externalId: `chart:${artist.toLowerCase()}:${track.name.toLowerCase()}`,
    };
  });
}

export async function getLastfmDiscoveryFeed(
  lastfmUsername: string,
): Promise<DiscoveryTrack[]> {
  const topArtists = await lastfm.getTopArtists(lastfmUsername, "3month", 5);
  if (topArtists.length === 0) return [];

  const similarResults = await Promise.all(
    topArtists
      .slice(0, 3)
      .map((artist) =>
        lastfm
          .getSimilarArtists(artist.name, 3)
          .catch(() => [] as lastfm.LastfmSimilarArtist[]),
      ),
  );

  const similarNames = new Set<string>();
  for (const group of similarResults) {
    for (const artist of group) similarNames.add(artist.name);
  }

  const trackResults = await Promise.all(
    Array.from(similarNames)
      .slice(0, 5)
      .map((artist) =>
        lastfm
          .getArtistTopTracks(artist, 5)
          .catch(() => [] as lastfm.LastfmArtistTrack[]),
      ),
  );

  const candidates: DiscoveryTrack[] = [];
  const seen = new Set<string>();
  for (const tracks of trackResults) {
    for (const track of tracks) {
      const artist =
        typeof track.artist === "object"
          ? track.artist.name
          : String(track.artist);
      const id = `${artist}:${track.name}`.toLowerCase();
      if (!seen.has(id)) {
        seen.add(id);
        candidates.push({
          name: track.name,
          artist,
          url: track.url,
          image: lastfm.getImageUrl(track.image),
          externalId: id,
        });
      }
    }
  }

  await enrichWithAlbumArt(candidates);
  return candidates;
}

async function getSearchBasedFeed(
  query: string,
): Promise<DiscoveryTrack[]> {
  const tracks = await lastfm.searchTracks(query, 30);
  const candidates: DiscoveryTrack[] = [];
  const seen = new Set<string>();

  for (const track of tracks) {
    const id = `${track.artist}:${track.name}`.toLowerCase();
    if (!seen.has(id)) {
      seen.add(id);
      candidates.push({
        name: track.name,
        artist: track.artist,
        url: track.url,
        image: lastfm.getImageUrl(track.image),
        externalId: id,
      });
    }
  }

  await enrichWithAlbumArt(candidates);
  return candidates;
}

export async function getDiscoveryFeed(
  options: DiscoveryFeedOptions,
): Promise<DiscoveryTrack[]> {
  const { lastfmUsername, swipedExternalIds, limit = 20, searchQuery } =
    options;

  let candidates: DiscoveryTrack[];

  if (searchQuery) {
    candidates = await getSearchBasedFeed(searchQuery);
  } else if (lastfmUsername) {
    candidates = await getLastfmDiscoveryFeed(lastfmUsername);
  } else {
    candidates = await getColdStartFeed();
  }

  const filtered = candidates.filter(
    (c) => !swipedExternalIds.has(c.externalId),
  );

  if (!searchQuery) filtered.sort(() => Math.random() - 0.5);

  return filtered.slice(0, limit);
}
```

- [ ] **Step 4: Run discovery tests — verify they pass**

```bash
bun test src/__tests__/services/discovery.test.ts
```

Expected: `2 tests passed`

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/discovery.ts src/lib/services/lastfm.ts src/__tests__/services/discovery.test.ts
git commit -m "feat: simplify discovery to Last.fm-only with cold-start + iTunes enrichment"
```

---

## Task 4: Scrobble Helper (TDD)

**Files:**
- Modify: `src/server/api/routers/swipe.ts`
- Create: `src/__tests__/server/scrobble.test.ts`

- [ ] **Step 1: Write failing test for `buildScrobbleParams`**

Create `src/__tests__/server/scrobble.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { buildScrobbleParams } from "~/server/api/routers/swipe";

describe("buildScrobbleParams", () => {
  it("returns params for liked action", () => {
    const result = buildScrobbleParams(
      { artist: "Radiohead", title: "Creep" },
      "liked",
    );
    expect(result).not.toBeNull();
    expect(result?.artist).toBe("Radiohead");
    expect(result?.track).toBe("Creep");
    expect(result?.timestamp).toBeTypeOf("number");
  });

  it("returns params for superliked action", () => {
    const result = buildScrobbleParams(
      { artist: "Nirvana", title: "Smells Like Teen Spirit" },
      "superliked",
    );
    expect(result).not.toBeNull();
  });

  it("returns null for skipped action", () => {
    const result = buildScrobbleParams(
      { artist: "Anyone", title: "Anything" },
      "skipped",
    );
    expect(result).toBeNull();
  });

  it("timestamp is within 5 seconds of now", () => {
    const before = Math.floor(Date.now() / 1000);
    const result = buildScrobbleParams({ artist: "A", title: "B" }, "liked");
    const after = Math.floor(Date.now() / 1000);
    expect(result?.timestamp).toBeGreaterThanOrEqual(before);
    expect(result?.timestamp).toBeLessThanOrEqual(after);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
bun test src/__tests__/server/scrobble.test.ts
```

Expected: `FAIL — buildScrobbleParams is not exported from swipe.ts`

- [ ] **Step 3: Export `buildScrobbleParams` from `src/server/api/routers/swipe.ts`**

Add this function above the `swipeRouter` definition in `src/server/api/routers/swipe.ts`:
```ts
export function buildScrobbleParams(
  songData: { artist: string; title: string },
  action: string,
): { artist: string; track: string; timestamp: number } | null {
  if (action !== "liked" && action !== "superliked") return null;
  return {
    artist: songData.artist,
    track: songData.title,
    timestamp: Math.floor(Date.now() / 1000),
  };
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
bun test src/__tests__/server/scrobble.test.ts
```

Expected: `4 tests passed`

- [ ] **Step 5: Run all tests**

```bash
bun test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/server/api/routers/swipe.ts src/__tests__/server/scrobble.test.ts
git commit -m "feat: add scrobble params helper with TDD"
```

---

## Task 5: Prisma Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Update `prisma/schema.prisma`**

In the `Song` model, remove `spotifyId`, `spotifyUrl`, `previewUrl`:

Before:
```prisma
model Song {
    id         String   @id @default(cuid())
    title      String
    artist     String
    album      String?
    albumArt   String?
    lastfmUrl  String?
    duration   Int?
    externalId String   @unique
    spotifyId  String?  @unique
    spotifyUrl String?
    previewUrl String?
    createdAt DateTime @default(now())
    ...
}
```

After (remove the three Spotify fields):
```prisma
model Song {
    id         String   @id @default(cuid())
    title      String
    artist     String
    album      String?
    albumArt   String?
    lastfmUrl  String?
    duration   Int?
    externalId String   @unique

    createdAt DateTime @default(now())

    playlistSongs PlaylistSong[]
    swipeActions  SwipeAction[]

    @@index([title, artist])
}
```

In the `Playlist` model, remove `spotifyPlaylistId`:

Before:
```prisma
spotifyPlaylistId String? @unique
```

Remove that line entirely.

In the `User` model, remove `musicProvider`:

Before:
```prisma
musicProvider String   @default("auto") // "auto" | "spotify" | "lastfm"
```

Remove that line entirely.

- [ ] **Step 2: Push schema to local dev database**

```bash
bunx prisma db push --accept-data-loss
```

Expected: Schema applied, confirmation of field removals. `--accept-data-loss` needed since we're dropping columns with existing data.

- [ ] **Step 3: Regenerate Prisma client**

```bash
bunx prisma generate
```

Expected: Client regenerated at `./generated/prisma`.

- [ ] **Step 4: Commit schema**

```bash
git add prisma/schema.prisma
git commit -m "chore: remove Spotify fields from Prisma schema (Song, Playlist, User)"
```

---

## Task 6: Delete Dead Files

**Files:** See list below — all deletions.

- [ ] **Step 1: Delete Spotify server directory**

```bash
rm -rf src/server/spotify
```

- [ ] **Step 2: Delete Spotify client files**

```bash
rm src/lib/services/spotify.ts
rm src/lib/hooks/useSpotifyPlayer.ts
rm src/types/spotify-sdk.d.ts
```

- [ ] **Step 3: Delete Spotify tRPC router and ProviderSwitcher**

```bash
rm src/server/api/routers/spotify.ts
rm src/app/(app)/dashboard/_components/ProviderSwitcher.tsx
```

- [ ] **Step 4: Verify typecheck still compiles (will fail — proceed)**

```bash
bun run typecheck 2>&1 | head -30
```

Expected: TypeScript errors about missing imports. This is expected — we fix them in the next tasks.

- [ ] **Step 5: Commit deletions**

```bash
git add -A
git commit -m "chore: delete Spotify server, client services, SDK types, and ProviderSwitcher"
```

---

## Task 7: Update Env + Auth + tRPC Context

**Files:**
- `src/env.js`
- `src/server/auth/index.ts`
- `src/server/api/trpc.ts`

- [ ] **Step 1: Remove Spotify env vars from `src/env.js`**

Remove `AUTH_SPOTIFY_ID` and `AUTH_SPOTIFY_SECRET` from both `server` schema and `runtimeEnv`:

```js
server: {
  AUTH_SECRET: process.env.NODE_ENV === "production" ? z.string() : z.string().optional(),
  LASTFM_API_KEY: z.string(),
  LASTFM_API_SECRET: z.string(),
  AUTH_GOOGLE_ID: z.string(),
  AUTH_GOOGLE_SECRET: z.string(),
  DATABASE_URL: z.string().url(),
  CRON_SECRET: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
},
// ...
runtimeEnv: {
  AUTH_SECRET: process.env.AUTH_SECRET,
  LASTFM_API_KEY: process.env.LASTFM_API_KEY,
  LASTFM_API_SECRET: process.env.LASTFM_API_SECRET,
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  CRON_SECRET: process.env.CRON_SECRET,
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_LASTFM_API_KEY: process.env.NEXT_PUBLIC_LASTFM_API_KEY,
},
```

- [ ] **Step 2: Remove Spotify from `src/server/auth/index.ts`**

Remove the `SPOTIFY_SCOPES` constant and the `spotify` key from `socialProviders`:

```ts
export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  baseURL: baseUrl,
  basePath: "/api/auth",
  secret: env.AUTH_SECRET,
  trustedOrigins: getTrustedOrigins(),

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },

  socialProviders: {
    google: {
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      redirectURI: `${baseUrl}/api/auth/callback/google`,
    },
  },

  plugins: [nextCookies()],

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["lastfm", "google"],
      allowDifferentEmails: true,
    },
  },
});
```

- [ ] **Step 3: Remove `getSpotifyToken` from `src/server/api/trpc.ts`**

Remove the import line:
```ts
// DELETE this line:
import { getSpotifyToken } from "~/server/spotify";
```

Remove the lazy token getter and context field — replace the context return with:
```ts
return {
  db,
  session,
  requestId,
  ...opts,
};
```

(Remove `spotifyTokenPromise`, `getSpotifyAccessToken`, and `getSpotifyToken: getSpotifyAccessToken` from the return object.)

- [ ] **Step 4: Commit**

```bash
git add src/env.js src/server/auth/index.ts src/server/api/trpc.ts
git commit -m "chore: remove Spotify from env, auth config, and tRPC context"
```

---

## Task 8: Update tRPC Root + Token Router

**Files:**
- `src/server/api/root.ts`
- `src/server/api/routers/token.ts`

- [ ] **Step 1: Remove spotifyRouter from `src/server/api/root.ts`**

Remove the import and the `spotify` key:
```ts
import { adminRouter } from "~/server/api/routers/admin";
import { demoRouter } from "~/server/api/routers/demo";
import { lastfmRouter } from "~/server/api/routers/lastfm";
import { playlistRouter } from "~/server/api/routers/playlist";
import { socialRouter } from "~/server/api/routers/social";
import { swipeRouter } from "~/server/api/routers/swipe";
import { tokenRouter } from "~/server/api/routers/token";
import { userRouter } from "~/server/api/routers/user";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  admin: adminRouter,
  demo: demoRouter,
  lastfm: lastfmRouter,
  playlist: playlistRouter,
  swipe: swipeRouter,
  social: socialRouter,
  token: tokenRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
```

- [ ] **Step 2: Remove `getSpotifyToken` from `src/server/api/routers/token.ts`**

Replace the entire file:
```ts
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { AppError, ErrorCode, toTRPCError } from "~/server/errors";
import { createLogger } from "~/server/logger";

export const tokenRouter = createTRPCRouter({
  getLastfmSession: protectedProcedure.query(async ({ ctx }) => {
    const log = createLogger("token.getLastfmSession", {
      userId: ctx.session.user.id,
    });

    try {
      const account = await ctx.db.account.findFirst({
        where: { userId: ctx.session.user.id, providerId: "lastfm" },
        select: { accessToken: true, accountId: true },
      });

      if (!account?.accessToken) {
        throw new AppError(
          ErrorCode.AUTH_FAILED,
          "Last.fm account not connected",
        );
      }

      log.debug("Last.fm session served to client");
      return {
        sessionKey: account.accessToken,
        username: account.accountId,
      };
    } catch (err) {
      if (err instanceof AppError) throw toTRPCError(err);
      log.warn("Failed to get Last.fm session", {
        error: err instanceof Error ? err.message : String(err),
      });
      throw toTRPCError(
        new AppError(ErrorCode.AUTH_FAILED, "Last.fm account not connected"),
      );
    }
  }),
});
```

- [ ] **Step 3: Commit**

```bash
git add src/server/api/root.ts src/server/api/routers/token.ts
git commit -m "chore: remove spotifyRouter and getSpotifyToken tRPC procedure"
```

---

## Task 9: Update User Router + SongData Utils

**Files:**
- `src/server/api/routers/user.ts`
- `src/server/api/utils.ts`

- [ ] **Step 1: Remove Spotify procedures from `src/server/api/routers/user.ts`**

Remove `getMusicProvider` and `setMusicProvider` procedures entirely.

Update `getConnectedProviders` to drop spotify:
```ts
getConnectedProviders: protectedProcedure.query(async ({ ctx }) => {
  const accounts = await ctx.db.account.findMany({
    where: { userId: ctx.session.user.id },
    select: { providerId: true },
  });
  const providerIds = new Set(accounts.map((a) => a.providerId));
  return {
    lastfm: providerIds.has("lastfm"),
    demo: providerIds.has("demo"),
  };
}),
```

Update `getProfile` — remove `hasSpotify` reference and update `connectedProviders`:
```ts
const hasLastfm = providerIds.has("lastfm");

// ...
connectedProviders: {
  lastfm: hasLastfm,
  demo: providerIds.has("demo"),
},
```

Also update the display name comment since "Spotify name" no longer applies:
```ts
const resolvedName = user.displayName || user.name || "SpotiSwipe User";
```

- [ ] **Step 2: Update `SongData` in `src/server/api/utils.ts`**

Remove `spotifyId`, `spotifyUrl`, `previewUrl` from the `SongData` interface:
```ts
export interface SongData {
  title: string;
  artist: string;
  album?: string;
  albumArt?: string;
  lastfmUrl?: string;
  externalId: string;
}
```

The `upsertSong` function body is unchanged — it spreads `fields` into the upsert, which now just has fewer fields.

- [ ] **Step 3: Commit**

```bash
git add src/server/api/routers/user.ts src/server/api/utils.ts
git commit -m "chore: remove Spotify provider procedures and fields from user router and SongData"
```

---

## Task 10: Wire Scrobbling in Swipe Router

**Files:**
- `src/server/api/routers/swipe.ts`

- [ ] **Step 1: Add scrobble import and update `recordSwipe` in `src/server/api/routers/swipe.ts`**

Add import at the top of the file:
```ts
import { scrobbleTrack } from "~/server/auth/lastfm";
```

Update the `recordSwipe` input schema — remove `spotifyId`, `spotifyUrl`, `previewUrl`:
```ts
songData: z.object({
  title: z.string().min(1),
  artist: z.string().min(1),
  album: z.string().optional(),
  albumArt: z.string().optional(),
  lastfmUrl: z.string().optional(),
  externalId: z.string().min(1),
}),
```

After the `swipeAction` upsert succeeds (before the `return swipeAction` line), add the fire-and-forget scrobble:
```ts
if (input.action === "liked" || input.action === "superliked") {
  ctx.db.account
    .findFirst({
      where: { userId: ctx.session.user.id, providerId: "lastfm" },
      select: { accessToken: true },
    })
    .then((account) => {
      if (!account?.accessToken) return;
      return scrobbleTrack(account.accessToken, {
        artist: input.songData.artist,
        track: input.songData.title,
        timestamp: Math.floor(Date.now() / 1000),
      });
    })
    .catch(() => {
      log.warn("Scrobble failed (non-blocking)", {
        song: input.songData.title,
      });
    });
}
```

- [ ] **Step 2: Run all tests**

```bash
bun test
```

Expected: All tests pass (scrobble helper tests still pass).

- [ ] **Step 3: Commit**

```bash
git add src/server/api/routers/swipe.ts
git commit -m "feat: scrobble to Last.fm on like/superlike (fire-and-forget)"
```

---

## Task 11: Simplify `useDiscoveryFeed` Hook

**Files:**
- `src/lib/hooks/useDiscoveryFeed.ts`

- [ ] **Step 1: Replace `src/lib/hooks/useDiscoveryFeed.ts`**

```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import {
  type DiscoveryTrack,
  getDiscoveryFeed,
} from "~/lib/services/discovery";
import { api } from "~/trpc/react";

const FEED_STORAGE_KEY = "spotiswipe:discovery-feed";

function saveFeedToSession(feed: DiscoveryTrack[]): void {
  try {
    sessionStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(feed));
  } catch {
    // sessionStorage unavailable or full
  }
}

function loadFeedFromSession(): DiscoveryTrack[] | undefined {
  try {
    const stored = sessionStorage.getItem(FEED_STORAGE_KEY);
    if (stored) return JSON.parse(stored) as DiscoveryTrack[];
  } catch {
    // corrupt or unavailable
  }
  return undefined;
}

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

  const { data: lastfmSessionData } = api.token.getLastfmSession.useQuery(
    undefined,
    { enabled: !isDemo, retry: false, staleTime: 5 * 60 * 1000 },
  );

  const { data: swipeHistory } = api.swipe.getHistory.useQuery(
    { limit: 50 },
    { refetchOnWindowFocus: false, enabled: !isDemo },
  );

  const lastfmUsername = lastfmSessionData?.username ?? null;

  const swipedExternalIds = useMemo(
    () => new Set(swipeHistory?.items.map((s) => s.song.externalId) ?? []),
    [swipeHistory],
  );

  useEffect(() => {
    if (searchQuery) {
      try {
        sessionStorage.removeItem(FEED_STORAGE_KEY);
      } catch {
        // sessionStorage unavailable
      }
    }
  }, [searchQuery]);

  const regularQuery = useQuery<DiscoveryTrack[]>({
    queryKey: ["discoveryFeed", lastfmUsername, limit, searchQuery ?? null],
    queryFn: () =>
      getDiscoveryFeed({ lastfmUsername, swipedExternalIds, limit, searchQuery }),
    enabled: !isDemo,
    refetchOnWindowFocus: false,
    staleTime: searchQuery ? 5 * 60 * 1000 : 10 * 60 * 1000,
    gcTime: Number.POSITIVE_INFINITY,
    initialData: searchQuery ? undefined : loadFeedFromSession,
  });

  useEffect(() => {
    if (regularQuery.data && regularQuery.data.length > 0) {
      saveFeedToSession(regularQuery.data);
    }
  }, [regularQuery.data]);

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
    data: regularQuery.data,
    isLoading: regularQuery.isLoading,
    error: regularQuery.error,
    refetch: regularQuery.refetch,
    isDemo: false,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/hooks/useDiscoveryFeed.ts
git commit -m "chore: simplify useDiscoveryFeed — remove Spotify token and provider branching"
```

---

## Task 12: Simplify PlayerCard + Dashboard

**Files:**
- `src/app/(app)/dashboard/_components/PlayerCard.tsx`
- `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Update `PlayerCard.tsx` — remove Spotify playback**

Remove these imports:
```ts
// DELETE these imports:
import { useCallback, useEffect, useRef, useState } from "react";
import { useSpotifyPlayer } from "~/lib/hooks/useSpotifyPlayer";
```

Replace with (keep only what's needed):
```ts
import { useCallback, useEffect, useRef, useState } from "react";
```

Remove the `getToken` callback and `player` hook — delete these lines:
```ts
// DELETE:
const getToken = useCallback(async () => {
  const result = await utils.token.getSpotifyToken.fetch();
  return result.accessToken;
}, [utils]);

const player = useSpotifyPlayer({
  getToken,
  playerName: "SpotiSwipe",
  enabled: !isDemo,
});
```

Remove `IconBrandSpotify` from tabler imports, keep `IconBrandLastfm`.

Replace the entire `{/* Swipe + Playback Controls */}` `<div>` block (from the progress bar comment to the closing `</div>`) with:
```tsx
<div style={{ marginTop: "auto" }}>
  <div className={styles.swipeControls}>
    <button
      className={`${styles.swipeButton} ${styles.rejectButton}`}
      onClick={() => handleSwipe("skipped")}
      title="Skip"
      type="button"
    >
      <IconX size={24} />
    </button>

    <Button
      color="red"
      component="a"
      href={currentTrack.url}
      leftSection={<IconBrandLastfm size={18} />}
      rel="noopener noreferrer"
      size="sm"
      target="_blank"
      variant="light"
    >
      Listen on Last.fm
    </Button>

    <button
      className={`${styles.swipeButton} ${styles.acceptButton}`}
      onClick={() => handleSwipe("liked")}
      title="Like"
      type="button"
    >
      <IconCheck size={24} />
    </button>
  </div>

  <Group justify="center" mt="xs">
    <button
      className={styles.swipeButton}
      onClick={() => handleSwipe("superliked")}
      style={{
        borderColor: "rgba(236, 72, 153, 0.5)",
        color: "rgb(236, 72, 153)",
        background: "rgba(236, 72, 153, 0.05)",
        width: "3rem",
        height: "3rem",
      }}
      title="Super Like"
      type="button"
    >
      <IconHeart size={18} />
    </button>
  </Group>
</div>
```

Also remove the `{/* Non-premium banner */}` block and the `{/* Card Counter + Spotify/Last.fm link */}` badge section — the Last.fm link is now the primary action. Keep only the track counter badge:
```tsx
<Group gap="xs" justify="center" mt="xs">
  <Badge variant="light">
    {currentIndex + 1} / {feed.length}
  </Badge>
  {activePlaylistId && (
    <Tooltip label="Liked songs will be added to your active playlist">
      <Badge color="green" variant="light">
        Auto-add ON
      </Badge>
    </Tooltip>
  )}
</Group>
```

Update `songData` in `handleSwipe` — remove Spotify fields:
```ts
const songData = {
  title: currentTrack.name,
  artist: currentTrack.artist,
  albumArt: currentTrack.image ?? undefined,
  lastfmUrl: currentTrack.url,
  externalId: currentTrack.externalId,
};
```

- [ ] **Step 2: Remove ProviderSwitcher from `src/app/(app)/dashboard/page.tsx`**

Remove the import:
```ts
// DELETE:
import ProviderSwitcher from "./_components/ProviderSwitcher";
```

Remove the JSX block (the `<div>` wrapping `<ProviderSwitcher />`):
```tsx
// DELETE these lines:
<div style={{ display: "flex", justifyContent: "center" }}>
  <ProviderSwitcher />
</div>
```

- [ ] **Step 3: Run typecheck**

```bash
bun run typecheck 2>&1 | head -40
```

Fix any remaining type errors (should be minor at this point).

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/dashboard/_components/PlayerCard.tsx src/app/(app)/dashboard/page.tsx
git commit -m "feat: replace Spotify playback with Last.fm external link in PlayerCard"
```

---

## Task 13: Update Onboarding + Auth UI

**Files:**
- `src/app/onboarding/page.tsx`
- `src/app/_components/OnboardingGuard.tsx`
- `src/app/_components/SignIn.tsx`

- [ ] **Step 1: Simplify `src/app/_components/OnboardingGuard.tsx`**

The guard now renders children unconditionally (Last.fm is optional, cold-start handles unauthenticated):
```tsx
"use client";

import { type ReactNode } from "react";

interface OnboardingGuardProps {
  children: ReactNode;
}

const OnboardingGuard = ({ children }: OnboardingGuardProps) => {
  return <>{children}</>;
};

export default OnboardingGuard;
```

- [ ] **Step 2: Rewrite `src/app/onboarding/page.tsx`**

Replace the entire file:
```tsx
"use client";

import {
  Button,
  Card,
  Center,
  Loader,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconBrandLastfm, IconCheck } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "~/trpc/react";

function getLastfmAuthUrl() {
  const cb = new URL("/api/auth/callback/lastfm", window.location.origin);
  cb.searchParams.set("redirect", "/onboarding");
  return `https://www.last.fm/api/auth?api_key=${process.env.NEXT_PUBLIC_LASTFM_API_KEY}&cb=${encodeURIComponent(cb.toString())}`;
}

const OnboardingPage = () => {
  const router = useRouter();
  const { data: providers, isLoading } =
    api.user.getConnectedProviders.useQuery(undefined, {
      refetchInterval: 3000,
    });

  useEffect(() => {
    if (!isLoading && providers?.lastfm) {
      router.replace("/dashboard");
    }
  }, [providers?.lastfm, isLoading, router]);

  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Center h="100vh">
      <Card maw={480} p="xl" radius="md" shadow="md" w="100%" withBorder>
        <Stack gap="lg">
          <div>
            <Title order={2} ta="center">
              Connect Last.fm
            </Title>
            <Text c="dimmed" mt="xs" size="sm" ta="center">
              Link your Last.fm account for personalized picks based on your
              listening history. Skip to browse popular charts instead.
            </Text>
          </div>

          <Button
            disabled={providers?.lastfm}
            gradient={{ from: "red", to: "pink" }}
            leftSection={
              providers?.lastfm ? (
                <ThemeIcon color="green" radius="xl" size="sm" variant="filled">
                  <IconCheck size={12} />
                </ThemeIcon>
              ) : (
                <IconBrandLastfm size={18} />
              )
            }
            onClick={() => {
              window.location.href = getLastfmAuthUrl();
            }}
            radius="md"
            size="lg"
            variant={providers?.lastfm ? "light" : "gradient"}
          >
            {providers?.lastfm ? "Last.fm connected" : "Connect Last.fm"}
          </Button>

          <Button
            color="gray"
            onClick={() => router.push("/dashboard")}
            radius="md"
            size="md"
            variant="subtle"
          >
            Skip — browse popular charts
          </Button>
        </Stack>
      </Card>
    </Center>
  );
};

export default OnboardingPage;
```

- [ ] **Step 3: Remove Spotify + Last.fm sign-in from `src/app/_components/SignIn.tsx`**

Remove `IconBrandSpotify` from icon imports and `IconBrandLastfm` (only needed if keeping Last.fm button).

Remove `handleSpotifySignIn` function and `handleLastfmSignIn` function.

Remove the Spotify `<Button>` and Last.fm `<Button>` from the social sign-in stack, keeping only Google:
```tsx
<Stack gap="sm">
  <Button
    color="gray"
    leftSection={<IconBrandGoogle size={18} />}
    onClick={handleGoogleSignIn}
    radius="md"
    size="md"
    variant="default"
  >
    Google
  </Button>
</Stack>
```

- [ ] **Step 4: Commit**

```bash
git add src/app/onboarding/page.tsx src/app/_components/OnboardingGuard.tsx src/app/_components/SignIn.tsx
git commit -m "feat: make Last.fm optional in onboarding, remove Spotify/Last.fm sign-in buttons"
```

---

## Task 14: Final Typecheck + Lint

- [ ] **Step 1: Run typecheck**

```bash
bun run typecheck
```

Expected: 0 errors. Fix any remaining type errors before proceeding.

- [ ] **Step 2: Run Biome lint + format**

```bash
bun run check:write
```

Expected: Clean output (pre-existing seed.ts + SuperJSON warnings are expected and OK).

- [ ] **Step 3: Run all tests**

```bash
bun test
```

Expected: All tests pass.

- [ ] **Step 4: Start dev server and verify manually**

```bash
bun dev
```

Check:
- Sign-in page: only email/password + Google visible
- Onboarding: shows "Connect Last.fm" + "Skip" — not blocked
- Dashboard loads with chart feed (cold-start) without Last.fm connected
- Like/superlike fires scrobble in server logs (check terminal output)
- "Listen on Last.fm" button opens correct Last.fm URL
- No Spotify references visible in UI

- [ ] **Step 5: Push Prisma schema to production DB**

```bash
# Only if deploying — push to Vercel's Neon DB
bunx prisma db push --accept-data-loss
```

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: final typecheck and lint pass — Spotify removal complete"
```

---

## Self-Review

### Spec Coverage Check
- [x] Auth: email/password + Google kept, Spotify OAuth removed from auth config and SignIn.tsx
- [x] Playback: `useSpotifyPlayer` deleted, `PlayerCard` shows "Listen on Last.fm" button
- [x] Discovery: `discovery.ts` simplified to Last.fm-only, `chart.getTopTracks` cold-start added
- [x] Album art: `itunes.ts` created, `enrichWithAlbumArt` called in discovery pipeline
- [x] Schema: `spotifyId`, `spotifyUrl`, `previewUrl` dropped from Song; `spotifyPlaylistId` from Playlist; `musicProvider` from User
- [x] Playlist sync: `spotifyRouter` deleted, removed from `root.ts`
- [x] ProviderSwitcher: deleted, removed from dashboard
- [x] Onboarding: soft prompt only, Skip button present, `OnboardingGuard` passes through
- [x] `useSpotifyPlayer` + SDK types: deleted
- [x] `getSpotifyToken` tRPC: removed from `token.ts` and `trpc.ts` context
- [x] `DiscoveryFeedOptions`: simplified (no `provider`/`spotifyToken`)
- [x] Scrobbling: `buildScrobbleParams` helper + fire-and-forget in `swipe.recordSwipe`
- [x] Env cleanup: `AUTH_SPOTIFY_ID`/`AUTH_SPOTIFY_SECRET` removed from `env.js`
- [x] `server/spotify/` directory: deleted
- [x] `lib/services/spotify.ts`: deleted
- [x] `OnboardingGuard`: renders children unconditionally
- [x] `SignIn.tsx`: Spotify + Last.fm direct sign-in removed

### Type Consistency
- `DiscoveryTrack` (discovery.ts): `{ name, artist, url, image, externalId }` — no Spotify fields
- `DiscoveryFeedOptions` (discovery.ts): `{ lastfmUsername, swipedExternalIds, limit?, searchQuery? }`
- `SongData` (utils.ts): `{ title, artist, album?, albumArt?, lastfmUrl?, externalId }` — no Spotify fields
- `buildScrobbleParams` (swipe.ts): `(songData: { artist, title }, action) => { artist, track, timestamp } | null`
- `getChartTopTracks` (lastfm.ts): returns `LastfmChartTrack[]`
- `fetchAlbumArt` (itunes.ts): `(artist, track) => Promise<string | null>`
