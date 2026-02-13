/**
 * Client-side discovery feed pipeline.
 * Orchestrates Spotify/Last.fm services to generate track candidates,
 * enriches with Deezer previews, and filters already-swiped tracks.
 */

import * as deezer from "./deezer";
import * as lastfm from "./lastfm";
import * as spotify from "./spotify";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DiscoveryTrack {
	name: string;
	artist: string;
	url: string;
	image: string | null;
	externalId: string;
	spotifyId?: string;
	spotifyUrl?: string;
	previewUrl?: string;
	deezerPreviewUrl?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Process items in batches to avoid rate limits */
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

// ─── Spotify Discovery Pipeline ─────────────────────────────────────────────

export async function getSpotifyDiscoveryFeed(
	spotifyToken: string,
): Promise<DiscoveryTrack[]> {
	const topArtists = await spotify.getTopArtists(
		spotifyToken,
		"medium_term",
		5,
	);
	const artists = topArtists.items;

	if (artists.length === 0) return [];

	// Fetch albums for each artist
	const albumResults = await Promise.all(
		artists.map((artist) =>
			spotify
				.getArtistAlbums(spotifyToken, artist.id, 5, "album,single")
				.catch(() => ({
					items: [] as spotify.SpotifyAlbumSimplified[],
					total: 0,
					limit: 0,
					offset: 0,
					next: null,
					previous: null,
				})),
		),
	);

	const allAlbums = albumResults.flatMap((r) => r.items);
	const shuffledAlbums = allAlbums.sort(() => Math.random() - 0.5);
	const albumsToFetch = shuffledAlbums.slice(0, 8);

	// Fetch tracks from selected albums
	const trackResults = await processBatches(albumsToFetch, 5, (album) =>
		spotify.getAlbumTracks(spotifyToken, album.id, 10).catch(() => ({
			items: [] as spotify.SpotifyTrack[],
			total: 0,
			limit: 0,
			offset: 0,
			next: null,
			previous: null,
		})),
	);

	const candidates: DiscoveryTrack[] = [];
	const seenIds = new Set<string>();

	for (let i = 0; i < trackResults.length; i++) {
		const parentAlbum = albumsToFetch[i];
		for (const track of trackResults[i]?.items ?? []) {
			const externalId = `spotify:${track.id}`;
			if (!seenIds.has(externalId)) {
				seenIds.add(externalId);
				candidates.push({
					name: track.name,
					artist: track.artists.map((a) => a.name).join(", "),
					url: track.external_urls.spotify,
					image: parentAlbum?.images[0]?.url ?? null,
					externalId,
					spotifyId: track.id,
					spotifyUrl: track.external_urls.spotify,
				});
			}
		}
	}

	return candidates;
}

// ─── Last.fm Discovery Pipeline ─────────────────────────────────────────────

export async function getLastfmDiscoveryFeed(
	lastfmUsername: string,
	spotifyToken: string | null,
): Promise<DiscoveryTrack[]> {
	const topArtists = await lastfm.getTopArtists(lastfmUsername, "3month", 5);

	if (topArtists.length === 0) return [];

	// Get similar artists
	const similarResults = await Promise.all(
		topArtists
			.slice(0, 3)
			.map((artist) =>
				lastfm
					.getSimilarArtists(artist.name, 3)
					.catch(() => [] as lastfm.LastfmSimilarArtist[]),
			),
	);

	const similarArtistNames = new Set<string>();
	for (const artists of similarResults) {
		for (const artist of artists) {
			similarArtistNames.add(artist.name);
		}
	}

	// Get top tracks from similar artists
	const artistsToFetch = Array.from(similarArtistNames).slice(0, 5);
	const trackResults = await Promise.all(
		artistsToFetch.map((artist) =>
			lastfm
				.getArtistTopTracks(artist, 5)
				.catch(() => [] as lastfm.LastfmArtistTrack[]),
		),
	);

	const candidates: DiscoveryTrack[] = [];
	const seenIds = new Set<string>();

	for (const tracks of trackResults) {
		for (const track of tracks) {
			const artistName =
				typeof track.artist === "object"
					? track.artist.name
					: String(track.artist);
			const externalId = `${artistName}:${track.name}`.toLowerCase();
			if (!seenIds.has(externalId)) {
				seenIds.add(externalId);
				candidates.push({
					name: track.name,
					artist: artistName,
					url: track.url,
					image: lastfm.getImageUrl(track.image),
					externalId,
				});
			}
		}
	}

	// Enrich with Spotify album art and metadata (if token available)
	if (spotifyToken) {
		await processBatches(candidates, 5, async (candidate) => {
			try {
				const result = await spotify.search(
					spotifyToken,
					`${candidate.name} ${candidate.artist}`,
					1,
				);
				const firstTrack = result.tracks?.items?.[0];
				if (firstTrack) {
					const albumImage = firstTrack.album?.images?.[0]?.url;
					if (albumImage) candidate.image = albumImage;
					candidate.spotifyId = firstTrack.id;
					candidate.spotifyUrl = firstTrack.external_urls?.spotify ?? undefined;
				}
			} catch {
				// Non-blocking enrichment
			}
		});
	}

	return candidates;
}

// ─── Deezer Preview Enrichment ──────────────────────────────────────────────

/**
 * Enrich discovery tracks with Deezer 30s preview URLs.
 * Non-blocking — tracks without a match keep previewUrl undefined.
 */
export async function enrichWithDeezerPreviews(
	tracks: DiscoveryTrack[],
): Promise<DiscoveryTrack[]> {
	await processBatches(tracks, 5, async (track) => {
		try {
			const result = await deezer.findTrack(track.artist, track.name);
			if (result) {
				track.deezerPreviewUrl = result.preview;
				// Also use Deezer album art if we don't have one
				if (!track.image && result.album.cover_big) {
					track.image = result.album.cover_big;
				}
			}
		} catch {
			// Non-blocking
		}
	});
	return tracks;
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

export interface DiscoveryFeedOptions {
	provider: "spotify" | "lastfm";
	spotifyToken: string | null;
	lastfmUsername: string | null;
	swipedExternalIds: Set<string>;
	limit?: number;
}

/**
 * Generate a discovery feed: fetch candidates, enrich with Deezer previews,
 * filter already-swiped, shuffle, and limit.
 */
export async function getDiscoveryFeed(
	options: DiscoveryFeedOptions,
): Promise<DiscoveryTrack[]> {
	const {
		provider,
		spotifyToken,
		lastfmUsername,
		swipedExternalIds,
		limit = 20,
	} = options;

	let candidates: DiscoveryTrack[];

	if (provider === "spotify" && spotifyToken) {
		candidates = await getSpotifyDiscoveryFeed(spotifyToken);
	} else if (provider === "lastfm" && lastfmUsername) {
		candidates = await getLastfmDiscoveryFeed(lastfmUsername, spotifyToken);
	} else {
		return [];
	}

	// Enrich with Deezer previews
	await enrichWithDeezerPreviews(candidates);

	// Filter out already-swiped
	const filtered = candidates.filter(
		(c) => !swipedExternalIds.has(c.externalId),
	);

	// Shuffle and limit
	const shuffled = filtered.sort(() => Math.random() - 0.5);
	return shuffled.slice(0, limit);
}
