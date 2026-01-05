'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PlaylistDetail } from '@/hooks/usePlaylist';
import { EditPlaylistModal } from './EditPlaylistModal';

interface PlaylistHeaderProps {
  playlist: PlaylistDetail;
  onEdit: (name: string, description: string) => Promise<void>;
  onDelete: () => void;
  isDeleting?: boolean;
  isEditing?: boolean;
}

/**
 * PlaylistHeader displays the playlist name, description, and action buttons.
 */
export function PlaylistHeader({
  playlist,
  onEdit,
  onDelete,
  isDeleting = false,
  isEditing = false,
}: PlaylistHeaderProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleEditSubmit = async (name: string, description: string) => {
    await onEdit(name, description);
    setIsEditModalOpen(false);
  };

  return (
    <>
      <div className="mb-8 pb-8 border-b border-gray-700">
        {/* Back Button */}
        <Link
          href="/dashboard/playlists"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-spotify-light transition-colors mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Playlists
        </Link>

        {/* Playlist Info */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-spotify-light mb-3">
              {playlist.name}
            </h1>

            {playlist.description && (
              <p className="text-gray-400 mb-4 max-w-2xl">
                {playlist.description}
              </p>
            )}

            <div className="text-sm text-gray-500 space-y-1">
              <p>
                {playlist.songCount} {playlist.songCount === 1 ? 'song' : 'songs'}
              </p>
              <p>
                Updated {new Date(playlist.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setIsEditModalOpen(true)}
              disabled={isEditing || isDeleting}
              className="px-4 py-2 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              aria-label="Edit playlist"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>

            <button
              onClick={onDelete}
              disabled={isDeleting || isEditing}
              className="px-4 py-2 rounded-full bg-red-900/30 hover:bg-red-900/50 disabled:bg-gray-700 disabled:cursor-not-allowed text-red-300 hover:text-red-200 font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              aria-label="Delete playlist"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                  Deleting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EditPlaylistModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditSubmit}
        initialName={playlist.name}
        initialDescription={playlist.description}
        isLoading={isEditing}
      />
    </>
  );
}
