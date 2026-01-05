'use client';

import React, { useState, useCallback, useEffect } from 'react';

interface EditPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string) => Promise<void>;
  initialName: string;
  initialDescription: string;
  isLoading?: boolean;
}

/**
 * EditPlaylistModal allows users to edit playlist name and description.
 */
export function EditPlaylistModal({
  isOpen,
  onClose,
  onSubmit,
  initialName,
  initialDescription,
  isLoading = false,
}: EditPlaylistModalProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);

  // Update form when initial values change
  useEffect(() => {
    setName(initialName);
    setDescription(initialDescription);
    setError(null);
  }, [initialName, initialDescription, isOpen]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!name.trim()) {
        setError('Playlist name is required');
        return;
      }

      if (name.trim().length > 100) {
        setError('Playlist name must be less than 100 characters');
        return;
      }

      if (description.length > 500) {
        setError('Description must be less than 500 characters');
        return;
      }

      try {
        await onSubmit(name.trim(), description.trim());
        onClose();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update playlist';
        setError(errorMessage);
      }
    },
    [name, description, onSubmit, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-spotify-gray rounded-lg shadow-xl max-w-md w-full border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-spotify-light">
            Edit Playlist
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-spotify-light transition-colors disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Name Input */}
          <div>
            <label
              htmlFor="edit-playlist-name"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Playlist Name *
            </label>
            <input
              id="edit-playlist-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Playlist name"
              disabled={isLoading}
              maxLength={100}
              className="w-full px-4 py-2 bg-spotify-dark border border-gray-700 rounded-lg text-spotify-light placeholder-gray-500 focus:outline-none focus:border-spotify-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              {name.length}/100
            </p>
          </div>

          {/* Description Input */}
          <div>
            <label
              htmlFor="edit-playlist-description"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Description (Optional)
            </label>
            <textarea
              id="edit-playlist-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              disabled={isLoading}
              maxLength={500}
              rows={4}
              className="w-full px-4 py-2 bg-spotify-dark border border-gray-700 rounded-lg text-spotify-light placeholder-gray-500 focus:outline-none focus:border-spotify-green transition-colors resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              {description.length}/500
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-6 py-2 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 rounded-full bg-spotify-green text-white hover:bg-green-600 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
