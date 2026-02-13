const DEEZER_API_BASE = "https://api.deezer.com";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DeezerArtist {
	id: number;
	name: string;
	link: string;
	picture_medium: string;
	picture_big: string;
}

export interface DeezerAlbum {
	id: number;
	title: string;
	cover_medium: string;
	cover_big: string;
}

export interface DeezerTrack {
	id: number;
	title: string;
	duration: number;
	preview: string;
	link: string;
	artist: DeezerArtist;
	album: DeezerAlbum;
}

interface DeezerSearchResponse {
	data: DeezerTrack[];
	total: number;
	next?: string;
}

// ─── API Functions ──────────────────────────────────────────────────────────

/**
 * Search for a track on Deezer. No authentication required.
 */
export async function searchTrack(
	query: string,
	limit = 5,
): Promise<DeezerTrack[]> {
	const params = new URLSearchParams({
		q: query,
		limit: String(limit),
	});

	const response = await fetch(`${DEEZER_API_BASE}/search/track?${params}`);

	if (!response.ok) {
		console.warn("[Deezer] Search failed:", response.status);
		return [];
	}

	const data = (await response.json()) as DeezerSearchResponse;
	return data.data ?? [];
}

/**
 * Get a 30-second preview URL for a track by searching artist + title.
 * Returns null if no match found.
 */
export async function getPreviewUrl(
	artist: string,
	title: string,
): Promise<string | null> {
	const tracks = await searchTrack(`${artist} ${title}`, 1);
	return tracks[0]?.preview ?? null;
}

/**
 * Search and return the best-matching Deezer track for an artist + title combo.
 * Returns null if no match found.
 */
export async function findTrack(
	artist: string,
	title: string,
): Promise<DeezerTrack | null> {
	const tracks = await searchTrack(`${artist} ${title}`, 1);
	return tracks[0] ?? null;
}
