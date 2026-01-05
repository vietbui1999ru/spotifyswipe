'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePlaylist } from '@/hooks/usePlaylist';
import { PlaylistHeader } from '@/components/PlaylistHeader';
import { PlaylistSongList } from '@/components/PlaylistSongList';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';

export default function PlaylistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const playlistId = params.id as string;

  const {
    playlist,
    isLoading,
    error,
    fetchPlaylist,
    updatePlaylist,
    deletePlaylist,
    removeSong,
  } = usePlaylist();

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isRemovingSong, setIsRemovingSong] = useState(false);

  /**
   * Fetch playlist on mount and when ID changes
   */
  useEffect(() => {
    if (playlistId) {
      fetchPlaylist(playlistId);
    }
  }, [playlistId, fetchPlaylist]);

  /**
   * Handle editing playlist
   */
  const handleEditPlaylist = useCallback(
    async (name: string, description: string) => {
      setIsEditing(true);
      try {
        await updatePlaylist(playlistId, name, description);
      } finally {
        setIsEditing(false);
      }
    },
    [playlistId, updatePlaylist]
  );

  /**
   * Initiate delete confirmation
   */
  const handleDeleteClick = useCallback(() => {
    setDeleteConfirmOpen(true);
  }, []);

  /**
   * Confirm and delete playlist
   */
  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const success = await deletePlaylist(playlistId);
      if (success) {
        setDeleteConfirmOpen(false);
        // Redirect to playlists list
        router.push('/dashboard/playlists');
      }
    } finally {
      setIsDeleting(false);
    }
  }, [playlistId, deletePlaylist, router]);

  /**
   * Handle removing song from playlist
   */
  const handleRemoveSong = useCallback(
    async (songId: string) => {
      setIsRemovingSong(true);
      try {
        await removeSong(playlistId, songId);
      } finally {
        setIsRemovingSong(false);
      }
    },
    [playlistId, removeSong]
  );

  /**
   * Loading state
   */
  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green mb-4" />
            <p className="text-gray-400">Loading playlist...</p>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Error state
   */
  if (error) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-4xl">
          <a
            href="/dashboard/playlists"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-spotify-light transition-colors mb-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Playlists
          </a>

          <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-red-100">
            <p className="font-semibold mb-2">Error</p>
            <p>{error}</p>
            <button
              onClick={() => fetchPlaylist(playlistId)}
              className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 rounded-full text-white text-sm font-semibold transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Playlist not found
   */
  if (!playlist) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-4xl">
          <a
            href="/dashboard/playlists"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-spotify-light transition-colors mb-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Playlists
          </a>

          <div className="text-center py-12">
            <p className="text-gray-400">Playlist not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl">
        {/* Header */}
        <PlaylistHeader
          playlist={playlist}
          onEdit={handleEditPlaylist}
          onDelete={handleDeleteClick}
          isDeleting={isDeleting}
          isEditing={isEditing}
        />

        {/* Songs Section */}
        <div>
          <h2 className="text-2xl font-bold text-spotify-light mb-6">
            Songs
          </h2>
          <PlaylistSongList
            songs={playlist.songs}
            onRemoveSong={handleRemoveSong}
            isRemoving={isRemovingSong}
          />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteConfirmOpen}
        title="Delete Playlist"
        message={`Are you sure you want to delete "${playlist.name}"? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
        isLoading={isDeleting}
        danger
      />
    </div>
  );
}
