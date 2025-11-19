import { useState, useRef, useCallback, useEffect } from 'react';
import type { Song } from '@/types/spotify';

export function useAudioPlayer(song: Song | null) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!audioRef.current) {
      audioRef.current = new Audio();

      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      });

      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current?.duration || 0);
      });

      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  useEffect(() => {
    if (!song || !audioRef.current) return;

    const newSrc = song.previewUrl || song.fullUrl;
    if (newSrc && audioRef.current.src !== newSrc) {
      audioRef.current.src = newSrc;
      setCurrentTime(0);
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      }
    }
  }, [song, isPlaying]);

  const play = useCallback(() => {
    if (!audioRef.current || !song?.previewUrl) return;

    audioRef.current.play().then(() => {
      setIsPlaying(true);
    }).catch(console.error);
  }, [song]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;

    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const skipForward = useCallback((seconds: number = 10) => {
    if (!audioRef.current) return;

    const newTime = Math.min(audioRef.current.currentTime + seconds, duration);
    seek(newTime);
  }, [duration, seek]);

  const skipBackward = useCallback((seconds: number = 10) => {
    if (!audioRef.current) return;

    const newTime = Math.max(audioRef.current.currentTime - seconds, 0);
    seek(newTime);
  }, [seek]);

  const setVolume = useCallback((volume: number) => {
    if (!audioRef.current) return;

    audioRef.current.volume = Math.max(0, Math.min(1, volume));
  }, []);

  return {
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    toggle,
    seek,
    skipForward,
    skipBackward,
    setVolume,
  };
}
