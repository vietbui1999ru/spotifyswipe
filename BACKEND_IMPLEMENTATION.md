# Backend Implementation Documentation

## Overview
This document describes the complete backend implementation for SpotifySwipe, including:
- Supabase database integration
- Spotify OAuth authentication with PKCE
- RESTful API endpoints
- CRUD operations for all data models

## Table of Contents
1. [Setup & Configuration](#setup--configuration)
2. [Database Schema](#database-schema)
3. [Authentication Flow](#authentication-flow)
4. [API Endpoints](#api-endpoints)
5. [Service Layer](#service-layer)
6. [Testing](#testing)

---

## Setup & Configuration

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Auth0 Configuration (optional, for future extension)
AUTH0_SECRET=your_auth0_secret_here
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=your_auth0_issuer_base_url_here
AUTH0_CLIENT_ID=your_auth0_client_id_here
AUTH0_CLIENT_SECRET=your_auth0_client_secret_here

# Spotify API Configuration
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/spotify/callback

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Dependencies Installed

```json
{
  "@supabase/supabase-js": "^latest",
  "@auth0/nextjs-auth0": "^latest",
  "axios": "^latest",
  "@types/spotify-api": "^latest"
}
```

### Database Setup

1. Create a Supabase project at https://supabase.com
2. Run the SQL script located at `supabase-schema.sql` in your Supabase SQL Editor
3. This will create all necessary tables, indexes, and RLS policies

---

## Database Schema

### Tables

#### 1. users
Stores user profile information and Spotify authentication tokens.

```sql
- id: UUID (primary key)
- username: VARCHAR(255) (unique)
- display_name: VARCHAR(255)
- email: VARCHAR(255) (unique)
- avatar_url: TEXT
- is_premium: BOOLEAN
- bio: TEXT
- spotify_id: VARCHAR(255) (unique)
- spotify_access_token: TEXT
- spotify_refresh_token: TEXT
- spotify_token_expires_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### 2. playlists
Stores user-created playlists.

```sql
- id: UUID (primary key)
- name: VARCHAR(255)
- description: TEXT
- image_url: TEXT
- owner_id: UUID (foreign key -> users.id)
- upvotes: INTEGER
- is_public: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### 3. playlist_songs
Junction table linking playlists to Spotify tracks.

```sql
- id: UUID (primary key)
- playlist_id: UUID (foreign key -> playlists.id)
- spotify_track_id: VARCHAR(255)
- track_data: JSONB (stores full track object from Spotify)
- position: INTEGER
- added_at: TIMESTAMPTZ
```

#### 4. swipe_sessions
Tracks individual swipe sessions with seed parameters.

```sql
- id: UUID (primary key)
- user_id: UUID (foreign key -> users.id)
- seed_pattern: VARCHAR(50)
- seed_frequency: VARCHAR(50)
- seed_category: VARCHAR(50)
- seed_mood: VARCHAR(50)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### 5. swipe_interactions
Records each swipe interaction (like/dislike/skip).

```sql
- id: UUID (primary key)
- session_id: UUID (foreign key -> swipe_sessions.id)
- user_id: UUID (foreign key -> users.id)
- spotify_track_id: VARCHAR(255)
- track_data: JSONB (stores full track object from Spotify)
- interaction_type: VARCHAR(20) ('like', 'dislike', 'skip')
- created_at: TIMESTAMPTZ
```

#### 6. comments
Stores comments on playlists.

```sql
- id: UUID (primary key)
- user_id: UUID (foreign key -> users.id)
- playlist_id: UUID (foreign key -> playlists.id)
- content: TEXT
- likes: INTEGER
- created_at: TIMESTAMPTZ
```

---

## Authentication Flow

### Spotify OAuth with PKCE

The application implements Spotify's Authorization Code Flow with PKCE (Proof Key for Code Exchange) for enhanced security.

#### Flow Diagram

```
User -> /api/auth/spotify/login
  -> Generate code_verifier and state
  -> Store in cookies
  -> Redirect to /api/auth/spotify/authorize
  -> Redirect to Spotify authorization URL

User authenticates on Spotify

Spotify -> /api/auth/spotify/callback?code=xxx&state=xxx
  -> Verify state (CSRF protection)
  -> Exchange code for tokens using code_verifier
  -> Fetch user profile from Spotify
  -> Create or update user in database
  -> Set session cookie
  -> Redirect to /dashboard
```

#### Key Functions

**File: `src/lib/spotify-auth.ts`**

- `generateRandomString(length)` - Generates cryptographically secure random strings
- `generateCodeChallenge(codeVerifier)` - Creates SHA-256 hash for PKCE
- `getSpotifyAuthUrl()` - Builds Spotify authorization URL with scopes
- `exchangeCodeForToken()` - Exchanges authorization code for access token
- `refreshSpotifyToken()` - Refreshes expired access tokens
- `isTokenExpired()` - Checks if token needs refresh

#### Scopes Requested

```javascript
[
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'user-read-recently-played',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-library-read',
  'user-library-modify',
  'streaming',
  'user-read-playback-state',
  'user-modify-playback-state'
]
```

---

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/spotify/login
Initiates Spotify OAuth flow.

**Response:**
- Redirects to Spotify authorization page

#### GET /api/auth/spotify/callback
Handles OAuth callback from Spotify.

**Query Parameters:**
- `code` - Authorization code from Spotify
- `state` - State parameter for CSRF protection

**Response:**
- Sets session cookie
- Redirects to /dashboard

#### POST /api/auth/spotify/refresh
Refreshes expired Spotify access token.

**Authentication:** Required (cookie)

**Response:**
```json
{
  "access_token": "string",
  "expires_in": 3600
}
```

#### POST /api/auth/spotify/logout
Logs out user by clearing session.

**Response:**
```json
{
  "success": true
}
```

---

### User Endpoints

#### GET /api/users/me
Get current authenticated user.

**Authentication:** Required

**Response:**
```json
{
  "id": "uuid",
  "username": "string",
  "display_name": "string",
  "email": "string",
  "avatar_url": "string",
  "is_premium": boolean,
  "bio": "string",
  "spotify_id": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "hasSpotifyToken": boolean
}
```

#### GET /api/users/[id]
Get user by ID.

**Parameters:**
- `id` - User UUID

**Response:**
```json
{
  "id": "uuid",
  "username": "string",
  "display_name": "string",
  "email": "string",
  "avatar_url": "string",
  "is_premium": boolean,
  "bio": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### PATCH /api/users/[id]
Update user profile.

**Authentication:** Required (must be own profile)

**Request Body:**
```json
{
  "username": "string",
  "display_name": "string",
  "bio": "string",
  "avatar_url": "string"
}
```

**Response:**
```json
{
  "id": "uuid",
  "username": "string",
  "display_name": "string",
  // ... updated user object
}
```

---

### Playlist Endpoints

#### GET /api/playlists
Get public playlists or user's playlists.

**Query Parameters:**
- `user_id` (optional) - Filter by user ID
- `limit` (default: 50) - Number of results
- `offset` (default: 0) - Pagination offset
- `order_by` (default: created_at) - Sort field (created_at, updated_at, upvotes)

**Response:**
```json
{
  "playlists": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "image_url": "string",
      "owner": {
        "id": "uuid",
        "username": "string",
        "display_name": "string",
        "avatar_url": "string"
      },
      "upvotes": number,
      "is_public": boolean,
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ],
  "total": number
}
```

#### POST /api/playlists
Create a new playlist.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "image_url": "string",
  "is_public": boolean
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  // ... playlist object
}
```

#### GET /api/playlists/[id]
Get playlist by ID with details.

**Parameters:**
- `id` - Playlist UUID

**Response:**
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "image_url": "string",
  "owner": { /* user object */ },
  "songs": [
    {
      "id": "uuid",
      "spotify_track_id": "string",
      "track_data": { /* Spotify track object */ },
      "position": number,
      "added_at": "timestamp"
    }
  ],
  "upvotes": number,
  "is_public": boolean,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### PATCH /api/playlists/[id]
Update playlist.

**Authentication:** Required (must be owner)

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "image_url": "string",
  "is_public": boolean
}
```

#### DELETE /api/playlists/[id]
Delete playlist.

**Authentication:** Required (must be owner)

**Response:**
```json
{
  "success": true
}
```

#### GET /api/playlists/[id]/songs
Get songs in a playlist.

**Response:**
```json
{
  "songs": [
    {
      "id": "uuid",
      "spotify_track_id": "string",
      "track_data": { /* Spotify track object */ },
      "position": number,
      "added_at": "timestamp"
    }
  ]
}
```

#### POST /api/playlists/[id]/songs
Add song to playlist.

**Authentication:** Required (must be owner)

**Request Body:**
```json
{
  "spotify_track_id": "string",
  "track_data": { /* Spotify track object */ },
  "position": number
}
```

#### DELETE /api/playlists/[id]/songs
Remove song from playlist.

**Authentication:** Required (must be owner)

**Query Parameters:**
- `spotify_track_id` - Spotify track ID to remove

**Response:**
```json
{
  "success": true
}
```

#### POST /api/playlists/[id]/upvote
Upvote a playlist.

**Response:**
```json
{
  "id": "uuid",
  "upvotes": number,
  // ... playlist object
}
```

#### DELETE /api/playlists/[id]/upvote
Remove upvote from playlist.

**Response:**
```json
{
  "id": "uuid",
  "upvotes": number,
  // ... playlist object
}
```

---

### Spotify Data Endpoints

#### GET /api/spotify/recommendations
Get Spotify recommendations.

**Authentication:** Required

**Query Parameters:**
- `seed_tracks` - Comma-separated track IDs (max 5)
- `seed_artists` - Comma-separated artist IDs (max 5)
- `seed_genres` - Comma-separated genres (max 5)
- `limit` (default: 20) - Number of recommendations
- `target_energy` - Target energy level (0-1)
- `target_valence` - Target valence level (0-1)
- `target_danceability` - Target danceability level (0-1)

**Response:**
```json
{
  "tracks": [ /* Spotify track objects */ ],
  "seeds": [ /* seed information */ ]
}
```

#### GET /api/spotify/search
Search Spotify catalog.

**Authentication:** Required

**Query Parameters:**
- `q` - Search query
- `type` - Comma-separated types (track, artist, album, playlist)
- `limit` (default: 20) - Number of results

**Response:**
```json
{
  "tracks": { /* track results */ },
  "artists": { /* artist results */ },
  "albums": { /* album results */ },
  "playlists": { /* playlist results */ }
}
```

#### GET /api/spotify/top-tracks
Get user's top tracks from Spotify.

**Authentication:** Required

**Query Parameters:**
- `time_range` (default: medium_term) - short_term, medium_term, long_term
- `limit` (default: 20) - Number of tracks

**Response:**
```json
{
  "items": [ /* Spotify track objects */ ],
  "total": number
}
```

#### GET /api/spotify/top-artists
Get user's top artists from Spotify.

**Authentication:** Required

**Query Parameters:**
- `time_range` (default: medium_term) - short_term, medium_term, long_term
- `limit` (default: 20) - Number of artists

**Response:**
```json
{
  "items": [ /* Spotify artist objects */ ],
  "total": number
}
```

---

### Swipe Session Endpoints

#### GET /api/swipe/sessions
Get user's swipe sessions or statistics.

**Authentication:** Required

**Query Parameters:**
- `limit` (default: 50) - Number of sessions
- `offset` (default: 0) - Pagination offset
- `stats` (optional) - Set to 'true' to get statistics instead of sessions

**Response (sessions):**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "seed_pattern": "string",
      "seed_frequency": "string",
      "seed_category": "string",
      "seed_mood": "string",
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ],
  "total": number
}
```

**Response (stats):**
```json
{
  "totalSessions": number,
  "totalSwipes": number,
  "likes": number,
  "dislikes": number,
  "skips": number
}
```

#### POST /api/swipe/sessions
Create a new swipe session.

**Authentication:** Required

**Request Body:**
```json
{
  "seed_pattern": "string",
  "seed_frequency": "string",
  "seed_category": "string",
  "seed_mood": "string"
}
```

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "seed_pattern": "string",
  // ... session object
}
```

#### GET /api/swipe/sessions/[id]
Get swipe session by ID.

**Authentication:** Required (must be owner)

**Query Parameters:**
- `include_interactions` (optional) - Set to 'true' to include interactions
- `include_stats` (optional) - Set to 'true' to include statistics

**Response:**
```json
{
  "session": { /* session object */ },
  "interactions": [ /* swipe interactions */ ],
  "stats": {
    "totalSwipes": number,
    "likes": number,
    "dislikes": number,
    "skips": number
  }
}
```

#### GET /api/swipe/interactions
Get user's liked or disliked songs.

**Authentication:** Required

**Query Parameters:**
- `type` - 'like' or 'dislike' (required)
- `limit` (default: 100) - Number of results
- `offset` (default: 0) - Pagination offset

**Response:**
```json
{
  "interactions": [
    {
      "id": "uuid",
      "session_id": "uuid",
      "user_id": "uuid",
      "spotify_track_id": "string",
      "track_data": { /* Spotify track object */ },
      "interaction_type": "like|dislike|skip",
      "created_at": "timestamp"
    }
  ],
  "total": number
}
```

#### POST /api/swipe/interactions
Record a swipe interaction.

**Authentication:** Required

**Request Body:**
```json
{
  "session_id": "uuid",
  "spotify_track_id": "string",
  "track_data": { /* Spotify track object */ },
  "interaction_type": "like|dislike|skip"
}
```

**Response:**
```json
{
  "id": "uuid",
  "session_id": "uuid",
  // ... interaction object
}
```

---

## Service Layer

### User Service
**File:** `src/services/user-service.ts`

Functions:
- `createUser(userData)` - Create new user
- `getUserById(userId)` - Get user by ID
- `getUserByEmail(email)` - Get user by email
- `getUserBySpotifyId(spotifyId)` - Get user by Spotify ID
- `getUserByUsername(username)` - Get user by username
- `updateUser(userId, updates)` - Update user
- `updateUserSpotifyTokens(userId, accessToken, refreshToken, expiresAt)` - Update tokens
- `deleteUser(userId)` - Delete user (admin)
- `getAllUsers(limit, offset)` - Get all users with pagination
- `searchUsers(query, limit)` - Search users
- `isUsernameAvailable(username)` - Check username availability
- `isEmailAvailable(email)` - Check email availability
- `getOrCreateUserFromSpotify(spotifyProfile, accessToken, refreshToken, expiresAt)` - OAuth helper

### Playlist Service
**File:** `src/services/playlist-service.ts`

Functions:
- `createPlaylist(playlistData)` - Create playlist
- `getPlaylistById(playlistId)` - Get playlist
- `getPlaylistWithDetails(playlistId)` - Get playlist with songs and owner
- `getPublicPlaylists(limit, offset, orderBy)` - Get public playlists
- `getUserPlaylists(userId)` - Get user's playlists
- `updatePlaylist(playlistId, updates)` - Update playlist
- `deletePlaylist(playlistId)` - Delete playlist
- `addSongToPlaylist(playlistId, spotifyTrackId, trackData, position)` - Add song
- `removeSongFromPlaylist(playlistId, spotifyTrackId)` - Remove song
- `getPlaylistSongs(playlistId)` - Get playlist songs
- `reorderPlaylistSongs(playlistId, songId, newPosition)` - Reorder songs
- `upvotePlaylist(playlistId)` - Increment upvotes
- `downvotePlaylist(playlistId)` - Decrement upvotes
- `searchPlaylists(query, limit)` - Search playlists
- `addComment(commentData)` - Add comment
- `getPlaylistComments(playlistId)` - Get comments
- `deleteComment(commentId)` - Delete comment
- `updateCommentLikes(commentId, likes)` - Update comment likes

### Swipe Service
**File:** `src/services/swipe-service.ts`

Functions:
- `createSwipeSession(sessionData)` - Create session
- `getSwipeSessionById(sessionId)` - Get session
- `getUserSwipeSessions(userId, limit, offset)` - Get user's sessions
- `getLatestSwipeSession(userId)` - Get most recent session
- `updateSwipeSession(sessionId, updates)` - Update session
- `deleteSwipeSession(sessionId)` - Delete session
- `recordSwipeInteraction(interactionData)` - Record interaction
- `getSessionInteractions(sessionId)` - Get session interactions
- `getUserLikedSongs(userId, limit, offset)` - Get liked songs
- `getUserDislikedSongs(userId, limit, offset)` - Get disliked songs
- `getUserTrackInteraction(userId, spotifyTrackId)` - Check if user interacted with track
- `getUserSwipeStats(userId)` - Get user statistics
- `getSessionStats(sessionId)` - Get session statistics
- `deleteOldSwipeSessions(userId, daysToKeep)` - Cleanup old sessions

### Spotify API Service
**File:** `src/lib/spotify-api.ts`

Functions:
- `getCurrentUserProfile(accessToken)` - Get current user
- `getUserTopTracks(accessToken, timeRange, limit)` - Get top tracks
- `getUserTopArtists(accessToken, timeRange, limit)` - Get top artists
- `getRecommendations(accessToken, params)` - Get recommendations
- `getTrack(accessToken, trackId)` - Get track details
- `getTracks(accessToken, trackIds)` - Get multiple tracks
- `getTrackAudioFeatures(accessToken, trackId)` - Get audio features
- `search(accessToken, query, types, limit)` - Search Spotify
- `getUserPlaylists(accessToken, limit, offset)` - Get user's Spotify playlists
- `getPlaylist(accessToken, playlistId)` - Get Spotify playlist
- `createPlaylist(accessToken, userId, name, description, isPublic)` - Create Spotify playlist
- `addTracksToPlaylist(accessToken, playlistId, trackUris)` - Add tracks
- `removeTracksFromPlaylist(accessToken, playlistId, trackUris)` - Remove tracks
- `getRecentlyPlayed(accessToken, limit)` - Get recently played
- `getAvailableGenreSeeds(accessToken)` - Get available genres
- `getCurrentPlayback(accessToken)` - Get playback state
- `startPlayback(accessToken, deviceId, contextUri, uris, offset)` - Start playback
- `pausePlayback(accessToken, deviceId)` - Pause playback
- `skipToNext(accessToken, deviceId)` - Skip to next
- `skipToPrevious(accessToken, deviceId)` - Skip to previous
- `convertSpotifyTrackToSong(track)` - Convert Spotify track to app format
- `convertSpotifyArtist(artist)` - Convert Spotify artist to app format

---

## Testing

### Prerequisites
1. Set up Supabase project and run schema SQL
2. Create Spotify App on Spotify Developer Dashboard
3. Configure environment variables in `.env.local`

### Testing Authentication
1. Navigate to http://localhost:3000/api/auth/spotify/login
2. Authenticate with Spotify
3. Check that you're redirected to /dashboard
4. Verify user created in Supabase `users` table

### Testing API Endpoints

Use tools like Postman, Insomnia, or curl:

```bash
# Get current user
curl http://localhost:3000/api/users/me

# Get public playlists
curl http://localhost:3000/api/playlists

# Get Spotify recommendations
curl http://localhost:3000/api/spotify/recommendations?seed_tracks=track_id&limit=10

# Create playlist
curl -X POST http://localhost:3000/api/playlists \
  -H "Content-Type: application/json" \
  -d '{"name":"My Playlist","description":"Test playlist","is_public":true}'
```

### Database Testing

Check Supabase Dashboard:
1. Verify RLS policies are working
2. Check data is being stored correctly
3. Test cascade deletes

---

## Important Notes

### Security Considerations
1. **Never expose SUPABASE_SERVICE_ROLE_KEY** - Only use server-side
2. **Spotify tokens are stored encrypted** in Supabase
3. **RLS policies** prevent unauthorized access
4. **PKCE flow** protects against authorization code interception
5. **State parameter** prevents CSRF attacks

### Token Management
- Access tokens expire after 1 hour
- Refresh tokens are long-lived
- Automatic refresh on API calls when token expires
- Client should handle 401 responses and redirect to login

### Rate Limiting
- Spotify API has rate limits (429 responses)
- Implement client-side caching where appropriate
- Use batch endpoints when fetching multiple items

### Performance Optimization
- Database indexes created on foreign keys
- Use pagination for large result sets
- Cache Spotify data in track_data JSONB fields
- Consider implementing Redis for session management

---

## Deployment Checklist

- [ ] Set production environment variables
- [ ] Configure Supabase production database
- [ ] Update Spotify app redirect URIs
- [ ] Enable Supabase RLS policies
- [ ] Set up database backups
- [ ] Configure CORS if needed
- [ ] Test authentication flow in production
- [ ] Monitor API rate limits
- [ ] Set up error logging (e.g., Sentry)
- [ ] Configure CDN for static assets

---

## Common Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Format code
npm run format
```

---

## File Structure

```
spotifyswipe/
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── auth/spotify/
│   │       │   ├── login/route.ts
│   │       │   ├── authorize/route.ts
│   │       │   ├── callback/route.ts
│   │       │   ├── logout/route.ts
│   │       │   └── refresh/route.ts
│   │       ├── playlists/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── songs/route.ts
│   │       │       └── upvote/route.ts
│   │       ├── spotify/
│   │       │   ├── recommendations/route.ts
│   │       │   ├── search/route.ts
│   │       │   ├── top-tracks/route.ts
│   │       │   └── top-artists/route.ts
│   │       ├── swipe/
│   │       │   ├── sessions/
│   │       │   │   ├── route.ts
│   │       │   │   └── [id]/route.ts
│   │       │   └── interactions/route.ts
│   │       └── users/
│   │           ├── me/route.ts
│   │           └── [id]/route.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── spotify-auth.ts
│   │   └── spotify-api.ts
│   ├── services/
│   │   ├── user-service.ts
│   │   ├── playlist-service.ts
│   │   └── swipe-service.ts
│   └── types/
│       └── spotify.ts
├── supabase-schema.sql
├── .env.example
└── BACKEND_IMPLEMENTATION.md
```

---

## Support & Troubleshooting

### Common Issues

**1. "Not authenticated" error**
- Check that session cookie is being sent
- Verify user is logged in
- Check cookie expiration

**2. "Token expired" error**
- Call `/api/auth/spotify/refresh` to refresh token
- Implement automatic token refresh in frontend

**3. "Supabase RLS policy error"**
- Verify RLS policies are correctly configured
- Check that auth.uid() is being passed correctly
- Test with service role key to bypass RLS

**4. "Spotify API rate limit"**
- Implement exponential backoff
- Cache responses where appropriate
- Consider upgrading Spotify API quota

### Getting Help
- Check Supabase logs in dashboard
- Review Next.js server logs
- Use Spotify API Console for debugging
- Check browser console for client-side errors

---

## Future Enhancements

1. **Caching Layer**
   - Implement Redis for session management
   - Cache Spotify API responses

2. **Real-time Features**
   - Use Supabase Realtime for collaborative playlists
   - Live swipe statistics

3. **Advanced Analytics**
   - Track user behavior
   - Generate personalized recommendations
   - Music taste analysis

4. **Social Features**
   - Follow users
   - Share playlists
   - Activity feed

5. **Mobile App**
   - React Native integration
   - Push notifications
   - Offline mode

---

**Last Updated:** 2025-11-19
**Version:** 1.0.0
**Author:** SpotifySwipe Development Team
