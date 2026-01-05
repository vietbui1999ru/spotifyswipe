'use client';

import { useState, useCallback } from 'react';
import { PlaylistCard } from '@/components/PlaylistCard';
import { CreatePlaylistModal } from '@/components/CreatePlaylistModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { usePlaylists } from '@/hooks/usePlaylists';

export default function PlaylistsPage() {
  const {
    playlists,
    isLoading,
    error,
    createPlaylist,
    deletePlaylist,
    fetchPlaylists,
  } = usePlaylists();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  /**
   * Handle creating a new playlist
   */
  const handleCreatePlaylist = useCallback(
    async (name: string, description: string) => {
      setIsCreating(true);
      try {
        await createPlaylist(name, description);
        setIsCreateModalOpen(false);
      } finally {
        setIsCreating(false);
      }
    },
    [createPlaylist]
  );

  /**
   * Initiate delete confirmation
   */
  const handleDeleteClick = useCallback((playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    setDeleteConfirmOpen(true);
  }, []);

  /**
   * Confirm and delete playlist
   */
  const handleConfirmDelete = useCallback(async () => {
    if (!selectedPlaylistId) return;

    setIsDeleting(true);
    try {
      const success = await deletePlaylist(selectedPlaylistId);
      if (success) {
        setDeleteConfirmOpen(false);
        setSelectedPlaylistId(null);
      }
    } finally {
      setIsDeleting(false);
    }
  }, [selectedPlaylistId, deletePlaylist]);

  /**
   * Cancel delete
   */
  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmOpen(false);
    setSelectedPlaylistId(null);
  }, []);

  return (
    <div className="flex-1 p-8">
      <div className="max-w-6xl">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-spotify-light mb-2">
              My Playlists
            </h1>
            <p className="text-gray-400">
              {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'}
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-spotify-green text-white hover:bg-green-600 rounded-full font-semibold transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create Playlist
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green mb-4" />
              <p className="text-gray-400">Loading playlists...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-red-100 mb-8">
            <p className="font-semibold mb-2">Error</p>
            <p>{error}</p>
            <button
              onClick={fetchPlaylists}
              className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 rounded-full text-white text-sm font-semibold transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Playlists Grid */}
        {!isLoading && playlists.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {playlists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                onDelete={handleDeleteClick}
                isDeleting={isDeleting && selectedPlaylistId === playlist.id}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && playlists.length === 0 && !error && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-spotify-green/10 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-spotify-green"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.823l.07.585a.5.5 0 00.992 0l.07-.585A1 1 0 0110.153 2h2a1 1 0 011 1v14a1 1 0 01-1 1h-2.153a1 1 0 01-.986-.823l-.07-.585a.5.5 0 00-.992 0l-.07.585an1 1 0 01-.986.823H3a1 1 0 01-1-1V3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-spotify-light mb-2">
              No playlists yet
            </h2>
            <p className="text-gray-400 mb-6">
              Create your first playlist to save songs from swiping sessions.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-3 bg-spotify-green text-white hover:bg-green-600 rounded-full font-semibold transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create Your First Playlist
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreatePlaylist}
        isLoading={isCreating}
      />

      <DeleteConfirmModal
        isOpen={deleteConfirmOpen}
        title="Delete Playlist"
        message={`Are you sure you want to delete "${
          selectedPlaylistId
            ? playlists.find((p) => p.id === selectedPlaylistId)?.name ||
              'this playlist'
            : 'this playlist'
        }"? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
        danger
      />
    </div>
  );
}
