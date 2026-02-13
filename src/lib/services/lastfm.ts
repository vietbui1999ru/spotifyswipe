/**
 * Client-side Last.fm API wrapper.
 * Uses NEXT_PUBLIC_LASTFM_API_KEY (public, appears in URL params by design).
 * Read-only calls only — no session key needed.
 */

import { env } from "~/env";

const LASTFM_API_BASE = "https://ws.audioscrobbler.com/2.0";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LastfmImage {
	size: string;
	"#text": string;
}

export interface LastfmTrackMatch {
	name: string;
	artist: string;
	url: string;
	listeners: string;
	image: LastfmImage[];
}

export interface LastfmTrackInfo {
	name: string;
	artist: { name: string; url: string };
	url: string;
	playcount: string;
	listeners: string;
	userplaycount?: string;
	userloved: string;
	image: LastfmImage[];
	album?: {
		artist: string;
		title: string;
		url: string;
		image: LastfmImage[];
	};
	wiki?: { content: string };
}

export interface LastfmArtist {
	name: string;
	playcount: string;
	image: LastfmImage[];
	url: string;
}

export interface LastfmSimilarArtist {
	name: string;
	match: string;
	url: string;
	image: LastfmImage[];
}

export interface LastfmArtistTrack {
	name: string;
	playcount: string;
	listeners: string;
	artist: { name: string; url: string };
	image: LastfmImage[];
	url: string;
}

// ─── Generic Caller ─────────────────────────────────────────────────────────

async function callLastfm<T>(
	method: string,
	params: Record<string, string>,
): Promise<T> {
	const apiKey = env.NEXT_PUBLIC_LASTFM_API_KEY;

	const queryParams = new URLSearchParams({
		api_key: apiKey,
		method,
		format: "json",
		...params,
	});

	const response = await fetch(`${LASTFM_API_BASE}?${queryParams}`);

	if (!response.ok) {
		throw new Error(
			`Last.fm API error: ${response.status} ${response.statusText}`,
		);
	}

	const data = (await response.json()) as {
		error?: number;
		message?: string;
	} & T;

	if (data.error) {
		throw new Error(`Last.fm API error: ${data.message}`);
	}

	return data;
}

// ─── Search ─────────────────────────────────────────────────────────────────

export async function searchTracks(
	query: string,
	limit = 10,
): Promise<LastfmTrackMatch[]> {
	const result = await callLastfm<{
		results: { trackmatches: { track: LastfmTrackMatch[] } };
	}>("track.search", { track: query, limit: String(limit) });

	return result.results?.trackmatches?.track ?? [];
}

// ─── Track Info ─────────────────────────────────────────────────────────────

export async function getTrackInfo(
	track: string,
	artist: string,
): Promise<LastfmTrackInfo> {
	const result = await callLastfm<{ track: LastfmTrackInfo }>("track.getInfo", {
		track,
		artist,
	});
	return result.track;
}

// ─── Discovery (artists) ───────────────────────────────────────────────────

export async function getTopArtists(
	username: string,
	period:
		| "overall"
		| "7day"
		| "1month"
		| "3month"
		| "6month"
		| "12month" = "overall",
	limit = 10,
): Promise<LastfmArtist[]> {
	const result = await callLastfm<{
		topartists: { artist: LastfmArtist[] };
	}>("user.getTopArtists", { user: username, period, limit: String(limit) });

	return result.topartists?.artist ?? [];
}

export async function getSimilarArtists(
	artist: string,
	limit = 10,
): Promise<LastfmSimilarArtist[]> {
	const result = await callLastfm<{
		similarartists: { artist: LastfmSimilarArtist[] };
	}>("artist.getSimilar", { artist, limit: String(limit) });

	return result.similarartists?.artist ?? [];
}

export async function getArtistTopTracks(
	artist: string,
	limit = 10,
): Promise<LastfmArtistTrack[]> {
	const result = await callLastfm<{
		toptracks: { track: LastfmArtistTrack[] };
	}>("artist.getTopTracks", { artist, limit: String(limit) });

	return result.toptracks?.track ?? [];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Extract the best image URL from a Last.fm image array */
export function getImageUrl(images: LastfmImage[] | undefined): string | null {
	if (!images) return null;
	return (
		images.find((img) => img.size === "large")?.["#text"] ||
		images[0]?.["#text"] ||
		null
	);
}
