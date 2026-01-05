'use client';

import React from 'react';

interface Genre {
  id: string;
  label: string;
  icon: string;
}

const GENRES: Genre[] = [
  { id: 'pop', label: 'Pop', icon: '🎵' },
  { id: 'rock', label: 'Rock', icon: '🎸' },
  { id: 'indie', label: 'Indie', icon: '🎹' },
  { id: 'chill', label: 'Chill', icon: '😌' },
  { id: 'party', label: 'Party', icon: '🎉' },
  { id: 'workout', label: 'Workout', icon: '💪' },
  { id: 'sleep', label: 'Sleep', icon: '😴' },
  { id: 'focus', label: 'Focus', icon: '🧠' },
  { id: 'jazz', label: 'Jazz', icon: '🎺' },
  { id: 'electronic', label: 'Electronic', icon: '🔊' },
  { id: 'hip-hop', label: 'Hip Hop', icon: '🎤' },
  { id: 'classical', label: 'Classical', icon: '🎻' }
];

interface GenreMoodSelectorProps {
  onGenreSelect: (genreId: string) => void;
  selectedGenre: string | null;
  isLoading?: boolean;
}

/**
 * GenreMoodSelector component displays a grid of genre/mood buttons
 * for users to choose from during playlist discovery.
 */
export function GenreMoodSelector({
  onGenreSelect,
  selectedGenre,
  isLoading = false
}: GenreMoodSelectorProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">
          Discover by Mood & Genre
        </h2>
        <p className="text-gray-400">
          Choose a vibe to explore curated playlists
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {GENRES.map((genre) => (
          <button
            key={genre.id}
            onClick={() => !isLoading && onGenreSelect(genre.id)}
            disabled={isLoading}
            className={`
              p-6 rounded-lg border-2 transition-all duration-200
              flex flex-col items-center gap-3
              ${
                selectedGenre === genre.id
                  ? 'border-green-500 bg-green-500/10 scale-105'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600 hover:bg-gray-700'
              }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            aria-label={`Select ${genre.label} genre`}
          >
            <span className="text-4xl" role="img" aria-hidden="true">
              {genre.icon}
            </span>
            <span className="text-lg font-semibold text-white">
              {genre.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
