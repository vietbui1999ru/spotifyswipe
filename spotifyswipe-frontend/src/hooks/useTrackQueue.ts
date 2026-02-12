'use client';

import { useState, useCallback, useRef } from 'react';
import apiClient from '@/lib/apiClient';

export interface Track {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
  durationMs: number;
  previewUrl?: string | null;
  popularity: number;
}

interface RecommendationsResponse {
  success: boolean;
  data: {
    tracks: Track[];
  };
}

interface UseTrackQueueOptions {
  mode?: 'recommendations' | 'playlist';
  playlistId?: string;
  initialLimit?: number;
  refillThreshold?: number;
  seedGenres?: string;
  seedTrackIds?: string;
  seedArtistIds?: string;
}

/**
 * Custom hook for managing a queue of tracks with auto-refill functionality.
 * Handles fetching recommendations and maintaining a pool of tracks for swiping.
 */
export function useTrackQueue(options: UseTrackQueueOptions = {}) {
  const {
    mode = 'recommendations',
    playlistId,
    initialLimit = 20,
    refillThreshold = 5,
    seedGenres = 'pop,rock,indie',
    seedTrackIds = '',
    seedArtistIds = ''
  } = options;

  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [playlistName, setPlaylistName] = useState<string>('');
  const isFetchingRef = useRef(false);

  /**
   * Fetch a batch of recommendations or playlist tracks from the API
   */
  const fetchTracks = useCallback(
    async (limit: number = initialLimit, append: boolean = false) => {
      // Prevent duplicate simultaneous requests
      if (isFetchingRef.current) return;

      try {
        isFetchingRef.current = true;
        setError(null);

        if (mode === 'playlist' && playlistId) {
          // Fetch from playlist endpoint
          const response = await apiClient.get<{
            success: boolean;
            data: {
              playlistId: string;
              playlistName: string;
              tracks: Track[];
              total: number;
              hasMore: boolean;
            };
          }>(`/api/spotify/playlists/${playlistId}/tracks`);

          if (!response.data.success) {
            throw new Error('Failed to fetch playlist tracks');
          }

          const newTracks = response.data.data.tracks || [];
          setPlaylistName(response.data.data.playlistName);

          // For playlist mode, load all at once (no append)
          setTracks(newTracks);
          setCurrentIndex(0);
          setHasMore(false); // Playlists have finite tracks, no auto-refill
        } else {
          // Fetch recommendations
          const params: Record<string, string | number> = {
            limit,
          };

          // Add seed parameters if provided
          if (seedTrackIds) params.seedTrackIds = seedTrackIds;
          if (seedArtistIds) params.seedArtistIds = seedArtistIds;
          if (seedGenres) params.seedGenres = seedGenres;

          const response = await apiClient.get<RecommendationsResponse>(
            '/api/spotify/search',
            { params }
          );

          if (!response.data.success) {
            throw new Error('Failed to fetch recommendations');
          }

          const newTracks = response.data.data.tracks || [];

          if (newTracks.length === 0) {
            setHasMore(false);
            return;
          }

          // Filter out tracks without preview URLs
          const tracksWithPreview = newTracks.filter(
            (track) => track.previewUrl !== null
          );

          if (append) {
            setTracks((prev) => [...prev, ...tracksWithPreview]);
          } else {
            setTracks(tracksWithPreview);
            setCurrentIndex(0);
          }
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load tracks';
        setError(errorMessage);
        console.error('Error fetching tracks:', err);
      } finally {
        isFetchingRef.current = false;
      }
    },
    [mode, playlistId, initialLimit, seedTrackIds, seedArtistIds, seedGenres]
  );

  /**
   * Move to the next track and trigger refill if needed
   */
  const nextTrack = useCallback(async () => {
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);

    // Only auto-refill in recommendations mode
    if (mode === 'recommendations') {
      const remainingTracks = tracks.length - newIndex;
      if (remainingTracks <= refillThreshold && hasMore && !isFetchingRef.current) {
        await fetchTracks(initialLimit, true);
      }
    }
  }, [mode, currentIndex, tracks.length, refillThreshold, hasMore, fetchTracks, initialLimit]);

  /**
   * Move to the previous track
   */
  const prevTrack = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  /**
   * Get the current track
   */
  const getCurrentTrack = useCallback((): Track | null => {
    if (currentIndex >= 0 && currentIndex < tracks.length) {
      return tracks[currentIndex];
    }
    return null;
  }, [tracks, currentIndex]);

  /**
   * Get next N tracks for queue preview
   */
  const getNextTracks = useCallback(
    (count: number = 3): Track[] => {
      const nextIndex = currentIndex + 1;
      return tracks.slice(nextIndex, nextIndex + count);
    },
    [tracks, currentIndex]
  );

  /**
   * Reset the queue
   */
  const resetQueue = useCallback(() => {
    setTracks([]);
    setCurrentIndex(0);
    setError(null);
    setHasMore(true);
    isFetchingRef.current = false;
  }, []);

  /**
   * Check if at the end of queue
   */
  const isAtEnd = currentIndex >= tracks.length - 1;

  /**
   * Get queue statistics
   */
  const getQueueStats = useCallback(() => ({
    total: tracks.length,
    current: currentIndex + 1,
    remaining: Math.max(0, tracks.length - currentIndex - 1),
  }), [tracks.length, currentIndex]);

  return {
    // State
    tracks,
    currentIndex,
    isLoading,
    error,
    hasMore,
    playlistName,
    mode,

    // Methods
    fetchTracks,
    nextTrack,
    prevTrack,
    getCurrentTrack,
    getNextTracks,
    resetQueue,

    // Helpers
    isAtEnd,
    getQueueStats,
  };
}
