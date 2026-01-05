'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/apiClient';
import { Track } from './useTrackQueue';

export interface Playlist {
  id: string;
  name: string;
  description: string;
  songCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistDetail extends Playlist {
  songs: Track[];
  songIds: string[];
}

interface CreatePlaylistResponse {
  success: boolean;
  data: {
    playlist: Playlist;
  };
}

interface PlaylistDetailResponse {
  success: boolean;
  data: {
    playlist: PlaylistDetail;
  };
}

interface UpdatePlaylistResponse {
  success: boolean;
  data: {
    playlist: Playlist;
  };
}

interface PlaylistsListResponse {
  success: boolean;
  data: {
    playlists: Playlist[];
  };
}

interface UsePlaylistOptions {
  playlistId?: string;
}

/**
 * Custom hook for managing single playlist operations.
 * Handles fetching, creating, updating, and deleting playlists.
 */
export function usePlaylist(options: UsePlaylistOptions = {}) {
  const { playlistId } = options;

  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch playlist details by ID
   */
  const fetchPlaylist = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get<PlaylistDetailResponse>(
        `/api/playlists/${id}`
      );

      if (!response.data.success) {
        throw new Error('Failed to fetch playlist');
      }

      setPlaylist(response.data.data.playlist);
      return response.data.data.playlist;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch playlist';
      setError(errorMessage);
      console.error('Error fetching playlist:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create a new playlist
   */
  const createPlaylist = useCallback(
    async (name: string, description: string = '') => {
      try {
        setError(null);

        const response = await apiClient.post<CreatePlaylistResponse>(
          '/api/playlists',
          { name, description }
        );

        if (!response.data.success) {
          throw new Error('Failed to create playlist');
        }

        return response.data.data.playlist;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create playlist';
        setError(errorMessage);
        console.error('Error creating playlist:', err);
        return null;
      }
    },
    []
  );

  /**
   * Update playlist metadata
   */
  const updatePlaylist = useCallback(
    async (id: string, name: string, description: string = '') => {
      try {
        setError(null);

        const response = await apiClient.patch<UpdatePlaylistResponse>(
          `/api/playlists/${id}`,
          { name, description }
        );

        if (!response.data.success) {
          throw new Error('Failed to update playlist');
        }

        if (playlist && playlist.id === id) {
          setPlaylist({
            ...playlist,
            name: response.data.data.playlist.name,
            description: response.data.data.playlist.description,
          });
        }

        return response.data.data.playlist;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update playlist';
        setError(errorMessage);
        console.error('Error updating playlist:', err);
        return null;
      }
    },
    [playlist]
  );

  /**
   * Delete playlist by ID
   */
  const deletePlaylist = useCallback(async (id: string) => {
    try {
      setError(null);

      const response = await apiClient.delete(`/api/playlists/${id}`);

      if (!response.data.success) {
        throw new Error('Failed to delete playlist');
      }

      if (playlist && playlist.id === id) {
        setPlaylist(null);
      }

      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete playlist';
      setError(errorMessage);
      console.error('Error deleting playlist:', err);
      return false;
    }
  }, [playlist]);

  /**
   * Add a song to the playlist
   */
  const addSong = useCallback(
    async (playlistId: string, songId: string) => {
      try {
        setError(null);

        const response = await apiClient.post(
          `/api/playlists/${playlistId}/songs`,
          { songId }
        );

        if (!response.data.success) {
          throw new Error('Failed to add song');
        }

        // Refresh playlist if this is the current one
        if (playlist && playlist.id === playlistId) {
          await fetchPlaylist(playlistId);
        }

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to add song';
        setError(errorMessage);
        console.error('Error adding song:', err);
        return false;
      }
    },
    [playlist, fetchPlaylist]
  );

  /**
   * Remove a song from the playlist
   */
  const removeSong = useCallback(
    async (playlistId: string, songId: string) => {
      try {
        setError(null);

        const response = await apiClient.delete(
          `/api/playlists/${playlistId}/songs/${songId}`
        );

        if (!response.data.success) {
          throw new Error('Failed to remove song');
        }

        // Update local state if this is the current playlist
        if (playlist && playlist.id === playlistId) {
          setPlaylist({
            ...playlist,
            songs: playlist.songs.filter((song) => song.id !== songId),
            songIds: playlist.songIds.filter((id) => id !== songId),
            songCount: playlist.songCount - 1,
          });
        }

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to remove song';
        setError(errorMessage);
        console.error('Error removing song:', err);
        return false;
      }
    },
    [playlist]
  );

  /**
   * Add multiple songs to the playlist
   */
  const addMultipleSongs = useCallback(
    async (playlistId: string, songIds: string[]) => {
      try {
        setError(null);

        const results = await Promise.all(
          songIds.map((songId) =>
            apiClient.post(`/api/playlists/${playlistId}/songs`, { songId })
          )
        );

        const allSuccessful = results.every((r) => r.data.success);
        if (!allSuccessful) {
          throw new Error('Failed to add some songs');
        }

        // Refresh playlist if this is the current one
        if (playlist && playlist.id === playlistId) {
          await fetchPlaylist(playlistId);
        }

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to add songs';
        setError(errorMessage);
        console.error('Error adding songs:', err);
        return false;
      }
    },
    [playlist, fetchPlaylist]
  );

  // Auto-fetch playlist if playlistId is provided
  // (handled by the component using this hook)

  return {
    // State
    playlist,
    isLoading,
    error,

    // Methods
    fetchPlaylist,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addSong,
    removeSong,
    addMultipleSongs,
  };
}
