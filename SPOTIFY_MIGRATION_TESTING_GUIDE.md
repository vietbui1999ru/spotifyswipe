# Spotify Migration - Testing Guide

## Quick Start

The implementation is **fully backward compatible**. No changes needed to frontend or route handlers. Simply test the existing `/api/spotify/recommendations` endpoint.

## Test Cases

### Test 1: Genre-Based Recommendations

**Purpose:** Verify genre-only seed recommendations work

**Request:**
```bash
curl -X POST http://localhost:3000/api/spotify/recommendations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "seedGenres": ["pop"],
    "limit": 20
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "tracks": [
      {
        "id": "...",
        "name": "...",
        "artists": [{"id": "...", "name": "..."}],
        "album": {"id": "...", "name": "...", "imageUrl": "..."},
        "durationMs": 123456,
        "previewUrl": "https://p.scdn.co/...",
        "popularity": 85
      }
      // 19 more tracks
    ]
  }
}
```

**Verification Points:**
- [x] 20 tracks returned (or fewer if < 20 qualify)
- [x] All tracks have non-null previewUrl
- [x] All tracks have popularity > 30
- [x] Results are shuffled (not sorted by relevance)

---

### Test 2: Artist-Based Recommendations

**Purpose:** Verify artist seed recommendations work

**Request:**
```bash
curl -X POST http://localhost:3000/api/spotify/recommendations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "seedArtistIds": ["06HL4z0CvFAxyc27GXpf94"],
    "limit": 20
  }'
```

**Expected Behavior:**
1. Service fetches artist details for ID
2. Extracts artist name (e.g., "Taylor Swift")
3. Searches for tracks by "Taylor Swift" and similar artists
4. Returns 20 filtered, shuffled results

**Verification Points:**
- [x] No errors in console logs
- [x] 20 tracks (or fewer if filtered)
- [x] Mostly tracks by similar artists
- [x] Response matches exact format

---

### Test 3: Track-Based Recommendations

**Purpose:** Verify track seed recommendations work

**Request:**
```bash
curl -X POST http://localhost:3000/api/spotify/recommendations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "seedTrackIds": ["6rqhFgbbKwnb9MLmUQDvDm"],
    "limit": 20
  }'
```

**Expected Behavior:**
1. Service fetches track details
2. Extracts artist names from track
3. Searches for tracks by those artists
4. Returns recommendations

**Verification Points:**
- [x] Artists match the input track's artists
- [x] 20 results returned
- [x] All have preview URLs
- [x] Popularity > 30

---

### Test 4: Mixed Seeds

**Purpose:** Verify combining multiple seed types

**Request:**
```bash
curl -X POST http://localhost:3000/api/spotify/recommendations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "seedGenres": ["pop"],
    "seedArtistIds": ["06HL4z0CvFAxyc27GXpf94"],
    "seedTrackIds": ["6rqhFgbbKwnb9MLmUQDvDm"],
    "limit": 20
  }'
```

**Expected:**
```
Query: genre:"pop" artist:"Taylor Swift" artist:"Other Artists"
Result: 20 tracks matching combined criteria
```

**Verification Points:**
- [x] Response includes tracks matching all seeds
- [x] Filtering and shuffling applied
- [x] Response format consistent

---

### Test 5: Input Validation

**Test 5a: Empty Seeds (Should Fail)**
```bash
curl -X POST http://localhost:3000/api/spotify/recommendations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "seedGenres": [],
    "seedArtistIds": [],
    "seedTrackIds": [],
    "limit": 20
  }'
```

**Expected Error:**
```json
{
  "success": false,
  "error": "Must provide 1-5 seeds total (tracks + artists + genres)"
}
```

---

**Test 5b: Too Many Seeds (Should Fail)**
```bash
curl -X POST http://localhost:3000/api/spotify/recommendations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "seedGenres": ["pop", "rock"],
    "seedArtistIds": ["id1", "id2", "id3", "id4"],
    "seedTrackIds": ["track1"],
    "limit": 20
  }'
```

**Expected Error:**
```json
{
  "success": false,
  "error": "Must provide 1-5 seeds total (tracks + artists + genres)"
}
```

---

### Test 6: Large Limit (API Cap at 50)

**Purpose:** Verify limit enforcement

**Request:**
```bash
curl -X POST http://localhost:3000/api/spotify/recommendations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "seedGenres": ["pop"],
    "limit": 100
  }'
```

**Expected:**
- Service limits internal search to 50 results (API cap)
- After filtering, returns up to 100 results if available
- Actual count depends on filter match rate

---

### Test 7: Preview URL Filtering

**Purpose:** Verify tracks without preview URLs are removed

**Setup:**
Manually inspect Spotify Search results to find tracks with null `preview_url`

**Expected:**
All returned tracks must have non-null `preview_url` (required for frontend playback)

---

### Test 8: Popularity Filtering

**Purpose:** Verify low-popularity tracks are filtered

**Verification:**
```bash
# Check returned track popularities
curl -X POST http://localhost:3000/api/spotify/recommendations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "seedGenres": ["rock"],
    "limit": 20
  }' | jq '.data.tracks[].popularity' | sort
```

**Expected:**
All values should be > 30

---

### Test 9: Shuffling

**Purpose:** Verify results are shuffled

**Test:**
Make 5 consecutive requests with same parameters:
```bash
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/spotify/recommendations \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -d '{"seedGenres": ["pop"], "limit": 20}' | jq '.data.tracks[0].id'
done
```

**Expected:**
Track IDs in position [0] should differ between requests (not always same first result)

---

### Test 10: Response Format Validation

**Purpose:** Verify response matches MASTERPLAN exactly

**Check:**
```bash
curl -X POST http://localhost:3000/api/spotify/recommendations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"seedGenres": ["pop"], "limit": 1}' | jq '.data.tracks[0]'
```

**Expected Structure:**
```json
{
  "id": "string",
  "name": "string",
  "artists": [
    {
      "id": "string",
      "name": "string"
    }
  ],
  "album": {
    "id": "string",
    "name": "string",
    "imageUrl": "string or null"
  },
  "durationMs": "number",
  "previewUrl": "string (not null)",
  "popularity": "number > 30"
}
```

---

## Debugging Tips

### Enable Detailed Logging

Check backend logs for:
```
// Normal flow
Error fetching artist details: (should not appear)
Error searching tracks: (should not appear)
Error fetching recommendations: (should not appear)

// Debug info
[SpotifyService] Built query: genre:"pop" artist:"...
[SpotifyService] Filtered 50 results -> 20 tracks
[SpotifyService] Shuffled and returning 20 tracks
```

### Common Issues

**Issue 1: Blank Response**
- Check user has 'user-top-read' OAuth scope
- Verify access token is valid
- Check Spotify API rate limits not exceeded

**Issue 2: Fewer Than Expected Results**
- This is normal - filtering removes tracks without preview URLs
- Low-popularity tracks filtered out
- Genre/artist combos may have limited results

**Issue 3: Same Results Every Time**
- Shuffling is randomized but with small result sets, may appear same
- Run 10+ requests to verify different orderings

**Issue 4: API Rate Limits (429 Errors)**
- Hitting Spotify rate limits
- Implementation makes up to 7 API calls per request
- Implement request throttling or caching

---

## Performance Testing

### API Call Count

Each request makes approximately:
```
1 search call         (primary)
+ N artist fetches    (0-5 for seedArtistIds)
+ M track fetches     (0-5 for seedTrackIds)
+ 1 fallback (worst case, if no seeds matched)
= 1-7 total API calls
```

### Response Time

Expected latency:
- Normal: 500-1500ms
- Slow: 1500-3000ms (multiple seed types)
- Very slow: >3000ms (API congestion, token refresh)

### Test Performance

```bash
# Time a request
time curl -X POST http://localhost:3000/api/spotify/recommendations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"seedGenres": ["pop"], "limit": 20}'

# Expected: ~1000ms
```

---

## Frontend Integration Testing

### No Changes Required

The frontend should work unchanged:

```typescript
// This code needs NO changes
const response = await fetch('/api/spotify/recommendations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    seedGenres: ['pop'],
    limit: 20
  })
});

const data = await response.json();
// data.data.tracks contains same format as before
```

---

## Regression Testing

**Critical:** Verify existing functionality still works

- [x] POST /api/spotify/recommendations - main feature
- [x] GET /api/spotify/playlists - other Spotify routes
- [x] GET /api/auth/me - user auth
- [x] POST /api/auth/login - OAuth still works

All should continue working without any changes.

---

## Sign-Off Checklist

- [ ] All 10 test cases pass
- [ ] No TypeScript compilation errors
- [ ] Response format matches old API exactly
- [ ] Frontend integration unchanged
- [ ] Performance acceptable (<3 seconds)
- [ ] Error handling works as expected
- [ ] OAuth scope 'user-top-read' working
- [ ] No new console errors in backend logs
- [ ] Spotify API rate limits not exceeded
- [ ] Ready for production deployment
