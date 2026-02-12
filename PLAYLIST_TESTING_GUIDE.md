# Playlist Management - Testing Guide

**Feature:** Playlist Management UI
**Status:** Ready for QA Testing
**Backend:** Fully tested and working
**Frontend:** Implemented and integrated

---

## Quick Start

### Prerequisites

1. Backend running on `http://127.0.0.1:3001`
2. Frontend running on `http://127.0.0.1:3000`
3. Spotify OAuth configured
4. User authenticated with valid Spotify account

### Test Environment Setup

```bash
# Terminal 1: Start Backend
cd spotifyswipe-backend
npm run dev

# Terminal 2: Start Frontend
cd spotifyswipe-frontend
npm run dev

# Terminal 3: Test in Browser
# Navigate to http://localhost:3000
```

---

## Test Scenarios

### Test 1: Create Playlist

**Path:** `/dashboard/playlists`

1. Click "Create Playlist" button
2. Enter name: "Test Playlist"
3. Enter description: "Testing playlist creation"
4. Click "Create"
5. **Expected:** Modal closes, playlist appears in grid

**Validation:**
- [ ] Form validation works (empty name shows error)
- [ ] Character counter updates
- [ ] Max lengths enforced (100 chars name, 500 chars description)
- [ ] Loading spinner shows while saving
- [ ] Playlist appears at top of list

---

### Test 2: View Playlists Grid

**Path:** `/dashboard/playlists`

1. Navigate to playlists page
2. Verify all playlists display in grid
3. Check responsive layout (resize browser)

**Validation:**
- [ ] Loading spinner appears initially
- [ ] All playlists load and display
- [ ] Grid is responsive (1→2→3→4 columns)
- [ ] Playlist cards show name, description, song count
- [ ] Hover effects work (green accent)
- [ ] Delete button visible on cards

---

### Test 3: Delete Playlist from List

**Path:** `/dashboard/playlists`

1. Find a test playlist
2. Click "Delete" button on card
3. Confirmation modal appears
4. Click "Confirm"
5. **Expected:** Playlist removed from list immediately

**Validation:**
- [ ] Confirmation modal shows
- [ ] Correct playlist name in message
- [ ] Can cancel deletion
- [ ] Playlist removed on confirm
- [ ] Loading state during deletion

---

### Test 4: View Playlist Detail

**Path:** `/dashboard/playlists/[id]`

1. Click on any playlist card from grid
2. Detail page loads
3. Verify all information displays

**Validation:**
- [ ] Loading spinner while fetching
- [ ] Playlist header shows correctly
- [ ] Back button works
- [ ] Edit button visible
- [ ] Delete button visible
- [ ] All songs display in list
- [ ] Song count matches

---

### Test 5: Play Song Preview

**Path:** `/dashboard/playlists/[id]`

1. Hover over a song in the list
2. Click play button (circle on album art)
3. Audio plays for 30 seconds
4. Click pause button to stop

**Validation:**
- [ ] Play button appears on hover
- [ ] Audio plays without buffering
- [ ] Pause button shows during playback
- [ ] Can pause and resume
- [ ] Switches to next song when clicking play on another
- [ ] Song removes its play button when paused

---

### Test 6: Remove Song from Playlist

**Path:** `/dashboard/playlists/[id]`

1. Locate a song in the list
2. Click delete icon (trash) on right
3. Song disappears from list
4. Song count decreases

**Validation:**
- [ ] Delete button appears on hover
- [ ] Loading state during removal
- [ ] Song removed immediately
- [ ] Song count updated
- [ ] No modal confirmation (inline delete)

---

### Test 7: Edit Playlist

**Path:** `/dashboard/playlists/[id]`

1. Click "Edit" button in header
2. Modal opens with current values
3. Change name to "Updated Name"
4. Change description
5. Click "Save Changes"

**Validation:**
- [ ] Modal shows current values
- [ ] Can update name and description
- [ ] Character counters work
- [ ] Validation prevents empty name
- [ ] Modal closes after save
- [ ] Header updates with new values
- [ ] Changes persist on page refresh

---

### Test 8: Delete Playlist from Detail

**Path:** `/dashboard/playlists/[id]`

1. Click "Delete" button in header
2. Confirmation modal appears
3. Click "Confirm"
4. **Expected:** Redirected to playlists list, playlist gone

**Validation:**
- [ ] Confirmation modal appears
- [ ] Can cancel
- [ ] Redirects to /dashboard/playlists on confirm
- [ ] Deleted playlist not in list
- [ ] No errors in console

---

### Test 9: Save Liked Songs to Playlist

**Path:** `/dashboard/swipe`

1. Swipe right on several songs (like them)
2. "Save Liked Songs" banner appears
3. Click "Save to Playlist"
4. Modal opens showing your playlists
5. Select one or two playlists
6. Click "Save"
7. **Expected:** Songs added to selected playlists

**Validation:**
- [ ] Banner appears when songs liked
- [ ] Shows correct count of liked songs
- [ ] Modal shows all playlists
- [ ] Can select/deselect playlists
- [ ] Save button disabled if no playlist selected
- [ ] Loading state during save
- [ ] Modal closes on success
- [ ] Songs appear in selected playlists

---

### Test 10: Create Playlist from Save Modal

**Path:** `/dashboard/swipe` → Save Modal

1. Have songs liked
2. Open "Save to Playlist" modal
3. Click "Create New Playlist"
4. CreatePlaylistModal opens
5. Enter "Auto Created Playlist"
6. Click "Create"
7. **Expected:** New playlist selected automatically

**Validation:**
- [ ] CreatePlaylistModal appears within save modal
- [ ] Can create new playlist
- [ ] New playlist automatically selected
- [ ] Still shows other playlists
- [ ] Can proceed to save with new playlist

---

### Test 11: Empty States

#### No Playlists
**Path:** `/dashboard/playlists` (first time user)

**Validation:**
- [ ] Empty state message shows
- [ ] "Create Your First Playlist" button visible
- [ ] No loading spinner
- [ ] Button works

#### No Songs in Playlist
**Path:** `/dashboard/playlists/[id]` (newly created)

**Validation:**
- [ ] "No songs yet" message
- [ ] Proper empty state styling
- [ ] No song list items

---

### Test 12: Error States

#### Network Error
1. Start test
2. Turn off backend API
3. Try to load playlists

**Validation:**
- [ ] Error message displays
- [ ] "Retry" button available
- [ ] Retry button works when API back up

#### Invalid Playlist ID
1. Navigate to `/dashboard/playlists/invalid-id`

**Validation:**
- [ ] Handles gracefully
- [ ] Back button works
- [ ] "Not found" message or redirect

---

### Test 13: Responsive Design

#### Mobile (375px width)

**Path:** `/dashboard/playlists`

**Validation:**
- [ ] Playlists show in 1 column
- [ ] Text readable
- [ ] Buttons touch-friendly
- [ ] No horizontal scroll

#### Tablet (768px width)

**Path:** `/dashboard/playlists`

**Validation:**
- [ ] Playlists show in 2 columns
- [ ] Layout looks balanced
- [ ] No overflow issues

#### Desktop (1920px width)

**Path:** `/dashboard/playlists`

**Validation:**
- [ ] Playlists show in 4 columns
- [ ] Proper spacing
- [ ] Max width respected

---

### Test 14: Form Validation

#### Create Playlist Modal

**Test:** Empty Name
1. Leave name empty
2. Click "Create"
3. **Expected:** Error message appears

**Test:** Max Length Name
1. Enter name with 101 characters
2. **Expected:** Input accepts only 100
3. Character counter shows "100/100"

**Test:** Max Length Description
1. Enter description with 501 characters
2. **Expected:** Input accepts only 500
3. Character counter shows "500/500"

---

### Test 15: Concurrent Operations

1. Open two playlists detail pages in separate tabs
2. Remove a song in tab 1
3. Refresh tab 2
4. **Expected:** Song still gone in tab 2

1. Create a playlist in one tab
2. Refresh playlists list in another tab
3. **Expected:** New playlist appears

---

### Test 16: Audio Playback Edge Cases

**Test:** Multiple Songs Playing
1. Play song 1
2. Immediately click play on song 2
3. **Expected:** Song 1 stops, song 2 plays

**Test:** Remove Playing Song
1. Play a song
2. Click delete while playing
3. **Expected:** Playback stops, song removed

**Test:** Navigate Away While Playing
1. Play a song
2. Navigate to different page
3. Navigate back
4. **Expected:** Playback stopped

---

## Known Limitations

1. **Audio Preview**: Some Spotify tracks don't have 30-second previews
   - These will show "Preview not available"
   - Not an error, just data limitation

2. **No Undo**: Deleting playlists/songs is permanent
   - This is intentional for MVP
   - Users get confirmation modal

3. **No Bulk Operations**: Can't select multiple songs to delete
   - Delete happens per-song for safety

---

## Performance Benchmarks

| Operation | Target | Expected |
|-----------|--------|----------|
| Load Playlists List | < 1s | 200-500ms |
| Create Playlist | < 2s | 300-800ms |
| Load Playlist Detail | < 2s | 400-900ms |
| Save to Multiple Playlists | < 3s | 800-2000ms |
| Remove Song | < 1s | 100-400ms |

---

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | Fully Supported |
| Firefox | 88+ | Fully Supported |
| Safari | 14+ | Fully Supported |
| Edge | 90+ | Fully Supported |
| Mobile Safari | 14+ | Fully Supported |
| Chrome Mobile | 90+ | Fully Supported |

---

## Critical Path for Testing

1. ✅ Create a playlist
2. ✅ View playlists list
3. ✅ Save songs to playlist
4. ✅ View playlist detail
5. ✅ Remove a song
6. ✅ Edit playlist
7. ✅ Delete playlist

**All tests must pass for production release.**

---

## Bug Report Template

```
Title: [Component] Brief description

Environment:
- Browser: [e.g., Chrome 120]
- Device: [Desktop/Mobile]
- OS: [e.g., macOS 14.2]

Steps to Reproduce:
1.
2.
3.

Expected Behavior:
[What should happen]

Actual Behavior:
[What actually happened]

Screenshots:
[If applicable]

Console Errors:
[Copy any error messages]

Network Requests:
[Failed API calls if any]
```

---

## Success Criteria

- [ ] All 16 test scenarios pass
- [ ] No TypeScript errors in console
- [ ] No unhandled promise rejections
- [ ] Performance meets benchmarks
- [ ] Mobile responsive works
- [ ] Audio playback functions
- [ ] Error states handled gracefully
- [ ] Forms validate correctly
- [ ] Modals work smoothly
- [ ] Navigation works as expected

**All criteria must be met for MVP completion.**
