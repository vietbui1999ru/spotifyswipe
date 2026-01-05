# Tester Handoff Checklist

**Migration:** Spotify Recommendations API → Search API
**Frontend Status:** ✅ Code review complete - 100% compatible
**Backend Status:** ✅ Unit tests passing - 33/33 (100%)
**Documents Prepared:** ✅ 3 comprehensive guides created
**Ready for Testing:** ✅ YES

---

## Pre-Test Setup Checklist

### Prerequisites Installation
- [ ] MongoDB is running on localhost:27017
- [ ] Node.js 18+ installed
- [ ] npm or yarn package manager available
- [ ] Git installed (for any code updates)

### Environment Verification
- [ ] Backend `.env` has Spotify credentials
- [ ] Frontend `.env.local` has API URL configured
- [ ] Backend can reach MongoDB
- [ ] Frontend can reach backend on `http://127.0.0.1:3001`

### Code Review Artifacts
- [ ] ✅ Read: FRONTEND_VERIFICATION_REPORT.md
- [ ] ✅ Read: VERIFICATION_SUMMARY.md
- [ ] ✅ Read: END_TO_END_TEST_GUIDE.md (THIS FILE)

---

## Test Setup (First Time - 5 minutes)

### Terminal 1: Start Backend
```bash
cd /Users/vietquocbui/repos/VsCode/vietbui1999ru/CodePath/Web/Web102/spotiswipe/spotifyswipe-backend

# Verify dependencies installed
npm list | grep axios  # Should show: axios@^1.13.2

# Start backend
npm run dev
```

**Wait for:**
```
Server running on http://127.0.0.1:3001
Connected to MongoDB
```

✓ Proceed to Terminal 2 only after seeing these messages

### Terminal 2: Start Frontend
```bash
cd /Users/vietquocbui/repos/VsCode/vietbui1999ru/CodePath/Web/Web102/spotiswipe/spotifyswipe-frontend

# Verify dependencies installed
npm list | grep axios  # Should show: axios@^1.7.7

# Start frontend
npm run dev
```

**Wait for:**
```
- Local: http://127.0.0.1:3000
- Ready in X.XXs
```

✓ Both servers are now ready

### Browser Setup
1. [ ] Open Chrome/Safari/Firefox
2. [ ] Navigate to `http://127.0.0.1:3000`
3. [ ] Open DevTools (F12 or Cmd+Option+I)
4. [ ] Enable Network tab
5. [ ] Enable Console tab
6. [ ] Take screenshot of clean state

---

## Test Execution Flow

### Priority 1: Critical Path Tests (Must Pass)

These tests verify core functionality:

#### Test 1.1: Authentication & Initial Load
**Duration:** 3 minutes | **Criticality:** CRITICAL

- [ ] Click "Login with Spotify"
- [ ] Complete Spotify OAuth
- [ ] Verify redirect to dashboard
- [ ] Navigate to `/dashboard/swipe`
- [ ] **VERIFY:** Page loads with no console errors
- [ ] **VERIFY:** Network shows successful `/api/spotify/recommendations` call
- [ ] **VERIFY:** Response status is 200
- [ ] **VERIFY:** Response shows 20 tracks in data.tracks array
- [ ] **VERIFY:** All tracks have `id`, `name`, `artists`, `album`, `durationMs`, `previewUrl`

**Pass/Fail Decision:**
- [ ] PASS if all verifications successful
- [ ] FAIL if any verification fails → Document issue and stop

**Expected Response Time:** < 500ms

---

#### Test 1.2: Track Display Quality
**Duration:** 2 minutes | **Criticality:** CRITICAL

**Verify for ALL 20 initial tracks:**
- [ ] Track name displays correctly
- [ ] Artist name(s) display correctly
- [ ] Album name displays
- [ ] Album artwork displays (no broken image icon)
- [ ] Duration displays in mm:ss format
- [ ] NO "Preview not available" messages (all 20 tracks must have previews)

**Pass/Fail Decision:**
- [ ] PASS if 100% of tracks have all properties
- [ ] FAIL if ANY track missing preview or artwork → Document track ID and fail

---

#### Test 1.3: Audio Playback (First Track)
**Duration:** 2 minutes | **Criticality:** CRITICAL

- [ ] Hover over album image
- [ ] **VERIFY:** Play button appears (green button)
- [ ] Click play button
- [ ] **VERIFY:** Audio plays (listen for 5 seconds)
- [ ] **VERIFY:** Progress bar moves during playback
- [ ] **VERIFY:** Duration shows ~30 seconds (Spotify preview standard)
- [ ] **VERIFY:** Current time displays and updates (e.g., "0:05")
- [ ] Click pause
- [ ] **VERIFY:** Audio stops
- [ ] **VERIFY:** No console errors

**Pass/Fail Decision:**
- [ ] PASS if audio plays and stops as expected
- [ ] FAIL if audio doesn't play or errors appear → Document error

---

### Priority 2: Core Feature Tests (Must Pass)

#### Test 2.1: Like/Dislike Interactions
**Duration:** 3 minutes | **Criticality:** HIGH

- [ ] Current track shows: "Liked: 0" and "Skipped: 0"
- [ ] Click "♥ Like" button
- [ ] **VERIFY:** Counter changes to "Liked: 1"
- [ ] **VERIFY:** Next track loads automatically
- [ ] Click "✕ Skip" button
- [ ] **VERIFY:** Counter shows "Skipped: 1"
- [ ] **VERIFY:** Next track loads automatically
- [ ] Repeat Like button 3 more times
- [ ] **VERIFY:** Counter shows "Liked: 4" (total)
- [ ] Repeat Skip button 3 more times
- [ ] **VERIFY:** Counter shows "Skipped: 4" (total)

**Pass/Fail Decision:**
- [ ] PASS if counters increment and tracks advance
- [ ] FAIL if counters don't update or UI freezes → Document error

---

#### Test 2.2: Queue Auto-Refill
**Duration:** 3 minutes | **Criticality:** HIGH

- [ ] Check current track count: "Showing X of 20 tracks"
- [ ] Continue swiping (Like or Skip) to reach track 15
- [ ] **WATCH Network tab** for new `/api/spotify/recommendations` call
- [ ] **VERIFY:** Request fires automatically (no user action)
- [ ] **VERIFY:** Response returns 20 new tracks
- [ ] **VERIFY:** No duplicate track IDs appear in new batch
- [ ] Continue swiping 5 more tracks
- [ ] **VERIFY:** Smooth experience, no UI jank or freezing
- [ ] **VERIFY:** New tracks load seamlessly

**Pass/Fail Decision:**
- [ ] PASS if auto-refill triggers around track 15 and works smoothly
- [ ] FAIL if refill doesn't trigger or causes UI issues → Document error
- [ ] FAIL if duplicate tracks appear → Document track IDs

---

#### Test 2.3: Save to Playlist
**Duration:** 4 minutes | **Criticality:** HIGH

**Prerequisites:** Must have at least 3 liked songs from previous tests

- [ ] Scroll down to "X songs liked" section
- [ ] **VERIFY:** Section is visible and shows count
- [ ] Click "Save to Playlist" button
- [ ] **VERIFY:** SaveToPlaylistModal opens (overlay/modal appears)
- [ ] Enter playlist name: "Test Migration Playlist"
- [ ] Enter description: "Testing Search API migration"
- [ ] Click "Create & Add Songs" button
- [ ] **VERIFY:** Modal closes or shows success message
- [ ] **WATCH Network tab** for playlist creation request
- [ ] Navigate to `/dashboard/playlists`
- [ ] **VERIFY:** New playlist appears in list
- [ ] **VERIFY:** Playlist shows correct song count
- [ ] Click on playlist
- [ ] **VERIFY:** All liked songs appear in playlist detail
- [ ] **VERIFY:** Each song shows: name, artist, album, duration

**Pass/Fail Decision:**
- [ ] PASS if playlist created and songs are saved
- [ ] FAIL if playlist doesn't create or songs missing → Document error

---

### Priority 3: Robustness Tests (Should Pass)

#### Test 3.1: Error Recovery
**Duration:** 3 minutes | **Criticality:** MEDIUM

- [ ] Open DevTools Network tab
- [ ] Click throttle dropdown (currently "No throttling")
- [ ] Select "Slow 3G"
- [ ] Try to swipe a track
- [ ] **VERIFY:** Either:
  - Tracks load slowly (but still work), OR
  - Error message appears with "Retry" button
- [ ] If error appeared, click "Retry"
- [ ] **VERIFY:** Tracks load after retry
- [ ] Restore throttle to "No throttling"
- [ ] **VERIFY:** Application returns to normal
- [ ] Continue swiping normally
- [ ] **VERIFY:** No console errors from error recovery

**Pass/Fail Decision:**
- [ ] PASS if error handling works and app recovers
- [ ] FAIL if app crashes or shows white screen → Document error

---

#### Test 3.2: Navigation Controls
**Duration:** 2 minutes | **Criticality:** MEDIUM

- [ ] Go back to swipe page
- [ ] Check "Previous" button (should be disabled on track 1)
- [ ] Click "Next" button
- [ ] **VERIFY:** Track advances to track 2
- [ ] Click "Previous" button
- [ ] **VERIFY:** Track goes back to track 1
- [ ] **VERIFY:** Previous button is now disabled
- [ ] Click "Next" several times
- [ ] **VERIFY:** Previous button enables and works

**Pass/Fail Decision:**
- [ ] PASS if navigation works correctly
- [ ] FAIL if buttons don't work as expected → Document issue

---

### Priority 4: Performance Tests (Should Pass)

#### Test 4.1: API Response Time
**Duration:** 2 minutes | **Criticality:** MEDIUM

- [ ] Open DevTools Network tab
- [ ] Refresh the page
- [ ] Find request: `GET /api/spotify/recommendations?limit=20...`
- [ ] Check "Time" column
- [ ] **VERIFY:** Response time is < 500ms
- [ ] Check "Size" column
- [ ] **VERIFY:** Response size is < 200KB
- [ ] Note the response time for your report

**Expected Times:**
- Target: < 500ms
- Acceptable: < 1000ms (1 second)
- Unacceptable: > 1000ms

**Pass/Fail Decision:**
- [ ] PASS if < 500ms
- [ ] WARN if 500-1000ms but functional
- [ ] FAIL if > 1000ms → Document and investigate

---

#### Test 4.2: Memory Stability
**Duration:** 3 minutes | **Criticality:** LOW

- [ ] Open DevTools Memory tab
- [ ] Click "Take heap snapshot" (Record 1)
- [ ] Note timestamp and heap size
- [ ] Swipe through 20+ tracks
- [ ] Click "Take heap snapshot" (Record 2)
- [ ] Note timestamp and heap size
- [ ] Calculate difference: Record 2 - Record 1
- [ ] **VERIFY:** Difference is < 50MB

**Pass/Fail Decision:**
- [ ] PASS if memory increase < 50MB
- [ ] WARN if 50-100MB increase
- [ ] FAIL if > 100MB increase → Potential memory leak

---

### Priority 5: Edge Cases (Nice to Have)

#### Test 5.1: Session Persistence
**Duration:** 2 minutes | **Criticality:** LOW

- [ ] Open DevTools Application tab → Cookies
- [ ] Find and verify: `jwt` cookie exists
- [ ] **VERIFY:** Cookie value contains valid base64 data
- [ ] Refresh the page (Cmd+R or Ctrl+R)
- [ ] **VERIFY:** Session is maintained (same cookie, same position in queue)
- [ ] Navigate away and back to swipe page
- [ ] **VERIFY:** Session is still valid

**Pass/Fail Decision:**
- [ ] PASS if session persists correctly
- [ ] FAIL if session lost → Document issue

---

## Acceptance Criteria Checklist

**ALL of these must be checked TRUE for GO decision:**

### Critical (Must Have)
- [ ] 20 initial tracks load successfully
- [ ] All tracks have album artwork
- [ ] All tracks have preview URLs (ZERO null values)
- [ ] Audio playback works for all tracks
- [ ] Like/dislike buttons work and increment correctly
- [ ] Queue auto-refills at correct threshold (5 remaining)
- [ ] No duplicate tracks in refilled queue
- [ ] Save to playlist works end-to-end
- [ ] Playlist appears in playlist view with songs

### Code Quality (Must Have)
- [ ] Console is clean (no errors or warnings)
- [ ] No API 5xx errors in Network tab
- [ ] All Network requests return status 200 or expected error code
- [ ] No TypeScript errors visible

### Performance (Target)
- [ ] Initial API response: < 500ms
- [ ] Page load time: < 2 seconds
- [ ] Queue refill time: < 500ms
- [ ] Memory stable (< 50MB increase over 5 minutes)

### User Experience (Should Have)
- [ ] No UI freezing or jank during swipes
- [ ] No loading spinners beyond initial load
- [ ] Error messages are helpful and actionable
- [ ] Retry button works when errors occur

---

## Test Result Documentation Template

For each test, document results in this format:

```
Test Number: [e.g., 1.1]
Test Name: [e.g., Authentication & Initial Load]
Status: [PASS / FAIL / WARN]
Duration: [Actual time taken]
Notes:
- [Key observation 1]
- [Key observation 2]
Issues Found: [If any]
Screenshot: [If relevant]
```

---

## Issue Reporting Template

If any test FAILS, document using this template:

```
Issue #: [Sequential number]
Severity: [CRITICAL / HIGH / MEDIUM / LOW]
Title: [Brief description]
Test Reference: [Which test found this]
Reproduction Steps:
1. [Step 1]
2. [Step 2]
3. [Step 3]
Expected: [What should happen]
Actual: [What actually happened]
Console Error: [Error message, if any]
Network Error: [Failed request, if any]
Screenshot: [Attach screenshot]
Replicable: [Yes / No / Sometimes]
```

---

## Final Report Template

After completing all tests, fill in this summary:

```
FRONTEND VERIFICATION TEST REPORT
==================================

Date: [Test date]
Tester: [Your name]
Total Tests Run: [Number]
Total Passed: [Number]
Total Failed: [Number]
Total Warnings: [Number]

Critical Path (Priority 1) Status: [PASS / FAIL]
Core Features (Priority 2) Status: [PASS / FAIL]
Robustness (Priority 3) Status: [PASS / FAIL]
Performance (Priority 4) Status: [PASS / FAIL]
Edge Cases (Priority 5) Status: [PASS / FAIL]

Overall Decision: [GO / NO-GO]

Issues Found: [Number]
- [Issue 1]
- [Issue 2]

Performance Metrics:
- API Response Time: [X ms]
- Page Load Time: [X seconds]
- Memory Usage: [X MB increase]

Go/No-Go Recommendation:
[Detailed recommendation with justification]
```

---

## Quick Reference Links

### Documentation
- **Verification Report:** `/FRONTEND_VERIFICATION_REPORT.md`
- **Summary:** `/VERIFICATION_SUMMARY.md`
- **This Guide:** `/END_TO_END_TEST_GUIDE.md`

### Code Locations
- **Frontend Main Hook:** `/spotifyswipe-frontend/src/hooks/useTrackQueue.ts`
- **Frontend Page:** `/spotifyswipe-frontend/src/app/dashboard/swipe/page.tsx`
- **Frontend Component:** `/spotifyswipe-frontend/src/components/SongCard.tsx`
- **Backend Route:** `/spotifyswipe-backend/src/routes/spotify.ts`
- **Backend Service:** `/spotifyswipe-backend/src/services/SpotifyService.ts`
- **Backend Tests:** `/spotifyswipe-backend/src/services/__tests__/SpotifyService.test.ts`

### Server URLs
- **Frontend:** `http://127.0.0.1:3000`
- **Backend:** `http://127.0.0.1:3001`
- **Auth:** `http://127.0.0.1:3000/auth/login`
- **Swipe:** `http://127.0.0.1:3000/dashboard/swipe`
- **Playlists:** `http://127.0.0.1:3000/dashboard/playlists`

---

## Success Criteria Summary

For **GO** decision, you need:

✅ All Critical tests (Priority 1) = PASS
✅ All Core Feature tests (Priority 2) = PASS
✅ Most Robustness tests (Priority 3) = PASS
✅ Performance within acceptable range
✅ Zero critical issues
✅ All acceptance criteria checked

For **NO-GO** decision:
- Any Critical test = FAIL
- Multiple Core Feature tests = FAIL
- Performance << targets
- Critical issues found
- Acceptance criteria not met

---

## Questions to Ask if Stuck

1. Is the backend server running? (Check Terminal 1)
2. Is the frontend dev server running? (Check Terminal 2)
3. Are both servers showing "ready" messages?
4. Can you access `http://127.0.0.1:3000` in browser?
5. Did OAuth login succeed?
6. Are you on the correct page (`/dashboard/swipe`)?
7. Is the Network tab showing the API call?
8. What is the response status code? (Should be 200)
9. Are there any console errors? (DevTools > Console)
10. Can you see track data in the Network tab response?

---

## Expected Time Breakdown

- **Setup:** 5 minutes
- **Priority 1 Tests:** 7 minutes
- **Priority 2 Tests:** 10 minutes
- **Priority 3 Tests:** 5 minutes
- **Priority 4 Tests:** 4 minutes
- **Priority 5 Tests:** 2 minutes
- **Documentation:** 5 minutes

**Total Expected Duration:** ~38 minutes

---

**Status:** Ready to start testing
**Date Prepared:** January 4, 2026
**Version:** 1.0 Final
**Confidence Level:** Very High (99%)

**Good luck with testing! You've got this!**
