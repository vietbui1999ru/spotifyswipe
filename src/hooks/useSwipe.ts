import { useState, useCallback } from 'react';
import type { Song, SwipeSession, SeedPattern, SeedFrequency, SeedCategory, SeedMood } from '@/types/spotify';

export function useSwipe(initialSongs: Song[]) {
  const [session, setSession] = useState<SwipeSession>({
    songs: initialSongs,
    currentIndex: 0,
    likedSongs: [],
    dislikedSongs: [],
  });

  const currentSong = session.songs[session.currentIndex] || null;
  const hasNext = session.currentIndex < session.songs.length - 1;
  const hasPrev = session.currentIndex > 0;

  const likeSong = useCallback(() => {
    if (!currentSong) return;

    setSession(prev => ({
      ...prev,
      likedSongs: [...prev.likedSongs, currentSong],
      currentIndex: Math.min(prev.currentIndex + 1, prev.songs.length - 1),
    }));
  }, [currentSong]);

  const dislikeSong = useCallback(() => {
    if (!currentSong) return;

    setSession(prev => ({
      ...prev,
      dislikedSongs: [...prev.dislikedSongs, currentSong],
      currentIndex: Math.min(prev.currentIndex + 1, prev.songs.length - 1),
    }));
  }, [currentSong]);

  const nextSong = useCallback(() => {
    setSession(prev => ({
      ...prev,
      currentIndex: Math.min(prev.currentIndex + 1, prev.songs.length - 1),
    }));
  }, []);

  const prevSong = useCallback(() => {
    setSession(prev => ({
      ...prev,
      currentIndex: Math.max(prev.currentIndex - 1, 0),
    }));
  }, []);

  const goToSong = useCallback((index: number) => {
    setSession(prev => ({
      ...prev,
      currentIndex: Math.max(0, Math.min(index, prev.songs.length - 1)),
    }));
  }, []);

  const setSeedParameters = useCallback((params: {
    seedPattern?: SeedPattern;
    seedFrequency?: SeedFrequency;
    seedCategory?: SeedCategory;
    seedMood?: SeedMood;
  }) => {
    setSession(prev => ({
      ...prev,
      ...params,
    }));
  }, []);

  const resetSession = useCallback(() => {
    setSession({
      songs: initialSongs,
      currentIndex: 0,
      likedSongs: [],
      dislikedSongs: [],
    });
  }, [initialSongs]);

  return {
    currentSong,
    currentIndex: session.currentIndex,
    totalSongs: session.songs.length,
    likedSongs: session.likedSongs,
    dislikedSongs: session.dislikedSongs,
    hasNext,
    hasPrev,
    likeSong,
    dislikeSong,
    nextSong,
    prevSong,
    goToSong,
    setSeedParameters,
    resetSession,
    seedPattern: session.seedPattern,
    seedFrequency: session.seedFrequency,
    seedCategory: session.seedCategory,
    seedMood: session.seedMood,
  };
}
