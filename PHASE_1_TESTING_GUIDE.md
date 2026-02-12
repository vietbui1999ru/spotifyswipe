# Phase 1 Testing Guide - Frontend Queue Management & Session Integration

## Quick Start for Testers

### Prerequisites
1. Backend server running on http://localhost:3001
2. MongoDB running and seeded with user data
3. Frontend running on http://localhost:3000
4. User authenticated and logged in

### Test Environment Setup
```bash
# Terminal 1 - Backend
cd spotifyswipe-backend
npm run dev

# Terminal 2 - Frontend
cd spotifyswipe-frontend
npm run dev

# Terminal 3 - Open browser
open http://localhost:3000
```

## Test Case Execution

### Test Suite 1: Track Queue Loading

#### TC-1.1: Load 20 Tracks on Mount
**Steps**:
1. Login to the application
2. Navigate to /dashboard/swipe
3. Observe the page load

**Expected Results**:
- Page displays "Loading recommendations..." spinner initially
- After 1-2 seconds, first track card appears
- Queue statistics show "Showing 1 of 20 tracks"
- "Coming Up" section shows next 3 tracks with thumbnails

**Actual Result**: _______________
**Status**: [ ] PASS [ ] FAIL

#### TC-1.2: Navigate Through Queue
**Steps**:
1. Click "Next" button multiple times (5-10 times)
2. Observe track changes and queue position

**Expected Results**:
- Each click advances to the next track
- Current track image and title update
- Queue position updates (e.g., "Showing 5 of 20")
- "Coming Up" section updates with new next 3 tracks

**Actual Result**: _______________
**Status**: [ ] PASS [ ] FAIL

#### TC-1.3: Previous Button Navigation
**Steps**:
1. Navigate forward 3 tracks with "Next"
2. Click "Previous" button twice
3. Verify position and track

**Expected Results**:
- Track advances backward correctly
- Queue position decrements
- Can't go below track 1
- "Previous" button disabled when at position 1

**Actual Result**: _______________
**Status**: [ ] PASS [ ] FAIL

#### TC-1.4: Audio Preview Playback
**Steps**:
1. Click play button on album art
2. Listen for audio playback
3. Verify progress bar updates
4. Click pause button

**Expected Results**:
- Play button appears on album hover
- Clicking play starts audio playback
- Progress bar shows elapsed time
- Duration updates as audio plays
- Pause button stops playback
- Can seek by clicking on progress bar

**Actual Result**: _______________
**Status**: [ ] PASS [ ] FAIL

#### TC-1.5: Preview Not Available State
**Steps**:
1. Swipe through multiple tracks
2. Look for tracks without preview audio
3. Note the UI state

**Expected Results**:
- If no previewUrl: "Preview not available" message shown
- Skip and Like buttons still functional
- No broken player UI
- Track information still displays

**Actual Result**: _______________
**Status**: [ ] PASS [ ] FAIL

### Test Suite 2: Queue Auto-Refill

#### TC-2.1: Auto-Refill at Low Threshold
**Steps**:
1. Start on track 1 of 20
2. Click "Next" button repeatedly until you reach track 16
3. Verify UI response

**Expected Results**:
- At track 16, auto-fetch triggers (less than 5 tracks remaining)
- Queue statistics update to show 20+ tracks
- New tracks appear in "Coming Up" section
- User can continue swiping past original 20 tracks

**Actual Result**: _______________
**Status**: [ ] PASS [ ] FAIL

#### TC-2.2: Multiple Auto-Refills
**Steps**:
1. Continue from TC-2.1
2. Keep clicking "Next" until another auto-refill should trigger (around track 36)
3. Verify no errors and UI remains responsive

**Expected Results**:
- Second batch of 20 tracks loaded
- Total track count shows 40+
- No console errors
- No duplicate API requests

**Actual Result**: _______________
**Status**: [ ] PASS [ ] FAIL

### Test Suite 3: Swipe Session API Integration

#### TC-3.1: Session Creation on Mount
**Steps**:
1. Navigate to /dashboard/swipe (fresh load, not already on page)
2. Open browser DevTools Network tab
3. Look for POST request to /api/swipe/session

**Expected Results**:
- POST /api/swipe/session called within 1 second of load
- Request body: `{ "seedTrackIds": [] }`
- Response includes session object with:
  - `id`: session ID (mongo ObjectId)
  - `likedSongIds`: []
  - `dislikedSongIds`: []
  - `seedTrackIds`: []

**Actual Result**: _______________
**Status**: [ ] PASS [ ] FAIL

#### TC-3.2: Like Action Records Swipe
**Steps**:
1. From TC-3.1, locate session ID from response
2. Click "Like" button on current track
3. Open DevTools Network tab
4. Look for PATCH request

**Expected Results**:
- PATCH /api/swipe/session/{sessionId} called
- Request body: `{ "action": "like", "songId": "track_id" }`
- Response includes updated session with:
  - likedSongIds contains the swiped track ID
  - dislikedSongIds unchanged
- Track advances to next in queue

**Actual Result**: _______________
**Status**: [ ] PASS [ ] FAIL

#### TC-3.3: Dislike Action Records Swipe
**Steps**:
1. Click "Skip" (dislike) button on current track
2. Check Network tab for PATCH request

**Expected Results**:
- PATCH /api/swipe/session/{sessionId} called
- Request body: `{ "action": "dislike", "songId": "track_id" }`
- Response includes updated session with:
  - dislikedSongIds contains the swiped track ID
  - likedSongIds unchanged
- Track advances to next in queue

**Actual Result**: _______________
**Status**: [ ] PASS [ ] FAIL

#### TC-3.4: Like Count Display
**Steps**:
1. Like 3 different tracks
2. Check queue statistics display

**Expected Results**:
- Queue stats update to show "Liked: 3"
- Each like increments the counter
- Counter persists as you navigate tracks

**Actual Result**: _______________
**Status**: [ ] PASS [ ] FAIL

#### TC-3.5: Dislike Count Display
**Steps**:
1. Dislike 2 different tracks
2. Check queue statistics display

**Expected Results**:
- Queue stats update to show "Skipped: 2"
- Each dislike increments the counter
- Counter displays alongside like count

**Actual Result**: _______________
**Status**: [ ] PASS [ ] FAIL

#### TC-3.6: Session Persistence
**Steps**:
1. Like 2 tracks, dislike 1 track
2. Refresh the page (F5)
3. Check if counts persist

**Expected Results**:
- A NEW session is created (old one completed)
- Counts reset to 0 for the new session
- New sessionId assigned

**Actual Result**: _______________
**Status**: [ ] PASS [ ] FAIL

#### TC-3.7: Session Completion on Exit
**Steps**:
1. Like/dislike several tracks
2. Navigate to a different page (/playlists or home)
3. Check DevTools Network tab

**Expected Results**:
- POST /api/swipe/session/{sessionId}/complete called before navigation
- Request completes successfully
- Session marked as completed in database

**Actual Result**: _______________
**Status**: [ ] PASS [ ] FAIL

### Test Suite 4: Error Handling

#### TC-4.1: Handle Recommendations API Failure
**Steps**:
1. Stop backend server while on swipe page
2. Refresh page
3. Wait for load timeout

**Expected Results**:
- Error message displays: "Failed to load recommendations"
- "Retry" button appears
- UI doesn't crash
- Can click Retry to attempt again (restart backend first)

**Actual Result**: _______________
**Status**: [ ] PASS [ ] FAIL

#### TC-4.2: Handle Session Creation Failure
**Steps**:
1. Stop backend server
2. Navigate to /dashboard/swipe
3. Wait for session creation timeout

**Expected Results**:
- Page still loads and displays recommendations
- Session tracking works gracefully
- Swipe actions still advance tracks
- Error logged but doesn't break UX

**Actual Result**: _______________
**Status**: [ ] PASS [ ] FAIL

#### TC-4.3: Handle Swipe Recording Failure
**Steps**:
1. Start swiping normally
2. Temporarily disconnect backend (network tab in DevTools)
3. Click "Like" or "Skip" button
4. Observe behavior

**Expected Results**:
- Track still advances to next
- If no sessionId, swipe records locally but doesn't persist
- UI remains responsive
- Reconnect backend and continue swiping

**Actual Result**: _______________
**Status**: [ ] PASS [ ] FAIL

### Test Suite 5: Browser Console & Performance

#### TC-5.1: No Console Errors
**Steps**:
1. Open DevTools Console
2. Perform all actions: swipe, navigate, auto-refill
3. Check for red error messages

**Expected Results**:
- No JavaScript errors in console
- Warnings are acceptable if not related to implementation
- No uncaught promise rejections

**Actual Result**: _______________
**Status**: [ ] PASS [ ] FAIL

#### TC-5.2: Network Performance
**Steps**:
1. Open DevTools Network tab
2. Perform the following actions:
   - Load page
   - Wait for auto-refill
   - Like/dislike 5 tracks
3. Check request times

**Expected Results**:
- GET /api/spotify/recommendations: < 2 seconds
- POST /api/swipe/session: < 1 second
- PATCH /api/swipe/session/{id}: < 500ms
- All requests show 200/201 status codes

**Actual Result**: _______________
**Status**: [ ] PASS [ ] FAIL

#### TC-5.3: No Memory Leaks
**Steps**:
1. Open DevTools Performance tab
2. Record for 30 seconds while swiping tracks
3. Check memory graph for continuous growth

**Expected Results**:
- Memory usage remains relatively stable
- No continuous sawtooth pattern indicating uncleared listeners
- Audio elements properly cleaned up on track change

**Actual Result**: _______________
**Status**: [ ] PASS [ ] FAIL

## Regression Testing

### Verify No Breaks to Existing Functionality
- [ ] Login still works
- [ ] Navigation to other pages still works
- [ ] User profile loads correctly
- [ ] Other dashboard pages unaffected
- [ ] Logout still works

## Edge Cases

### EC-1: Rapid Queue Advancement
**Steps**: Click "Next" button 10+ times rapidly
**Expected**: All requests processed, no skipped tracks

### EC-2: Play Audio While Swiping
**Steps**: Start audio preview, immediately click Next
**Expected**: Audio stops, new track loads, no playback errors

### EC-3: Network Latency
**Steps**: Throttle network in DevTools to "Slow 3G"
**Expected**: UI shows loading states, eventually loads, no timeout crashes

### EC-4: Empty Queue
**Steps**: If API returns fewer than 20 tracks
**Expected**: UI shows available tracks, no crash

## Test Summary Template

```
Test Date: ______________
Tester Name: ______________
Environment: [ ] Dev [ ] Staging [ ] Production

Total Test Cases: ___
Passed: ___
Failed: ___
Blocked: ___

Critical Issues Found:
1. ________________
2. ________________

Recommendations:
1. ________________
2. ________________

Sign-off: _________________ Date: _________
```

## Debugging Tips

### Check Session Creation
```javascript
// In browser console:
localStorage.getItem('sessionId') // Should store if implemented locally
// Or check Network tab for POST /api/swipe/session
```

### Monitor API Calls
```javascript
// Filter Network tab for:
// - /api/spotify/recommendations (GET)
// - /api/swipe/session (POST, PATCH)
```

### Test Audio Manually
```javascript
// In console:
const audio = new Audio('preview_url_here');
audio.play();
```

### Check for Memory Leaks
```javascript
// In DevTools Performance:
1. Take heap snapshot
2. Perform 50 swipes
3. Force garbage collection
4. Take another heap snapshot
5. Compare retained object counts
```
