import { env } from "~/env";
import { db } from "~/server/db";
import { AppError, ErrorCode } from "~/server/errors";
import { createLogger } from "~/server/logger";
import type {
	SpotifyAlbumSimplified,
	SpotifyArtist,
	SpotifyPaginated,
	SpotifyPlaybackState,
	SpotifyPlaylist,
	SpotifyRecentlyPlayed,
	SpotifySearchResult,
	SpotifyTrack,
	SpotifyUser,
} from "./types";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

const log = createLogger("spotify-api");

/**
 * Refresh a Spotify access token using the refresh_token grant
 */
async function refreshSpotifyToken(refreshToken: string): Promise<{
	access_token: string;
	expires_in: number;
	refresh_token?: string;
}> {
	const response = await fetch(SPOTIFY_TOKEN_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: `Basic ${Buffer.from(`${env.AUTH_SPOTIFY_ID}:${env.AUTH_SPOTIFY_SECRET}`).toString("base64")}`,
		},
		body: new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: refreshToken,
		}),
	});

	if (!response.ok) {
		const text = await response.text();
		log.error("Failed to refresh Spotify token", {
			status: response.status,
			body: text,
		});
		throw new AppError(
			ErrorCode.SPOTIFY_API_ERROR,
			"Failed to refresh Spotify token",
		);
	}

	return response.json() as Promise<{
		access_token: string;
		expires_in: number;
		refresh_token?: string;
	}>;
}

/**
 * Get a valid Spotify access token for a user.
 * Refreshes automatically if expired.
 */
export async function getSpotifyToken(userId: string): Promise<string> {
	const account = await db.account.findFirst({
		where: { userId, providerId: "spotify" },
		select: {
			accessToken: true,
			refreshToken: true,
			accessTokenExpiresAt: true,
			id: true,
		},
	});

	if (!account?.accessToken || !account.refreshToken) {
		throw new AppError(ErrorCode.AUTH_FAILED, "Spotify account not connected");
	}

	// Check if token is expired (with 60s buffer)
	const now = new Date();
	const bufferMs = 60 * 1000;
	if (
		account.accessTokenExpiresAt &&
		account.accessTokenExpiresAt.getTime() > now.getTime() + bufferMs
	) {
		return account.accessToken;
	}

	// Token expired — refresh it
	log.info("Refreshing expired Spotify token", { userId });
	const refreshed = await refreshSpotifyToken(account.refreshToken);

	await db.account.update({
		where: { id: account.id },
		data: {
			accessToken: refreshed.access_token,
			accessTokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
			...(refreshed.refresh_token
				? { refreshToken: refreshed.refresh_token }
				: {}),
		},
	});

	return refreshed.access_token;
}

/**
 * Generic Spotify API caller with Bearer auth
 */
async function callSpotifyApi<T>(
	endpoint: string,
	accessToken: string,
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
			Authorization: `Bearer ${accessToken}`,
			...(body ? { "Content-Type": "application/json" } : {}),
		},
		...(body ? { body: JSON.stringify(body) } : {}),
	});

	// 204 No Content (e.g. playback control)
	if (response.status === 204) {
		return {} as T;
	}

	if (!response.ok) {
		const text = await response.text();
		log.error("Spotify API error", {
			endpoint,
			status: response.status,
			body: text,
		});
		throw new AppError(
			ErrorCode.SPOTIFY_API_ERROR,
			`Spotify API error: ${response.status} on ${endpoint}`,
		);
	}

	return response.json() as Promise<T>;
}

// ─── Exported API Functions ─────────────────────────────────────────────────

export async function searchSpotify(
	accessToken: string,
	query: string,
	limit = 20,
): Promise<SpotifySearchResult> {
	return callSpotifyApi<SpotifySearchResult>("/search", accessToken, {
		params: { q: query, type: "track", limit: String(limit) },
	});
}

export async function getCurrentPlayback(
	accessToken: string,
): Promise<SpotifyPlaybackState | null> {
	try {
		return await callSpotifyApi<SpotifyPlaybackState>(
			"/me/player",
			accessToken,
		);
	} catch {
		// 204 or no active device returns empty
		return null;
	}
}

export async function startPlayback(
	accessToken: string,
	options: {
		uris?: string[];
		context_uri?: string;
		offset?: { position: number };
	} = {},
): Promise<void> {
	await callSpotifyApi("/me/player/play", accessToken, {
		method: "PUT",
		body: options,
	});
}

export async function pausePlayback(accessToken: string): Promise<void> {
	await callSpotifyApi("/me/player/pause", accessToken, { method: "PUT" });
}

export async function skipToNext(accessToken: string): Promise<void> {
	await callSpotifyApi("/me/player/next", accessToken, { method: "POST" });
}

export async function getUserPlaylists(
	accessToken: string,
	limit = 20,
	offset = 0,
): Promise<SpotifyPaginated<SpotifyPlaylist>> {
	return callSpotifyApi<SpotifyPaginated<SpotifyPlaylist>>(
		"/me/playlists",
		accessToken,
		{
			params: { limit: String(limit), offset: String(offset) },
		},
	);
}

export async function createSpotifyPlaylist(
	accessToken: string,
	name: string,
	description?: string,
	isPublic = false,
): Promise<SpotifyPlaylist> {
	return callSpotifyApi<SpotifyPlaylist>("/me/playlists", accessToken, {
		method: "POST",
		body: { name, description: description ?? "", public: isPublic },
	});
}

export async function addTracksToPlaylist(
	accessToken: string,
	playlistId: string,
	uris: string[],
): Promise<{ snapshot_id: string }> {
	return callSpotifyApi<{ snapshot_id: string }>(
		`/playlists/${playlistId}/items`,
		accessToken,
		{ method: "POST", body: { uris } },
	);
}

export async function getSpotifyUserProfile(
	accessToken: string,
): Promise<SpotifyUser> {
	return callSpotifyApi<SpotifyUser>("/me", accessToken);
}

export async function getRecentlyPlayed(
	accessToken: string,
	limit = 20,
): Promise<SpotifyRecentlyPlayed> {
	return callSpotifyApi<SpotifyRecentlyPlayed>(
		"/me/player/recently-played",
		accessToken,
		{ params: { limit: String(limit) } },
	);
}

export async function getTrack(
	accessToken: string,
	trackId: string,
): Promise<SpotifyTrack> {
	return callSpotifyApi<SpotifyTrack>(`/tracks/${trackId}`, accessToken);
}

export async function getTopArtistsSpotify(
	accessToken: string,
	timeRange: "short_term" | "medium_term" | "long_term" = "medium_term",
	limit = 5,
): Promise<SpotifyPaginated<SpotifyArtist>> {
	return callSpotifyApi<SpotifyPaginated<SpotifyArtist>>(
		"/me/top/artists",
		accessToken,
		{ params: { time_range: timeRange, limit: String(limit) } },
	);
}

export async function getTopTracksSpotify(
	accessToken: string,
	timeRange: "short_term" | "medium_term" | "long_term" = "medium_term",
	limit = 20,
): Promise<SpotifyPaginated<SpotifyTrack>> {
	return callSpotifyApi<SpotifyPaginated<SpotifyTrack>>(
		"/me/top/tracks",
		accessToken,
		{ params: { time_range: timeRange, limit: String(limit) } },
	);
}

export async function getArtistAlbums(
	accessToken: string,
	artistId: string,
	limit = 10,
	includeGroups = "album,single",
): Promise<SpotifyPaginated<SpotifyAlbumSimplified>> {
	return callSpotifyApi<SpotifyPaginated<SpotifyAlbumSimplified>>(
		`/artists/${artistId}/albums`,
		accessToken,
		{
			params: {
				include_groups: includeGroups,
				limit: String(limit),
			},
		},
	);
}

export async function getAlbumTracks(
	accessToken: string,
	albumId: string,
	limit = 50,
): Promise<SpotifyPaginated<SpotifyTrack>> {
	return callSpotifyApi<SpotifyPaginated<SpotifyTrack>>(
		`/albums/${albumId}/tracks`,
		accessToken,
		{ params: { limit: String(limit) } },
	);
}
