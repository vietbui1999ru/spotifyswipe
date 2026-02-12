'use client';

import React from 'react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  danger?: boolean;
}

/**
 * DeleteConfirmModal displays a confirmation dialog before performing a destructive action.
 */
export function DeleteConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isLoading = false,
  danger = true,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-spotify-gray rounded-lg shadow-xl max-w-sm w-full border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className={`text-lg font-bold ${danger ? 'text-red-400' : 'text-spotify-light'}`}>
            {title}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-300 mb-6">{message}</p>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-6 py-2 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-6 py-2 rounded-full font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                danger
                  ? 'bg-red-900 text-red-100 hover:bg-red-800'
                  : 'bg-spotify-green text-white hover:bg-green-600'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                  Confirming...
                </>
              ) : (
                'Confirm'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
