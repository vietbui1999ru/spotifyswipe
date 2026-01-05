# Playlist-Based Discovery Feature: Complete Implementation Specification

**Feature ID:** FEAT-PLAYLIST-DISCOVERY-001
**Created:** 2026-01-04
**Status:** READY FOR IMPLEMENTATION
**Priority:** HIGH
**Estimated Total Time:** 10 hours

---

## Executive Summary

Replace individual track recommendations with playlist-based discovery. Users select genre/mood → browse curated Spotify playlists → swipe through tracks from those playlists → save liked tracks to their own playlists.

**Key Benefits:**
- Greater user control over discovery
- Access to Spotify's curated playlists
- More tracks to explore (playlists have 50-200+ tracks)
- Better genre/mood targeting

---

## Architecture Overview

### Current System
```
User → Swipe Page → getRecommendations() → 20 tracks → Swipe → Save
```

### New System (Parallel Path)
```
User → Genre Selector → Playlist Browser → Playlist Tracks → Swipe → Save
              ↓                  ↓                ↓
       Search API      Playlist Search    Get Playlist Tracks
```

**Important:** This is an additive feature. Existing recommendation flow remains unchanged.

---

## Implementation Plan

### Phase 1: Backend API (3 hours)

#### Task 1.1: Playlist Search Endpoint
**File:** `/spotifyswipe-backend/src/services/SpotifyService.ts`

Add new method:
```typescript
/**
 * Search for playlists by genre/mood keyword
 * Uses Spotify Search API with type=playlist filter
 */
static async searchPlaylists(
  userId: string,
  query: string,
  limit: number = 10,
  offset: number = 0
): Promise<{
  playlists: Array<{
    id: string;
    name: string;
    description: string;
    imageUrl: string | null;
    trackCount: number;
    owner: string;
    followerCount: number;
  }>;
  total: number;
  limit: number;
  offset: number;
}> {
  const accessToken = await this.getValidAccessToken(userId);

  try {
    const response = await axios.get(`${this.API_BASE}/search`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        q: query,
        type: 'playlist',
        limit: Math.min(limit, 50),
        offset
      }
    });

    return {
      playlists: response.data.playlists.items.map((playlist: any) => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description || '',
        imageUrl: playlist.images?.[0]?.url || null,
        trackCount: playlist.tracks.total,
        owner: playlist.owner.display_name || playlist.owner.id,
        followerCount: playlist.followers?.total || 0
      })),
      total: response.data.playlists.total,
      limit,
      offset
    };
  } catch (error) {
    console.error('Error searching playlists:', error);
    throw new Error('Failed to search playlists');
  }
}
```

**File:** `/spotifyswipe-backend/src/routes/spotify.ts`

Add new route handler:
```typescript
/**
 * GET /api/spotify/playlists/search
 * Search for playlists by keyword
 */
router.get('/playlists/search', authenticate, async (req: Request, res: Response) => {
  try {
    const { query, limit, offset } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    const result = await SpotifyService.searchPlaylists(
      req.userId!,
      query,
      limit ? parseInt(limit as string) : 10,
      offset ? parseInt(offset as string) : 0
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error searching playlists:', error);
    res.status(502).json({
      success: false,
      error: 'Failed to search playlists'
    });
  }
});
```

**Acceptance Criteria:**
- [ ] Endpoint returns playlists matching search query
- [ ] Pagination works (limit, offset parameters)
- [ ] Returns 401 if not authenticated
- [ ] Returns 400 if query missing
- [ ] Handles Spotify API errors (502)
- [ ] Response matches specification exactly

---

#### Task 1.2: Playlist Tracks Extraction Endpoint
**File:** `/spotifyswipe-backend/src/services/SpotifyService.ts`

Add new method:
```typescript
/**
 * Get all tracks from a Spotify playlist
 * Handles pagination automatically up to 500 tracks max
 * Filters out tracks without preview URLs by default
 */
static async getPlaylistTracks(
  userId: string,
  playlistId: string,
  filterPreview: boolean = true,
  maxTracks: number = 500
): Promise<{
  playlistId: string;
  playlistName: string;
  tracks: Array<{
    id: string;
    name: string;
    artists: Array<{ id: string; name: string }>;
    album: {
      id: string;
      name: string;
      imageUrl: string | null;
    };
    durationMs: number;
    previewUrl: string | null;
    popularity: number;
  }>;
  total: number;
  hasMore: boolean;
}> {
  const accessToken = await this.getValidAccessToken(userId);

  try {
    // Fetch playlist details first
    const playlistResponse = await axios.get(
      `${this.API_BASE}/playlists/${playlistId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { fields: 'name,tracks.total' }
      }
    );

    const playlistName = playlistResponse.data.name;
    const totalTracks = playlistResponse.data.tracks.total;

    // Fetch tracks with pagination
    let allTracks: any[] = [];
    let offset = 0;
    const limit = 100; // Spotify API limit

    while (allTracks.length < maxTracks && offset < totalTracks) {
      const tracksResponse = await axios.get(
        `${this.API_BASE}/playlists/${playlistId}/tracks`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: {
            limit,
            offset,
            fields: 'items(track(id,name,artists,album,duration_ms,preview_url,popularity))'
          }
        }
      );

      const items = tracksResponse.data.items
        .filter((item: any) => item.track && item.track.id) // Filter out null tracks
        .map((item: any) => item.track);

      allTracks = allTracks.concat(items);
      offset += limit;

      // Break if no more tracks
      if (tracksResponse.data.items.length < limit) break;
    }

    // Filter tracks without preview URLs if requested
    let tracks = allTracks;
    if (filterPreview) {
      tracks = tracks.filter((track: any) => track.preview_url !== null);
    }

    // Transform to match Track interface
    const transformedTracks = tracks.slice(0, maxTracks).map((track: any) => ({
      id: track.id,
      name: track.name,
      artists: track.artists.map((artist: any) => ({
        id: artist.id,
        name: artist.name
      })),
      album: {
        id: track.album.id,
        name: track.album.name,
        imageUrl: track.album.images?.[0]?.url || null
      },
      durationMs: track.duration_ms,
      previewUrl: track.preview_url,
      popularity: track.popularity
    }));

    return {
      playlistId,
      playlistName,
      tracks: transformedTracks,
      total: tracks.length,
      hasMore: totalTracks > maxTracks
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error('Playlist not found');
    }
    if (error.response?.status === 403) {
      throw new Error('Playlist is private or inaccessible');
    }
    console.error('Error fetching playlist tracks:', error);
    throw new Error('Failed to fetch playlist tracks');
  }
}
```

**File:** `/spotifyswipe-backend/src/routes/spotify.ts`

Add new route handler:
```typescript
/**
 * GET /api/spotify/playlists/:playlistId/tracks
 * Get all tracks from a specific playlist
 */
router.get('/playlists/:playlistId/tracks', authenticate, async (req: Request, res: Response) => {
  try {
    const { playlistId } = req.params;
    const { filterPreview } = req.query;

    const result = await SpotifyService.getPlaylistTracks(
      req.userId!,
      playlistId,
      filterPreview !== 'false' // Default to true
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error fetching playlist tracks:', error);

    if (error.message === 'Playlist not found') {
      return res.status(404).json({
        success: false,
        error: 'Playlist not found'
      });
    }

    if (error.message === 'Playlist is private or inaccessible') {
      return res.status(403).json({
        success: false,
        error: 'Playlist is private or inaccessible'
      });
    }

    res.status(502).json({
      success: false,
      error: 'Failed to fetch playlist tracks'
    });
  }
});
```

**Acceptance Criteria:**
- [ ] Returns all tracks from specified playlist (up to 500)
- [ ] Filters tracks without preview URLs by default
- [ ] Handles pagination automatically
- [ ] Returns 404 if playlist not found
- [ ] Returns 403 if playlist is private
- [ ] Response matches Track interface exactly
- [ ] Handles large playlists (100+ tracks) efficiently

---

### Phase 2: Frontend Components (4 hours)

#### Task 2.1: Genre/Mood Selector Component
**File:** `/spotifyswipe-frontend/src/components/GenreMoodSelector.tsx`

```typescript
'use client';

import React from 'react';

interface Genre {
  id: string;
  label: string;
  icon: string;
}

const GENRES: Genre[] = [
  { id: 'pop', label: 'Pop', icon: '🎵' },
  { id: 'rock', label: 'Rock', icon: '🎸' },
  { id: 'indie', label: 'Indie', icon: '🎹' },
  { id: 'chill', label: 'Chill', icon: '😌' },
  { id: 'party', label: 'Party', icon: '🎉' },
  { id: 'workout', label: 'Workout', icon: '💪' },
  { id: 'sleep', label: 'Sleep', icon: '😴' },
  { id: 'focus', label: 'Focus', icon: '🧠' },
  { id: 'jazz', label: 'Jazz', icon: '🎺' },
  { id: 'electronic', label: 'Electronic', icon: '🔊' },
  { id: 'hip-hop', label: 'Hip Hop', icon: '🎤' },
  { id: 'classical', label: 'Classical', icon: '🎻' }
];

interface GenreMoodSelectorProps {
  onGenreSelect: (genreId: string) => void;
  selectedGenre: string | null;
}

export function GenreMoodSelector({ onGenreSelect, selectedGenre }: GenreMoodSelectorProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-spotify-light mb-2">
          Discover by Mood & Genre
        </h2>
        <p className="text-gray-400">
          Choose a vibe to explore curated playlists
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {GENRES.map((genre) => (
          <button
            key={genre.id}
            onClick={() => onGenreSelect(genre.id)}
            className={`
              p-6 rounded-lg border-2 transition-all duration-200
              flex flex-col items-center gap-3
              ${
                selectedGenre === genre.id
                  ? 'border-spotify-green bg-spotify-green/10 scale-105'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600 hover:bg-gray-700'
              }
            `}
            aria-label={`Select ${genre.label} genre`}
          >
            <span className="text-4xl" role="img" aria-hidden="true">
              {genre.icon}
            </span>
            <span className="text-lg font-semibold text-spotify-light">
              {genre.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Renders 12 genre/mood buttons in responsive grid
- [ ] Selected state visually distinct (green border, scaled)
- [ ] Hover effects work smoothly
- [ ] Calls onGenreSelect callback when clicked
- [ ] Accessible (keyboard navigation, ARIA labels)
- [ ] Responsive on mobile, tablet, desktop

---

#### Task 2.2: Playlist Browser Component
**File:** `/spotifyswipe-frontend/src/components/PlaylistBrowser.tsx`

```typescript
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
}

export function PlaylistBrowser({
  playlists,
  isLoading,
  onPlaylistSelect,
  onBack,
  selectedGenre
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
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          aria-label="Go back"
        >
          <svg className="w-6 h-6 text-spotify-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-3xl font-bold text-spotify-light capitalize">
            {selectedGenre} Playlists
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {playlists.length} playlists found
          </p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="bg-gray-800 rounded-lg p-4 animate-pulse">
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
              className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-all duration-200 text-left group"
            >
              {/* Playlist Image */}
              <div className="relative w-full aspect-square mb-4 overflow-hidden rounded-lg">
                {playlist.imageUrl ? (
                  <img
                    src={playlist.imageUrl}
                    alt={playlist.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <svg className="w-16 h-16 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Playlist Info */}
              <h3 className="text-lg font-semibold text-spotify-light mb-2 line-clamp-2 group-hover:text-spotify-green transition-colors">
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
      {!isLoading && playlists.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-400 text-lg mb-2">No playlists found</p>
          <p className="text-gray-500 text-sm">Try selecting a different genre</p>
        </div>
      )}
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Displays playlist cards in responsive grid
- [ ] Shows loading skeleton while fetching
- [ ] Handles empty results gracefully
- [ ] Click handler triggers playlist selection
- [ ] Back button returns to genre selector
- [ ] Images lazy-load for performance
- [ ] Hover effects work smoothly
- [ ] Follower count formatted correctly (1.2K, 2.5M)

---

#### Task 2.3: Modify useTrackQueue Hook
**File:** `/spotifyswipe-frontend/src/hooks/useTrackQueue.ts`

Add support for playlist mode:

```typescript
// Add to interface at top of file
interface UseTrackQueueOptions {
  mode?: 'recommendations' | 'playlist';  // NEW
  playlistId?: string;                     // NEW

  // Existing options
  initialLimit?: number;
  refillThreshold?: number;
  seedGenres?: string;
  seedTrackIds?: string;
  seedArtistIds?: string;
}

// Modify hook signature
export function useTrackQueue(options: UseTrackQueueOptions = {}) {
  const {
    mode = 'recommendations',  // NEW: default to recommendations
    playlistId,                // NEW
    initialLimit = 20,
    refillThreshold = 5,
    seedGenres = 'pop,rock,indie',
    seedTrackIds = '',
    seedArtistIds = ''
  } = options;

  // Add new state
  const [playlistName, setPlaylistName] = useState<string>('');

  // Modify fetchTracks to support both modes
  const fetchTracks = useCallback(
    async (limit: number = initialLimit, append: boolean = false) => {
      if (isFetchingRef.current) return;

      try {
        isFetchingRef.current = true;
        setError(null);

        let response;

        if (mode === 'playlist' && playlistId) {
          // NEW: Fetch from playlist endpoint
          response = await apiClient.get<{
            success: boolean;
            data: {
              playlistId: string;
              playlistName: string;
              tracks: Track[];
              total: number;
              hasMore: boolean;
            };
          }>(`/api/spotify/playlists/${playlistId}/tracks`);

          if (!response.data.success) {
            throw new Error('Failed to fetch playlist tracks');
          }

          const newTracks = response.data.data.tracks || [];
          setPlaylistName(response.data.data.playlistName);

          // For playlist mode, don't append, load all at once
          setTracks(newTracks);
          setCurrentIndex(0);
          setHasMore(false); // Playlists have finite tracks, no refill

        } else {
          // EXISTING: Recommendations mode
          const params: Record<string, string | number> = { limit };
          if (seedTrackIds) params.seedTrackIds = seedTrackIds;
          if (seedArtistIds) params.seedArtistIds = seedArtistIds;
          if (seedGenres) params.seedGenres = seedGenres;

          response = await apiClient.get<RecommendationsResponse>(
            '/api/spotify/search',
            { params }
          );

          if (!response.data.success) {
            throw new Error('Failed to fetch recommendations');
          }

          const newTracks = response.data.data.tracks || [];

          if (newTracks.length === 0) {
            setHasMore(false);
            return;
          }

          const tracksWithPreview = newTracks.filter(
            (track) => track.previewUrl !== null
          );

          if (append) {
            setTracks((prev) => [...prev, ...tracksWithPreview]);
          } else {
            setTracks(tracksWithPreview);
            setCurrentIndex(0);
          }
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load tracks';
        setError(errorMessage);
        console.error('Error fetching tracks:', err);
      } finally {
        isFetchingRef.current = false;
      }
    },
    [mode, playlistId, initialLimit, seedTrackIds, seedArtistIds, seedGenres]
  );

  // Modify nextTrack to disable auto-refill in playlist mode
  const nextTrack = useCallback(async () => {
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);

    // Only auto-refill in recommendations mode
    if (mode === 'recommendations') {
      const remainingTracks = tracks.length - newIndex;
      if (remainingTracks <= refillThreshold && hasMore && !isFetchingRef.current) {
        await fetchTracks(initialLimit, true);
      }
    }
  }, [mode, currentIndex, tracks.length, refillThreshold, hasMore, fetchTracks, initialLimit]);

  // Add to return object
  return {
    // ... existing returns
    playlistName,  // NEW: name of loaded playlist
    mode,          // NEW: current mode
  };
}
```

**Acceptance Criteria:**
- [ ] Supports both 'recommendations' and 'playlist' modes
- [ ] Playlist mode fetches from new endpoint
- [ ] Playlist mode loads all tracks at once (no auto-refill)
- [ ] Recommendations mode unchanged (backward compatible)
- [ ] Returns playlist name when in playlist mode
- [ ] Error handling works for both modes

---

#### Task 2.4: Create Discovery Page
**File:** `/spotifyswipe-frontend/src/app/dashboard/discover/page.tsx`

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GenreMoodSelector } from '@/components/GenreMoodSelector';
import { PlaylistBrowser, PlaylistItem } from '@/components/PlaylistBrowser';
import apiClient from '@/lib/apiClient';

type Step = 'genre' | 'playlists';

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
      setError('Failed to load playlists. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handle playlist selection - navigate to swipe page with playlist mode
   */
  const handlePlaylistSelect = useCallback((playlistId: string, playlistName: string) => {
    router.push(`/dashboard/swipe?mode=playlist&playlistId=${playlistId}`);
  }, [router]);

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
          />
        )}
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Genre selection fetches playlists correctly
- [ ] Playlist selection navigates to swipe page with correct params
- [ ] Back button returns to genre selector
- [ ] Loading states display during API calls
- [ ] Error handling shows user-friendly messages
- [ ] Page is responsive on all screen sizes

---

#### Task 2.5: Update SwipePage for Dual Mode
**File:** `/spotifyswipe-frontend/src/app/dashboard/swipe/page.tsx`

Add query param support and modify initialization:

```typescript
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';  // NEW
import { SongCard } from '@/components/SongCard';
import { SaveToPlaylistModal } from '@/components/SaveToPlaylistModal';
import { useTrackQueue, Track } from '@/hooks/useTrackQueue';
import { useSwipeSession } from '@/hooks/useSwipeSession';
import { usePlaylists } from '@/hooks/usePlaylists';
import { usePlaylist } from '@/hooks/usePlaylist';

export default function SwipePage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();  // NEW
  const router = useRouter();              // NEW

  // NEW: Read query params
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
    playlistName,  // NEW
    mode: currentMode,  // NEW
  } = useTrackQueue({
    mode,  // NEW
    playlistId: playlistId || undefined,  // NEW
    initialLimit: 20,
    refillThreshold: 5,
    seedGenres: 'pop,rock,indie',
  });

  // ... rest of existing code ...

  // NEW: Handle back to discovery
  const handleBackToDiscover = useCallback(() => {
    router.push('/dashboard/discover');
  }, [router]);

  // Fetch initial tracks on mount
  useEffect(() => {
    if (user && tracks.length === 0 && !isLoading) {
      fetchTracks(mode === 'playlist' ? 500 : 20);  // MODIFIED: different limits
    }
  }, [user, tracks.length, isLoading, fetchTracks, mode]);

  // ... rest of existing code ...

  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl">
        {/* Header Section */}
        <div className="mb-12">
          {/* NEW: Show different header for playlist mode */}
          {currentMode === 'playlist' && playlistName ? (
            <div>
              <button
                onClick={handleBackToDiscover}
                className="flex items-center gap-2 text-gray-400 hover:text-spotify-light mb-4 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Discovery
              </button>
              <h1 className="text-4xl font-bold text-spotify-light mb-2">
                {playlistName}
              </h1>
              <p className="text-gray-400">
                Swipe through tracks from this playlist
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-4xl font-bold text-spotify-light mb-2">
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
                  ? `Track ${queueStats.current} of ${queueStats.total}`  // NEW: finite progress
                  : `Showing ${queueStats.current} of ${queueStats.total} tracks`  // EXISTING
                }
                {sessionStats.likedCount > 0 &&
                  ` • Liked: ${sessionStats.likedCount}`}
                {sessionStats.dislikedCount > 0 &&
                  ` • Skipped: ${sessionStats.dislikedCount}`}
              </p>
            </div>
          )}
        </div>

        {/* Rest of existing component remains unchanged */}
        {/* ... existing loading, error, content, and modal code ... */}
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Reads mode and playlistId from query params
- [ ] Initializes useTrackQueue with correct mode
- [ ] Shows different header for playlist mode
- [ ] Back button navigates to /dashboard/discover
- [ ] Progress indicator shows finite count in playlist mode
- [ ] All existing swipe functionality works in both modes
- [ ] Save to playlist works in both modes

---

### Phase 3: Testing (3 hours)

#### Task 3.1: Backend Endpoint Tests
**Agent:** tester

**File:** `/spotifyswipe-backend/src/routes/__tests__/spotify-playlists.test.ts`

Test coverage required:
1. Playlist search endpoint
   - Returns playlists for valid query
   - Handles pagination
   - Returns 401 for unauthenticated
   - Returns 400 for missing query
   - Handles Spotify API errors

2. Playlist tracks endpoint
   - Returns tracks for valid playlist
   - Filters preview URLs correctly
   - Handles pagination
   - Returns 404 for invalid playlist
   - Returns 403 for private playlist

**Acceptance Criteria:**
- [ ] All tests pass
- [ ] Test coverage >80% for new code
- [ ] Mocks Spotify API responses
- [ ] Tests error conditions

---

#### Task 3.2: Frontend Component Tests
**Agent:** tester

**Files:**
- `/spotifyswipe-frontend/src/components/__tests__/GenreMoodSelector.test.tsx`
- `/spotifyswipe-frontend/src/components/__tests__/PlaylistBrowser.test.tsx`

Test coverage required:
1. GenreMoodSelector
   - Renders all genres
   - Calls callback on click
   - Shows selected state
   - Keyboard navigation

2. PlaylistBrowser
   - Displays playlists
   - Shows loading state
   - Handles empty results
   - Calls callbacks correctly

**Acceptance Criteria:**
- [ ] All tests pass
- [ ] Component snapshots created
- [ ] User interaction tests pass
- [ ] Accessibility tests pass

---

#### Task 3.3: Integration Testing
**Agent:** tester

**Manual Testing Checklist:**
- [ ] Complete flow: genre → playlists → tracks → swipe → save
- [ ] Genre selection loads playlists
- [ ] Playlist selection loads tracks correctly
- [ ] Swipe functionality works with playlist tracks
- [ ] Save to playlist works
- [ ] Back navigation works at each step
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] Responsive design works on mobile
- [ ] No console errors or warnings
- [ ] Browser back/forward buttons work
- [ ] Existing recommendation flow still works
- [ ] Can switch between discovery and recommendations

**Acceptance Criteria:**
- [ ] All checklist items pass
- [ ] No critical bugs found
- [ ] Performance acceptable (<2s load times)

---

## Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION FLOW                          │
└────────────────────────────────────────────────────────────────────────┘

Step 1: Genre Selection
User → GenreMoodSelector Component → Click "Pop"
         ↓
      onGenreSelect("pop")
         ↓
      DiscoverPage → API Call: GET /api/spotify/playlists/search?query=pop
         ↓
      SpotifyService.searchPlaylists()
         ↓
      Spotify API: GET /v1/search?q=pop&type=playlist
         ↓
      Returns: Array of playlists

Step 2: Playlist Browse
User sees PlaylistBrowser Component with playlist cards
         ↓
User clicks playlist → onPlaylistSelect(playlistId, name)
         ↓
      router.push(/dashboard/swipe?mode=playlist&playlistId=xyz)

Step 3: Track Loading
SwipePage reads query params (mode=playlist, playlistId=xyz)
         ↓
useTrackQueue initialized with mode='playlist', playlistId='xyz'
         ↓
fetchTracks() → API Call: GET /api/spotify/playlists/xyz/tracks
         ↓
SpotifyService.getPlaylistTracks()
         ↓
Spotify API: GET /v1/playlists/xyz/tracks (with pagination)
         ↓
Returns: Array of tracks (up to 500)

Step 4: Swiping
User swipes tracks (existing functionality)
         ↓
useSwipeSession records likes/dislikes (existing)
         ↓
User clicks "Save to Playlist"
         ↓
SaveToPlaylistModal opens (existing)
         ↓
User saves liked songs (existing)
```

---

## Success Metrics

### Technical Metrics
- [ ] All new endpoints return <500ms response time
- [ ] Test coverage >80% for new code
- [ ] No console errors in browser
- [ ] No 500 errors in backend logs
- [ ] Lighthouse performance score >70

### User Experience Metrics
- [ ] User can complete full flow without errors
- [ ] Loading states provide feedback <100ms
- [ ] UI responsive on mobile, tablet, desktop
- [ ] Back/forward navigation works correctly

---

## Rollout Plan

**Day 1: Development**
- Hours 1-3: Backend implementation
- Hours 4-7: Frontend implementation
- Hours 8-9: Unit testing

**Day 2: Testing & Deployment**
- Hours 1-2: Integration testing
- Hour 3: Bug fixes
- Hour 4: Deployment

**Total Time:** 10 hours

---

## Backward Compatibility

This feature is **fully backward compatible**:
- Existing recommendation flow unchanged
- SwipePage works with no query params (default mode)
- useTrackQueue defaults to 'recommendations' mode
- No database schema changes
- No breaking API changes

Users can switch between:
1. `/dashboard/swipe` - Recommendations (existing)
2. `/dashboard/discover` - Playlist discovery (new)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Spotify rate limits | Cache playlist searches, respect rate limits |
| No preview URLs | Filter tracks, show warning to user |
| Large playlists (1000+ tracks) | Limit to 500 tracks max, paginate |
| Private playlists | Handle 403 errors, show friendly message |
| Slow loading | Show loading indicators, lazy load images |

---

## Next Steps

1. **Backend Agent:** Implement Task 1.1 and 1.2 (3 hours)
2. **Frontend Agent:** Implement Tasks 2.1-2.5 (4 hours)
3. **Tester Agent:** Execute Tasks 3.1-3.3 (3 hours)
4. **Orchestrator:** Review and approve before deployment

**Total Estimated Time:** 10 hours
