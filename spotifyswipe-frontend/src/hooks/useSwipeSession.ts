'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import apiClient from '@/lib/apiClient';

interface SwipeSessionResponse {
  success: boolean;
  data: {
    session: {
      id: string;
      likedSongIds: string[];
      dislikedSongIds: string[];
      seedTrackIds: string[];
      createdAt: string;
    };
  };
}

interface SwipeActionResponse {
  success: boolean;
  data: {
    session: {
      id: string;
      likedSongIds: string[];
      dislikedSongIds: string[];
    };
  };
}

interface UseSwipeSessionOptions {
  seedTrackIds?: string[];
  autoCreate?: boolean;
}

/**
 * Custom hook for managing swipe sessions and recording user actions.
 * Handles creation, updates, and completion of swipe sessions.
 */
export function useSwipeSession(options: UseSwipeSessionOptions = {}) {
  const { seedTrackIds = [], autoCreate = true } = options;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [likedSongIds, setLikedSongIds] = useState<string[]>([]);
  const [dislikedSongIds, setDislikedSongIds] = useState<string[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCreatingRef = useRef(false);

  /**
   * Create a new swipe session
   */
  const createSession = useCallback(async () => {
    // Prevent duplicate session creation
    if (isCreatingRef.current || sessionId) return;

    try {
      isCreatingRef.current = true;
      setIsInitializing(true);
      setError(null);

      const response = await apiClient.post<SwipeSessionResponse>(
        '/api/swipe/session',
        {
          seedTrackIds,
        }
      );

      if (!response.data.success) {
        throw new Error('Failed to create swipe session');
      }

      const session = response.data.data.session;
      setSessionId(session.id);
      setLikedSongIds(session.likedSongIds);
      setDislikedSongIds(session.dislikedSongIds);

      return session.id;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create session';
      setError(errorMessage);
      console.error('Error creating swipe session:', err);
      return null;
    } finally {
      isCreatingRef.current = false;
      setIsInitializing(false);
    }
  }, [sessionId, seedTrackIds]);

  /**
   * Record a swipe action (like or dislike)
   */
  const recordSwipe = useCallback(
    async (
      action: 'like' | 'dislike',
      songId: string
    ): Promise<boolean> => {
      if (!sessionId) {
        console.warn(
          'No active session. Recording swipe without session tracking.'
        );
        return false;
      }

      try {
        setError(null);

        const response = await apiClient.patch<SwipeActionResponse>(
          `/api/swipe/session/${sessionId}`,
          {
            action,
            songId,
          }
        );

        if (!response.data.success) {
          throw new Error('Failed to record swipe action');
        }

        const session = response.data.data.session;
        setLikedSongIds(session.likedSongIds);
        setDislikedSongIds(session.dislikedSongIds);

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to record swipe';
        setError(errorMessage);
        console.error('Error recording swipe:', err);
        return false;
      }
    },
    [sessionId]
  );

  /**
   * Like a song
   */
  const likeSong = useCallback(
    (songId: string) => recordSwipe('like', songId),
    [recordSwipe]
  );

  /**
   * Dislike a song
   */
  const dislikeSong = useCallback(
    (songId: string) => recordSwipe('dislike', songId),
    [recordSwipe]
  );

  /**
   * Complete the swipe session
   */
  const completeSession = useCallback(async () => {
    if (!sessionId) {
      return;
    }

    try {
      setError(null);

      await apiClient.post(
        `/api/swipe/session/${sessionId}/complete`,
        {}
      );

      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to complete session';
      setError(errorMessage);
      console.error('Error completing swipe session:', err);
      return false;
    }
  }, [sessionId]);

  /**
   * End session (without marking as complete)
   */
  const endSession = useCallback(() => {
    setSessionId(null);
    setLikedSongIds([]);
    setDislikedSongIds([]);
    setError(null);
  }, []);

  /**
   * Get session statistics
   */
  const getSessionStats = useCallback(
    () => ({
      sessionId,
      likedCount: likedSongIds.length,
      dislikedCount: dislikedSongIds.length,
      totalSwipes: likedSongIds.length + dislikedSongIds.length,
    }),
    [sessionId, likedSongIds.length, dislikedSongIds.length]
  );

  /**
   * Auto-create session on mount if enabled
   */
  useEffect(() => {
    if (autoCreate && !sessionId && !isCreatingRef.current) {
      createSession();
    }
  }, [autoCreate, sessionId, createSession]);

  return {
    // State
    sessionId,
    likedSongIds,
    dislikedSongIds,
    isInitializing,
    error,

    // Methods
    createSession,
    recordSwipe,
    likeSong,
    dislikeSong,
    completeSession,
    endSession,

    // Helpers
    getSessionStats,
  };
}
