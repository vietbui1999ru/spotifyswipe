'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import apiClient from '@/lib/apiClient';
import { Playlist } from './usePlaylist';

interface PlaylistsListResponse {
  success: boolean;
  data: {
    playlists: Playlist[];
  };
}

/**
 * Custom hook for managing the list of user playlists.
 * Handles fetching, creating, and deleting playlists with list refresh.
 */
export function usePlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  /**
   * Fetch all user playlists
   */
  const fetchPlaylists = useCallback(async () => {
    // Prevent duplicate simultaneous requests
    if (isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get<PlaylistsListResponse>(
        '/api/playlists'
      );

      if (!response.data.success) {
        throw new Error('Failed to fetch playlists');
      }

      setPlaylists(response.data.data.playlists);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch playlists';
      setError(errorMessage);
      console.error('Error fetching playlists:', err);
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  /**
   * Create a new playlist and add it to the list
   */
  const createPlaylist = useCallback(
    async (name: string, description: string = '') => {
      try {
        setError(null);

        const response = await apiClient.post('/api/playlists', {
          name,
          description,
        });

        if (!response.data.success) {
          throw new Error('Failed to create playlist');
        }

        const newPlaylist = response.data.data.playlist;
        setPlaylists((prev) => [newPlaylist, ...prev]);
        return newPlaylist;
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
   * Delete a playlist and remove it from the list
   */
  const deletePlaylist = useCallback(async (playlistId: string) => {
    try {
      setError(null);

      const response = await apiClient.delete(`/api/playlists/${playlistId}`);

      if (!response.data.success) {
        throw new Error('Failed to delete playlist');
      }

      setPlaylists((prev) =>
        prev.filter((playlist) => playlist.id !== playlistId)
      );
      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete playlist';
      setError(errorMessage);
      console.error('Error deleting playlist:', err);
      return false;
    }
  }, []);

  /**
   * Add multiple songs to a playlist and refresh the list
   */
  const addSongsToPlaylist = useCallback(
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

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to add songs';
        setError(errorMessage);
        console.error('Error adding songs:', err);
        return false;
      }
    },
    []
  );

  /**
   * Fetch playlists on mount
   */
  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  return {
    // State
    playlists,
    isLoading,
    error,

    // Methods
    fetchPlaylists,
    createPlaylist,
    deletePlaylist,
    addSongsToPlaylist,
  };
}
