'use client';

import React from 'react';

export interface PlaylistItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  trackCount: number;
  owner: string;
  followerCount: number;
}

interface PlaylistBrowserProps {
  playlists: PlaylistItem[];
  isLoading: boolean;
  onPlaylistSelect: (playlistId: string, playlistName: string) => void;
  onBack: () => void;
  selectedGenre: string;
  error?: string | null;
}

/**
 * PlaylistBrowser component displays search results as playlist cards
 * in a responsive grid layout.
 */
export function PlaylistBrowser({
  playlists,
  isLoading,
  onPlaylistSelect,
  onBack,
  selectedGenre,
  error
}: PlaylistBrowserProps) {
  const formatFollowers = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors flex-shrink-0"
          aria-label="Go back"
          disabled={isLoading}
        >
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div>
          <h2 className="text-3xl font-bold text-white capitalize">
            {selectedGenre} Playlists
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {isLoading ? 'Loading...' : `${playlists.length} playlists found`}
          </p>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-100">
          <p className="font-semibold mb-2">Error Loading Playlists</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, idx) => (
            <div
              key={idx}
              className="bg-gray-800 rounded-lg p-4 animate-pulse"
            >
              <div className="w-full aspect-square bg-gray-700 rounded-lg mb-4"></div>
              <div className="h-6 bg-gray-700 rounded mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      )}

      {/* Playlist Grid */}
      {!isLoading && playlists.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => onPlaylistSelect(playlist.id, playlist.name)}
              className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-all duration-200 text-left group text-white"
            >
              {/* Playlist Image */}
              <div className="relative w-full aspect-square mb-4 overflow-hidden rounded-lg bg-gray-700">
                {playlist.imageUrl ? (
                  <img
                    src={playlist.imageUrl}
                    alt={playlist.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <svg
                      className="w-16 h-16 text-gray-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Playlist Info */}
              <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-green-500 transition-colors">
                {playlist.name}
              </h3>

              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>{playlist.trackCount} tracks</span>
                {playlist.followerCount > 0 && (
                  <span>{formatFollowers(playlist.followerCount)} followers</span>
                )}
              </div>

              {playlist.description && (
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                  {playlist.description}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && playlists.length === 0 && !error && (
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 text-gray-600 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-gray-400 text-lg mb-2">No playlists found</p>
          <p className="text-gray-500 text-sm">Try selecting a different genre</p>
        </div>
      )}
    </div>
  );
}
