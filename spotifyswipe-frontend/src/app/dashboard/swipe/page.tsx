'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SongCard } from '@/components/SongCard';
import { SaveToPlaylistModal } from '@/components/SaveToPlaylistModal';
import { useTrackQueue, Track } from '@/hooks/useTrackQueue';
import { useSwipeSession } from '@/hooks/useSwipeSession';
import { usePlaylists } from '@/hooks/usePlaylists';
import { usePlaylist } from '@/hooks/usePlaylist';

export default function SwipePage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read query params for playlist mode
  const mode = (searchParams.get('mode') as 'recommendations' | 'playlist') || 'recommendations';
  const playlistId = searchParams.get('playlistId');

  // State for save to playlist modal
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSavingPlaylists, setIsSavingPlaylists] = useState(false);

  // Initialize track queue management with mode support
  const {
    tracks,
    currentIndex,
    isLoading,
    error: queueError,
    fetchTracks,
    nextTrack,
    prevTrack,
    getCurrentTrack,
    getNextTracks,
    getQueueStats,
    playlistName,
    mode: currentMode,
  } = useTrackQueue({
    mode,
    playlistId: playlistId || undefined,
    initialLimit: 20,
    refillThreshold: 5,
    seedGenres: 'pop,rock,indie',
  });

  // Initialize swipe session tracking
  const {
    sessionId,
    error: sessionError,
    isInitializing,
    likeSong,
    dislikeSong,
    getSessionStats,
    completeSession,
    likedSongIds,
  } = useSwipeSession({
    autoCreate: true,
  });

  // Initialize playlists
  const { playlists, createPlaylist } = usePlaylists();
  const { addMultipleSongs } = usePlaylist();

  // Fetch initial recommendations or playlist tracks on mount
  useEffect(() => {
    if (user && tracks.length === 0 && !isLoading) {
      const limit = mode === 'playlist' ? 500 : 20;
      fetchTracks(limit);
    }
  }, [user, tracks.length, isLoading, fetchTracks, mode]);

  /**
   * Handle back to discovery
   */
  const handleBackToDiscover = useCallback(() => {
    router.push('/dashboard/discover');
  }, [router]);

  // Handle cleanup when leaving the page
  useEffect(() => {
    return () => {
      // Complete the session when user leaves the page
      if (sessionId) {
        completeSession().catch(console.error);
      }
    };
  }, [sessionId, completeSession]);

  /**
   * Handle saving liked songs to selected playlists
   */
  const handleSaveToPlaylists = useCallback(
    async (playlistIds: string[]) => {
      if (likedSongIds.length === 0) {
        console.warn('No liked songs to save');
        return;
      }

      setIsSavingPlaylists(true);
      try {
        // Add liked songs to each selected playlist
        await Promise.all(
          playlistIds.map((playlistId) =>
            addMultipleSongs(playlistId, likedSongIds)
          )
        );
        setIsSaveModalOpen(false);
      } catch (error) {
        console.error('Error saving songs to playlists:', error);
      } finally {
        setIsSavingPlaylists(false);
      }
    },
    [likedSongIds, addMultipleSongs]
  );

  /**
   * Handle creating a new playlist from the save modal
   */
  const handleCreatePlaylistFromModal = useCallback(
    async (name: string, description: string) => {
      return await createPlaylist(name, description);
    },
    [createPlaylist]
  );

  const currentTrack = getCurrentTrack();
  const nextTracks = getNextTracks(3);
  const queueStats = getQueueStats();
  const sessionStats = getSessionStats();

  const handleLike = async () => {
    if (!currentTrack) return;

    // Record the swipe in the session
    const swipeRecorded = await likeSong(currentTrack.id);

    if (swipeRecorded || !sessionId) {
      // Move to next track regardless of API success
      // (user experience is more important than API failures)
      await nextTrack();
    }
  };

  const handleDislike = async () => {
    if (!currentTrack) return;

    // Record the swipe in the session
    const swipeRecorded = await dislikeSong(currentTrack.id);

    if (swipeRecorded || !sessionId) {
      // Move to next track regardless of API success
      await nextTrack();
    }
  };

  const error = queueError || sessionError;

  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl">
        {/* Header Section */}
        <div className="mb-12">
          {/* Show different header for playlist mode */}
          {currentMode === 'playlist' && playlistName ? (
            <div>
              <button
                onClick={handleBackToDiscover}
                className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to Discovery
              </button>
              <h1 className="text-4xl font-bold text-white mb-2">
                {playlistName}
              </h1>
              <p className="text-gray-400">
                Swipe through tracks from this playlist
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Discover Music
              </h1>
              <p className="text-gray-400">
                {user ? `Ready to discover, ${user.displayName}?` : 'Loading...'}
              </p>
            </div>
          )}

          {/* Queue Stats */}
          {tracks.length > 0 && (
            <div className="mt-4 text-sm text-gray-400">
              <p>
                {currentMode === 'playlist'
                  ? `Track ${queueStats.current} of ${queueStats.total}`
                  : `Showing ${queueStats.current} of ${queueStats.total} tracks`}
                {sessionStats.likedCount > 0 &&
                  ` • Liked: ${sessionStats.likedCount}`}
                {sessionStats.dislikedCount > 0 &&
                  ` • Skipped: ${sessionStats.dislikedCount}`}
              </p>
            </div>
          )}
        </div>

        {/* Loading State */}
        {(isLoading || isInitializing) && !currentTrack && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green mb-4"></div>
              <p className="text-gray-400">
                {isInitializing ? 'Starting session...' : 'Loading recommendations...'}
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-red-100 mb-8">
            <p className="font-semibold mb-2">Error</p>
            <p>{error}</p>
            <button
              onClick={() => fetchTracks(20)}
              className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 rounded-full text-white text-sm font-semibold transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Main Content */}
        {currentTrack && (
          <div className="space-y-8">
            {/* Current Track Card */}
            <div>
              <SongCard
                id={currentTrack.id}
                name={currentTrack.name}
                artists={currentTrack.artists}
                album={currentTrack.album}
                durationMs={currentTrack.durationMs}
                previewUrl={currentTrack.previewUrl}
                onLike={handleLike}
                onDislike={handleDislike}
              />
            </div>

            {/* Queue Preview */}
            {nextTracks.length > 0 && (
              <div className="mt-8">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Coming Up
                </h2>
                <div className="space-y-2">
                  {nextTracks.map((track, idx) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-4 p-3 bg-gray-800/40 rounded-lg hover:bg-gray-800/60 transition-colors"
                    >
                      {track.album.imageUrl && (
                        <img
                          src={track.album.imageUrl}
                          alt={track.album.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-spotify-light truncate">
                          {track.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {track.artists.map((a) => a.name).join(', ')}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        #{currentIndex + idx + 2}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Controls */}
            <div className="flex gap-4 justify-center mt-8">
              <button
                onClick={prevTrack}
                disabled={currentIndex === 0}
                className="px-6 py-2 bg-gray-700 disabled:bg-gray-800 disabled:text-gray-600 text-gray-300 hover:bg-gray-600 rounded-full font-semibold transition-colors disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={nextTrack}
                className="px-6 py-2 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-full font-semibold transition-colors"
              >
                Next
              </button>
            </div>

            {/* Save Liked Songs Button */}
            {sessionStats.likedCount > 0 && (
              <div className="mt-8 p-6 bg-spotify-green/10 border border-spotify-green/30 rounded-lg">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="font-semibold text-spotify-light">
                      {sessionStats.likedCount} song{sessionStats.likedCount !== 1 ? 's' : ''} liked
                    </p>
                    <p className="text-sm text-gray-400">
                      Save your discoveries to a playlist
                    </p>
                  </div>
                  <button
                    onClick={() => setIsSaveModalOpen(true)}
                    className="px-6 py-3 bg-spotify-green text-white hover:bg-green-600 rounded-full font-semibold transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Save to Playlist
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !currentTrack && !error && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No tracks available</p>
            <button
              onClick={() => fetchTracks(20)}
              className="px-6 py-2 bg-spotify-green hover:bg-green-600 text-white rounded-full font-semibold transition-colors"
            >
              Load Recommendations
            </button>
          </div>
        )}
      </div>

      {/* Save to Playlist Modal */}
      <SaveToPlaylistModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        playlists={playlists}
        songIds={likedSongIds}
        onSave={handleSaveToPlaylists}
        onCreatePlaylist={handleCreatePlaylistFromModal}
        isLoading={isSavingPlaylists}
      />
    </div>
  );
}
