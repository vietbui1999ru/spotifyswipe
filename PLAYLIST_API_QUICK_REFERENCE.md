# Playlist Discovery API - Quick Reference

## Endpoints

### 1. Search Playlists by Genre/Mood

```
GET /api/spotify/playlists/search?query=pop&limit=10&offset=0
```

**Authentication:** Required (JWT cookie)

**Query Parameters:**
- `query` (required): Search term (e.g., "pop", "chill", "workout")
- `limit` (optional): Results per page (default: 10, max: 50)
- `offset` (optional): Pagination offset (default: 0)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "playlists": [
      {
        "id": "37i9dQZF1DWSJHnPb64wgD",
        "name": "Top 50 - Global",
        "description": "Your daily update of the most played tracks right now...",
        "imageUrl": "https://mosaic.scdn.co/300/...",
        "trackCount": 50,
        "followers": 10000000,
        "owner": "Spotify"
      }
    ],
    "total": 12345,
    "limit": 10,
    "offset": 0
  }
}
```

**Error Responses:**
- **400 Bad Request:** Missing query parameter
- **401 Unauthorized:** Not authenticated
- **502 Bad Gateway:** Spotify API error

**cURL Example:**
```bash
curl -X GET "http://localhost:3001/api/spotify/playlists/search?query=pop&limit=10" \
  -H "Cookie: jwt=<your_jwt_token>"
```

---

### 2. Get Playlist Tracks

```
GET /api/spotify/playlists/{playlistId}/tracks?filterPreview=true&limit=50&offset=0
```

**Authentication:** Required (JWT cookie)

**Path Parameters:**
- `playlistId` (required): Spotify playlist ID

**Query Parameters:**
- `filterPreview` (optional): Only return tracks with preview URLs (default: true)
- `limit` (optional): Results per page (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "playlistId": "37i9dQZF1DWSJHnPb64wgD",
    "playlistName": "Top 50 - Global",
    "tracks": [
      {
        "id": "1301WleyT98MSxVHPZCA6M",
        "name": "Blinding Lights",
        "artists": [
          {
            "id": "1Xyo4u8uILK2Cjl6B2SVu0",
            "name": "The Weeknd"
          }
        ],
        "album": {
          "id": "0VjIjW4GlUZAMYd2vXMwbk",
          "name": "After Hours",
          "imageUrl": "https://i.scdn.co/image/ab67616d0000b273..."
        },
        "durationMs": 200040,
        "previewUrl": "https://p.scdn.co/mp3-preview/...",
        "popularity": 96
      }
    ],
    "total": 50,
    "hasMore": false,
    "limit": 50,
    "offset": 0
  }
}
```

**Error Responses:**
- **400 Bad Request:** Missing playlistId
- **401 Unauthorized:** Not authenticated
- **404 Not Found:** Playlist not found
- **502 Bad Gateway:** Spotify API error

**cURL Example:**
```bash
curl -X GET "http://localhost:3001/api/spotify/playlists/37i9dQZF1DWSJHnPb64wgD/tracks?limit=50" \
  -H "Cookie: jwt=<your_jwt_token>"
```

---

## Common Use Cases

### Search Multiple Genres

```bash
# Pop playlists
curl -X GET "http://localhost:3001/api/spotify/playlists/search?query=pop" \
  -H "Cookie: jwt=<token>"

# Rock playlists
curl -X GET "http://localhost:3001/api/spotify/playlists/search?query=rock" \
  -H "Cookie: jwt=<token>"

# Chill/Relaxing playlists
curl -X GET "http://localhost:3001/api/spotify/playlists/search?query=chill" \
  -H "Cookie: jwt=<token>"

# Workout playlists
curl -X GET "http://localhost:3001/api/spotify/playlists/search?query=workout" \
  -H "Cookie: jwt=<token>"
```

### Pagination Examples

```bash
# Get second page of results (items 11-20)
curl -X GET "http://localhost:3001/api/spotify/playlists/search?query=pop&limit=10&offset=10" \
  -H "Cookie: jwt=<token>"

# Get first 100 items from a large playlist
curl -X GET "http://localhost:3001/api/spotify/playlists/37i9dQZF1DWSJHnPb64wgD/tracks?limit=100&offset=0" \
  -H "Cookie: jwt=<token>"

# Get next batch of playlist tracks
curl -X GET "http://localhost:3001/api/spotify/playlists/37i9dQZF1DWSJHnPb64wgD/tracks?limit=50&offset=50" \
  -H "Cookie: jwt=<token>"
```

### Filter by Preview Availability

```bash
# Only include tracks with preview URLs (default)
curl -X GET "http://localhost:3001/api/spotify/playlists/{playlistId}/tracks?filterPreview=true" \
  -H "Cookie: jwt=<token>"

# Include all tracks (some may not have previews)
curl -X GET "http://localhost:3001/api/spotify/playlists/{playlistId}/tracks?filterPreview=false" \
  -H "Cookie: jwt=<token>"
```

---

## Field Descriptions

### Playlist Object

| Field | Type | Description |
|-------|------|-------------|
| id | string | Spotify playlist ID |
| name | string | Playlist name |
| description | string | Playlist description (may be empty) |
| imageUrl | string \| null | Playlist cover image URL |
| trackCount | number | Total number of tracks in playlist |
| followers | number | Number of followers |
| owner | string | Playlist owner name |

### Track Object

| Field | Type | Description |
|-------|------|-------------|
| id | string | Spotify track ID |
| name | string | Song name |
| artists | Array | Array of artist objects |
| artists[].id | string | Artist ID |
| artists[].name | string | Artist name |
| album | Object | Album information |
| album.id | string | Album ID |
| album.name | string | Album name |
| album.imageUrl | string \| null | Album cover image URL |
| durationMs | number | Duration in milliseconds |
| previewUrl | string \| null | 30-second preview URL (may be null) |
| popularity | number | Popularity score (0-100) |

### Response Metadata

| Field | Type | Description |
|-------|------|-------------|
| total | number | Total items in full result set |
| limit | number | Items returned in this response |
| offset | number | Pagination offset used |
| hasMore | boolean | Whether more items are available (playlists endpoint) |

---

## Status Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 200 | Success | Request completed successfully |
| 400 | Bad Request | Missing/invalid parameters |
| 401 | Unauthorized | Missing or invalid JWT token |
| 404 | Not Found | Playlist doesn't exist or is private |
| 502 | Bad Gateway | Spotify API error or network issue |

---

## Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

**Example Error:**
```json
{
  "success": false,
  "error": "Query parameter is required"
}
```

---

## Frontend Integration Tips

### Using with Fetch API

```javascript
// Search playlists
const searchPlaylists = async (query, limit = 10, offset = 0) => {
  const response = await fetch(
    `/api/spotify/playlists/search?query=${query}&limit=${limit}&offset=${offset}`,
    { credentials: 'include' } // Important: send cookies
  );
  const data = await response.json();
  if (data.success) {
    return data.data.playlists;
  } else {
    throw new Error(data.error);
  }
};

// Get playlist tracks
const getPlaylistTracks = async (playlistId, limit = 50, offset = 0) => {
  const response = await fetch(
    `/api/spotify/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`,
    { credentials: 'include' }
  );
  const data = await response.json();
  if (data.success) {
    return data.data;
  } else {
    throw new Error(data.error);
  }
};

// Usage
const results = await searchPlaylists('pop', 10);
console.log(results); // Array of playlist objects

const playlistData = await getPlaylistTracks('37i9dQZF1DWSJHnPb64wgD');
console.log(playlistData.tracks); // Array of track objects
```

### Using with Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  withCredentials: true // Important: send cookies
});

// Search playlists
const searchPlaylists = (query, limit = 10, offset = 0) => {
  return api.get('/spotify/playlists/search', {
    params: { query, limit, offset }
  }).then(res => res.data.data.playlists);
};

// Get playlist tracks
const getPlaylistTracks = (playlistId, limit = 50, offset = 0) => {
  return api.get(`/spotify/playlists/${playlistId}/tracks`, {
    params: { limit, offset }
  }).then(res => res.data.data);
};
```

---

## Rate Limiting

These endpoints are subject to Spotify API rate limits:
- **General Limit:** 120 requests per minute per user
- **Recommendations:** No additional limits beyond general

**Handling Rate Limits:**
- Backend automatically retries on 429 responses
- Token refresh handled automatically
- Service returns 502 if limits exceeded

---

## Testing Playlist IDs

### Popular Spotify Playlists (for testing)

| Genre | Playlist ID | Name |
|-------|------------|------|
| Pop | 37i9dQZF1DWSJHnPb64wgD | Top 50 - Global |
| Rock | 37i9dQZF1DX0L0Sz4wqEAv | RockThis |
| Hip-Hop | 37i9dQZF1DX0XUsuxWHRQd | RapCaviar |
| Indie | 37i9dQZF1DX4UtSsGT1Sbe | Indie Mix |
| Chill | 37i9dQZF1DWU0scTgaV9bM | Peaceful Piano |
| Workout | 37i9dQZF1DX76Wlfdnj86P | Power Workout |
| Sleep | 37i9dQZF1DXBqcOcF60wrq | Deep Sleep |

---

## Troubleshooting

### "Query parameter is required"
- Make sure `?query=something` is in the URL
- Query must be non-empty string

### "Playlist ID is required"
- Make sure playlist ID is in URL path: `/playlists/{id}/tracks`
- Check for typos in playlist ID

### "Not authenticated" (401)
- Ensure JWT cookie is being sent
- Check if JWT token has expired
- Login again to get fresh token

### "Playlist not found" (404)
- Playlist may be private or deleted
- Check if playlist ID is correct
- Try with a known public playlist

### No preview URLs in response
- Many tracks don't have preview URLs
- Use `filterPreview=true` to only get tracks with previews
- Check `previewUrl` field (may be null)

---

## Performance Recommendations

1. **Limit Search Results**
   - Default limit of 10 is good for initial UI
   - Max 50 results per request

2. **Playlist Pagination**
   - Use limit of 50-100 for optimal performance
   - Implement client-side caching of results

3. **Preview Filtering**
   - Enable `filterPreview=true` for swipe interface
   - Reduces number of non-playable tracks

4. **Batch Requests**
   - Get multiple playlist details in sequence
   - Backend handles pagination internally

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-04 | Initial implementation |

