'use client';

import React, { useState } from 'react';
import { Track } from '@/hooks/useTrackQueue';

interface PlaylistSongListProps {
  songs: Track[];
  onRemoveSong: (songId: string) => Promise<void>;
  isRemoving?: boolean;
}

/**
 * PlaylistSongList displays all songs in a playlist with remove buttons and playback controls.
 */
export function PlaylistSongList({
  songs,
  onRemoveSong,
  isRemoving = false,
}: PlaylistSongListProps) {
  const [removingSongId, setRemovingSongId] = useState<string | null>(null);
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [audioRefMap] = React.useState<Map<string, HTMLAudioElement>>(new Map());

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleRemove = async (songId: string) => {
    setRemovingSongId(songId);
    try {
      await onRemoveSong(songId);
      // Stop playing if it was the song being removed
      if (playingSongId === songId) {
        const audio = audioRefMap.get(songId);
        if (audio) {
          audio.pause();
          setPlayingSongId(null);
        }
      }
    } finally {
      setRemovingSongId(null);
    }
  };

  const handlePlayPause = (songId: string, previewUrl: string | null | undefined) => {
    if (!previewUrl) return;

    if (playingSongId === songId) {
      // Stop playing
      const audio = audioRefMap.get(songId);
      if (audio) {
        audio.pause();
        setPlayingSongId(null);
      }
    } else {
      // Stop other songs
      if (playingSongId) {
        const otherAudio = audioRefMap.get(playingSongId);
        if (otherAudio) {
          otherAudio.pause();
        }
      }

      // Play this song
      let audio = audioRefMap.get(songId);
      if (!audio) {
        audio = new Audio(previewUrl);
        audioRefMap.set(songId, audio);

        audio.addEventListener('ended', () => {
          setPlayingSongId(null);
        });
      }

      audio.play().catch((error) => {
        console.error('Failed to play audio:', error);
        setPlayingSongId(null);
      });

      setPlayingSongId(songId);
    }
  };

  if (songs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-300 mb-2">No songs yet</h3>
        <p className="text-gray-500">
          Add songs from your swipe sessions to build this playlist.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {songs.map((song, index) => (
        <div
          key={song.id}
          className="flex items-center gap-4 p-3 bg-gray-800/40 rounded-lg hover:bg-gray-800/60 transition-colors group"
        >
          {/* Album Art / Play Button */}
          <div className="relative flex-shrink-0">
            {song.album.imageUrl ? (
              <img
                src={song.album.imageUrl}
                alt={song.album.name}
                className="w-12 h-12 rounded object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded bg-gray-700 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-gray-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M18 3a1 1 0 00-1.196-.15l-1.559 1.03A7 7 0 5020 13V6a3 3 0 00-3-3z" />
                </svg>
              </div>
            )}

            {song.previewUrl && (
              <button
                onClick={() => handlePlayPause(song.id, song.previewUrl)}
                className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors rounded"
                aria-label={playingSongId === song.id ? 'Pause preview' : 'Play preview'}
              >
                <div className="w-6 h-6 rounded-full bg-spotify-green flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {playingSongId === song.id ? (
                    <svg className="w-3 h-3 fill-white" viewBox="0 0 24 24">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 fill-white ml-0.5" viewBox="0 0 24 24">
                      <polygon points="5 3 19 12 5 21" />
                    </svg>
                  )}
                </div>
              </button>
            )}
          </div>

          {/* Song Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-spotify-light truncate">
              {index + 1}. {song.name}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {song.artists.map((a) => a.name).join(', ')}
            </p>
          </div>

          {/* Duration */}
          <span className="text-xs text-gray-500 flex-shrink-0 hidden sm:inline">
            {formatDuration(song.durationMs)}
          </span>

          {/* Remove Button */}
          <button
            onClick={() => handleRemove(song.id)}
            disabled={isRemoving || removingSongId === song.id}
            className="text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            aria-label="Remove from playlist"
          >
            {removingSongId === song.id ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
