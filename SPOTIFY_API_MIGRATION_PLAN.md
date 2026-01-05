# Spotify Recommendations API to Search API Migration Plan

**Status:** READY FOR IMPLEMENTATION
**Priority:** CRITICAL
**Estimated Effort:** 8 hours
**Created:** 2026-01-04
**Owner:** Tech Lead / Product Manager

---

## Executive Summary

Spotify has deprecated the Recommendations API (`/v1/recommendations`). This document outlines a comprehensive migration plan to replace it with the Search API (`/v1/search`) while maintaining similar user experience and functionality.

### Impact Analysis

**Severity:** HIGH - Core feature dependency
**Scope:** Backend service layer, frontend hooks, and test suites
**User Impact:** Minimal if migration executed correctly
**Timeline:** Must complete before Recommendations API sunset date

---

## Table of Contents

1. [Current Implementation Analysis](#current-implementation-analysis)
2. [API Comparison](#api-comparison)
3. [Migration Strategy](#migration-strategy)
4. [Affected Files](#affected-files)
5. [Implementation Plan](#implementation-plan)
6. [Testing Strategy](#testing-strategy)
7. [Rollback Plan](#rollback-plan)
8. [Risk Assessment](#risk-assessment)

---

## Current Implementation Analysis

### Backend: SpotifyService.getRecommendations()

**File:** `/spotifyswipe-backend/src/services/SpotifyService.ts` (Lines 111-169)

**Current Behavior:**
- Endpoint: `GET /v1/recommendations`
- Parameters:
  - `seed_tracks`: comma-separated track IDs (max 5)
  - `seed_artists`: comma-separated artist IDs (max 5)
  - `seed_genres`: comma-separated genre names (max 5)
  - `limit`: number of tracks (max 50)
- Validation: Total seeds must be 1-5
- Returns: Personalized track recommendations with preview URLs

**Dependencies:**
- Called by: `/api/spotify/recommendations` route
- Used by: Frontend `useTrackQueue` hook

### Backend: Spotify Route Handler

**File:** `/spotifyswipe-backend/src/routes/spotify.ts` (Lines 31-73)

**Current Behavior:**
- Route: `GET /api/spotify/recommendations`
- Query Parameters: `limit`, `seedTrackIds`, `seedArtistIds`, `seedGenres`
- Authentication: Required (JWT middleware)
- Error Handling: Returns 502 on Spotify API failure

### Frontend: useTrackQueue Hook

**File:** `/spotifyswipe-frontend/src/hooks/useTrackQueue.ts` (Lines 58-113)

**Current Behavior:**
- Fetches recommendations with seed parameters
- Filters tracks without preview URLs
- Auto-refills queue when threshold reached (5 tracks remaining)
- Maintains queue of 20+ tracks
- Default seeds: `'pop,rock,indie'` genres

**State Management:**
- `tracks`: Array of Track objects
- `currentIndex`: Current position in queue
- `isLoading`: Fetch state
- `error`: Error messages
- `hasMore`: Whether more tracks can be fetched

### Frontend: Swipe Page Integration

**File:** `/spotifyswipe-frontend/src/app/dashboard/swipe/page.tsx` (Lines 20-35)

**Current Usage:**
- Initializes useTrackQueue with `seedGenres: 'pop,rock,indie'`
- Default `initialLimit: 20`
- `refillThreshold: 5`

---

## API Comparison

### Recommendations API (Current - Deprecated)

```
GET /v1/recommendations
Query Parameters:
  - seed_tracks: string (comma-separated IDs, max 5)
  - seed_artists: string (comma-separated IDs, max 5)
  - seed_genres: string (comma-separated, max 5)
  - limit: number (max 50)
  - market: string (optional)

Response:
{
  "tracks": [
    {
      "id": "track_id",
      "name": "Track Name",
      "artists": [{"id": "artist_id", "name": "Artist"}],
      "album": {...},
      "duration_ms": 210000,
      "preview_url": "https://...",
      "popularity": 75
    }
  ],
  "seeds": [...]
}
```

**Advantages:**
- Personalized recommendations based on seeds
- Optimized for discovery
- Returns preview URLs (when available)
- Consistent quality of results

**Disadvantages:**
- DEPRECATED (sunset date approaching)
- Limited to 5 seeds total
- No control over result diversity

### Search API (Replacement)

```
GET /v1/search
Query Parameters:
  - q: string (search query)
  - type: string (comma-separated: "track,artist,album,playlist")
  - limit: number (max 50 per type)
  - offset: number (pagination)
  - market: string (optional)

Response:
{
  "tracks": {
    "items": [
      {
        "id": "track_id",
        "name": "Track Name",
        "artists": [{"id": "artist_id", "name": "Artist"}],
        "album": {...},
        "duration_ms": 210000,
        "preview_url": "https://...",
        "popularity": 75
      }
    ],
    "total": 1000,
    "limit": 20,
    "offset": 0
  }
}
```

**Advantages:**
- Not deprecated (stable API)
- Flexible search queries
- Supports pagination with offset
- Can search multiple entity types
- No seed limitations

**Disadvantages:**
- Requires crafting search queries from seeds
- Not inherently personalized
- May return less relevant results without good queries
- Requires additional logic to convert seeds to queries

---

## Migration Strategy

### Approach: Hybrid Search Query Construction

We will implement a **smart query builder** that converts seed parameters into effective search queries:

1. **Seed to Query Mapping:**
   - **Track Seeds:** Use track names + artist names as query terms
   - **Artist Seeds:** Use artist names as query terms
   - **Genre Seeds:** Use genre names as query filters

2. **Query Enhancement:**
   - Fetch user's top tracks/artists to enhance seed-based queries
   - Randomize query variations to increase diversity
   - Apply popularity and recency filters

3. **Result Optimization:**
   - Deduplicate tracks across multiple searches
   - Filter by preview URL availability
   - Maintain track quality (popularity > 30)
   - Shuffle results for variety

4. **Fallback Strategy:**
   - If seeds provided: Use seed-based search
   - If no seeds: Search user's top artists + popular tracks
   - If all fails: Use genre-based broad search

### Query Construction Examples

**Example 1: Genre Seeds**
```
Input: seedGenres = ['pop', 'rock', 'indie']
Query: "genre:pop OR genre:rock OR genre:indie"
Type: track
Limit: 50
```

**Example 2: Track Seeds**
```
Input: seedTrackIds = ['track1', 'track2']
Step 1: Fetch track details (names + artists)
Step 2: Query = "artist:Coldplay OR artist:Radiohead"
Type: track
Limit: 50
```

**Example 3: Mixed Seeds**
```
Input:
  - seedGenres = ['electronic']
  - seedArtistIds = ['artist1']
Step 1: Fetch artist details
Step 2: Query = "genre:electronic artist:Daft Punk"
Type: track
Limit: 50
```

**Example 4: No Seeds (Fallback)**
```
Step 1: Fetch user's top artists (5 artists)
Step 2: Query = "artist:ArtistA OR artist:ArtistB OR artist:ArtistC"
Type: track
Limit: 50
```

---

## Affected Files

### Backend Files (4 files)

| File | Impact | Changes Required |
|------|--------|------------------|
| `spotifyswipe-backend/src/services/SpotifyService.ts` | HIGH | Rewrite `getRecommendations()` method to use Search API |
| `spotifyswipe-backend/src/routes/spotify.ts` | LOW | No changes (route signature remains same) |
| `spotifyswipe-backend/src/routes/__tests__/swipe.test.ts` | MEDIUM | Update test expectations if response format changes |
| `spotifyswipe-backend/src/routes/__tests__/playlists.test.ts` | LOW | No changes (playlists don't use recommendations) |

### Frontend Files (2 files)

| File | Impact | Changes Required |
|------|--------|------------------|
| `spotifyswipe-frontend/src/hooks/useTrackQueue.ts` | LOW | No changes (API contract unchanged) |
| `spotifyswipe-frontend/src/app/dashboard/swipe/page.tsx` | LOW | No changes (uses hook abstraction) |

### New Files to Create (1 file)

| File | Purpose |
|------|---------|
| `spotifyswipe-backend/src/services/__tests__/SpotifyService.test.ts` | Unit tests for new Search API implementation |

---

## Implementation Plan

### Phase 1: Backend Service Layer (4 hours)

**Agent:** backend-code-writer

#### Task 1.1: Implement Search API Helper Methods

**File:** `spotifyswipe-backend/src/services/SpotifyService.ts`

**New Methods to Add:**

```typescript
/**
 * Search for tracks using Spotify Search API
 */
static async searchTracks(
  userId: string,
  query: string,
  limit: number = 20,
  offset: number = 0
): Promise<any>

/**
 * Get details for a single track
 */
static async getTrackDetails(
  userId: string,
  trackId: string
): Promise<any>

/**
 * Get details for a single artist
 */
static async getArtistDetails(
  userId: string,
  artistId: string
): Promise<any>
```

**Implementation Details:**
- Use endpoint: `GET /v1/search?type=track&q=...`
- Response parsing: Extract `tracks.items` array
- Error handling: Same pattern as existing methods
- Token refresh: Use existing `getValidAccessToken()`

#### Task 1.2: Rewrite getRecommendations() Method

**File:** `spotifyswipe-backend/src/services/SpotifyService.ts`

**Replacement Strategy:**

```typescript
/**
 * Get personalized recommendations using Search API
 * Replaces deprecated Recommendations API
 */
static async getRecommendations(
  userId: string,
  seedTrackIds: string[] = [],
  seedArtistIds: string[] = [],
  seedGenres: string[] = [],
  limit: number = 20
): Promise<any> {
  // Step 1: Validate inputs (keep existing validation)

  // Step 2: Build search query based on seeds
  let searchQuery = '';

  if (seedGenres.length > 0) {
    // Use genre-based search
    searchQuery = seedGenres.map(g => `genre:"${g}"`).join(' OR ');
  }

  if (seedArtistIds.length > 0) {
    // Fetch artist details and add to query
    const artists = await Promise.all(
      seedArtistIds.map(id => this.getArtistDetails(userId, id))
    );
    const artistQuery = artists.map(a => `artist:"${a.name}"`).join(' OR ');
    searchQuery = searchQuery ? `${searchQuery} ${artistQuery}` : artistQuery;
  }

  if (seedTrackIds.length > 0) {
    // Fetch track details and use artist names
    const tracks = await Promise.all(
      seedTrackIds.map(id => this.getTrackDetails(userId, id))
    );
    const trackArtists = tracks.flatMap(t => t.artists.map(a => a.name));
    const uniqueArtists = [...new Set(trackArtists)];
    const artistQuery = uniqueArtists.map(a => `artist:"${a}"`).join(' OR ');
    searchQuery = searchQuery ? `${searchQuery} ${artistQuery}` : artistQuery;
  }

  // Step 3: Fallback if no seeds provided
  if (!searchQuery) {
    const topArtists = await this.getTopArtists(userId, 5);
    searchQuery = topArtists.map(a => `artist:"${a.name}"`).join(' OR ');
  }

  // Step 4: Execute search
  const results = await this.searchTracks(userId, searchQuery, limit * 2, 0);

  // Step 5: Filter and transform results
  const tracks = results.tracks.items
    .filter(track => track.preview_url !== null) // Only tracks with previews
    .filter(track => track.popularity > 30)     // Quality filter
    .slice(0, limit);                           // Limit results

  // Step 6: Shuffle for variety
  const shuffled = tracks.sort(() => Math.random() - 0.5);

  // Step 7: Return in same format as old API
  return {
    tracks: shuffled.map((track: any) => ({
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
    }))
  };
}
```

**Key Changes:**
1. Replace `/v1/recommendations` endpoint with `/v1/search`
2. Convert seeds to search queries
3. Fetch track/artist details for seed resolution
4. Apply filters (preview URL, popularity)
5. Shuffle results for diversity
6. Maintain identical return format (backward compatible)

**Backward Compatibility:**
- Method signature: UNCHANGED
- Parameters: UNCHANGED
- Return type: UNCHANGED
- Calling code: NO CHANGES NEEDED

#### Task 1.3: Add OAuth Scopes (if needed)

**File:** `spotifyswipe-backend/src/routes/auth.ts`

**Check Current Scopes:**
```typescript
const scopes = [
  'user-read-email',
  'user-read-private',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read',
  'user-top-read' // Required for fallback (top artists/tracks)
];
```

**Action:** Verify `user-top-read` scope is present. Add if missing.

### Phase 2: Backend Testing (2 hours)

**Agent:** jest-unit-tester

#### Task 2.1: Create SpotifyService Unit Tests

**File:** `spotifyswipe-backend/src/services/__tests__/SpotifyService.test.ts` (NEW)

**Test Coverage:**

```typescript
describe('SpotifyService - Search API Methods', () => {
  describe('searchTracks()', () => {
    test('should search tracks with query');
    test('should handle pagination with offset');
    test('should refresh token if expired');
    test('should throw error on API failure');
  });

  describe('getTrackDetails()', () => {
    test('should fetch single track details');
    test('should handle invalid track ID');
  });

  describe('getArtistDetails()', () => {
    test('should fetch single artist details');
    test('should handle invalid artist ID');
  });

  describe('getRecommendations() - New Implementation', () => {
    test('should generate query from genre seeds');
    test('should generate query from artist seeds');
    test('should generate query from track seeds');
    test('should combine multiple seed types');
    test('should fallback to top artists when no seeds');
    test('should filter tracks without preview URLs');
    test('should filter tracks with low popularity');
    test('should shuffle results for diversity');
    test('should limit results to requested count');
    test('should throw error when API fails');
    test('should maintain backward compatible format');
  });
});
```

**Mocking Strategy:**
- Mock `axios.get()` for Spotify API calls
- Mock `User.findById()` for token retrieval
- Verify query construction logic
- Assert response format matches old API

#### Task 2.2: Update Swipe Session Tests

**File:** `spotifyswipe-backend/src/routes/__tests__/swipe.test.ts`

**Changes:**
- Mock `SpotifyService.getRecommendations()` responses
- Verify session creation still works
- Ensure swipe actions recorded correctly

**No structural changes expected** - tests should pass with new implementation since API contract unchanged.

#### Task 2.3: Update Playlist Tests

**File:** `spotifyswipe-backend/src/routes/__tests__/playlists.test.ts`

**Changes:**
- None (playlists don't depend on recommendations API)

**Action:** Run existing tests to verify no regressions.

### Phase 3: Frontend Updates (1 hour)

**Agent:** frontend-code-writer

#### Task 3.1: Review Frontend Hook (No Changes Expected)

**File:** `spotifyswipe-frontend/src/hooks/useTrackQueue.ts`

**Verification Steps:**
1. Confirm hook calls `/api/spotify/recommendations` (unchanged endpoint)
2. Verify parameter names match backend expectations
3. Test error handling with new implementation
4. Confirm preview URL filtering still works

**Expected Changes:** NONE (backend maintains API contract)

#### Task 3.2: Review Swipe Page (No Changes Expected)

**File:** `spotifyswipe-frontend/src/app/dashboard/swipe/page.tsx`

**Verification Steps:**
1. Confirm default seed parameters still valid
2. Test track queue auto-refill
3. Verify audio preview playback
4. Check error messages display correctly

**Expected Changes:** NONE

#### Task 3.3: Optional UI Enhancement (If Time Permits)

**Enhancement:** Add seed configuration UI

**Features:**
- Genre selector dropdown
- "Use my top artists" checkbox
- "Surprise me" random mode

**Priority:** LOW (nice-to-have, not required for migration)

### Phase 4: Integration Testing (1 hour)

**Agent:** jest-unit-tester

#### Task 4.1: End-to-End Testing

**Test Scenarios:**

1. **Basic Flow:**
   - Login via Spotify OAuth
   - Navigate to `/dashboard/swipe`
   - Verify tracks load (20 tracks)
   - Verify preview URLs present
   - Swipe right/left multiple times
   - Verify queue auto-refills at threshold

2. **Seed Variations:**
   - Test with default genre seeds (`'pop,rock,indie'`)
   - Test with custom genre seeds
   - Test with no seeds (fallback to top artists)
   - Test with track seeds (if implemented)

3. **Error Handling:**
   - Test with expired Spotify token (auto-refresh)
   - Test with network failure (retry logic)
   - Test with empty search results (fallback)

4. **Performance:**
   - Measure API response time (should be < 500ms p95)
   - Verify no memory leaks in queue management
   - Check browser console for errors

#### Task 4.2: Regression Testing

**Verify Existing Features:**
- Swipe session creation
- Like/dislike tracking
- Save to playlist functionality
- Playlist CRUD operations
- Audio preview playback

**Acceptance Criteria:**
- All existing features work unchanged
- No console errors
- No failed API calls
- User experience feels identical

---

## Testing Strategy

### Unit Tests (Backend)

**Framework:** Jest
**Coverage Target:** 80%+

**Test Files:**
- `spotifyswipe-backend/src/services/__tests__/SpotifyService.test.ts` (NEW)
- `spotifyswipe-backend/src/routes/__tests__/swipe.test.ts` (UPDATE)
- `spotifyswipe-backend/src/routes/__tests__/playlists.test.ts` (VERIFY)

**Mocking:**
- Mock Spotify API responses with realistic data
- Mock MongoDB User model
- Mock JWT token generation

### Integration Tests

**Manual Testing Checklist:**

- [ ] Login with Spotify works
- [ ] Swipe page loads recommendations
- [ ] Tracks have preview URLs
- [ ] Audio playback works
- [ ] Swipe left records dislike
- [ ] Swipe right records like
- [ ] Queue auto-refills when low
- [ ] Save to playlist works
- [ ] No console errors
- [ ] Network tab shows correct API calls

**Automated E2E Tests (Optional):**
- Use Playwright or Cypress
- Test full user flow
- Run in CI/CD pipeline

### Performance Testing

**Metrics to Monitor:**
- API response time: < 500ms (p95)
- Time to first track: < 2s
- Queue refill latency: < 1s
- Memory usage: stable over time

**Load Testing:**
- Simulate 10 concurrent users
- Verify no rate limiting issues
- Check token refresh under load

---

## Rollback Plan

### Rollback Trigger Conditions

1. **Critical Bugs:**
   - Search API returns no results consistently
   - Preview URLs missing for >50% of tracks
   - Token refresh fails
   - App crashes or freezes

2. **Performance Degradation:**
   - API response time > 2s (p95)
   - Queue refill takes > 5s
   - High error rate (>5%)

3. **User Experience Issues:**
   - Recommendations irrelevant
   - Same tracks repeat frequently
   - Genre filtering broken

### Rollback Steps

**Option 1: Git Revert (Immediate)**
```bash
# Identify migration commit
git log --oneline | grep "Migrate to Search API"

# Revert the commit
git revert <commit-hash>

# Push to production
git push origin main
```

**Option 2: Feature Flag (If Implemented)**
```typescript
// Backend: SpotifyService.ts
static async getRecommendations(...) {
  if (process.env.USE_SEARCH_API === 'true') {
    return this.getRecommendationsViaSearch(...);
  } else {
    return this.getRecommendationsViaOldAPI(...);
  }
}
```

**Option 3: Code Swap**
- Keep old `getRecommendations()` as `getRecommendationsLegacy()`
- Swap implementation pointers
- Deploy hotfix

### Post-Rollback Actions

1. Create incident report with failure details
2. Analyze root cause (logs, metrics)
3. Fix issues in staging environment
4. Re-test thoroughly before retry
5. Communicate timeline to stakeholders

---

## Risk Assessment

### High Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Search API returns irrelevant tracks | Medium | High | Implement smart query construction with fallbacks |
| Too few tracks with preview URLs | Medium | High | Increase search limit (2x), filter aggressively |
| Performance degradation (slower than Recommendations API) | Medium | Medium | Cache artist/track lookups, parallelize requests |
| Spotify rate limits hit | Low | High | Implement exponential backoff, request batching |

### Medium Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Genre queries don't work as expected | Medium | Medium | Test genre search extensively, add genre mapping |
| User's top artists API fails | Low | Medium | Add fallback to popular tracks search |
| OAuth scope missing for top artists | Low | Medium | Update scope in auth flow, require re-login |
| Response format differs slightly | Low | Low | Add transformation layer, write adapters |

### Low Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Frontend hook needs updates | Low | Low | Test thoroughly, update if needed |
| Swipe page UI breaks | Low | High | Comprehensive E2E tests before deploy |
| Test suites fail | Medium | Low | Update test expectations, fix mocks |

### Risk Mitigation Summary

1. **Extensive Testing:** Unit, integration, and E2E tests
2. **Feature Flag:** Optional toggle between old/new APIs
3. **Gradual Rollout:** Deploy to staging first, then production
4. **Monitoring:** Track error rates, response times, user engagement
5. **Rollback Plan:** Quick revert if critical issues arise

---

## Success Criteria

### Technical Metrics

- [ ] All unit tests pass (80%+ coverage)
- [ ] All integration tests pass
- [ ] API response time < 500ms (p95)
- [ ] Error rate < 1%
- [ ] Zero console errors
- [ ] Preview URL availability > 70%

### User Experience Metrics

- [ ] Recommendations feel relevant
- [ ] No noticeable performance difference
- [ ] Queue refills seamlessly
- [ ] Audio playback works flawlessly
- [ ] No user-reported bugs

### Business Metrics

- [ ] Daily active users unchanged
- [ ] Swipe session completion rate unchanged
- [ ] Playlist creation rate unchanged
- [ ] User retention rate unchanged

---

## Timeline

### Detailed Schedule

| Phase | Duration | Owner | Deliverables |
|-------|----------|-------|--------------|
| Phase 1: Backend Service | 4 hours | backend-code-writer | New Search API methods, updated getRecommendations() |
| Phase 2: Backend Testing | 2 hours | jest-unit-tester | Unit tests, test coverage report |
| Phase 3: Frontend Updates | 1 hour | frontend-code-writer | Verified hooks, optional UI enhancements |
| Phase 4: Integration Testing | 1 hour | jest-unit-tester | E2E test results, performance report |

**Total Estimated Effort:** 8 hours

### Milestone Checklist

- [ ] **Hour 0-4:** Backend implementation complete
  - [ ] searchTracks() method added
  - [ ] getTrackDetails() method added
  - [ ] getArtistDetails() method added
  - [ ] getRecommendations() rewritten
  - [ ] OAuth scopes verified
  - [ ] Code review passed

- [ ] **Hour 4-6:** Backend tests complete
  - [ ] SpotifyService unit tests written (11 tests)
  - [ ] Swipe session tests updated
  - [ ] All tests passing
  - [ ] Coverage > 80%

- [ ] **Hour 6-7:** Frontend verification complete
  - [ ] useTrackQueue hook verified
  - [ ] Swipe page verified
  - [ ] No changes needed (or changes implemented)

- [ ] **Hour 7-8:** Integration testing complete
  - [ ] E2E tests passed
  - [ ] Performance tests passed
  - [ ] Regression tests passed
  - [ ] Deployment ready

---

## Agent Task Delegations

### Task Delegation 1: Backend Implementation

**Agent:** backend-code-writer
**Priority:** P0 (Critical)
**Estimated Time:** 4 hours

**Task Description:**
Migrate SpotifyService from deprecated Recommendations API to Search API. Implement query construction logic that converts seed parameters into effective search queries while maintaining backward compatibility.

**Acceptance Criteria:**
1. New methods implemented: `searchTracks()`, `getTrackDetails()`, `getArtistDetails()`
2. `getRecommendations()` method rewritten to use Search API
3. Method signature unchanged (backward compatible)
4. Return format matches old API exactly
5. Handles genre, artist, and track seeds
6. Implements fallback to user's top artists
7. Filters tracks without preview URLs
8. Shuffles results for diversity
9. No changes needed in route handlers
10. Code compiles without errors

**Files to Modify:**
- `spotifyswipe-backend/src/services/SpotifyService.ts`

**Files to Verify:**
- `spotifyswipe-backend/src/routes/spotify.ts` (should need no changes)
- `spotifyswipe-backend/src/routes/auth.ts` (verify OAuth scopes)

**Testing Requirements:**
- Run backend TypeScript compiler: `npm run build`
- Verify no compilation errors
- Manually test with Postman or curl

### Task Delegation 2: Backend Test Suite

**Agent:** jest-unit-tester
**Priority:** P0 (Critical)
**Estimated Time:** 2 hours

**Task Description:**
Create comprehensive unit tests for the new Search API implementation in SpotifyService. Update existing test files to work with the new implementation.

**Acceptance Criteria:**
1. New test file created: `SpotifyService.test.ts` with 11+ tests
2. All tests pass with new implementation
3. Test coverage > 80% for SpotifyService
4. Existing swipe tests still pass
5. Existing playlist tests still pass
6. Mocks correctly simulate Spotify API responses
7. Edge cases covered (empty results, API errors, token refresh)

**Files to Create:**
- `spotifyswipe-backend/src/services/__tests__/SpotifyService.test.ts`

**Files to Update:**
- `spotifyswipe-backend/src/routes/__tests__/swipe.test.ts` (update mocks if needed)

**Files to Verify:**
- `spotifyswipe-backend/src/routes/__tests__/playlists.test.ts` (should still pass)

**Testing Requirements:**
- Run test suite: `npm test`
- Generate coverage report: `npm run test:coverage`
- All tests must pass
- Coverage report shows > 80% for SpotifyService

### Task Delegation 3: Frontend Verification

**Agent:** frontend-code-writer
**Priority:** P1 (High)
**Estimated Time:** 1 hour

**Task Description:**
Verify that frontend hooks and components work correctly with the new backend Search API implementation. Update code only if necessary (should be minimal or none).

**Acceptance Criteria:**
1. `useTrackQueue` hook tested with new backend
2. Track fetching works correctly
3. Queue auto-refill works
4. Preview URL filtering works
5. Error handling works
6. Swipe page loads recommendations
7. Audio playback works
8. No console errors
9. No TypeScript errors
10. User experience unchanged

**Files to Review:**
- `spotifyswipe-frontend/src/hooks/useTrackQueue.ts`
- `spotifyswipe-frontend/src/app/dashboard/swipe/page.tsx`

**Files to Update (if needed):**
- None expected, but update if API contract changed

**Testing Requirements:**
- Start frontend dev server: `npm run dev`
- Login via Spotify OAuth
- Navigate to `/dashboard/swipe`
- Verify tracks load and play
- Check browser console for errors
- Test queue refill by swiping through 15+ tracks

### Task Delegation 4: Integration Testing

**Agent:** jest-unit-tester
**Priority:** P1 (High)
**Estimated Time:** 1 hour

**Task Description:**
Perform comprehensive end-to-end testing of the migrated system. Verify all user flows work correctly and performance meets requirements.

**Acceptance Criteria:**
1. All E2E test scenarios pass (basic flow, seed variations, error handling)
2. Performance metrics met (API < 500ms, queue refill < 1s)
3. Regression tests pass (all existing features work)
4. No console errors
5. No failed API calls
6. User experience identical to before migration
7. Test report document created

**Test Scenarios:**
- Login and swipe flow (20+ tracks)
- Queue auto-refill (trigger at 5 tracks remaining)
- Audio preview playback (multiple tracks)
- Like/dislike actions (5+ each)
- Save to playlist (create new, add to existing)
- Error handling (expired token, network failure)

**Deliverables:**
- Test execution report
- Performance metrics report
- Screenshots or video recording
- List of any issues found

---

## Post-Migration Tasks

### Monitoring (Week 1)

- [ ] Monitor error logs for Search API failures
- [ ] Track API response times
- [ ] Monitor user engagement metrics
- [ ] Collect user feedback
- [ ] Check for unexpected behaviors

### Optimization (Week 2-4)

- [ ] Tune search query construction based on results
- [ ] Implement caching for artist/track lookups
- [ ] Add diversity algorithms for better recommendations
- [ ] A/B test different query strategies
- [ ] Optimize preview URL filtering

### Documentation

- [ ] Update API documentation
- [ ] Update developer README
- [ ] Create migration postmortem
- [ ] Document lessons learned
- [ ] Share knowledge with team

---

## Appendix

### Spotify Search API Documentation

**Official Docs:** https://developer.spotify.com/documentation/web-api/reference/search

**Key Endpoints:**
- `GET /v1/search` - Main search endpoint
- `GET /v1/tracks/{id}` - Get track details
- `GET /v1/artists/{id}` - Get artist details

**Query Syntax:**
- Basic search: `q=Radiohead`
- Genre filter: `q=genre:"indie rock"`
- Artist filter: `q=artist:Coldplay`
- Multiple terms: `q=genre:pop OR genre:rock`
- Combination: `q=genre:electronic artist:"Daft Punk"`

**Rate Limits:**
- Standard: 180 requests per minute
- Extended: Varies by developer tier

### Testing Resources

**Mock Data Generator:**
```typescript
// Generate realistic track object for tests
function mockSpotifyTrack(overrides = {}) {
  return {
    id: 'track_' + Math.random().toString(36).substring(7),
    name: 'Test Track',
    artists: [{ id: 'artist_123', name: 'Test Artist' }],
    album: {
      id: 'album_123',
      name: 'Test Album',
      images: [{ url: 'https://i.scdn.co/image/test' }]
    },
    duration_ms: 210000,
    preview_url: 'https://p.scdn.co/mp3-preview/test',
    popularity: 75,
    ...overrides
  };
}
```

**API Response Mocks:**
```typescript
// Mock Search API response
const mockSearchResponse = {
  tracks: {
    items: [mockSpotifyTrack(), mockSpotifyTrack()],
    total: 100,
    limit: 20,
    offset: 0
  }
};

// Mock Track Details response
const mockTrackDetails = mockSpotifyTrack();

// Mock Artist Details response
const mockArtistDetails = {
  id: 'artist_123',
  name: 'Test Artist',
  genres: ['rock', 'indie'],
  images: [{ url: 'https://i.scdn.co/image/artist' }],
  popularity: 80
};
```

---

## Document Control

**Version:** 1.0
**Last Updated:** 2026-01-04
**Author:** Tech Lead / Product Manager
**Reviewers:** Backend Engineer, Frontend Engineer, QA Engineer
**Status:** APPROVED FOR IMPLEMENTATION

**Change Log:**

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-01-04 | 1.0 | Tech Lead | Initial migration plan created |

---

**Next Steps:**

1. Review and approve this migration plan
2. Assign tasks to respective agents (backend, frontend, QA)
3. Begin Phase 1: Backend Implementation
4. Track progress in PROGRESS.md
5. Update this document with actual results

**Questions or Concerns:**
Contact Tech Lead before starting implementation.
