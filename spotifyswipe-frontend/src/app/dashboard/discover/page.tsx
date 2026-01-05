'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GenreMoodSelector } from '@/components/GenreMoodSelector';
import { PlaylistBrowser, PlaylistItem } from '@/components/PlaylistBrowser';
import apiClient from '@/lib/apiClient';

type Step = 'genre' | 'playlists';

/**
 * Discovery page for playlist-based music discovery
 * Two-step flow: select genre -> select playlist -> swipe tracks
 */
export default function DiscoverPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('genre');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle genre selection - fetch playlists for that genre
   */
  const handleGenreSelect = useCallback(async (genreId: string) => {
    setSelectedGenre(genreId);
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<{
        success: boolean;
        data: {
          playlists: PlaylistItem[];
          total: number;
          limit: number;
          offset: number;
        };
      }>('/api/spotify/playlists/search', {
        params: {
          query: genreId,
          limit: 20
        }
      });

      if (!response.data.success) {
        throw new Error('Failed to fetch playlists');
      }

      setPlaylists(response.data.data.playlists);
      setStep('playlists');
    } catch (err) {
      console.error('Error fetching playlists:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load playlists. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handle playlist selection - navigate to swipe page with playlist mode
   */
  const handlePlaylistSelect = useCallback(
    (playlistId: string, playlistName: string) => {
      router.push(`/dashboard/swipe?mode=playlist&playlistId=${playlistId}`);
    },
    [router]
  );

  /**
   * Handle back button - return to genre selection
   */
  const handleBack = useCallback(() => {
    setStep('genre');
    setSelectedGenre(null);
    setPlaylists([]);
    setError(null);
  }, []);

  return (
    <div className="flex-1 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Error Display */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-red-100 mb-8">
            <p className="font-semibold mb-2">Error</p>
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 rounded-full text-white text-sm font-semibold transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Step 1: Genre Selection */}
        {step === 'genre' && (
          <GenreMoodSelector
            onGenreSelect={handleGenreSelect}
            selectedGenre={selectedGenre}
            isLoading={isLoading}
          />
        )}

        {/* Step 2: Playlist Browser */}
        {step === 'playlists' && (
          <PlaylistBrowser
            playlists={playlists}
            isLoading={isLoading}
            onPlaylistSelect={handlePlaylistSelect}
            onBack={handleBack}
            selectedGenre={selectedGenre || 'Unknown'}
            error={error}
          />
        )}
      </div>
    </div>
  );
}
