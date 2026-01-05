# Test Code Examples and Patterns

## Overview

This document provides detailed code examples from the comprehensive Jest unit tests created for Playlist and Swipe Session endpoints.

---

## Playlist Tests - Detailed Examples

### File Location
`/spotifyswipe-backend/src/routes/__tests__/playlists.test.ts` (1,171 lines)

### Test Setup Pattern

```typescript
import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import playlistRoutes from '../playlists';
import { Playlist } from '../../models/Playlist';
import { SpotifyService } from '../../services/SpotifyService';

jest.mock('../../models/Playlist');
jest.mock('../../services/SpotifyService');

process.env.JWT_SECRET = 'test_jwt_secret_key';

describe('Playlist CRUD Endpoints', () => {
  let app: Express;
  let testUserId: string;
  let testPlaylistId: string;
  let authToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/playlists', playlistRoutes);

    testUserId = new mongoose.Types.ObjectId().toString();
    testPlaylistId = new mongoose.Types.ObjectId().toString();
    authToken = jwt.sign({ userId: testUserId }, process.env.JWT_SECRET!);
  });
  // ... tests follow
});
```

### Example 1: GET /api/playlists - List Playlists

#### Test: Return Empty Array for New User

```typescript
test('should return empty array for new user with no playlists', async () => {
  // Mock the database query to return empty array
  (Playlist.find as jest.Mock).mockResolvedValue([]);

  // Make authenticated request
  const response = await request(app)
    .get('/api/playlists')
    .set('Cookie', `jwt=${authToken}`);

  // Verify response
  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data.playlists).toEqual([]);

  // Verify correct query was made
  expect(Playlist.find).toHaveBeenCalledWith({ ownerId: testUserId });
});
```

#### Test: Return Playlists with Metadata

```typescript
test('should return user playlists with metadata', async () => {
  // Create mock playlists
  const mockPlaylists = [
    {
      _id: testPlaylistId,
      name: 'My Favorites',
      description: 'Favorite songs',
      songIds: ['track1', 'track2', 'track3'],
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-02'),
      toObject: function() { return this; }
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      name: 'Workout Hits',
      description: 'High energy',
      songIds: ['track4', 'track5'],
      createdAt: new Date('2025-01-03'),
      updatedAt: new Date('2025-01-04'),
      toObject: function() { return this; }
    }
  ];

  // Mock the select chain
  const selectMock = jest.fn().mockResolvedValue(mockPlaylists);
  (Playlist.find as jest.Mock).mockReturnValue({ select: selectMock });

  const response = await request(app)
    .get('/api/playlists')
    .set('Cookie', `jwt=${authToken}`);

  // Verify response structure
  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data.playlists).toHaveLength(2);

  // Verify first playlist metadata
  expect(response.body.data.playlists[0]).toMatchObject({
    id: testPlaylistId,
    name: 'My Favorites',
    description: 'Favorite songs',
    songCount: 3
  });
});
```

### Example 2: POST /api/playlists - Create Playlist

#### Test: Create with Valid Name and Description

```typescript
test('should create playlist with valid name and description', async () => {
  // Create mock playlist that the save will return
  const mockPlaylist = {
    _id: testPlaylistId,
    name: 'My New Playlist',
    description: 'Test description',
    songIds: [],
    createdAt: new Date('2025-01-01'),
    save: jest.fn().mockResolvedValue(true)
  };

  // Mock the constructor
  (Playlist as jest.Mock).mockImplementation(() => mockPlaylist);

  // Make request
  const response = await request(app)
    .post('/api/playlists')
    .set('Cookie', `jwt=${authToken}`)
    .send({
      name: 'My New Playlist',
      description: 'Test description'
    });

  // Verify successful creation
  expect(response.status).toBe(201);
  expect(response.body.success).toBe(true);
  expect(response.body.data.playlist).toMatchObject({
    id: testPlaylistId,
    name: 'My New Playlist',
    description: 'Test description',
    songIds: []
  });

  // Verify save was called
  expect(mockPlaylist.save).toHaveBeenCalled();
});
```

#### Test: Validation - Missing Name

```typescript
test('should return 400 for missing name', async () => {
  const response = await request(app)
    .post('/api/playlists')
    .set('Cookie', `jwt=${authToken}`)
    .send({
      description: 'No name provided'
    });

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.error).toContain('name is required');
});
```

#### Test: Validation - Name Length

```typescript
test('should return 400 for name exceeding 100 characters', async () => {
  const longName = 'a'.repeat(101);

  const response = await request(app)
    .post('/api/playlists')
    .set('Cookie', `jwt=${authToken}`)
    .send({
      name: longName,
      description: 'Test'
    });

  expect(response.status).toBe(400);
  expect(response.body.error).toContain('1-100 characters');
});
```

### Example 3: GET /api/playlists/:id - Get Playlist Detail

#### Test: Get Playlist with Song Details from Spotify

```typescript
test('should return playlist with song details from Spotify', async () => {
  // Mock the playlist
  const mockPlaylist = {
    _id: testPlaylistId,
    ownerId: new mongoose.Types.ObjectId(testUserId),
    name: 'My Playlist',
    description: 'Test',
    songIds: ['track1', 'track2'],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
    toString: function() { return this._id.toString(); }
  };

  // Mock the Spotify tracks
  const mockTracks = [
    {
      id: 'track1',
      name: 'Song 1',
      artists: [{ id: 'artist1', name: 'Artist 1' }],
      album: { id: 'album1', name: 'Album 1' },
      previewUrl: 'https://preview1.url'
    },
    {
      id: 'track2',
      name: 'Song 2',
      artists: [{ id: 'artist2', name: 'Artist 2' }],
      album: { id: 'album2', name: 'Album 2' },
      previewUrl: 'https://preview2.url'
    }
  ];

  // Set up mocks
  (Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);
  (SpotifyService.getTracks as jest.Mock).mockResolvedValue(mockTracks);

  // Make request
  const response = await request(app)
    .get(`/api/playlists/${testPlaylistId}`)
    .set('Cookie', `jwt=${authToken}`);

  // Verify response
  expect(response.status).toBe(200);
  expect(response.body.data.playlist.songs).toHaveLength(2);
  expect(response.body.data.playlist.songs[0]).toMatchObject({
    id: 'track1',
    name: 'Song 1'
  });

  // Verify Spotify was called
  expect(SpotifyService.getTracks).toHaveBeenCalledWith(
    testUserId,
    ['track1', 'track2']
  );
});
```

#### Test: Authorization - Not Playlist Owner

```typescript
test('should return 403 if user is not playlist owner', async () => {
  // Create playlist owned by different user
  const otherUserId = new mongoose.Types.ObjectId().toString();
  const mockPlaylist = {
    _id: testPlaylistId,
    ownerId: new mongoose.Types.ObjectId(otherUserId),
    name: 'Other User Playlist',
    toString: function() { return this._id.toString(); }
  };

  (Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

  // Try to access with different user's token
  const response = await request(app)
    .get(`/api/playlists/${testPlaylistId}`)
    .set('Cookie', `jwt=${authToken}`); // testUserId's token

  expect(response.status).toBe(403);
  expect(response.body.error).toContain('Not authorized');
});
```

### Example 4: PATCH /api/playlists/:id - Update Playlist

#### Test: Update Name and Description

```typescript
test('should update both name and description together', async () => {
  // Mock playlist
  const mockPlaylist = {
    _id: testPlaylistId,
    ownerId: new mongoose.Types.ObjectId(testUserId),
    name: 'Old Name',
    description: 'Old description',
    songIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(true),
    toString: function() { return this._id.toString(); }
  };

  (Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

  // Make request
  const response = await request(app)
    .patch(`/api/playlists/${testPlaylistId}`)
    .set('Cookie', `jwt=${authToken}`)
    .send({
      name: 'New Name',
      description: 'New description'
    });

  // Verify updates
  expect(response.status).toBe(200);
  expect(mockPlaylist.name).toBe('New Name');
  expect(mockPlaylist.description).toBe('New description');
  expect(mockPlaylist.save).toHaveBeenCalled();
});
```

#### Test: Timestamp Update

```typescript
test('should update the updatedAt timestamp', async () => {
  const oldDate = new Date('2025-01-01');
  const mockPlaylist = {
    _id: testPlaylistId,
    ownerId: new mongoose.Types.ObjectId(testUserId),
    name: 'Name',
    description: '',
    songIds: [],
    createdAt: oldDate,
    updatedAt: oldDate,
    save: jest.fn().mockResolvedValue(true),
    toString: function() { return this._id.toString(); }
  };

  (Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

  // Update the playlist
  await request(app)
    .patch(`/api/playlists/${testPlaylistId}`)
    .set('Cookie', `jwt=${authToken}`)
    .send({ name: 'Updated' });

  // Verify updatedAt changed
  expect(mockPlaylist.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
});
```

### Example 5: POST /api/playlists/:id/songs - Add Song

#### Test: Add Single Song Successfully

```typescript
test('should add single song successfully', async () => {
  // Mock playlist
  const mockPlaylist = {
    _id: testPlaylistId,
    ownerId: new mongoose.Types.ObjectId(testUserId),
    name: 'My Playlist',
    description: '',
    songIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(true),
    toString: function() { return this._id.toString(); }
  };

  (Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

  // Add song
  const response = await request(app)
    .post(`/api/playlists/${testPlaylistId}/songs`)
    .set('Cookie', `jwt=${authToken}`)
    .send({ songId: 'track1' });

  // Verify song was added
  expect(response.status).toBe(200);
  expect(mockPlaylist.songIds).toContain('track1');
  expect(mockPlaylist.songIds.length).toBe(1);
  expect(mockPlaylist.save).toHaveBeenCalled();
});
```

#### Test: Prevent Duplicate Songs

```typescript
test('should return 400 for duplicate song', async () => {
  // Mock playlist with existing song
  const mockPlaylist = {
    _id: testPlaylistId,
    ownerId: new mongoose.Types.ObjectId(testUserId),
    name: 'My Playlist',
    description: '',
    songIds: ['track1'], // Already has track1
    toString: function() { return this._id.toString(); }
  };

  (Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

  // Try to add same song again
  const response = await request(app)
    .post(`/api/playlists/${testPlaylistId}/songs`)
    .set('Cookie', `jwt=${authToken}`)
    .send({ songId: 'track1' });

  expect(response.status).toBe(400);
  expect(response.body.error).toContain('already in playlist');
});
```

#### Test: Max Capacity Check

```typescript
test('should return 400 when playlist at max capacity (500 songs)', async () => {
  // Mock playlist at max capacity
  const mockPlaylist = {
    _id: testPlaylistId,
    ownerId: new mongoose.Types.ObjectId(testUserId),
    name: 'Full Playlist',
    description: '',
    // 500 songs (max capacity)
    songIds: Array.from({ length: 500 }, (_, i) => `track${i}`),
    toString: function() { return this._id.toString(); }
  };

  (Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

  // Try to add another song
  const response = await request(app)
    .post(`/api/playlists/${testPlaylistId}/songs`)
    .set('Cookie', `jwt=${authToken}`)
    .send({ songId: 'new_track' });

  expect(response.status).toBe(400);
  expect(response.body.error).toContain('maximum capacity');
});
```

### Example 6: DELETE /api/playlists/:id/songs/:songId - Remove Song

#### Test: Remove Song Successfully

```typescript
test('should successfully remove song from playlist', async () => {
  // Mock playlist with multiple songs
  const mockPlaylist = {
    _id: testPlaylistId,
    ownerId: new mongoose.Types.ObjectId(testUserId),
    name: 'My Playlist',
    description: '',
    songIds: ['track1', 'track2', 'track3'],
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(true),
    toString: function() { return this._id.toString(); }
  };

  (Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

  // Remove track2
  const response = await request(app)
    .delete(`/api/playlists/${testPlaylistId}/songs/track2`)
    .set('Cookie', `jwt=${authToken}`);

  // Verify removal
  expect(response.status).toBe(200);
  expect(mockPlaylist.songIds).toEqual(['track1', 'track3']);
  expect(mockPlaylist.songIds).not.toContain('track2');
  expect(mockPlaylist.save).toHaveBeenCalled();
});
```

#### Test: Song Not in Playlist

```typescript
test('should return 400 if song not in playlist', async () => {
  // Mock playlist
  const mockPlaylist = {
    _id: testPlaylistId,
    ownerId: new mongoose.Types.ObjectId(testUserId),
    name: 'My Playlist',
    songIds: ['track1', 'track2'],
    toString: function() { return this._id.toString(); }
  };

  (Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

  // Try to remove song not in playlist
  const response = await request(app)
    .delete(`/api/playlists/${testPlaylistId}/songs/track999`)
    .set('Cookie', `jwt=${authToken}`);

  expect(response.status).toBe(400);
  expect(response.body.error).toContain('not in playlist');
});
```

---

## Swipe Session Tests - Detailed Examples

### File Location
`/spotifyswipe-backend/src/routes/__tests__/swipe.test.ts` (892 lines)

### Example 1: POST /api/swipe/session - Create Session

#### Test: Create Session for Authenticated User

```typescript
test('should create session for authenticated user', async () => {
  // Mock new session
  const mockSession = {
    _id: testSessionId,
    userId: testUserId,
    likedSongIds: [],
    dislikedSongIds: [],
    seedTrackIds: [],
    createdAt: new Date('2025-01-01'),
    save: jest.fn().mockResolvedValue(true)
  };

  // Mock constructor
  (SwipeSession as jest.Mock).mockImplementation(() => mockSession);

  // Create session
  const response = await request(app)
    .post('/api/swipe/session')
    .set('Cookie', `jwt=${authToken}`)
    .send({});

  // Verify session created
  expect(response.status).toBe(201);
  expect(response.body.success).toBe(true);
  expect(response.body.data.session).toBeDefined();
  expect(response.body.data.session.id).toBe(testSessionId);
});
```

#### Test: Create with Seed Track IDs

```typescript
test('should create session with seed track IDs', async () => {
  const seedTracks = ['track1', 'track2', 'track3'];

  const mockSession = {
    _id: testSessionId,
    userId: testUserId,
    likedSongIds: [],
    dislikedSongIds: [],
    seedTrackIds: seedTracks,
    createdAt: new Date(),
    save: jest.fn().mockResolvedValue(true)
  };

  (SwipeSession as jest.Mock).mockImplementation(() => mockSession);

  const response = await request(app)
    .post('/api/swipe/session')
    .set('Cookie', `jwt=${authToken}`)
    .send({ seedTrackIds });

  expect(response.status).toBe(201);
  expect(response.body.data.session.seedTrackIds).toEqual(seedTracks);
});
```

### Example 2: PATCH /api/swipe/session/:id - Record Swipe

#### Test: Record Like Action

```typescript
test('should record like action and add to likedSongIds', async () => {
  // Mock session
  const mockSession = {
    _id: testSessionId,
    userId: new mongoose.Types.ObjectId(testUserId),
    likedSongIds: [],
    dislikedSongIds: [],
    seedTrackIds: [],
    save: jest.fn().mockResolvedValue(true),
    toString: function() { return this._id.toString(); }
  };

  (SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

  // Like a song
  const response = await request(app)
    .patch(`/api/swipe/session/${testSessionId}`)
    .set('Cookie', `jwt=${authToken}`)
    .send({ action: 'like', songId: 'track1' });

  // Verify like recorded
  expect(response.status).toBe(200);
  expect(mockSession.likedSongIds).toContain('track1');
  expect(mockSession.save).toHaveBeenCalled();
});
```

#### Test: Move Song from Disliked to Liked

```typescript
test('should move song from disliked to liked when changing swipe', async () => {
  // Mock session with song in disliked
  const mockSession = {
    _id: testSessionId,
    userId: new mongoose.Types.ObjectId(testUserId),
    likedSongIds: [],
    dislikedSongIds: ['track1'], // Previously disliked
    seedTrackIds: [],
    save: jest.fn().mockResolvedValue(true),
    toString: function() { return this._id.toString(); }
  };

  (SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

  // Change to like
  await request(app)
    .patch(`/api/swipe/session/${testSessionId}`)
    .set('Cookie', `jwt=${authToken}`)
    .send({ action: 'like', songId: 'track1' });

  // Verify state changed
  expect(mockSession.dislikedSongIds).not.toContain('track1');
  expect(mockSession.likedSongIds).toContain('track1');
});
```

#### Test: Prevent Duplicate Likes

```typescript
test('should prevent duplicate likes - cannot like same song twice', async () => {
  // Mock session with already liked song
  const mockSession = {
    _id: testSessionId,
    userId: new mongoose.Types.ObjectId(testUserId),
    likedSongIds: ['track1'], // Already liked
    dislikedSongIds: [],
    seedTrackIds: [],
    save: jest.fn().mockResolvedValue(true),
    toString: function() { return this._id.toString(); }
  };

  (SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

  // Try to like same song again
  await request(app)
    .patch(`/api/swipe/session/${testSessionId}`)
    .set('Cookie', `jwt=${authToken}`)
    .send({ action: 'like', songId: 'track1' });

  // Should not have duplicates
  const count = mockSession.likedSongIds.filter(id => id === 'track1').length;
  expect(count).toBe(1);
});
```

#### Test: Invalid Action Type

```typescript
test('should return 400 for invalid action type', async () => {
  // Mock session
  const mockSession = {
    _id: testSessionId,
    userId: new mongoose.Types.ObjectId(testUserId),
    likedSongIds: [],
    dislikedSongIds: [],
    toString: function() { return this._id.toString(); }
  };

  (SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

  // Send invalid action
  const response = await request(app)
    .patch(`/api/swipe/session/${testSessionId}`)
    .set('Cookie', `jwt=${authToken}`)
    .send({ action: 'invalid', songId: 'track1' });

  expect(response.status).toBe(400);
  expect(response.body.error).toContain('like');
  expect(response.body.error).toContain('dislike');
});
```

### Example 3: POST /api/swipe/session/:id/complete - Complete Session

#### Test: Mark Session as Completed

```typescript
test('should mark session as completed', async () => {
  // Mock session
  const mockSession = {
    _id: testSessionId,
    userId: new mongoose.Types.ObjectId(testUserId),
    likedSongIds: ['track1', 'track2'],
    dislikedSongIds: [],
    completedAt: null,
    save: jest.fn().mockResolvedValue(true),
    toString: function() { return this._id.toString(); }
  };

  (SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

  // Complete session
  const response = await request(app)
    .post(`/api/swipe/session/${testSessionId}/complete`)
    .set('Cookie', `jwt=${authToken}`)
    .send({});

  // Verify completion
  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(mockSession.completedAt).not.toBeNull();
  expect(mockSession.save).toHaveBeenCalled();
});
```

#### Test: Preserve Data When Completing

```typescript
test('should preserve liked songs when completing session', async () => {
  const likedSongs = ['track1', 'track2', 'track3', 'track4'];

  const mockSession = {
    _id: testSessionId,
    userId: new mongoose.Types.ObjectId(testUserId),
    likedSongIds: likedSongs,
    dislikedSongIds: ['track5'],
    completedAt: null,
    save: jest.fn().mockResolvedValue(true),
    toString: function() { return this._id.toString(); }
  };

  (SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

  const response = await request(app)
    .post(`/api/swipe/session/${testSessionId}/complete`)
    .set('Cookie', `jwt=${authToken}`)
    .send({});

  // Verify all data preserved
  expect(response.body.data.session.likedSongIds).toEqual(likedSongs);
});
```

### Example 4: Integration Test - Full Session Lifecycle

```typescript
test('should complete full session lifecycle', async () => {
  // Step 1: Create session
  const createdSession = {
    _id: testSessionId,
    userId: testUserId,
    likedSongIds: [],
    dislikedSongIds: [],
    seedTrackIds: ['seed1'],
    createdAt: new Date(),
    completedAt: null,
    save: jest.fn().mockResolvedValue(true)
  };

  (SwipeSession as jest.Mock).mockImplementation(() => createdSession);

  const createResponse = await request(app)
    .post('/api/swipe/session')
    .set('Cookie', `jwt=${authToken}`)
    .send({ seedTrackIds: ['seed1'] });

  expect(createResponse.status).toBe(201);

  // Step 2: Record likes
  (SwipeSession.findById as jest.Mock).mockResolvedValue(createdSession);

  const likeResponse = await request(app)
    .patch(`/api/swipe/session/${testSessionId}`)
    .set('Cookie', `jwt=${authToken}`)
    .send({ action: 'like', songId: 'track1' });

  expect(likeResponse.status).toBe(200);
  expect(createdSession.likedSongIds).toContain('track1');

  // Step 3: Record dislikes
  const dislikeResponse = await request(app)
    .patch(`/api/swipe/session/${testSessionId}`)
    .set('Cookie', `jwt=${authToken}`)
    .send({ action: 'dislike', songId: 'track2' });

  expect(dislikeResponse.status).toBe(200);
  expect(createdSession.dislikedSongIds).toContain('track2');

  // Step 4: Complete session
  const completeResponse = await request(app)
    .post(`/api/swipe/session/${testSessionId}/complete`)
    .set('Cookie', `jwt=${authToken}`)
    .send({});

  expect(completeResponse.status).toBe(200);
  expect(createdSession.completedAt).not.toBeNull();
});
```

---

## Common Testing Patterns

### Pattern 1: Authentication Required

```typescript
test('should return 401 without authentication', async () => {
  const response = await request(app)
    .get('/api/playlists')
    // No .set('Cookie', ...) header

  expect(response.status).toBe(401);
  expect(response.body.error).toBeDefined();
});
```

**Usage:** All endpoints (30+ tests)

### Pattern 2: Owner Verification

```typescript
test('should return 403 if not owner', async () => {
  const otherUserId = new mongoose.Types.ObjectId().toString();
  const mockResource = {
    ownerId: new mongoose.Types.ObjectId(otherUserId),
    // ...
  };

  (Model.findById as jest.Mock).mockResolvedValue(mockResource);

  const response = await request(app)
    .patch(`/api/resource/${id}`)
    .set('Cookie', `jwt=${authToken}`) // Different user
    .send({});

  expect(response.status).toBe(403);
});
```

**Usage:** Resource modification endpoints (25+ tests)

### Pattern 3: Mock Chain for Methods

```typescript
test('with chained methods', async () => {
  const selectMock = jest.fn().mockResolvedValue(data);
  (Model.find as jest.Mock).mockReturnValue({
    select: selectMock
  });

  // Or with populate:
  const populateMock = jest.fn().mockResolvedValue(data);
  (Model.findById as jest.Mock).mockReturnValue({
    populate: populateMock
  });
});
```

### Pattern 4: Verify Mock Called With

```typescript
test('verify mock was called correctly', async () => {
  await request(app)
    .get('/api/playlists')
    .set('Cookie', `jwt=${authToken}`);

  // Verify query
  expect(Playlist.find).toHaveBeenCalledWith({
    ownerId: testUserId
  });

  // Verify service call with params
  expect(SpotifyService.getTracks).toHaveBeenCalledWith(
    testUserId,
    ['track1', 'track2']
  );
});
```

---

## Summary

These code examples demonstrate:
- Proper test structure and setup
- Comprehensive endpoint coverage
- Authorization and authentication testing
- Data validation testing
- Edge case handling
- Integration testing
- Mock usage patterns

All examples follow the patterns established in the actual test files.
