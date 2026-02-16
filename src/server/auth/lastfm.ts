import crypto from "node:crypto";

const LASTFM_API_BASE = "https://ws.audioscrobbler.com/2.0";

interface LastfmApiParams {
	[key: string]: string;
}

/**
 * Generate API signature for Last.fm API calls (MD5 hash)
 * Required for all authenticated API calls
 * Exported for use in auth callback and provider
 */
export function generateApiSig(
	params: Record<string, string>,
	apiSecret: string,
): string {
	const sortedKeys = Object.keys(params).sort();
	let sigString = "";

	for (const key of sortedKeys) {
		sigString += key + params[key];
	}
	sigString += apiSecret;

	return crypto.createHash("md5").update(sigString).digest("hex");
}

/**
 * Make a request to Last.fm API (GET for reads, POST for writes)
 */
async function callLastfmApi<T>(
	method: string,
	params: LastfmApiParams,
	sessionKey?: string,
	httpMethod: "GET" | "POST" = "GET",
): Promise<T> {
	const apiKey = process.env.LASTFM_API_KEY;
	const apiSecret = process.env.LASTFM_API_SECRET;

	if (!apiKey || !apiSecret) {
		throw new Error(
			"Last.fm API credentials not configured (LASTFM_API_KEY, LASTFM_API_SECRET)",
		);
	}

	// Build API parameters (format must NOT be in the signature)
	const apiParams: LastfmApiParams = {
		api_key: apiKey,
		method: method,
		...params,
	};

	// Add session key if provided (for authenticated calls)
	if (sessionKey) {
		apiParams.sk = sessionKey;
	}

	// Generate signature for authenticated calls
	// Note: format is excluded from signature per Last.fm API spec
	if (sessionKey) {
		apiParams.api_sig = generateApiSig(apiParams, apiSecret);
	}

	// Add format after signature is computed
	apiParams.format = "json";

	let response: Response;

	if (httpMethod === "POST") {
		// Write operations: POST with params in body
		response = await fetch(LASTFM_API_BASE, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams(apiParams).toString(),
		});
	} else {
		// Read operations: GET with params in URL
		const queryString = new URLSearchParams(apiParams).toString();
		const url = `${LASTFM_API_BASE}?${queryString}`;
		response = await fetch(url, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

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

/**
 * Get user's recent tracks
 * Uses the `user` param (no auth/session key required for this read-only endpoint)
 */
export async function getRecentTracks(
	username: string,
	limit = 10,
): Promise<{
	recenttracks: {
		track: Array<{
			name: string;
			artist: { name: string };
			album: { name: string };
			image: Array<{ size: string; "#text": string }>;
			url: string;
			date?: { uts: string; "#text": string };
			loved: string;
		}>;
	};
}> {
	return callLastfmApi<{
		recenttracks: {
			track: Array<{
				name: string;
				artist: { name: string };
				album: { name: string };
				image: Array<{ size: string; "#text": string }>;
				url: string;
				date?: { uts: string; "#text": string };
				loved: string;
			}>;
		};
	}>("user.getRecentTracks", { user: username, limit: String(limit) });
}

/**
 * Get user's top tracks
 * Uses the `user` param (no auth/session key required for this read-only endpoint)
 */
export async function getTopTracks(
	username: string,
	period:
		| "overall"
		| "7day"
		| "1month"
		| "3month"
		| "6month"
		| "12month" = "overall",
	limit = 10,
): Promise<{
	toptracks: {
		track: Array<{
			name: string;
			playcount: string;
			artist: { name: string };
			image: Array<{ size: string; "#text": string }>;
			url: string;
		}>;
	};
}> {
	return callLastfmApi<{
		toptracks: {
			track: Array<{
				name: string;
				playcount: string;
				artist: { name: string };
				image: Array<{ size: string; "#text": string }>;
				url: string;
			}>;
		};
	}>("user.getTopTracks", { user: username, period, limit: String(limit) });
}

/**
 * Get similar artists to a given artist
 */
export async function getSimilarArtists(
	artistName: string,
	limit = 10,
): Promise<{
	similarartists: {
		artist: Array<{
			name: string;
			match: string;
			url: string;
			image: Array<{ size: string; "#text": string }>;
		}>;
	};
}> {
	return callLastfmApi<{
		similarartists: {
			artist: Array<{
				name: string;
				match: string;
				url: string;
				image: Array<{ size: string; "#text": string }>;
			}>;
		};
	}>("artist.getSimilar", { artist: artistName, limit: String(limit) });
}

/**
 * Get artist information
 */
export async function getArtistInfo(artistName: string): Promise<{
	artist: {
		name: string;
		url: string;
		playcount: string;
		listeners: string;
		bio: { content: string; links: { link: { text: string; href: string } } };
		image: Array<{ size: string; "#text": string }>;
	};
}> {
	return callLastfmApi<{
		artist: {
			name: string;
			url: string;
			playcount: string;
			listeners: string;
			bio: { content: string; links: { link: { text: string; href: string } } };
			image: Array<{ size: string; "#text": string }>;
		};
	}>("artist.getInfo", { artist: artistName });
}

/**
 * Get track information
 */
export async function getTrackInfo(
	trackName: string,
	artistName: string,
): Promise<{
	track: {
		name: string;
		artist: { name: string; url: string };
		url: string;
		playcount: string;
		listeners: string;
		userplaycount?: string;
		userloved: string;
		image: Array<{ size: string; "#text": string }>;
		album?: {
			artist: string;
			title: string;
			url: string;
			image: Array<{ size: string; "#text": string }>;
		};
		wiki?: { content: string };
	};
}> {
	return callLastfmApi<{
		track: {
			name: string;
			artist: { name: string; url: string };
			url: string;
			playcount: string;
			listeners: string;
			userplaycount?: string;
			userloved: string;
			image: Array<{ size: string; "#text": string }>;
			album?: {
				artist: string;
				title: string;
				url: string;
				image: Array<{ size: string; "#text": string }>;
			};
			wiki?: { content: string };
		};
	}>("track.getInfo", { track: trackName, artist: artistName });
}

/**
 * Get user's top artists
 * Uses the `user` param (no auth/session key required for this read-only endpoint)
 */
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
): Promise<{
	topartists: {
		artist: Array<{
			name: string;
			playcount: string;
			image: Array<{ size: string; "#text": string }>;
			url: string;
		}>;
	};
}> {
	return callLastfmApi<{
		topartists: {
			artist: Array<{
				name: string;
				playcount: string;
				image: Array<{ size: string; "#text": string }>;
				url: string;
			}>;
		};
	}>("user.getTopArtists", { user: username, period, limit: String(limit) });
}

/**
 * Search for tracks on Last.fm
 */
export async function searchTracks(
	query: string,
	limit = 10,
): Promise<{
	results: {
		trackmatches: {
			track: Array<{
				name: string;
				artist: string;
				url: string;
				listeners: string;
				image: Array<{ size: string; "#text": string }>;
			}>;
		};
	};
}> {
	return callLastfmApi<{
		results: {
			trackmatches: {
				track: Array<{
					name: string;
					artist: string;
					url: string;
					listeners: string;
					image: Array<{ size: string; "#text": string }>;
				}>;
			};
		};
	}>("track.search", { track: query, limit: String(limit) });
}

/**
 * Get an artist's top tracks
 */
export async function getArtistTopTracks(
	artistName: string,
	limit = 10,
): Promise<{
	toptracks: {
		track: Array<{
			name: string;
			playcount: string;
			listeners: string;
			artist: { name: string; url: string };
			image: Array<{ size: string; "#text": string }>;
			url: string;
		}>;
	};
}> {
	return callLastfmApi<{
		toptracks: {
			track: Array<{
				name: string;
				playcount: string;
				listeners: string;
				artist: { name: string; url: string };
				image: Array<{ size: string; "#text": string }>;
				url: string;
			}>;
		};
	}>("artist.getTopTracks", { artist: artistName, limit: String(limit) });
}

/**
 * Get user information
 */
export async function getUserInfo(sessionKey: string): Promise<{
	user: {
		id?: string;
		name: string;
		realname?: string;
		url: string;
		image: Array<{ size: string; "#text": string }>;
		registered: { unixtime: string };
		playcount: string;
		bootstrap: string;
		subscriber: string;
		playlists: string;
	};
}> {
	return callLastfmApi<{
		user: {
			id?: string;
			name: string;
			realname?: string;
			url: string;
			image: Array<{ size: string; "#text": string }>;
			registered: { unixtime: string };
			playcount: string;
			bootstrap: string;
			subscriber: string;
			playlists: string;
		};
	}>("user.getInfo", {}, sessionKey);
}

// ─── Write Operations (require session key + api_sig, HTTP POST) ─────────────

/**
 * Scrobble a track to a user's Last.fm profile.
 * Requires authenticated session key.
 */
export async function scrobbleTrack(
	sessionKey: string,
	params: {
		artist: string;
		track: string;
		timestamp: number;
		album?: string;
		duration?: number;
	},
): Promise<{
	scrobbles: {
		"@attr": { accepted: number; ignored: number };
	};
}> {
	const apiParams: LastfmApiParams = {
		artist: params.artist,
		track: params.track,
		timestamp: String(params.timestamp),
	};
	if (params.album) apiParams.album = params.album;
	if (params.duration) apiParams.duration = String(params.duration);

	return callLastfmApi("track.scrobble", apiParams, sessionKey, "POST");
}

/**
 * Love a track on a user's Last.fm profile.
 */
export async function loveTrack(
	sessionKey: string,
	params: { artist: string; track: string },
): Promise<Record<string, never>> {
	return callLastfmApi(
		"track.love",
		{ artist: params.artist, track: params.track },
		sessionKey,
		"POST",
	);
}

/**
 * Remove love from a track on a user's Last.fm profile.
 */
export async function unloveTrack(
	sessionKey: string,
	params: { artist: string; track: string },
): Promise<Record<string, never>> {
	return callLastfmApi(
		"track.unlove",
		{ artist: params.artist, track: params.track },
		sessionKey,
		"POST",
	);
}

/**
 * Update "now playing" status on a user's Last.fm profile.
 */
export async function updateNowPlaying(
	sessionKey: string,
	params: {
		artist: string;
		track: string;
		album?: string;
		duration?: number;
	},
): Promise<{
	nowplaying: {
		track: { corrected: string; "#text": string };
		artist: { corrected: string; "#text": string };
	};
}> {
	const apiParams: LastfmApiParams = {
		artist: params.artist,
		track: params.track,
	};
	if (params.album) apiParams.album = params.album;
	if (params.duration) apiParams.duration = String(params.duration);

	return callLastfmApi("track.updateNowPlaying", apiParams, sessionKey, "POST");
}

// ─── Auth Helper Functions (shared by provider and callback) ─────────────────

export interface LastfmProfile {
	user: {
		id?: string;
		name: string;
		realname?: string;
		url?: string;
		image?: Array<{ size: string; "#text": string }>;
		registered?: { unixtime: string };
		playcount?: string;
	};
}

/**
 * Exchange Last.fm auth token for session key
 */
export async function getSessionKey(
	token: string,
	apiKey: string,
	apiSecret: string,
): Promise<string> {
	const params: Record<string, string> = {
		api_key: apiKey,
		method: "auth.getSession",
		token: token,
	};

	const api_sig = generateApiSig(params, apiSecret);

	const queryParams = new URLSearchParams({
		...params,
		api_sig,
		format: "json",
	});

	const response = await fetch(`${LASTFM_API_BASE}?${queryParams}`, {
		method: "GET",
	});

	if (!response.ok) {
		throw new Error(
			`Failed to get Last.fm session key: ${response.statusText}`,
		);
	}

	const data = (await response.json()) as {
		session?: { key: string; user: string };
		error?: number;
		message?: string;
	};

	if (data.error) {
		throw new Error(`Last.fm API error (${data.error}): ${data.message}`);
	}

	if (!data.session?.key) {
		throw new Error("No session key returned from Last.fm");
	}

	return data.session.key;
}

/**
 * Get Last.fm user profile using session key.
 * Reuses callLastfmApi for consistent error handling.
 */
export async function getLastfmUserProfile(
	_apiKey: string,
	sessionKey: string,
): Promise<LastfmProfile> {
	return callLastfmApi<LastfmProfile>("user.getInfo", {}, sessionKey);
}
