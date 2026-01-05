# End-to-End Testing Guide: Frontend + Search API Backend

**Purpose:** Verify that the frontend works seamlessly with the migrated Search API backend
**Duration:** ~30 minutes
**Prerequisites:** MongoDB running, Spotify OAuth credentials configured

---

## Quick Start (5 minutes)

### Terminal 1: Start Backend

```bash
cd /Users/vietquocbui/repos/VsCode/vietbui1999ru/CodePath/Web/Web102/spotiswipe/spotifyswipe-backend
npm run dev
```

Wait for: `Server running on http://127.0.0.1:3001`

### Terminal 2: Start Frontend

```bash
cd /Users/vietquocbui/repos/VsCode/vietbui1999ru/CodePath/Web/Web102/spotiswipe/spotifyswipe-frontend
npm run dev
```

Wait for: `Local: http://127.0.0.1:3000`

### Browser: Open Frontend

```
http://127.0.0.1:3000
```

---

## Test Scenario 1: Initial Load (3 minutes)

**Objective:** Verify 20 tracks load on page load with all required data

**Steps:**
1. Navigate to `http://127.0.0.1:3000/auth/login`
2. Click "Login with Spotify"
3. Authorize the application
4. Redirect to dashboard
5. Navigate to `http://127.0.0.1:3000/dashboard/swipe`

**Verification Checklist:**
- [ ] Page loads without errors
- [ ] 20 tracks display in the queue
- [ ] First track shows album artwork
- [ ] All tracks have preview URLs (no "Preview not available" messages)
- [ ] Track metadata displays: name, artists, album, duration
- [ ] Queue stats display: "Showing 1 of 20 tracks"
- [ ] Console has no errors (DevTools > Console)
- [ ] Network tab shows: `GET /api/spotify/recommendations` with status 200

**Console Check:**
```javascript
// Open DevTools > Console
// Should show NO error messages
// Expected log: Initial render complete
```

**Network Check:**
```
Request: GET /api/spotify/recommendations?limit=20&seedGenres=pop,rock,indie
Status: 200
Response: { "success": true, "data": { "tracks": [...] } }
Time: < 500ms
Size: < 200KB
```

---

## Test Scenario 2: Audio Playback (2 minutes)

**Objective:** Verify audio preview playback works correctly

**Steps:**
1. On the swipe page, hover over the first track's album image
2. Verify play button appears (green button with play icon)
3. Click the play button
4. Listen for audio playback
5. Verify progress bar moves
6. Verify duration displays (e.g., "0:30")
7. Click pause (stop button should appear)
8. Verify audio stops

**Verification Checklist:**
- [ ] Play button appears on hover
- [ ] Audio plays when clicked
- [ ] Progress bar animates during playback
- [ ] Duration displays correctly (should be ~30 seconds)
- [ ] Pause icon appears when playing
- [ ] Audio stops when paused
- [ ] No console errors during playback
- [ ] Can click progress bar to seek

**Expected Audio Duration:** 30 seconds (Spotify preview standard)

---

## Test Scenario 3: Like/Dislike Swipes (3 minutes)

**Objective:** Verify swipe tracking and counter updates

**Steps:**
1. On the current track, click "♥ Like" button
2. Verify: Counter updates to "Liked: 1"
3. Click "Like" 4 more times (total 5)
4. Verify: Counter shows "Liked: 5"
5. Click "✕ Skip" button
6. Verify: Counter updates to "Skipped: 1"
7. Click "Skip" 4 more times (total 5)
8. Verify: Counter shows "Skipped: 5"
9. Verify: Queue stats update (e.g., "Showing 11 of 20 tracks")

**Verification Checklist:**
- [ ] Like counter increments correctly
- [ ] Skip counter increments correctly
- [ ] Queue position updates (current track index increments)
- [ ] "Showing X of Y" updates dynamically
- [ ] No console errors during swipes
- [ ] Network tab shows successful like/skip requests
- [ ] No duplicate tracks in queue

**Network Check:**
```
Requests per like: POST /api/swipe/like
Requests per skip: POST /api/swipe/dislike
All should return status: 200
```

---

## Test Scenario 4: Queue Auto-Refill (3 minutes)

**Objective:** Verify new tracks load when queue reaches low threshold

**Steps:**
1. Continue swiping through tracks (you already swiped 10)
2. Swipe through 5 more tracks (total 15 swipes)
3. Watch for Network tab activity
4. Verify: New API call to `/api/spotify/recommendations` is triggered
5. Verify: 20+ new tracks are added to the queue
6. Continue swiping and verify no duplicate tracks appear
7. Verify smooth transition without UI jank

**Verification Checklist:**
- [ ] Auto-refill triggered around track 15-16 (when 5 remaining)
- [ ] Network request shows: `GET /api/spotify/recommendations?limit=20...`
- [ ] Queue seamlessly adds new tracks
- [ ] No UI freezing or lag during refill
- [ ] No duplicate track IDs in queue
- [ ] Swipe experience remains smooth

**Network Monitoring:**
```
Watch for refill request when tracks.length - currentIndex <= 5
Expected timing: Should happen automatically without user action
Response time: < 500ms
New tracks: Should be different from existing queue
```

**Command to Check for Duplicates:**
```javascript
// In DevTools Console:
// After swipes that trigger refill, run this to check for duplicates
```

---

## Test Scenario 5: Save to Playlist (5 minutes)

**Objective:** Verify end-to-end save to playlist functionality

**Steps:**
1. Continue swiping until you have at least 5 liked songs
2. Scroll down to the "X songs liked" section
3. Click "Save to Playlist" button
4. Verify: SaveToPlaylistModal opens
5. Enter playlist name: "Migration Test Playlist"
6. Enter description: "Testing Search API migration"
7. Click "Create & Add Songs"
8. Verify: Success message or modal closes
9. Navigate to `/dashboard/playlists`
10. Verify: New playlist appears in list
11. Click on the playlist
12. Verify: All liked songs appear in playlist

**Verification Checklist:**
- [ ] SaveToPlaylistModal opens when clicking "Save to Playlist"
- [ ] Can enter playlist name and description
- [ ] Create button is enabled
- [ ] Modal closes after successful creation
- [ ] New playlist appears in `/dashboard/playlists`
- [ ] Playlist contains correct number of songs
- [ ] All liked song metadata displays correctly (name, artist, album)
- [ ] No console errors during process

**Network Check:**
```
Requests made:
1. POST /api/playlists (create playlist)
2. POST /api/playlists/{id}/songs (add songs)
All should return status: 200
```

---

## Test Scenario 6: Navigation & Controls (2 minutes)

**Objective:** Verify manual navigation controls work

**Steps:**
1. Go back to the swipe page
2. Verify "Previous" button is disabled when at first track
3. Click "Next" button
4. Verify: Track changes and counter updates
5. Click "Previous" button
6. Verify: Track changes back
7. Previous button should now be disabled (at first track)

**Verification Checklist:**
- [ ] Previous button disabled at track 1
- [ ] Previous button enabled when not at track 1
- [ ] Next button always enabled
- [ ] Track changes when navigation buttons clicked
- [ ] Queue position counter updates

---

## Test Scenario 7: Error Handling (3 minutes)

**Objective:** Verify graceful error handling and recovery

**Steps:**
1. Open DevTools > Network tab
2. Click the throttling dropdown (currently shows "No throttling")
3. Select "Slow 3G"
4. Try to swipe through tracks
5. Verify: No console errors or white screen
6. Verify: Either tracks load slowly or error message appears
7. Click "Retry" if error appears
8. Change throttle back to "No throttling"
9. Verify: Application recovers and loads normally

**Verification Checklist:**
- [ ] Application doesn't crash on network slowness
- [ ] Error message displays if request times out
- [ ] Retry button works
- [ ] Application recovers after network throttle is removed
- [ ] No console errors (only network warnings expected)
- [ ] No memory leaks (heap size stable in DevTools Memory tab)

**Network Error Test:**
```
1. Open Network tab
2. Right-click any request
3. Select "Block request URL"
4. Try to swipe - should see error handling
5. Unblock to verify recovery
```

---

## Test Scenario 8: Performance Metrics (2 minutes)

**Objective:** Verify performance meets targets

**Steps:**
1. Hard refresh the page (Cmd+Shift+R)
2. Open DevTools > Network tab
3. Navigate to `/dashboard/swipe`
4. Check API response time for `/api/spotify/recommendations`
5. Check initial page load time
6. Open DevTools > Performance tab
7. Record a 10-second session of swiping
8. Review performance metrics

**Performance Targets:**
- [ ] Initial API response: < 500ms
- [ ] Page load to interactive: < 2 seconds
- [ ] Subsequent API calls: < 500ms
- [ ] No main thread blocking (smooth swipes)
- [ ] Memory usage stable (no growth > 50MB over 5 minutes)

**DevTools Memory Check:**
```
1. DevTools > Memory tab
2. Take heap snapshot at start
3. Swipe 20+ tracks
4. Take another heap snapshot
5. Verify: Size difference is < 50MB
```

---

## Test Scenario 9: Session Management (2 minutes)

**Objective:** Verify session tracking and cleanup

**Steps:**
1. Open DevTools > Application tab
2. Navigate to Cookies
3. Verify: `jwt` cookie exists with valid token
4. Verify: `jwt` contains valid base64 data
5. Swipe through several tracks
6. Refresh the page
7. Verify: Session is maintained (same cookie)
8. Leave the page and return after 5 minutes
9. Verify: Session is still valid

**Verification Checklist:**
- [ ] JWT cookie is set after login
- [ ] JWT cookie persists across page refreshes
- [ ] JWT cookie contains valid data
- [ ] Session stats are preserved after refresh
- [ ] No 401 Unauthorized errors appear

---

## Acceptance Criteria - Final Verification

| Criterion | Pass | Notes |
|-----------|------|-------|
| 20 tracks load on initial page load | [ ] | Check Network tab |
| All tracks have album artwork | [ ] | No missing images |
| All tracks have preview URLs | [ ] | No "Preview not available" |
| Audio playback works | [ ] | Play/pause functionality |
| Duration displays correctly | [ ] | ~30 seconds for previews |
| Progress bar updates during playback | [ ] | Smooth animation |
| Like counter increments | [ ] | Real-time updates |
| Skip counter increments | [ ] | Real-time updates |
| Queue auto-refills at 5 remaining | [ ] | Watch Network tab |
| New tracks are different from existing | [ ] | No duplicates |
| Queue refill is smooth (no UI jank) | [ ] | No visible stuttering |
| Save to playlist works end-to-end | [ ] | Create and verify |
| Playlist appears in playlist view | [ ] | Navigate to /playlists |
| Songs are saved to playlist | [ ] | Verify in playlist detail |
| No console errors | [ ] | DevTools > Console |
| No API 5xx errors | [ ] | Network tab status codes |
| API response < 500ms | [ ] | Network tab timing |
| Page load < 2 seconds | [ ] | DevTools > Performance |
| No memory leaks | [ ] | DevTools > Memory |
| Error handling graceful | [ ] | Network throttle test |
| User can recover from errors | [ ] | Retry button works |

---

## Quick Reference Commands

### Backend Health Check
```bash
# Backend should be running
curl http://127.0.0.1:3001/api/health
# Should return: {"status": "ok"}
```

### Frontend Health Check
```bash
# Frontend should be running
curl http://127.0.0.1:3000
# Should return HTML
```

### View Backend Logs
```bash
# Terminal 1 where backend is running
# Should show:
# Server running on http://127.0.0.1:3001
# Connected to MongoDB
# API requests logged
```

### Clear Browser Cache
```
DevTools > Application > Cache Storage > Clear All
DevTools > Application > Local Storage > Clear All
```

---

## Issue Reporting Template

If you encounter any issues, document them using this format:

```
Issue Title: [Descriptive title]
Severity: [Critical/High/Medium/Low]
Scenario: [Test scenario number]
Reproduction Steps:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Expected Result: [What should happen]
Actual Result: [What actually happened]

Screenshots: [If applicable]
Console Error: [Error message, if any]
Network Requests: [Failed requests, if any]
Environment: [Browser, OS, etc.]
```

---

## Success Criteria

All of the following must be TRUE:

1. ✅ Frontend loads without errors
2. ✅ Backend API returns recommendations in < 500ms
3. ✅ All 20 initial tracks have preview URLs (none null/undefined)
4. ✅ Audio playback works for all tracks
5. ✅ Like/dislike buttons increment counters in real-time
6. ✅ Queue auto-refills seamlessly when threshold reached
7. ✅ No duplicate tracks in any queue
8. ✅ Save to playlist creates playlist and adds songs
9. ✅ Playlists are viewable in playlist section
10. ✅ No console errors or warnings
11. ✅ No TypeScript compilation errors
12. ✅ No API 5xx errors in Network tab
13. ✅ Performance targets met (< 2s page load, < 500ms API)
14. ✅ Error handling works gracefully
15. ✅ No memory leaks detected

**If all criteria are met → PASS (Ready for Deployment)**
**If any criteria fail → FAIL (Document issues and remediate)**

---

**Test Duration:** ~30 minutes
**Report Location:** `/spotifyswipe/FRONTEND_VERIFICATION_REPORT.md`
**Status:** READY TO TEST
