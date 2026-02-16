/**
 * Client-side Spotify Web API wrapper.
 * All functions take an access token param (fetched via token.getSpotifyToken tRPC).
 */

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SpotifyImage {
	url: string;
	height: number | null;
	width: number | null;
}

export interface SpotifyArtist {
	id: string;
	name: string;
	uri: string;
	external_urls: { spotify: string };
	images?: SpotifyImage[];
}

export interface SpotifyAlbum {
	id: string;
	name: string;
	uri: string;
	external_urls: { spotify: string };
	images: SpotifyImage[];
	release_date: string;
	artists: SpotifyArtist[];
}

export interface SpotifyAlbumSimplified {
	id: string;
	name: string;
	uri: string;
	external_urls: { spotify: string };
	images: SpotifyImage[];
	release_date: string;
	album_type: string;
	total_tracks: number;
}

export interface SpotifyTrack {
	id: string;
	name: string;
	uri: string;
	duration_ms: number;
	preview_url: string | null;
	external_urls: { spotify: string };
	artists: SpotifyArtist[];
	album: SpotifyAlbum;
	is_playable?: boolean;
}

export interface SpotifyPaginated<T> {
	items: T[];
	total: number;
	limit: number;
	offset: number;
	next: string | null;
	previous: string | null;
}

export interface SpotifySearchResult {
	tracks?: SpotifyPaginated<SpotifyTrack>;
}

export interface SpotifyPlaybackState {
	is_playing: boolean;
	progress_ms: number | null;
	item: SpotifyTrack | null;
	device: {
		id: string;
		name: string;
		type: string;
		volume_percent: number;
	};
	shuffle_state: boolean;
	repeat_state: string;
}

export interface SpotifyRecentlyPlayed {
	items: Array<{
		track: SpotifyTrack;
		played_at: string;
	}>;
	next: string | null;
}

export interface SpotifyPlaylist {
	id: string;
	name: string;
	description: string | null;
	public: boolean;
	external_urls: { spotify: string };
	images: SpotifyImage[];
	owner: { id: string; display_name: string | null };
	items: { total: number };
}

// ─── Generic Caller ─────────────────────────────────────────────────────────

async function callSpotify<T>(
	endpoint: string,
	token: string,
	options: {
		method?: string;
		body?: unknown;
		params?: Record<string, string>;
	} = {},
): Promise<T> {
	const { method = "GET", body, params } = options;
	let url = `${SPOTIFY_API_BASE}${endpoint}`;

	if (params) {
		url += `?${new URLSearchParams(params).toString()}`;
	}

	const response = await fetch(url, {
		method,
		headers: {
			Authorization: `Bearer ${token}`,
			...(body ? { "Content-Type": "application/json" } : {}),
		},
		...(body ? { body: JSON.stringify(body) } : {}),
	});

	if (response.status === 204) {
		return {} as T;
	}

	if (!response.ok) {
		const text = await response.text();
		throw new Error(
			`Spotify API error: ${response.status} on ${endpoint} - ${text}`,
		);
	}

	return response.json() as Promise<T>;
}

// ─── Search ─────────────────────────────────────────────────────────────────

export async function search(
	token: string,
	query: string,
	limit = 20,
): Promise<SpotifySearchResult> {
	return callSpotify<SpotifySearchResult>("/search", token, {
		params: { q: query, type: "track", limit: String(limit) },
	});
}

// ─── Discovery ──────────────────────────────────────────────────────────────

export async function getTopArtists(
	token: string,
	timeRange: "short_term" | "medium_term" | "long_term" = "medium_term",
	limit = 5,
): Promise<SpotifyPaginated<SpotifyArtist>> {
	return callSpotify<SpotifyPaginated<SpotifyArtist>>(
		"/me/top/artists",
		token,
		{ params: { time_range: timeRange, limit: String(limit) } },
	);
}

export async function getArtistAlbums(
	token: string,
	artistId: string,
	limit = 10,
	includeGroups = "album,single",
): Promise<SpotifyPaginated<SpotifyAlbumSimplified>> {
	return callSpotify<SpotifyPaginated<SpotifyAlbumSimplified>>(
		`/artists/${artistId}/albums`,
		token,
		{ params: { include_groups: includeGroups, limit: String(limit) } },
	);
}

export async function getAlbumTracks(
	token: string,
	albumId: string,
	limit = 50,
): Promise<SpotifyPaginated<SpotifyTrack>> {
	return callSpotify<SpotifyPaginated<SpotifyTrack>>(
		`/albums/${albumId}/tracks`,
		token,
		{ params: { limit: String(limit) } },
	);
}

// ─── Playback ───────────────────────────────────────────────────────────────

export async function getPlayback(
	token: string,
): Promise<SpotifyPlaybackState | null> {
	try {
		return await callSpotify<SpotifyPlaybackState>("/me/player", token);
	} catch {
		return null;
	}
}

export async function play(
	token: string,
	options: {
		uris?: string[];
		context_uri?: string;
		offset?: { position: number };
	} = {},
	deviceId?: string,
): Promise<void> {
	await callSpotify("/me/player/play", token, {
		method: "PUT",
		body: options,
		...(deviceId ? { params: { device_id: deviceId } } : {}),
	});
}

export async function pause(token: string, deviceId?: string): Promise<void> {
	await callSpotify("/me/player/pause", token, {
		method: "PUT",
		...(deviceId ? { params: { device_id: deviceId } } : {}),
	});
}

export async function skip(token: string): Promise<void> {
	await callSpotify("/me/player/next", token, { method: "POST" });
}

// ─── Playlists ──────────────────────────────────────────────────────────────

export async function getPlaylists(
	token: string,
	limit = 20,
	offset = 0,
): Promise<SpotifyPaginated<SpotifyPlaylist>> {
	return callSpotify<SpotifyPaginated<SpotifyPlaylist>>(
		"/me/playlists",
		token,
		{ params: { limit: String(limit), offset: String(offset) } },
	);
}

export async function createPlaylist(
	token: string,
	name: string,
	description?: string,
	isPublic = false,
): Promise<SpotifyPlaylist> {
	return callSpotify<SpotifyPlaylist>("/me/playlists", token, {
		method: "POST",
		body: { name, description: description ?? "", public: isPublic },
	});
}

// ─── Recently Played ────────────────────────────────────────────────────────

export async function getRecentlyPlayed(
	token: string,
	limit = 20,
): Promise<SpotifyRecentlyPlayed> {
	return callSpotify<SpotifyRecentlyPlayed>(
		"/me/player/recently-played",
		token,
		{ params: { limit: String(limit) } },
	);
}
