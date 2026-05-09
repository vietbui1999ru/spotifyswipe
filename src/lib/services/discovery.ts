/**
 * Client-side discovery feed pipeline.
 * Last.fm-only: cold-start via chart.getTopTracks, personalized via user history,
 * search-based via track.search. iTunes enriches album art.
 */

import { fetchAlbumArt } from "./itunes";
import * as lastfm from "./lastfm";

// ─── Types ──────────────────────────────────────────────────────────────────

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

async function enrichWithAlbumArt(
	candidates: DiscoveryTrack[],
): Promise<void> {
	const toEnrich = candidates.filter((c) => !c.image).slice(0, 15);
	await processBatches(toEnrich, 5, async (candidate) => {
		const art = await fetchAlbumArt(candidate.artist, candidate.name);
		if (art) candidate.image = art;
	});
}

// ─── Cold-Start (no account) ─────────────────────────────────────────────────

async function getColdStartFeed(): Promise<DiscoveryTrack[]> {
	const tracks = await lastfm.getChartTopTracks(50);
	const candidates: DiscoveryTrack[] = tracks.map((track) => {
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
	await enrichWithAlbumArt(candidates);
	return candidates;
}

// ─── Personalized (Last.fm account) ─────────────────────────────────────────

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

// ─── Search-Based ────────────────────────────────────────────────────────────

async function getSearchBasedFeed(query: string): Promise<DiscoveryTrack[]> {
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

// ─── Main Entry Point ────────────────────────────────────────────────────────

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
