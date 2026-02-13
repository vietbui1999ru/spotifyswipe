import type { SpotifyTrack } from "./types";

/**
 * Generate a stable externalId from a Spotify track.
 * Uses `spotify:{trackId}` format to distinguish from Last.fm IDs.
 */
export function spotifyTrackToExternalId(track: SpotifyTrack): string {
	return `spotify:${track.id}`;
}

/**
 * Map a Spotify track to the data shape used for Song upserts.
 */
export function mapSpotifyTrackToSongData(track: SpotifyTrack) {
	return {
		title: track.name,
		artist: track.artists.map((a) => a.name).join(", "),
		album: track.album.name,
		albumArt: track.album.images[0]?.url ?? null,
		spotifyId: track.id,
		spotifyUrl: track.external_urls.spotify,
		previewUrl: track.preview_url,
		duration: Math.round(track.duration_ms / 1000),
		externalId: spotifyTrackToExternalId(track),
	};
}
