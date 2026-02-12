'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Artist {
  id: string;
  name: string;
}

interface Album {
  id: string;
  name: string;
  imageUrl: string | null;
}

interface SongCardProps {
  id: string;
  name: string;
  artists: Artist[];
  album: Album;
  durationMs: number;
  previewUrl?: string | null;
  onLike?: () => void;
  onDislike?: () => void;
}

/**
 * SongCard component displays a single track with album art, metadata, and action buttons.
 * Includes audio preview playback for 30-second samples.
 */
export function SongCard({
  id,
  name,
  artists,
  album,
  durationMs,
  previewUrl,
  onLike,
  onDislike
}: SongCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Convert milliseconds to mm:ss format
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const artistNames = artists.map(a => a.name).join(', ');

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current && previewUrl) {
      const audio = new Audio(previewUrl);
      audioRef.current = audio;

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };

      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      const handleLoadStart = () => {
        setIsLoading(true);
      };

      const handleCanPlay = () => {
        setIsLoading(false);
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('loadstart', handleLoadStart);
      audio.addEventListener('canplay', handleCanPlay);

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('loadstart', handleLoadStart);
        audio.removeEventListener('canplay', handleCanPlay);
      };
    }
  }, [previewUrl]);

  // Stop audio when component unmounts or preview URL changes
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };
  }, [previewUrl]);

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(error => {
        console.error('Failed to play audio:', error);
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * audioRef.current.duration;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-spotify-gray rounded-lg overflow-hidden shadow-lg border border-gray-700 hover:border-spotify-green transition-colors duration-300">
        {/* Album Image with Play Button */}
        {album.imageUrl && (
          <div className="relative w-full aspect-square bg-gray-800 overflow-hidden group">
            <img
              src={album.imageUrl}
              alt={album.name}
              className="w-full h-full object-cover"
            />

            {/* Play Button Overlay */}
            {previewUrl && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <button
                  onClick={handlePlayPause}
                  disabled={isLoading}
                  className="w-16 h-16 rounded-full bg-spotify-green hover:bg-green-600 disabled:bg-gray-600 text-white flex items-center justify-center shadow-lg transform hover:scale-105 transition-all disabled:cursor-not-allowed"
                  aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                  ) : isPlaying ? (
                    <svg
                      className="w-8 h-8 fill-white"
                      viewBox="0 0 24 24"
                    >
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg
                      className="w-8 h-8 fill-white ml-1"
                      viewBox="0 0 24 24"
                    >
                      <polygon points="5 3 19 12 5 21" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Song Info */}
        <div className="p-6">
          <h3 className="text-xl font-bold text-spotify-light truncate mb-2">
            {name}
          </h3>
          <p className="text-gray-400 text-sm truncate mb-1">
            {artistNames}
          </p>
          <p className="text-gray-500 text-sm mb-4">
            {album.name}
          </p>

          {/* Audio Progress Bar */}
          {previewUrl && (
            <div className="mb-4">
              <div
                onClick={handleProgressClick}
                className="h-1 bg-gray-700 rounded-full cursor-pointer group"
              >
                <div
                  className="h-full bg-spotify-green rounded-full transition-all"
                  style={{
                    width: duration ? `${(currentTime / duration) * 100}%` : '0%',
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>{formatDuration(currentTime * 1000)}</span>
                <span>{duration ? formatDuration(duration * 1000) : '0:00'}</span>
              </div>
            </div>
          )}

          {/* Duration */}
          <div className="flex items-center justify-between mb-6 text-sm text-gray-400">
            <span>Duration</span>
            <span className="font-mono font-bold text-spotify-light">
              {formatDuration(durationMs)}
            </span>
          </div>

          {/* Preview Status */}
          {!previewUrl && (
            <div className="mb-4 p-2 bg-gray-800 rounded text-xs text-gray-400 text-center">
              Preview not available
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onDislike}
              className="flex-1 py-2 px-4 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors font-semibold text-sm"
            >
              ✕ Skip
            </button>
            <button
              onClick={onLike}
              className="flex-1 py-2 px-4 rounded-full bg-spotify-green text-white hover:bg-green-600 transition-colors font-semibold text-sm"
            >
              ♥ Like
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
