/**
 * Spotify API Integration
 * This module provides functions to interact with the Spotify Web API
 */

import type { Song, Artist, Album } from '@/types/spotify';

const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1';

/**
 * Make authenticated request to Spotify API
 */
async function spotifyFetch(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${SPOTIFY_API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Spotify API error: ${error.error?.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Get current user's profile
 */
export async function getCurrentUserProfile(accessToken: string): Promise<SpotifyApi.CurrentUsersProfileResponse> {
  return spotifyFetch('/me', accessToken);
}

/**
 * Get user's top tracks
 */
export async function getUserTopTracks(
  accessToken: string,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  limit = 20
): Promise<SpotifyApi.UsersTopTracksResponse> {
  return spotifyFetch(
    `/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
    accessToken
  );
}

/**
 * Get user's top artists
 */
export async function getUserTopArtists(
  accessToken: string,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  limit = 20
): Promise<SpotifyApi.UsersTopArtistsResponse> {
  return spotifyFetch(
    `/me/top/artists?time_range=${timeRange}&limit=${limit}`,
    accessToken
  );
}

/**
 * Get recommendations based on seed tracks, artists, and genres
 */
export async function getRecommendations(
  accessToken: string,
  params: {
    seedTracks?: string[];
    seedArtists?: string[];
    seedGenres?: string[];
    limit?: number;
    targetEnergy?: number;
    targetValence?: number;
    targetDanceability?: number;
  }
): Promise<SpotifyApi.RecommendationsFromSeedsResponse> {
  const queryParams = new URLSearchParams();

  if (params.seedTracks?.length) {
    queryParams.append('seed_tracks', params.seedTracks.slice(0, 5).join(','));
  }
  if (params.seedArtists?.length) {
    queryParams.append('seed_artists', params.seedArtists.slice(0, 5).join(','));
  }
  if (params.seedGenres?.length) {
    queryParams.append('seed_genres', params.seedGenres.slice(0, 5).join(','));
  }
  if (params.limit) {
    queryParams.append('limit', params.limit.toString());
  }
  if (params.targetEnergy !== undefined) {
    queryParams.append('target_energy', params.targetEnergy.toString());
  }
  if (params.targetValence !== undefined) {
    queryParams.append('target_valence', params.targetValence.toString());
  }
  if (params.targetDanceability !== undefined) {
    queryParams.append('target_danceability', params.targetDanceability.toString());
  }

  return spotifyFetch(`/recommendations?${queryParams.toString()}`, accessToken);
}

/**
 * Get track details
 */
export async function getTrack(accessToken: string, trackId: string): Promise<SpotifyApi.SingleTrackResponse> {
  return spotifyFetch(`/tracks/${trackId}`, accessToken);
}

/**
 * Get multiple tracks
 */
export async function getTracks(accessToken: string, trackIds: string[]): Promise<SpotifyApi.MultipleTracksResponse> {
  const ids = trackIds.slice(0, 50).join(','); // Max 50 tracks
  return spotifyFetch(`/tracks?ids=${ids}`, accessToken);
}

/**
 * Get track audio features
 */
export async function getTrackAudioFeatures(
  accessToken: string,
  trackId: string
): Promise<SpotifyApi.AudioFeaturesResponse> {
  return spotifyFetch(`/audio-features/${trackId}`, accessToken);
}

/**
 * Search for tracks, artists, albums, or playlists
 */
export async function search(
  accessToken: string,
  query: string,
  types: ('track' | 'artist' | 'album' | 'playlist')[],
  limit = 20
): Promise<SpotifyApi.SearchResponse> {
  const typeString = types.join(',');
  const encodedQuery = encodeURIComponent(query);
  return spotifyFetch(
    `/search?q=${encodedQuery}&type=${typeString}&limit=${limit}`,
    accessToken
  );
}

/**
 * Get user's playlists
 */
export async function getUserPlaylists(
  accessToken: string,
  limit = 50,
  offset = 0
): Promise<SpotifyApi.ListOfUsersPlaylistsResponse> {
  return spotifyFetch(`/me/playlists?limit=${limit}&offset=${offset}`, accessToken);
}

/**
 * Get playlist details
 */
export async function getPlaylist(
  accessToken: string,
  playlistId: string
): Promise<SpotifyApi.SinglePlaylistResponse> {
  return spotifyFetch(`/playlists/${playlistId}`, accessToken);
}

/**
 * Create a new playlist
 */
export async function createPlaylist(
  accessToken: string,
  userId: string,
  name: string,
  description: string,
  isPublic = true
): Promise<SpotifyApi.CreatePlaylistResponse> {
  return spotifyFetch(`/users/${userId}/playlists`, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      name,
      description,
      public: isPublic,
    }),
  });
}

/**
 * Add tracks to playlist
 */
export async function addTracksToPlaylist(
  accessToken: string,
  playlistId: string,
  trackUris: string[]
): Promise<SpotifyApi.AddTracksToPlaylistResponse> {
  return spotifyFetch(`/playlists/${playlistId}/tracks`, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      uris: trackUris,
    }),
  });
}

/**
 * Remove tracks from playlist
 */
export async function removeTracksFromPlaylist(
  accessToken: string,
  playlistId: string,
  trackUris: string[]
): Promise<SpotifyApi.RemoveTracksFromPlaylistResponse> {
  return spotifyFetch(`/playlists/${playlistId}/tracks`, accessToken, {
    method: 'DELETE',
    body: JSON.stringify({
      tracks: trackUris.map(uri => ({ uri })),
    }),
  });
}

/**
 * Get user's recently played tracks
 */
export async function getRecentlyPlayed(
  accessToken: string,
  limit = 50
): Promise<SpotifyApi.UsersRecentlyPlayedTracksResponse> {
  return spotifyFetch(`/me/player/recently-played?limit=${limit}`, accessToken);
}

/**
 * Get available genre seeds
 */
export async function getAvailableGenreSeeds(accessToken: string): Promise<SpotifyApi.AvailableGenreSeedsResponse> {
  return spotifyFetch('/recommendations/available-genre-seeds', accessToken);
}

/**
 * Get current playback state
 */
export async function getCurrentPlayback(accessToken: string): Promise<SpotifyApi.CurrentPlaybackResponse | null> {
  try {
    return await spotifyFetch('/me/player', accessToken);
  } catch (error) {
    // Returns 204 No Content when no active device
    return null;
  }
}

/**
 * Start/Resume playback
 */
export async function startPlayback(
  accessToken: string,
  deviceId?: string,
  contextUri?: string,
  uris?: string[],
  offset?: number
): Promise<void> {
  const params = deviceId ? `?device_id=${deviceId}` : '';
  const body: any = {};

  if (contextUri) body.context_uri = contextUri;
  if (uris) body.uris = uris;
  if (offset !== undefined) body.offset = { position: offset };

  return spotifyFetch(`/me/player/play${params}`, accessToken, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * Pause playback
 */
export async function pausePlayback(accessToken: string, deviceId?: string): Promise<void> {
  const params = deviceId ? `?device_id=${deviceId}` : '';
  return spotifyFetch(`/me/player/pause${params}`, accessToken, {
    method: 'PUT',
  });
}

/**
 * Skip to next track
 */
export async function skipToNext(accessToken: string, deviceId?: string): Promise<void> {
  const params = deviceId ? `?device_id=${deviceId}` : '';
  return spotifyFetch(`/me/player/next${params}`, accessToken, {
    method: 'POST',
  });
}

/**
 * Skip to previous track
 */
export async function skipToPrevious(accessToken: string, deviceId?: string): Promise<void> {
  const params = deviceId ? `?device_id=${deviceId}` : '';
  return spotifyFetch(`/me/player/previous${params}`, accessToken, {
    method: 'POST',
  });
}

/**
 * Convert Spotify track to app Song type
 */
export function convertSpotifyTrackToSong(track: SpotifyApi.TrackObjectFull): Song {
  return {
    id: track.id,
    name: track.name,
    artists: track.artists.map(artist => ({
      id: artist.id,
      name: artist.name,
      imageUrl: '', // Artist images require separate API call
      followers: 0,
    })),
    album: {
      id: track.album.id,
      name: track.album.name,
      imageUrl: track.album.images[0]?.url || '',
      releaseDate: track.album.release_date,
      artists: track.album.artists.map(artist => ({
        id: artist.id,
        name: artist.name,
        imageUrl: '',
        followers: 0,
      })),
    },
    duration: Math.floor(track.duration_ms / 1000),
    previewUrl: track.preview_url,
    fullUrl: track.uri,
    imageUrl: track.album.images[0]?.url || '',
    genres: [], // Genres require audio features or artist details
    popularity: track.popularity,
  };
}

/**
 * Convert Spotify artist to app Artist type
 */
export function convertSpotifyArtist(artist: SpotifyApi.ArtistObjectFull): Artist {
  return {
    id: artist.id,
    name: artist.name,
    imageUrl: artist.images[0]?.url || '',
    followers: artist.followers.total,
  };
}
