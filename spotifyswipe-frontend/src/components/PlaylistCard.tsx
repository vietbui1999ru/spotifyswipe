'use client';

import React from 'react';
import Link from 'next/link';
import { Playlist } from '@/hooks/usePlaylist';

interface PlaylistCardProps {
  playlist: Playlist;
  onDelete?: (playlistId: string) => void;
  isDeleting?: boolean;
}

/**
 * PlaylistCard displays a single playlist in a grid/list view.
 * Shows playlist name, description, song count, and delete button.
 */
export function PlaylistCard({
  playlist,
  onDelete,
  isDeleting = false,
}: PlaylistCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onDelete && !isDeleting) {
      onDelete(playlist.id);
    }
  };

  return (
    <Link
      href={`/dashboard/playlists/${playlist.id}`}
      className="block group"
    >
      <div className="bg-spotify-gray rounded-lg overflow-hidden shadow-lg border border-gray-700 hover:border-spotify-green transition-all duration-300 h-full hover:shadow-xl hover:shadow-spotify-green/20">
        {/* Playlist Cover with Placeholder */}
        <div className="relative w-full aspect-square bg-gradient-to-br from-spotify-green/20 to-spotify-dark flex items-center justify-center overflow-hidden group-hover:from-spotify-green/30 group-hover:to-spotify-dark transition-colors">
          <div className="text-center">
            <svg
              className="w-16 h-16 text-spotify-green/60 mx-auto mb-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.823l.07.585a.5.5 0 00.992 0l.07-.585A1 1 0 0110.153 2h2a1 1 0 011 1v14a1 1 0 01-1 1h-2.153a1 1 0 01-.986-.823l-.07-.585a.5.5 0 00-.992 0l-.07.585an1 1 0 01-.986.823H3a1 1 0 01-1-1V3z" />
            </svg>
            <span className="text-xs text-gray-500">Playlist</span>
          </div>
        </div>

        {/* Playlist Info */}
        <div className="p-4">
          <h3 className="text-lg font-bold text-spotify-light truncate mb-1 group-hover:text-spotify-green transition-colors">
            {playlist.name}
          </h3>

          {playlist.description && (
            <p className="text-sm text-gray-400 line-clamp-2 mb-3">
              {playlist.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {playlist.songCount} {playlist.songCount === 1 ? 'song' : 'songs'}
            </p>

            {onDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-xs px-2 py-1 rounded-full bg-red-900/30 hover:bg-red-900/50 disabled:bg-gray-700 disabled:cursor-not-allowed text-red-300 hover:text-red-200 transition-colors font-medium"
                aria-label="Delete playlist"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
