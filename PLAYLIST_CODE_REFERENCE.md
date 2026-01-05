# Playlist Discovery - Code Reference & Snippets

## File Locations

### Modified Files

1. **Backend Service:**
   - Path: `/spotifyswipe-backend/src/services/SpotifyService.ts`
   - Added Methods: `searchPlaylists()` (lines 375-418), `getPlaylistTracks()` (lines 425-507)
   - Total Lines Added: ~133

2. **Backend Routes:**
   - Path: `/spotifyswipe-backend/src/routes/spotify.ts`
   - Added Endpoints: `/playlists/search` (lines 135-169), `/playlists/:playlistId/tracks` (lines 171-218)
   - Total Lines Added: ~84

---

## Complete Code Reference

### SpotifyService.ts - searchPlaylists() Method

**Location:** Lines 375-418

```typescript
/**
 * Search for playlists by genre/mood keyword
 * Uses Spotify Search API with type=playlist filter
 * Returns playlist metadata without full track details
 */
static async searchPlaylists(
	userId: string,
	query: string,
	limit: number = 10,
	offset: number = 0
): Promise<any> {
	const accessToken = await this.getValidAccessToken(userId);

	try {
		// Validate query
		if (!query || query.trim().length === 0) {
			throw new Error('Query parameter cannot be empty');
		}

		const response = await axios.get(`${this.API_BASE}/search`, {
			headers: { Authorization: `Bearer ${accessToken}` },
			params: {
				q: query,
				type: 'playlist',
				limit: Math.min(limit, 50), // API limit is 50
				offset
			}
		});

		// Transform response to match specification
		return {
			playlists: response.data.playlists.items.map((playlist: any) => ({
				id: playlist.id,
				name: playlist.name,
				description: playlist.description || '',
				imageUrl: playlist.images?.[0]?.url || null,
				trackCount: playlist.tracks.total,
				followers: playlist.followers?.total || 0,
				owner: playlist.owner.display_name || playlist.owner.id
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

**Key Points:**
- Validates query is non-empty
- Uses Spotify Search API with `type=playlist`
- Enforces 50-result limit (Spotify API max)
- Maps Spotify response to clean format
- Returns pagination metadata

---

### SpotifyService.ts - getPlaylistTracks() Method

**Location:** Lines 425-507

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
): Promise<any> {
	const accessToken = await this.getValidAccessToken(userId);

	try {
		// Step 1: Fetch playlist details (name and track count)
		const playlistResponse = await axios.get(
			`${this.API_BASE}/playlists/${playlistId}`,
			{
				headers: { Authorization: `Bearer ${accessToken}` },
				params: { fields: 'name,tracks.total' }
			}
		);

		const playlistName = playlistResponse.data.name;
		const totalTracks = playlistResponse.data.tracks.total;

		// Step 2: Fetch tracks from playlist (with pagination)
		const allTracks: any[] = [];
		const tracksToFetch = Math.min(totalTracks, maxTracks);
		const batchSize = 100; // Spotify API limit is 100 tracks per request

		for (let offset = 0; offset < tracksToFetch; offset += batchSize) {
			const limit = Math.min(batchSize, tracksToFetch - offset);

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

			allTracks.push(...tracksResponse.data.items);
		}

		// Step 3: Transform and filter tracks
		let transformedTracks = allTracks.map((item: any) => {
			const track = item.track;
			return {
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
			};
		});

		// Step 4: Filter out tracks without preview URLs if requested
		if (filterPreview) {
			transformedTracks = transformedTracks.filter((track: any) => track.previewUrl !== null);
		}

		// Step 5: Return result with pagination info
		return {
			playlistId,
			playlistName,
			tracks: transformedTracks,
			total: totalTracks,
			hasMore: totalTracks > maxTracks
		};
	} catch (error) {
		console.error('Error fetching playlist tracks:', error);
		throw new Error('Failed to fetch playlist tracks');
	}
}
```

**Key Points:**
- Fetches playlist metadata first (name, total tracks)
- Implements automatic pagination (100 tracks per batch)
- Transforms Spotify response format to application format
- Filters tracks by preview URL availability
- Returns total track count and hasMore flag
- Limits fetching to max 500 tracks

---

### spotify.ts - Playlist Search Route

**Location:** Lines 135-169

```typescript
// GET /api/spotify/playlists/search - Search for playlists by genre/mood
router.get('/playlists/search', async (req: AuthRequest, res: Response) => {
	try {
		const { query } = req.query;

		// Validate query parameter
		if (!query || typeof query !== 'string') {
			return res.status(400).json({
				success: false,
				error: 'Query parameter is required'
			});
		}

		const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
		const offset = parseInt(req.query.offset as string) || 0;

		const result = await SpotifyService.searchPlaylists(
			req.userId!,
			query,
			limit,
			offset
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

**Key Points:**
- Requires authentication (via authMiddleware on router)
- Validates query parameter is non-empty string
- Enforces 50-result limit
- Calls SpotifyService.searchPlaylists()
- Returns consistent response format
- Handles errors gracefully (502 status)

---

### spotify.ts - Playlist Tracks Route

**Location:** Lines 171-218

```typescript
// GET /api/spotify/playlists/:playlistId/tracks - Get all tracks from a playlist
router.get('/playlists/:playlistId/tracks', async (req: AuthRequest, res: Response) => {
	try {
		const { playlistId } = req.params;
		const filterPreview = (req.query.filterPreview as string || 'true').toLowerCase() === 'true';
		const limit = parseInt(req.query.limit as string) || 50;
		const offset = parseInt(req.query.offset as string) || 0;

		// Validate playlistId parameter
		if (!playlistId || typeof playlistId !== 'string') {
			return res.status(400).json({
				success: false,
				error: 'Playlist ID is required'
			});
		}

		const result = await SpotifyService.getPlaylistTracks(
			req.userId!,
			playlistId,
			filterPreview
		);

		// Handle pagination in response if offset/limit provided
		let paginatedTracks = result.tracks;
		if (offset > 0 || limit < result.tracks.length) {
			paginatedTracks = result.tracks.slice(offset, offset + limit);
		}

		res.json({
			success: true,
			data: {
				playlistId: result.playlistId,
				playlistName: result.playlistName,
				tracks: paginatedTracks,
				total: result.total,
				hasMore: result.hasMore,
				limit,
				offset
			}
		});
	} catch (error) {
		console.error('Error fetching playlist tracks:', error);
		res.status(502).json({
			success: false,
			error: 'Failed to fetch playlist tracks'
		});
	}
});
```

**Key Points:**
- Requires authentication and playlistId parameter
- Parses filterPreview, limit, and offset from query
- Client-side pagination (slice after fetching)
- Returns playlist metadata with tracks
- Includes hasMore flag for UI pagination
- Handles errors gracefully

---

## Integration Examples

### Example 1: Simple Genre Search

**Frontend Code:**
```javascript
async function searchGenre(genre) {
  try {
    const response = await fetch(
      `/api/spotify/playlists/search?query=${genre}&limit=10`,
      { credentials: 'include' }
    );

    const result = await response.json();

    if (result.success) {
      displayPlaylists(result.data.playlists);
    } else {
      showError(result.error);
    }
  } catch (error) {
    showError('Network error: ' + error.message);
  }
}

// Usage
searchGenre('pop');
searchGenre('workout');
searchGenre('sleep');
```

**Backend Flow:**
1. Frontend calls GET `/api/spotify/playlists/search?query=pop`
2. Route validates query parameter
3. `SpotifyService.searchPlaylists()` called
4. Spotify API Search endpoint called with `type=playlist`
5. Response transformed and returned
6. Frontend displays playlist results

---

### Example 2: Get Playlist Tracks for Swiping

**Frontend Code:**
```javascript
async function loadPlaylistForSwiping(playlistId) {
  try {
    const response = await fetch(
      `/api/spotify/playlists/${playlistId}/tracks?filterPreview=true&limit=50`,
      { credentials: 'include' }
    );

    const result = await response.json();

    if (result.success) {
      const { tracks, playlistName, total, hasMore } = result.data;

      // Initialize swipe interface with playlist tracks
      initializeSwipeInterface(tracks, playlistName);

      // Store pagination info for loading more
      state.playlistId = playlistId;
      state.hasMore = hasMore;
      state.currentOffset = 50;
    } else {
      showError(result.error);
    }
  } catch (error) {
    showError('Failed to load playlist');
  }
}

// Usage
loadPlaylistForSwiping('37i9dQZF1DWSJHnPb64wgD');
```

**Backend Flow:**
1. Frontend calls GET `/api/spotify/playlists/{id}/tracks`
2. Route validates playlistId parameter
3. `SpotifyService.getPlaylistTracks()` called
4. Service fetches playlist metadata
5. Service paginates through all tracks (100 per batch)
6. Tracks transformed and filtered
7. Response returned with pagination metadata
8. Frontend uses tracks for swipe interface

---

### Example 3: Pagination

**Frontend Code:**
```javascript
async function loadMorePlaylistTracks(playlistId, offset) {
  try {
    const response = await fetch(
      `/api/spotify/playlists/${playlistId}/tracks?limit=50&offset=${offset}`,
      { credentials: 'include' }
    );

    const result = await response.json();

    if (result.success) {
      const { tracks } = result.data;
      appendTracksToList(tracks);

      // Check if more tracks available
      if (result.data.hasMore) {
        state.nextOffset = offset + 50;
      }
    }
  } catch (error) {
    console.error('Failed to load more tracks');
  }
}

// Usage - Load next batch when user reaches end
if (currentTrackIndex >= tracks.length - 10) {
  loadMorePlaylistTracks(playlistId, state.nextOffset);
}
```

**How It Works:**
1. Frontend requests tracks with offset
2. Backend fetches all tracks from Spotify (automatic)
3. Backend slices response based on limit/offset
4. Frontend receives paginated batch
5. Frontend can request next batch by incrementing offset

---

## Error Handling Examples

### Search Validation

```typescript
// Input Validation
if (!query || typeof query !== 'string') {
  return res.status(400).json({
    success: false,
    error: 'Query parameter is required'
  });
}

// In Service
if (!query || query.trim().length === 0) {
  throw new Error('Query parameter cannot be empty');
}
```

### Token Refresh

```typescript
// Automatic token refresh in SpotifyService
static async getValidAccessToken(userId: string): Promise<string> {
	const user = await User.findById(userId);
	if (!user) throw new Error('User not found');

	// Check if token is expired or expiring within 5 minutes
	const now = new Date();
	const expiresAt = new Date(user.spotifyTokenExpiresAt!);
	const bufferTime = 5 * 60 * 1000; // 5 minutes

	if (now.getTime() + bufferTime >= expiresAt.getTime()) {
		// Token expired or expiring soon, refresh it
		await this.refreshAccessToken(userId);
		const updatedUser = await User.findById(userId);
		if (!updatedUser) throw new Error('User not found');
		return decryptToken(updatedUser.spotifyAccessToken!);
	}

	return decryptToken(user.spotifyAccessToken!);
}
```

### API Error Handling

```typescript
try {
	const response = await axios.get(`${this.API_BASE}/search`, {
		headers: { Authorization: `Bearer ${accessToken}` },
		params: { q: query, type: 'playlist', limit, offset }
	});
	// Process response
} catch (error) {
	console.error('Error searching playlists:', error);
	throw new Error('Failed to search playlists');
}

// Route error handler
catch (error) {
	console.error('Error searching playlists:', error);
	res.status(502).json({
		success: false,
		error: 'Failed to search playlists'
	});
}
```

---

## Testing Code Examples

### Unit Test - Search Playlists

```typescript
describe('SpotifyService.searchPlaylists', () => {
  it('should search playlists by query', async () => {
    const userId = 'test-user-id';
    const query = 'pop';

    const result = await SpotifyService.searchPlaylists(userId, query, 10, 0);

    expect(result).toHaveProperty('playlists');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('limit');
    expect(result).toHaveProperty('offset');
    expect(Array.isArray(result.playlists)).toBe(true);
  });

  it('should throw error on empty query', async () => {
    const userId = 'test-user-id';

    await expect(SpotifyService.searchPlaylists(userId, '', 10, 0))
      .rejects.toThrow('Query parameter cannot be empty');
  });

  it('should enforce limit max of 50', async () => {
    const userId = 'test-user-id';
    const query = 'pop';

    const result = await SpotifyService.searchPlaylists(userId, query, 100, 0);

    expect(result.playlists.length).toBeLessThanOrEqual(50);
  });
});
```

### Integration Test - Search Route

```typescript
describe('GET /api/spotify/playlists/search', () => {
  it('should return playlists for valid query', async () => {
    const response = await request(app)
      .get('/api/spotify/playlists/search')
      .query({ query: 'pop' })
      .set('Cookie', `jwt=${validToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('playlists');
  });

  it('should return 400 for missing query', async () => {
    const response = await request(app)
      .get('/api/spotify/playlists/search')
      .set('Cookie', `jwt=${validToken}`);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 401 for missing auth', async () => {
    const response = await request(app)
      .get('/api/spotify/playlists/search')
      .query({ query: 'pop' });

    expect(response.status).toBe(401);
  });
});
```

---

## Performance Considerations

### Memory Usage

```typescript
// Efficient: Only fetch needed tracks
const maxTracks = 500; // Cap to prevent OOM
const tracksToFetch = Math.min(totalTracks, maxTracks);

// Don't load all tracks if not needed
for (let offset = 0; offset < tracksToFetch; offset += batchSize) {
  // Process in batches
}
```

### API Call Optimization

```typescript
// Efficient: Use fields parameter to reduce response size
params: {
  fields: 'items(track(id,name,artists,album,duration_ms,preview_url,popularity))'
}

// Skip unnecessary data to improve speed
```

### Token Management

```typescript
// Efficient: Cache token and refresh proactively
const bufferTime = 5 * 60 * 1000; // Refresh 5 minutes early
if (now.getTime() + bufferTime >= expiresAt.getTime()) {
  // Refresh token
}
```

---

## Version Compatibility

### Dependencies Used

- **axios:** For HTTP requests to Spotify API
- **Express:** Framework for routing
- **TypeScript:** Type safety
- **MongoDB/Mongoose:** User token storage

### No New Dependencies Added

Both methods use existing project dependencies - no additional packages required.

---

## Future Enhancements

### Potential Improvements

1. **Caching:**
   - Cache playlist search results (5-minute TTL)
   - Cache playlist tracks after first fetch

2. **Advanced Filtering:**
   - Filter by playlist size
   - Filter by follower count
   - Filter by last updated date

3. **Sorting:**
   - Sort by popularity
   - Sort by follower count
   - Sort by alphabetical

4. **Analytics:**
   - Track popular search terms
   - Monitor API performance
   - Log playlist access

---

## Debugging Tips

### Enable Verbose Logging

```typescript
// In service methods
console.log('Searching playlists:', { userId, query, limit, offset });
console.log('Spotify API response:', response.data);
console.log('Transformed playlists:', result);
```

### Test with cURL

```bash
# Test search endpoint
curl -X GET "http://localhost:3001/api/spotify/playlists/search?query=pop&limit=10" \
  -H "Cookie: jwt=<token>" \
  -H "Content-Type: application/json" \
  -v

# Test tracks endpoint
curl -X GET "http://localhost:3001/api/spotify/playlists/37i9dQZF1DWSJHnPb64wgD/tracks?limit=50" \
  -H "Cookie: jwt=<token>" \
  -H "Content-Type: application/json" \
  -v
```

### Monitor Spotify API Limits

```typescript
// Log rate limit headers
console.log('Rate Limit:', response.headers['x-rate-limit-limit']);
console.log('Remaining:', response.headers['x-rate-limit-remaining']);
console.log('Reset:', response.headers['x-rate-limit-reset']);
```

---

## Summary

The implementation provides:
- **2 new service methods** in SpotifyService
- **2 new API endpoints** in routes
- **Automatic token refresh** for long operations
- **Smart pagination** handling
- **Consistent response format** with existing endpoints
- **Robust error handling** at all levels
- **Zero breaking changes** to existing code

All code follows existing patterns and conventions in the codebase.

