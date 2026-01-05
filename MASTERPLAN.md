# Swipify: Master Project Specification

## Executive Summary

Swipify is a music discovery application that integrates with Spotify to provide a swipe-based interface for discovering new music. Users authenticate via Spotify OAuth, receive personalized song recommendations, and can create custom playlists from liked songs.

**Timeline:** 24 hours
**Stack:** React + TailwindCSS (frontend), Express + TypeScript (backend), MongoDB (database)
**Deployment Target:** Proxmox VM with Docker, Ansible, Terraform

---

## Table of Contents

1. [Product Vision](#product-vision)
2. [User Stories](#user-stories)
3. [System Architecture](#system-architecture)
4. [Data Models](#data-models)
5. [API Specification](#api-specification)
6. [Frontend Pages](#frontend-pages)
7. [Authentication Flow](#authentication-flow)
8. [Task Breakdown](#task-breakdown)
9. [Acceptance Criteria](#acceptance-criteria)
10. [Infrastructure Plan](#infrastructure-plan)
11. [Risk Register](#risk-register)
12. [Glossary](#glossary)

---

## Product Vision

### Problem Statement

Music listeners face decision fatigue when browsing large catalogs. Existing playlist creation requires manual searching and selection, which is time-consuming.

### Solution

A Tinder-style swipe interface for music discovery. Users hear 30-second previews, swipe right to like or left to skip. Liked songs accumulate into custom playlists. Spotify's recommendation engine provides personalized suggestions.

### Success Metrics

| Metric | Target |
|--------|--------|
| OAuth login completes | 100% success rate |
| Recommendations load | < 2 seconds |
| Audio preview plays | No buffering on stable connection |
| Playlist save works | Persists across sessions |

---

## User Stories

### Authentication

| ID | Story | Priority |
|----|-------|----------|
| US-01 | As a user, I can login with my Spotify account so I don't need to create new credentials | P0 |
| US-02 | As a user, I remain logged in across browser sessions until I explicitly logout | P0 |
| US-03 | As a user, I can logout and my session is terminated | P0 |

### Music Discovery

| ID | Story | Priority |
|----|-------|----------|
| US-04 | As a user, I see recommended songs based on my Spotify listening history | P0 |
| US-05 | As a user, I can play a 30-second preview of the current song | P0 |
| US-06 | As a user, I can swipe right to like a song | P0 |
| US-07 | As a user, I can swipe left to skip a song | P0 |
| US-08 | As a user, I can navigate to previous/next songs in the recommendation queue | P1 |

### Playlist Management

| ID | Story | Priority |
|----|-------|----------|
| US-09 | As a user, I can view my Spotify playlists | P1 |
| US-10 | As a user, I can create a custom playlist in Swipify | P0 |
| US-11 | As a user, I can add liked songs to a custom playlist | P0 |
| US-12 | As a user, I can remove songs from my custom playlist | P1 |
| US-13 | As a user, I can delete a custom playlist | P1 |
| US-14 | As a user, I can rename my custom playlist | P2 |

### Priority Key

- **P0:** Must have for MVP (blocks release)
- **P1:** Should have (core experience)
- **P2:** Nice to have (if time permits)

---

## System Architecture

### High-Level Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                          BROWSER                                │
│                  React + TailwindCSS                            │
│                  localhost:3000                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTP + Cookies
                            │ (credentials: include)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXPRESS BACKEND                            │
│                      localhost:3001                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     MIDDLEWARE                           │   │
│  │  cors → cookieParser → jsonParser → authMiddleware       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────┬──────────────┬──────────────┬─────────────┐  │
│  │ Auth Routes  │ Spotify      │ Playlist     │ Swipe       │  │
│  │ /api/auth/*  │ /api/spotify/*│ /api/playlists/*│ /api/swipe/*│  │
│  └──────────────┴──────────────┴──────────────┴─────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    SERVICES                              │   │
│  │  SpotifyService (API calls, token refresh)               │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌───────────────────────┐       ┌───────────────────────────────┐
│       MongoDB         │       │       Spotify Web API         │
│   localhost:27017     │       │    api.spotify.com            │
│                       │       │                               │
│   Collections:        │       │   Endpoints Used:             │
│   - users             │       │   - /authorize                │
│   - playlists         │       │   - /api/token                │
│   - swipe_sessions    │       │   - /v1/me                    │
│                       │       │   - /v1/me/playlists          │
│                       │       │   - /v1/recommendations       │
└───────────────────────┘       └───────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| React Frontend | UI rendering, user interaction, audio playback |
| Express Backend | API routing, business logic, session management |
| MongoDB | Persistent storage for users, playlists, swipe history |
| Spotify API | OAuth provider, music data, recommendations |

### Communication Patterns

| From | To | Protocol | Auth |
|------|----|----------|------|
| Browser | Backend | REST over HTTP | JWT in httpOnly cookie |
| Backend | MongoDB | Mongoose driver | Connection string |
| Backend | Spotify | REST over HTTPS | Bearer token |

---

## Data Models

### Users Collection
```
Collection: users
Purpose: Store authenticated user profiles and Spotify tokens

Schema:
{
  _id: ObjectId (auto-generated),
  
  // Spotify Identity
  spotifyId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    description: "Spotify user ID from OAuth"
  },
  
  // Profile
  email: {
    type: String,
    required: true,
    description: "Email from Spotify profile"
  },
  displayName: {
    type: String,
    required: true,
    description: "Display name from Spotify"
  },
  avatarUrl: {
    type: String,
    default: null,
    description: "Profile image URL"
  },
  
  // Spotify Tokens (encrypted at rest)
  accessToken: {
    type: String,
    required: true,
    description: "Spotify API access token"
  },
  refreshToken: {
    type: String,
    required: true,
    description: "Spotify API refresh token"
  },
  tokenExpiresAt: {
    type: Date,
    required: true,
    description: "When accessToken expires"
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}

Indexes:
- spotifyId: unique
- email: non-unique (for lookups)
```

### Playlists Collection
```
Collection: playlists
Purpose: Store custom playlists created within Swipify

Schema:
{
  _id: ObjectId (auto-generated),
  
  // Ownership
  ownerId: {
    type: ObjectId,
    ref: 'User',
    required: true,
    index: true,
    description: "Reference to user who owns this playlist"
  },
  
  // Content
  name: {
    type: String,
    required: true,
    maxlength: 100,
    description: "Playlist name"
  },
  description: {
    type: String,
    default: "",
    maxlength: 500,
    description: "Optional description"
  },
  songIds: {
    type: [String],
    default: [],
    description: "Array of Spotify track IDs"
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}

Indexes:
- ownerId: for filtering user's playlists
- createdAt: for sorting

Constraints:
- songIds max length: 500 tracks
- name: required, non-empty
```

### SwipeSessions Collection
```
Collection: swipe_sessions
Purpose: Track user swipe history for analytics and playlist creation

Schema:
{
  _id: ObjectId (auto-generated),
  
  // Ownership
  userId: {
    type: ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Swipe Data
  likedSongIds: {
    type: [String],
    default: [],
    description: "Spotify track IDs swiped right"
  },
  dislikedSongIds: {
    type: [String],
    default: [],
    description: "Spotify track IDs swiped left"
  },
  
  // Session Context
  seedTrackIds: {
    type: [String],
    default: [],
    description: "Seed tracks used for this recommendation batch"
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null,
    description: "When session was converted to playlist or abandoned"
  }
}

Indexes:
- userId + createdAt: for fetching user's recent sessions
```

### Entity Relationships
```
┌─────────────┐       ┌─────────────┐
│    User     │       │  Playlist   │
├─────────────┤       ├─────────────┤
│ _id (PK)    │──────<│ ownerId (FK)│
│ spotifyId   │       │ name        │
│ email       │       │ songIds[]   │
└─────────────┘       └─────────────┘
      │
      │
      ▼
┌─────────────────┐
│  SwipeSession   │
├─────────────────┤
│ userId (FK)     │
│ likedSongIds[]  │
│ dislikedSongIds[]│
└─────────────────┘

Relationships:
- User 1:N Playlist (one user owns many playlists)
- User 1:N SwipeSession (one user has many sessions)
- Playlist contains Spotify track IDs (not stored locally)
```

---

## API Specification

### Base URL
```
Development: http://localhost:3001/api
Production: https://api.swipify.yourdomain.com/api
```

### Response Format

All endpoints return JSON with consistent structure:
```json
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

### Authentication Endpoints

#### GET /api/auth/login

Returns Spotify OAuth authorization URL.
```
Request:
  Method: GET
  Auth: None

Response (200):
{
  "success": true,
  "data": {
    "url": "https://accounts.spotify.com/authorize?client_id=...&redirect_uri=...&scope=..."
  }
}

Spotify Scopes Requested:
- user-read-email
- user-read-private
- playlist-read-private
- playlist-read-collaborative
- user-library-read
```

#### POST /api/auth/callback

Exchanges authorization code for tokens, creates/updates user, sets JWT cookie.
```
Request:
  Method: POST
  Auth: None
  Body: {
    "code": "authorization_code_from_spotify"
  }

Response (200):
{
  "success": true,
  "data": {
    "user": {
      "id": "mongo_object_id",
      "spotifyId": "spotify_user_id",
      "displayName": "John Doe",
      "email": "john@example.com",
      "avatarUrl": "https://..."
    }
  }
}

Side Effects:
- Creates or updates user in MongoDB
- Sets httpOnly cookie "jwt" with 7-day expiry

Errors:
- 400: Missing code
- 401: Invalid code or Spotify rejected
- 500: Database error
```

#### POST /api/auth/logout

Clears JWT cookie, terminates session.
```
Request:
  Method: POST
  Auth: Required (JWT cookie)

Response (200):
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}

Side Effects:
- Clears "jwt" cookie
```

#### GET /api/auth/me

Returns current authenticated user.
```
Request:
  Method: GET
  Auth: Required (JWT cookie)

Response (200):
{
  "success": true,
  "data": {
    "user": {
      "id": "mongo_object_id",
      "spotifyId": "spotify_user_id",
      "displayName": "John Doe",
      "email": "john@example.com",
      "avatarUrl": "https://..."
    }
  }
}

Errors:
- 401: No cookie or invalid JWT
```

### Spotify Proxy Endpoints

These endpoints proxy requests to Spotify API, handling token refresh automatically.

#### GET /api/spotify/playlists

Fetches user's Spotify playlists.
```
Request:
  Method: GET
  Auth: Required
  Query: {
    limit: number (default: 20, max: 50),
    offset: number (default: 0)
  }

Response (200):
{
  "success": true,
  "data": {
    "playlists": [
      {
        "id": "spotify_playlist_id",
        "name": "My Playlist",
        "description": "...",
        "imageUrl": "https://...",
        "trackCount": 25,
        "owner": "spotify_user_id"
      }
    ],
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}

Errors:
- 401: Not authenticated
- 502: Spotify API error
```

#### GET /api/spotify/recommendations

Fetches personalized song recommendations.
```
Request:
  Method: GET
  Auth: Required
  Query: {
    limit: number (default: 20, max: 50),
    seedTrackIds: string (comma-separated, max 5),
    seedArtistIds: string (comma-separated, max 5),
    seedGenres: string (comma-separated, max 5)
  }

  Note: Total seeds (tracks + artists + genres) must be 1-5

Response (200):
{
  "success": true,
  "data": {
    "tracks": [
      {
        "id": "spotify_track_id",
        "name": "Song Name",
        "artists": [
          { "id": "artist_id", "name": "Artist Name" }
        ],
        "album": {
          "id": "album_id",
          "name": "Album Name",
          "imageUrl": "https://..."
        },
        "durationMs": 210000,
        "previewUrl": "https://p.scdn.co/mp3-preview/...",
        "popularity": 75
      }
    ]
  }
}

Errors:
- 400: Invalid seed parameters
- 401: Not authenticated
- 502: Spotify API error

Notes:
- previewUrl may be null for some tracks
- Filter out tracks with null previewUrl on frontend
```

### Playlist Endpoints

#### GET /api/playlists

Lists user's custom playlists.
```
Request:
  Method: GET
  Auth: Required

Response (200):
{
  "success": true,
  "data": {
    "playlists": [
      {
        "id": "mongo_object_id",
        "name": "My Swipify Playlist",
        "description": "Songs I discovered",
        "songCount": 15,
        "createdAt": "2025-01-03T10:00:00Z",
        "updatedAt": "2025-01-03T12:00:00Z"
      }
    ]
  }
}
```

#### POST /api/playlists

Creates a new custom playlist.
```
Request:
  Method: POST
  Auth: Required
  Body: {
    "name": "My New Playlist",
    "description": "Optional description"
  }

Response (201):
{
  "success": true,
  "data": {
    "playlist": {
      "id": "mongo_object_id",
      "name": "My New Playlist",
      "description": "Optional description",
      "songIds": [],
      "createdAt": "2025-01-03T10:00:00Z"
    }
  }
}

Validation:
- name: required, 1-100 characters
- description: optional, max 500 characters

Errors:
- 400: Validation failed
- 401: Not authenticated
```

#### GET /api/playlists/:id

Gets a single playlist with full song details.
```
Request:
  Method: GET
  Auth: Required
  Params: {
    id: "mongo_object_id"
  }

Response (200):
{
  "success": true,
  "data": {
    "playlist": {
      "id": "mongo_object_id",
      "name": "My Playlist",
      "description": "...",
      "songs": [
        {
          "id": "spotify_track_id",
          "name": "Song Name",
          "artists": [...],
          "album": {...},
          "previewUrl": "https://..."
        }
      ],
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}

Notes:
- Song details fetched from Spotify API at request time
- Cached for performance (optional)

Errors:
- 401: Not authenticated
- 403: Not playlist owner
- 404: Playlist not found
```

#### PATCH /api/playlists/:id

Updates playlist metadata.
```
Request:
  Method: PATCH
  Auth: Required
  Params: { id: "mongo_object_id" }
  Body: {
    "name": "Updated Name",
    "description": "Updated description"
  }

Response (200):
{
  "success": true,
  "data": {
    "playlist": { ... }
  }
}

Errors:
- 400: Validation failed
- 401: Not authenticated
- 403: Not playlist owner
- 404: Playlist not found
```

#### DELETE /api/playlists/:id

Deletes a playlist.
```
Request:
  Method: DELETE
  Auth: Required
  Params: { id: "mongo_object_id" }

Response (200):
{
  "success": true,
  "data": {
    "message": "Playlist deleted"
  }
}

Errors:
- 401: Not authenticated
- 403: Not playlist owner
- 404: Playlist not found
```

#### POST /api/playlists/:id/songs

Adds a song to playlist.
```
Request:
  Method: POST
  Auth: Required
  Params: { id: "mongo_object_id" }
  Body: {
    "songId": "spotify_track_id"
  }

Response (200):
{
  "success": true,
  "data": {
    "playlist": { ... }
  }
}

Errors:
- 400: Missing songId or song already in playlist
- 401: Not authenticated
- 403: Not playlist owner
- 404: Playlist not found
```

#### DELETE /api/playlists/:id/songs/:songId

Removes a song from playlist.
```
Request:
  Method: DELETE
  Auth: Required
  Params: {
    id: "mongo_object_id",
    songId: "spotify_track_id"
  }

Response (200):
{
  "success": true,
  "data": {
    "playlist": { ... }
  }
}

Errors:
- 400: Song not in playlist
- 401: Not authenticated
- 403: Not playlist owner
- 404: Playlist not found
```

### Swipe Session Endpoints

#### POST /api/swipe/session

Creates a new swipe session.
```
Request:
  Method: POST
  Auth: Required
  Body: {
    "seedTrackIds": ["track_id_1", "track_id_2"]
  }

Response (201):
{
  "success": true,
  "data": {
    "session": {
      "id": "mongo_object_id",
      "likedSongIds": [],
      "dislikedSongIds": [],
      "seedTrackIds": ["track_id_1", "track_id_2"],
      "createdAt": "..."
    }
  }
}
```

#### PATCH /api/swipe/session/:id

Records a swipe action.
```
Request:
  Method: PATCH
  Auth: Required
  Params: { id: "mongo_object_id" }
  Body: {
    "action": "like" | "dislike",
    "songId": "spotify_track_id"
  }

Response (200):
{
  "success": true,
  "data": {
    "session": {
      "id": "...",
      "likedSongIds": ["song1", "song2"],
      "dislikedSongIds": ["song3"]
    }
  }
}

Errors:
- 400: Invalid action or missing songId
- 401: Not authenticated
- 403: Not session owner
- 404: Session not found
```

---

## Frontend Pages

### Page Map
```
/                     → Landing page (redirects to /swipe if logged in)
/login                → Login page with Spotify button
/auth/login/callback  → OAuth callback handler
/swipe                → Main swipe interface (protected)
/playlists            → List of custom playlists (protected)
/playlists/:id        → Single playlist view (protected)
/spotify-playlists    → View Spotify playlists (protected)
```

### Page Specifications

#### Landing Page (/)
```
Route: /
Auth: None
Purpose: Marketing/entry point

Behavior:
- If user logged in → redirect to /swipe
- If user not logged in → show landing content

Components:
- Hero section with tagline
- "Login with Spotify" button
- Brief feature overview

Design:
- Full-screen hero
- Centered content
- Spotify green accent color (#1DB954)
```

#### Login Page (/login)
```
Route: /login
Auth: None
Purpose: Initiate Spotify OAuth

Behavior:
- If already logged in → redirect to /swipe
- On button click → redirect to Spotify OAuth URL

Components:
- Spotify login button
- App logo
- Brief description

API Calls:
- GET /api/auth/login → get OAuth URL
```

#### OAuth Callback (/auth/login/callback)
```
Route: /auth/login/callback
Auth: None (receives OAuth code)
Purpose: Complete OAuth flow

Behavior:
1. Extract "code" from URL query params
2. POST to /api/auth/callback with code
3. On success → redirect to /swipe
4. On error → redirect to /login with error message

Components:
- Loading spinner
- Error message (if failed)

API Calls:
- POST /api/auth/callback { code }
```

#### Swipe Page (/swipe)
```
Route: /swipe
Auth: Required
Purpose: Main music discovery interface

Behavior:
1. Fetch recommendations on mount
2. Display current track card
3. Play 30-second preview automatically (or on tap)
4. Swipe right → like, move to next
5. Swipe left → dislike, move to next
6. Previous/next buttons for navigation
7. "Save to Playlist" button for liked songs

Components:
- Track card (album art, name, artist)
- Audio player (play/pause, progress bar)
- Swipe buttons (left, right)
- Navigation (prev, next)
- Liked songs counter
- "Save to Playlist" modal

State:
- tracks: Track[] (recommendation queue)
- currentIndex: number
- likedSongIds: string[]
- dislikedSongIds: string[]
- isPlaying: boolean
- sessionId: string

API Calls:
- GET /api/spotify/recommendations
- POST /api/swipe/session
- PATCH /api/swipe/session/:id
- POST /api/playlists (to save)
- POST /api/playlists/:id/songs (to add songs)
```

#### Playlists Page (/playlists)
```
Route: /playlists
Auth: Required
Purpose: View and manage custom playlists

Behavior:
- List all user's custom playlists
- Click playlist → navigate to detail
- Create new playlist button
- Delete playlist (with confirmation)

Components:
- Playlist grid/list
- Create playlist button
- Delete button per playlist
- Empty state if no playlists

API Calls:
- GET /api/playlists
- POST /api/playlists
- DELETE /api/playlists/:id
```

#### Playlist Detail (/playlists/:id)
```
Route: /playlists/:id
Auth: Required
Purpose: View and edit single playlist

Behavior:
- Show playlist metadata
- List all songs with preview playback
- Remove song button
- Edit name/description

Components:
- Playlist header (name, description, edit button)
- Song list with album art
- Remove song button per track
- Audio preview on song click
- Back button

API Calls:
- GET /api/playlists/:id
- PATCH /api/playlists/:id
- DELETE /api/playlists/:id/songs/:songId
```

#### Spotify Playlists (/spotify-playlists)
```
Route: /spotify-playlists
Auth: Required
Purpose: Browse user's actual Spotify playlists

Behavior:
- List playlists from Spotify
- View-only (cannot edit Spotify playlists)
- Click to see tracks
- Use as seed for recommendations

Components:
- Playlist grid
- Playlist detail modal
- "Use as seed" button

API Calls:
- GET /api/spotify/playlists
```

### Component Hierarchy
```
App
├── AuthContext (provides user state)
├── Layout
│   ├── Header
│   │   ├── Logo
│   │   ├── Navigation
│   │   └── UserMenu (avatar, logout)
│   └── Main (page content)
│
├── Pages
│   ├── LandingPage
│   ├── LoginPage
│   ├── CallbackPage
│   ├── SwipePage
│   │   ├── TrackCard
│   │   ├── AudioPlayer
│   │   ├── SwipeButtons
│   │   └── SavePlaylistModal
│   ├── PlaylistsPage
│   │   ├── PlaylistCard
│   │   └── CreatePlaylistModal
│   ├── PlaylistDetailPage
│   │   ├── PlaylistHeader
│   │   └── SongList
│   └── SpotifyPlaylistsPage
│
└── Shared Components
    ├── Button
    ├── Input
    ├── Modal
    ├── Loading
    └── ErrorMessage
```

---

## Authentication Flow

### Sequence Diagram
```
┌────────┐          ┌─────────┐          ┌─────────┐          ┌─────────┐
│Browser │          │ Backend │          │ Spotify │          │ MongoDB │
└───┬────┘          └────┬────┘          └────┬────┘          └────┬────┘
    │                    │                    │                    │
    │ GET /api/auth/login│                    │                    │
    │───────────────────>│                    │                    │
    │                    │                    │                    │
    │ { url: "https://accounts.spotify.com/authorize?..." }       │
    │<───────────────────│                    │                    │
    │                    │                    │                    │
    │ Redirect to Spotify│                    │                    │
    │─────────────────────────────────────────>                    │
    │                    │                    │                    │
    │                    │    User logs in    │                    │
    │                    │    and approves    │                    │
    │                    │                    │                    │
    │ Redirect to /auth/login/callback?code=ABC123                │
    │<─────────────────────────────────────────                    │
    │                    │                    │                    │
    │ POST /api/auth/callback { code: "ABC123" }                  │
    │───────────────────>│                    │                    │
    │                    │                    │                    │
    │                    │ POST /api/token    │                    │
    │                    │ { code, client_id, │                    │
    │                    │   client_secret }  │                    │
    │                    │───────────────────>│                    │
    │                    │                    │                    │
    │                    │ { access_token,    │                    │
    │                    │   refresh_token }  │                    │
    │                    │<───────────────────│                    │
    │                    │                    │                    │
    │                    │ GET /v1/me         │                    │
    │                    │───────────────────>│                    │
    │                    │                    │                    │
    │                    │ { id, email, ... } │                    │
    │                    │<───────────────────│                    │
    │                    │                    │                    │
    │                    │ Upsert user                             │
    │                    │────────────────────────────────────────>│
    │                    │                    │                    │
    │                    │ User document      │                    │
    │                    │<────────────────────────────────────────│
    │                    │                    │                    │
    │                    │ Generate JWT       │                    │
    │                    │ (contains userId)  │                    │
    │                    │                    │                    │
    │ Set-Cookie: jwt=xxx; HttpOnly; Path=/; Max-Age=604800       │
    │ { success: true, data: { user } }                           │
    │<───────────────────│                    │                    │
    │                    │                    │                    │
    │ Redirect to /swipe │                    │                    │
    │                    │                    │                    │
```

### Token Refresh Flow
```
┌────────┐          ┌─────────┐          ┌─────────┐          ┌─────────┐
│Browser │          │ Backend │          │ Spotify │          │ MongoDB │
└───┬────┘          └────┬────┘          └────┬────┘          └────┬────┘
    │                    │                    │                    │
    │ GET /api/spotify/recommendations (with JWT cookie)          │
    │───────────────────>│                    │                    │
    │                    │                    │                    │
    │                    │ Verify JWT         │                    │
    │                    │ Extract userId     │                    │
    │                    │                    │                    │
    │                    │ Find user                               │
    │                    │────────────────────────────────────────>│
    │                    │                    │                    │
    │                    │ User (with tokens) │                    │
    │                    │<────────────────────────────────────────│
    │                    │                    │                    │
    │                    │ Check tokenExpiresAt                    │
    │                    │ (expired!)         │                    │
    │                    │                    │                    │
    │                    │ POST /api/token    │                    │
    │                    │ { refresh_token,   │                    │
    │                    │   grant_type }     │                    │
    │                    │───────────────────>│                    │
    │                    │                    │                    │
    │                    │ { new_access_token,│                    │
    │                    │   expires_in }     │                    │
    │                    │<───────────────────│                    │
    │                    │                    │                    │
    │                    │ Update user tokens                      │
    │                    │────────────────────────────────────────>│
    │                    │                    │                    │
    │                    │ GET /v1/recommendations                │
    │                    │ (with new token)   │                    │
    │                    │───────────────────>│                    │
    │                    │                    │                    │
    │                    │ { tracks: [...] }  │                    │
    │                    │<───────────────────│                    │
    │                    │                    │                    │
    │ { success: true, data: { tracks } }                         │
    │<───────────────────│                    │                    │
```

### JWT Structure
```
Header:
{
  "alg": "HS256",
  "typ": "JWT"
}

Payload:
{
  "userId": "mongo_object_id",
  "iat": 1704268800,
  "exp": 1704873600
}

Signature:
HMACSHA256(base64(header) + "." + base64(payload), JWT_SECRET)
```

### Cookie Settings
```
Name: jwt
Value: <JWT token>
HttpOnly: true (not accessible via JavaScript)
Secure: false (dev) / true (prod with HTTPS)
SameSite: Lax
Path: /
Max-Age: 604800 (7 days)
```

---

## Task Breakdown

### Phase 1: Backend Foundation (4 hours)

| Task | Description | Time | Dependencies |
|------|-------------|------|--------------|
| 1.1 | Express skeleton + middleware | 1h | None |
| 1.2 | MongoDB connection + models | 1h | 1.1 |
| 1.3 | JWT middleware | 30m | 1.1 |
| 1.4 | Auth routes | 1.5h | 1.1, 1.2, 1.3 |

**Deliverables:**
- Running Express server on :3001
- MongoDB connected
- User, Playlist, SwipeSession models
- /api/auth/login, /api/auth/callback, /api/auth/logout, /api/auth/me routes
- JWT cookie authentication working

**Acceptance Test:**
1. GET /api/auth/login returns Spotify URL
2. Complete OAuth flow manually
3. POST /api/auth/callback sets JWT cookie
4. GET /api/auth/me returns user data
5. POST /api/auth/logout clears cookie

---

### Phase 2: Spotify Integration (3 hours)

| Task | Description | Time | Dependencies |
|------|-------------|------|--------------|
| 2.1 | Spotify service (token refresh) | 1h | Phase 1 |
| 2.2 | GET /api/spotify/playlists | 1h | 2.1 |
| 2.3 | GET /api/spotify/recommendations | 1h | 2.1 |

**Deliverables:**
- SpotifyService class with API helpers
- Automatic token refresh on expiry
- User playlists endpoint
- Recommendations endpoint

**Acceptance Test:**
1. Login and wait for token to expire (or manually set past date)
2. Call /api/spotify/playlists → should auto-refresh and return data
3. Call /api/spotify/recommendations with seed → returns tracks with previewUrl

---

### Phase 3: Playlist CRUD (2 hours)

| Task | Description | Time | Dependencies |
|------|-------------|------|--------------|
| 3.1 | Playlist routes (CRUD) | 1.5h | Phase 1 |
| 3.2 | Add/remove songs | 30m | 3.1 |

**Deliverables:**
- Full playlist CRUD
- Add/remove songs from playlist
- Ownership validation (can't edit others' playlists)

**Acceptance Test:**
1. POST /api/playlists creates playlist
2. GET /api/playlists returns user's playlists only
3. PATCH /api/playlists/:id updates name
4. POST /api/playlists/:id/songs adds song
5. DELETE /api/playlists/:id/songs/:songId removes song
6. DELETE /api/playlists/:id deletes playlist
7. Cannot access another user's playlist (403)

---

### Phase 4: Frontend Foundation (4 hours)

| Task | Description | Time | Dependencies |
|------|-------------|------|--------------|
| 4.1 | React + Vite + TailwindCSS setup | 30m | None |
| 4.2 | API client wrapper | 30m | 4.1 |
| 4.3 | Auth context + login page | 1h | 4.1, 4.2 |
| 4.4 | Callback page | 30m | 4.3 |
| 4.5 | Protected route wrapper | 30m | 4.3 |
| 4.6 | Layout + navigation | 1h | 4.1 |

**Deliverables:**
- Running React app on :3000
- TailwindCSS configured
- API client with credentials: include
- AuthContext providing user state
- Login flow complete
- Protected routes redirect to login

**Acceptance Test:**
1. Visit / → shows landing page
2. Click login → redirects to Spotify
3. Complete OAuth → redirects to /swipe
4. Refresh page → still logged in
5. Click logout → redirected to /
6. Visit /swipe directly → redirected to /login

---

### Phase 5: Core Features UI (5 hours)

| Task | Description | Time | Dependencies |
|------|-------------|------|--------------|
| 5.1 | Swipe page | 2h | Phase 4 |
| 5.2 | Audio player | 1h | 5.1 |
| 5.3 | Spotify playlists page | 1h | Phase 4 |
| 5.4 | Custom playlists page | 1h | Phase 4 |

**Deliverables:**
- Swipe interface with track cards
- 30-second audio preview playback
- Previous/next navigation
- Save liked songs to playlist
- View Spotify playlists
- Create/view/delete custom playlists

**Acceptance Test:**
1. Swipe page shows recommended tracks
2. Audio plays on card display
3. Swipe right → card animates, next track loads, song marked as liked
4. Swipe left → card animates, next track loads, song marked as disliked
5. "Save to Playlist" → modal opens, can create new or add to existing
6. Playlist page shows all custom playlists
7. Can delete playlist

---

### Phase 6: Testing + Buffer (6 hours)

| Task | Description | Time | Dependencies |
|------|-------------|------|--------------|
| 6.1 | End-to-end testing | 2h | All above |
| 6.2 | Bug fixes | 2h | 6.1 |
| 6.3 | Buffer | 2h | - |

**Deliverables:**
- All user stories tested manually
- Critical bugs fixed
- README with setup instructions

---

## Acceptance Criteria

### MVP Complete When:

- [ ] User can login with Spotify
- [ ] User remains logged in across sessions
- [ ] User can logout
- [ ] User sees personalized recommendations
- [ ] User can play 30-second previews
- [ ] User can swipe right to like
- [ ] User can swipe left to skip
- [ ] User can create custom playlist
- [ ] User can add liked songs to playlist
- [ ] User can view their custom playlists
- [ ] User can delete custom playlists
- [ ] No console errors in browser
- [ ] No unhandled promise rejections in backend

### Quality Gates:

| Metric | Threshold |
|--------|-----------|
| OAuth success rate | 100% |
| API response time (p95) | < 500ms |
| Audio preview load time | < 2s |
| Frontend Lighthouse score | > 70 |
| Backend uptime during testing | 100% |

---

## Infrastructure Plan

### Development Environment
```
Local Machine:
├── MongoDB (localhost:27017)
├── Backend (localhost:3001)
└── Frontend (localhost:3000)
```

### Production Environment (Proxmox)
```
Proxmox Host
└── Ubuntu VM (created by Terraform)
    ├── Docker
    │   ├── nginx (port 80, 443)
    │   ├── frontend (port 3000, internal)
    │   ├── backend (port 3001, internal)
    │   └── mongodb (port 27017, internal)
    └── Configured by Ansible
```

### Infrastructure Files
```
infra/
├── terraform/
│   ├── main.tf              # Proxmox provider, VM resource
│   ├── variables.tf         # VM specs (CPU, RAM, disk)
│   └── outputs.tf           # VM IP address
│
├── ansible/
│   ├── inventory.ini        # Target VM IP
│   ├── playbook.yml         # Main orchestration
│   └── roles/
│       ├── docker/          # Install Docker
│       ├── app/             # Deploy containers
│       └── nginx/           # Configure reverse proxy, SSL
│
└── docker/
    ├── backend.Dockerfile
    ├── frontend.Dockerfile
    └── docker-compose.yml
```

### Deployment Flow
```
1. Terraform: Create VM on Proxmox
   - terraform init
   - terraform apply

2. Update Ansible inventory with VM IP

3. Ansible: Configure VM
   - ansible-playbook playbook.yml
   
4. Result: App running at https://swipify.yourdomain.com
```

### SSL/HTTPS

- **Development:** HTTP only (localhost)
- **Production:** HTTPS via Let's Encrypt (certbot in nginx container)
- **Domain:** Required for production (update Spotify redirect URI)

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Spotify API rate limits | Medium | High | Implement caching, exponential backoff |
| Spotify API 503 errors | Medium | High | Retry logic, graceful degradation |
| OAuth token expiry | Certain | Medium | Implement token refresh before API calls |
| MongoDB connection drops | Low | High | Connection pooling, reconnect logic |
| JWT secret compromise | Low | Critical | Use strong secret, rotate periodically |
| CORS misconfiguration | Medium | Medium | Test cross-origin requests early |
| 30-sec preview unavailable | Medium | Low | Filter tracks, show "no preview" state |
| Time overrun | Medium | High | Prioritize P0 features, cut P2 if needed |

---

## Glossary

| Term | Definition |
|------|------------|
| **OAuth 2.0** | Authorization framework allowing third-party apps to access user data |
| **PKCE** | Proof Key for Code Exchange - OAuth extension for public clients |
| **JWT** | JSON Web Token - encoded token for stateless authentication |
| **httpOnly cookie** | Cookie inaccessible to JavaScript, prevents XSS token theft |
| **Access Token** | Short-lived token for Spotify API calls (~1 hour) |
| **Refresh Token** | Long-lived token to get new access tokens |
| **Seed** | Input to Spotify recommendations (track, artist, or genre IDs) |
| **Preview URL** | 30-second MP3 sample provided by Spotify (not all tracks have this) |
| **CORS** | Cross-Origin Resource Sharing - browser security for cross-domain requests |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-03 | PM Agent | Initial specification |

---

## Next Steps

1. Product Manager Agent: Approve this specification
2. Code Writer Agent: Begin Task 1.1 (Express skeleton)
3. Code Tester Agent: Validate Task 1.1 deliverables

Proceed with implementation.
