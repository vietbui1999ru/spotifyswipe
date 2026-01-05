# Playlist Discovery Frontend - Quick Test Guide

**Purpose:** Quick reference for testing the frontend implementation before backend integration.

---

## Files Created (6 Total)

### New Components
1. **GenreMoodSelector.tsx** - `/src/components/GenreMoodSelector.tsx` (64 lines)
2. **PlaylistBrowser.tsx** - `/src/components/PlaylistBrowser.tsx` (166 lines)
3. **discover/page.tsx** - `/src/app/dashboard/discover/page.tsx` (92 lines)

### Modified Files
4. **useTrackQueue.ts** - `/src/hooks/useTrackQueue.ts` (+40 lines)
5. **swipe/page.tsx** - `/src/app/dashboard/swipe/page.tsx` (+50 lines)
6. **Navigation.tsx** - `/src/components/Navigation.tsx` (+4 lines)

---

## Component API Reference

### GenreMoodSelector Props
```typescript
interface GenreMoodSelectorProps {
  onGenreSelect: (genreId: string) => void;  // Called when user selects a genre
  selectedGenre: string | null;               // Currently selected genre
  isLoading?: boolean;                        // Disable interactions while loading
}
```

**Genres Supported:**
- pop, rock, indie, chill, party, workout, sleep, focus, jazz, electronic, hip-hop, classical

---

### PlaylistBrowser Props
```typescript
interface PlaylistBrowserProps {
  playlists: PlaylistItem[];                                      // Array of playlists to display
  isLoading: boolean;                                            // Show loading skeleton
  onPlaylistSelect: (playlistId: string, playlistName: string) => void;  // Click handler
  onBack: () => void;                                            // Back button handler
  selectedGenre: string;                                         // Display in header
  error?: string | null;                                         // Show error banner
}

interface PlaylistItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  trackCount: number;
  owner: string;
  followerCount: number;
}
```

---

### useTrackQueue Hook Options
```typescript
interface UseTrackQueueOptions {
  mode?: 'recommendations' | 'playlist';      // NEW: discovery mode
  playlistId?: string;                        // NEW: required if mode='playlist'
  initialLimit?: number;                      // Default: 20
  refillThreshold?: number;                   // Default: 5
  seedGenres?: string;                        // For recommendations mode
  seedTrackIds?: string;                      // For recommendations mode
  seedArtistIds?: string;                     // For recommendations mode
}
```

**Return Value (added properties):**
```typescript
{
  // ... existing properties (tracks, currentIndex, error, etc.)
  playlistName: string;                       // Name of loaded playlist
  mode: 'recommendations' | 'playlist';       // Current mode
}
```

---

## URL Routes

### New Routes
- **`/dashboard/discover`** - Genre selection and playlist browsing
  - Query params: None
  - Authentication: Required (protected by Dashboard layout)

- **`/dashboard/swipe?mode=playlist&playlistId=PLAYLIST_ID`** - Swipe playlist tracks
  - Query params:
    - `mode=playlist` - Switches to playlist mode
    - `playlistId=SPOTIFY_PLAYLIST_ID` - Which playlist to load
  - Authentication: Required

### Existing Routes (Unchanged)
- **`/dashboard/swipe`** - Recommendations mode (default)
- **`/dashboard/my-playlists`** - User's custom playlists
- **`/dashboard/spotify-playlists`** - Spotify playlists

---

## Manual Testing Checklist

### 1. Component Rendering ✓
- [ ] Navigate to `/dashboard/discover`
- [ ] GenreMoodSelector displays 12 buttons with emojis
- [ ] Each button labeled correctly (Pop, Rock, Indie, etc.)
- [ ] Dark theme styling applied correctly
- [ ] Responsive layout on mobile (2 columns)

### 2. Genre Selection ✓
- [ ] Click a genre button (e.g., "Pop")
- [ ] Button highlights in green
- [ ] Page transitions to PlaylistBrowser
- [ ] Loading spinner appears
- [ ] Genre name shown in header ("Pop Playlists")

### 3. Playlist Display ✓
- [ ] Playlists load and display in grid
- [ ] Each card shows:
  - [ ] Playlist image (or placeholder)
  - [ ] Playlist name (bold, no truncation in grid)
  - [ ] Track count ("42 tracks")
  - [ ] Follower count ("12K followers")
  - [ ] Description preview (if available)
- [ ] Grid is responsive (1 col mobile, 2 tablet, 3 desktop)

### 4. Playlist Selection ✓
- [ ] Click a playlist card
- [ ] Should navigate to `/dashboard/swipe?mode=playlist&playlistId=...`
- [ ] URL contains correct playlist ID
- [ ] SwipePage loads with playlist mode

### 5. SwipePage in Playlist Mode ✓
- [ ] Back button visible ("Back to Discovery")
- [ ] Playlist name displayed as title
- [ ] Subtitle says "Swipe through tracks from this playlist"
- [ ] Track counter shows "Track X of Y" (finite count)
- [ ] Swipe functionality works (like/dislike)
- [ ] Save to playlist button works
- [ ] Back button returns to `/dashboard/discover`

### 6. SwipePage in Recommendations Mode ✓
- [ ] Navigate to `/dashboard/swipe` (no query params)
- [ ] Title says "Discover Music"
- [ ] Subtitle says "Ready to discover, {name}?"
- [ ] Track counter shows "Showing X of Y tracks"
- [ ] No back button to discovery
- [ ] Auto-refill still works (old behavior preserved)

### 7. Navigation ✓
- [ ] Left sidebar shows updated nav items
- [ ] "Discover Music" link → `/dashboard/swipe`
- [ ] "Browse Playlists" link → `/dashboard/discover`
- [ ] Active link highlighted in green
- [ ] All other nav items still present

### 8. Error Handling ✓
- [ ] Close browser DevTools Network tab to simulate offline
- [ ] Genre selection shows error banner
- [ ] Error message readable and dismissible
- [ ] Error doesn't break UI
- [ ] Can return to genre selection and retry

### 9. Loading States ✓
- [ ] Loading skeleton appears in playlist grid
- [ ] Skeleton animates (pulsing effect)
- [ ] Loading spinner shown on initial genre load
- [ ] Buttons disabled during loading
- [ ] Loading completes and UI renders

### 10. Edge Cases ✓
- [ ] Try genre with no results → Shows "No playlists found" message
- [ ] Try navigating directly to swipe with invalid playlistId → Error handled
- [ ] Refresh page while in playlist mode → Maintains state
- [ ] Browser back button works correctly at each step

---

## Backend Dependency Requirements

### Endpoints Needed for Frontend

**1. GET /api/spotify/playlists/search**
```
Query Params:
  - query: string (genre name)
  - limit: number (default 20)
  - offset: number (default 0)

Response:
{
  "success": true,
  "data": {
    "playlists": PlaylistItem[],
    "total": number,
    "limit": number,
    "offset": number
  }
}
```

**2. GET /api/spotify/playlists/:playlistId/tracks**
```
Params:
  - playlistId: string (Spotify playlist ID)

Query Params:
  - filterPreview: boolean (optional, default true)

Response:
{
  "success": true,
  "data": {
    "playlistId": string,
    "playlistName": string,
    "tracks": Track[],
    "total": number,
    "hasMore": boolean
  }
}

Track structure:
{
  "id": string,
  "name": string,
  "artists": [{ "id": string, "name": string }],
  "album": {
    "id": string,
    "name": string,
    "imageUrl": string | null
  },
  "durationMs": number,
  "previewUrl": string | null,
  "popularity": number
}
```

---

## Expected API Behavior

### Playlist Search Response
```javascript
// Example: /api/spotify/playlists/search?query=pop&limit=3
{
  "success": true,
  "data": {
    "playlists": [
      {
        "id": "37i9dQZF1DXcYxJwTdv74G",
        "name": "Today's Top Hits",
        "description": "The hottest hits right now",
        "imageUrl": "https://mosaic.scdn.co/...",
        "trackCount": 50,
        "owner": "Spotify",
        "followerCount": 3500000
      },
      // ... more playlists
    ],
    "total": 50,
    "limit": 3,
    "offset": 0
  }
}
```

### Playlist Tracks Response
```javascript
// Example: /api/spotify/playlists/37i9dQZF1DXcYxJwTdv74G/tracks
{
  "success": true,
  "data": {
    "playlistId": "37i9dQZF1DXcYxJwTdv74G",
    "playlistName": "Today's Top Hits",
    "tracks": [
      {
        "id": "track_id_1",
        "name": "Song Name",
        "artists": [
          {
            "id": "artist_id_1",
            "name": "Artist Name"
          }
        ],
        "album": {
          "id": "album_id_1",
          "name": "Album Name",
          "imageUrl": "https://..."
        },
        "durationMs": 210000,
        "previewUrl": "https://p.scdn.co/mp3-preview/...",
        "popularity": 75
      },
      // ... more tracks
    ],
    "total": 50,
    "hasMore": false
  }
}
```

---

## Browser Console Checks

When testing, check browser console for:

### Good Signs
- ✓ No TypeScript errors in build
- ✓ No React warnings
- ✓ Network requests to `/api/spotify/playlists/search`
- ✓ Network requests to `/api/spotify/playlists/{id}/tracks`
- ✓ Proper JSON responses with `"success": true`

### Problems to Watch For
- ✗ "Cannot find module" errors
- ✗ TypeScript compilation errors
- ✗ API 404 errors (endpoints not yet implemented)
- ✗ API 401 errors (auth issues)
- ✗ CORS errors (backend CORS config)
- ✗ Uncaught React errors (component bugs)
- ✗ "undefined" values in rendered output

---

## Debugging Tips

### If Components Don't Render
1. Check `/dashboard/discover` is accessible
2. Verify Next.js dev server is running
3. Check browser console for build errors
4. Verify Node modules installed (`npm install`)

### If Genre Selection Doesn't Work
1. Check API endpoint exists: `/api/spotify/playlists/search`
2. Check API is responding with correct format
3. Open DevTools Network tab and check request/response
4. Look for 401 (auth), 404 (not found), 502 (server error) status codes

### If Playlists Don't Display
1. Verify API response contains `playlists` array
2. Check `PlaylistItem` interface matches API response
3. Ensure images are loading (check Network tab)
4. Verify no JavaScript errors in console

### If Swipe Page Doesn't Switch to Playlist Mode
1. Check URL has `mode=playlist&playlistId=...`
2. Verify `useSearchParams()` is getting params correctly
3. Check `useTrackQueue` receives correct mode prop
4. Look at Network tab for `/api/spotify/playlists/{id}/tracks` request

---

## Performance Considerations

### Optimization Already Implemented
- ✓ Lazy loading for playlist images
- ✓ Prevented duplicate API requests (isFetchingRef)
- ✓ Efficient state management
- ✓ Skeleton loading for visual feedback
- ✓ Component memoization (useCallback)

### Monitor During Testing
- Check API response times (target: <500ms)
- Monitor image load times
- Watch for re-render spam (DevTools Profiler)
- Test with slow network (DevTools throttling)

---

## Summary

**Frontend Status:** ✅ COMPLETE AND READY FOR INTEGRATION

**Next Steps:**
1. Backend team implements `/api/spotify/playlists/search`
2. Backend team implements `/api/spotify/playlists/:playlistId/tracks`
3. Run manual tests from this checklist
4. If all pass, feature is production-ready

**Estimated Backend Time:** 2-3 hours
**Total Feature Time:** 6-7 hours (3 frontend + 3 backend + testing)
