'use client';

import React, { useState, useCallback } from 'react';
import { Playlist } from '@/hooks/usePlaylist';
import { CreatePlaylistModal } from './CreatePlaylistModal';

interface SaveToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  songIds: string[];
  onSave: (playlistIds: string[]) => Promise<void>;
  onCreatePlaylist?: (name: string, description: string) => Promise<Playlist | null>;
  isLoading?: boolean;
}

/**
 * SaveToPlaylistModal allows users to select one or more playlists to save liked songs to.
 */
export function SaveToPlaylistModal({
  isOpen,
  onClose,
  playlists,
  songIds,
  onSave,
  onCreatePlaylist,
  isLoading = false,
}: SaveToPlaylistModalProps) {
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<Set<string>>(
    new Set()
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleTogglePlaylist = useCallback((playlistId: string) => {
    setSelectedPlaylistIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(playlistId)) {
        newSet.delete(playlistId);
      } else {
        newSet.add(playlistId);
      }
      return newSet;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (selectedPlaylistIds.size === 0) {
      setError('Select at least one playlist');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const playlistIds = Array.from(selectedPlaylistIds);
      await onSave(playlistIds);
      setSelectedPlaylistIds(new Set());
      onClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to save songs';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [selectedPlaylistIds, onSave, onClose]);

  const handleCreatePlaylist = useCallback(
    async (name: string, description: string) => {
      if (!onCreatePlaylist) return;

      try {
        const newPlaylist = await onCreatePlaylist(name, description);
        if (newPlaylist) {
          setSelectedPlaylistIds(new Set([newPlaylist.id]));
          setIsCreateModalOpen(false);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create playlist';
        setError(errorMessage);
      }
    },
    [onCreatePlaylist]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-spotify-gray rounded-lg shadow-xl max-w-md w-full border border-gray-700 flex flex-col max-h-96">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-spotify-light">
            Save to Playlists
          </h2>
          <button
            onClick={onClose}
            disabled={isSaving || isLoading}
            className="text-gray-400 hover:text-spotify-light transition-colors disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {/* Info */}
          <p className="text-sm text-gray-400 mb-4">
            Saving {songIds.length} {songIds.length === 1 ? 'song' : 'songs'} to:
          </p>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-200 text-sm mb-4">
              {error}
            </div>
          )}

          {/* Playlists List */}
          {playlists.length > 0 ? (
            <div className="space-y-2 mb-4">
              {playlists.map((playlist) => (
                <label
                  key={playlist.id}
                  className="flex items-center gap-3 p-3 bg-spotify-dark rounded-lg hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedPlaylistIds.has(playlist.id)}
                    onChange={() => handleTogglePlaylist(playlist.id)}
                    disabled={isSaving || isLoading}
                    className="w-4 h-4 rounded border-gray-600 text-spotify-green focus:ring-spotify-green cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-spotify-light truncate">
                      {playlist.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {playlist.songCount} {playlist.songCount === 1 ? 'song' : 'songs'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No playlists yet</p>
            </div>
          )}

          {/* Create New Playlist Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            disabled={isSaving || isLoading}
            className="w-full py-2 px-4 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:cursor-not-allowed text-gray-300 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create New Playlist
          </button>
        </div>

        {/* Footer - Action Buttons */}
        <div className="flex gap-3 p-6 border-t border-gray-700 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isSaving || isLoading}
            className="flex-1 px-4 py-2 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading || selectedPlaylistIds.size === 0}
            className="flex-1 px-4 py-2 rounded-full bg-spotify-green text-white hover:bg-green-600 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>

      {/* Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreatePlaylist}
        isLoading={isLoading}
      />
    </div>
  );
}
