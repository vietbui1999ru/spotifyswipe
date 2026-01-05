# OAuth PKCE Authentication Implementation

## Overview
Complete OAuth2 authentication flow with PKCE security for Spotify login integration. This implementation provides secure, industry-standard authentication for the Swipify application.

## Architecture

### Authentication Flow
```
1. User clicks "Login with Spotify" button
2. Frontend generates PKCE code_verifier (128-char random string)
3. code_verifier stored in sessionStorage
4. Frontend calls GET /api/auth/login
5. Backend returns Spotify OAuth authorization URL
6. User redirected to Spotify login/authorization page
7. User authorizes scopes and grants access
8. Spotify redirects to /auth/callback?code=XXXX&state=YYYY
9. Frontend extracts code from URL
10. Frontend retrieves code_verifier from sessionStorage
11. Frontend calls POST /api/auth/callback with code + codeVerifier
12. Backend validates with Spotify using PKCE
13. Backend returns JWT cookie (httpOnly)
14. Frontend calls GET /api/auth/me to fetch user data
15. Frontend redirects to /dashboard/swipe
```

## Created Files

### 1. `/src/utils/pkce.ts` - PKCE Utilities
**Purpose**: Cryptographic functions for PKCE flow

**Exports**:
- `generateCodeVerifier()`: Generates 128-character random string using safe characters (A-Z, a-z, 0-9, -, ., _, ~)
- `generateCodeChallenge(verifier)`: Creates SHA-256 hash of verifier and base64url encodes it (async)
- `storePKCEVerifier(verifier)`: Stores verifier in sessionStorage with key 'pkce_code_verifier'
- `getPKCEVerifier()`: Retrieves verifier from sessionStorage
- `clearPKCEVerifier()`: Removes verifier from sessionStorage
- `CODE_VERIFIER_LENGTH`: Constant = 128
- `SPOTIFY_SCOPES`: Array of OAuth scopes requested from Spotify

**Security Details**:
- Uses Web Crypto API (crypto.subtle.digest) for SHA-256 hashing
- Base64url encoding ensures URL-safe strings
- sessionStorage automatically cleared when tab/browser closes
- Verifier stored client-side only (never sent to Spotify)

### 2. `/src/app/auth/login/page.tsx` - Updated Login Page
**Changes**:
- Imports PKCE utilities
- Removed callback handling from this page (moved to dedicated callback page)
- `handleSpotifyLogin()` now:
  - Generates PKCE code verifier
  - Stores verifier in sessionStorage
  - Calls GET /api/auth/login to get authorization URL
  - Redirects to Spotify (window.location.href)
- Redirects already-authenticated users to `/dashboard/swipe`

**UI**:
- Maintains existing dark theme styling
- Shows loading spinner during login initiation
- Displays error messages if login fails

### 3. `/src/app/auth/callback/page.tsx` - OAuth Callback Handler
**Purpose**: Handles Spotify redirect after user authorization

**Functionality**:
- Extracts `code` and `state` query parameters from URL
- Validates code presence (handles missing code gracefully)
- Retrieves PKCE verifier from sessionStorage
- Validates verifier presence (handles expired sessions)
- Posts code + verifier to POST /api/auth/callback
- On success:
  - Clears PKCE verifier from sessionStorage
  - Calls `refreshUser()` to fetch authenticated user data
  - Redirects to /dashboard/swipe
- On error:
  - Displays error message
  - Provides "Back to Login" button to retry
  - Suggests clearing browser cache

**Error Handling**:
- Missing code: "No authorization code received from Spotify. Please try logging in again."
- Missing verifier: "PKCE verifier not found. Your session may have expired. Please try logging in again."
- API errors: Shows actual error message with retry option
- Network errors: Handled by axios interceptor (redirects to login on 401)

**UI States**:
- Loading: Spinner with "Authenticating with Spotify..." message
- Error: Red error box with message and retry button
- Success: Spinner with redirect message (immediately redirects)

### 4. `/src/app/dashboard/layout.tsx` - Dashboard Layout
**Purpose**: Wraps all dashboard routes with authentication protection

**Features**:
- Uses ProtectedRoute component for auth enforcement
- Unauthenticated users redirected to /auth/login
- Shows loading spinner while auth state is being determined
- Serves as base layout for all dashboard pages

### 5. `/src/app/dashboard/swipe/page.tsx` - Swipe Page
**Purpose**: Main dashboard page users are redirected to after login

**Features**:
- Displays welcome message with user's Spotify display name
- Placeholder for future swipe functionality
- Protected by dashboard layout

## Modified Files

### `/src/app/auth/login/page.tsx`
- Removed callback handling (now in dedicated callback page)
- Added PKCE code verifier generation
- Updated successful auth redirect to `/dashboard/swipe`
- Simplified login flow

## Security Considerations

### PKCE (Proof Key for Code Exchange)
- **Why PKCE**: Protects against authorization code interception attacks
- **How it works**:
  1. Client generates random `code_verifier` (128 chars)
  2. Client creates `code_challenge` = SHA-256(code_verifier) base64url encoded
  3. Client sends code_challenge in authorization request
  4. Spotify verifies: code_challenge = SHA-256(code_verifier)
  5. Even if code is intercepted, verifier cannot be derived from challenge

### Session Storage
- **Verifier placement**: sessionStorage (not localStorage)
- **Scope**: Single tab, cleared on tab close
- **Lifecycle**: Generated at login, cleared at callback success
- **Protection**: Never sent to Spotify, never logged

### JWT Handling
- **Storage**: httpOnly cookie (automatic with axios withCredentials)
- **Access**: Backend sets, frontend never sees raw token
- **Security**: httpOnly prevents XSS attacks

### CORS & Credentials
- Backend configured with CORS for frontend origin
- `withCredentials: true` in axios ensures JWT cookie is sent
- Automatic 401 handling redirects to login

## OAuth Scopes Requested
```
- user-read-email: Access to user's email
- user-read-private: Access to private user data
- playlist-read-private: Read private playlists
- playlist-read-collaborative: Read collaborative playlists
- user-library-read: Read user's saved tracks
```

## Browser Requirements
- Modern browser with Web Crypto API support
- sessionStorage support (all modern browsers)
- JavaScript enabled

## Testing Checklist
- [ ] Login page loads correctly
- [ ] "Login with Spotify" button initiates PKCE flow
- [ ] sessionStorage contains code verifier after login click
- [ ] Redirected to Spotify authorization page
- [ ] After user authorizes, redirected to /auth/callback?code=XXX
- [ ] Callback page shows loading state
- [ ] Successful authentication clears verifier and redirects to /dashboard/swipe
- [ ] Dashboard page shows user's display name
- [ ] Navigation back to login (when not authenticated) works
- [ ] Manual URL access to /dashboard without auth redirects to login
- [ ] Refresh on callback page doesn't break authentication
- [ ] Error messages display correctly on API failures
- [ ] Browser console shows no CORS errors
- [ ] Axios requests include credentials (check Network tab in DevTools)

## Environment Variables
Required in `.env.local` (or `.env`):
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:3001
```

## API Endpoints Used
- `GET /api/auth/login`: Returns authorization URL
- `POST /api/auth/callback`: Exchanges code for JWT token
- `GET /api/auth/me`: Fetches authenticated user data
- `POST /api/auth/logout`: Clears JWT token

## Dependencies
- `next`: ^15.1.3
- `react`: ^19.0.0
- `axios`: ^1.7.7 (with CORS support)
- Built-in Web Crypto API (no external crypto library needed)

## File Structure
```
spotifyswipe-frontend/src/
├── utils/
│   └── pkce.ts                           (NEW)
├── app/
│   ├── layout.tsx
│   ├── auth/
│   │   ├── layout.tsx
│   │   ├── login/
│   │   │   └── page.tsx                  (MODIFIED)
│   │   └── callback/
│   │       └── page.tsx                  (NEW)
│   └── dashboard/
│       ├── layout.tsx                    (NEW)
│       └── swipe/
│           └── page.tsx                  (NEW)
├── contexts/
│   └── AuthContext.tsx
├── components/
│   └── ProtectedRoute.tsx
└── lib/
    └── apiClient.ts
```

## Backend Requirements (Not Modified)
The backend must:
1. Implement GET /api/auth/login returning { url: "spotify_oauth_url" }
2. Implement POST /api/auth/callback accepting { code, codeVerifier }
3. Validate PKCE: verify code_challenge = SHA-256(codeVerifier)
4. Exchange code with Spotify for access_token
5. Create/update user in database
6. Return JWT token as httpOnly cookie
7. Implement GET /api/auth/me returning { id, spotifyId, displayName, email, avatarUrl? }
8. Implement POST /api/auth/logout clearing JWT cookie
9. Configure CORS allowing credentials

## Common Issues & Solutions

### "PKCE verifier not found" Error
- **Cause**: Tab closed/page refreshed between login and callback
- **Solution**: Must maintain sessionStorage between login and redirect
- **Prevention**: Start fresh login from /auth/login

### "No authorization code" Error
- **Cause**: Spotify failed to authorize or user denied
- **Solution**: Check Spotify app credentials, user permissions
- **Prevention**: Verify OAuth app configured correctly in Spotify Developer Dashboard

### "Invalid PKCE verifier"
- **Cause**: Code verifier mismatch (backend issue)
- **Solution**: Ensure backend correctly validates SHA-256(verifier)
- **Prevention**: Backend should log verifier for debugging

### CORS Errors
- **Cause**: Frontend and backend CORS mismatch
- **Solution**: Verify backend CORS config includes frontend origin
- **Prevention**: Use environment variables for CORS origins

### JWT Not Sent with Requests
- **Cause**: withCredentials not set on axios
- **Solution**: Already configured in apiClient.ts
- **Check**: Network tab shows Cookie header in requests

## Future Enhancements
1. Add refresh token rotation
2. Implement token expiration with automatic refresh
3. Add logout functionality
4. Add provider selection (Google, GitHub, etc.)
5. Add password-less authentication option
6. Implement rate limiting on callback endpoint
7. Add two-factor authentication option

## References
- [OAuth 2.0 PKCE Specification](https://tools.ietf.org/html/rfc7636)
- [Spotify Web API Authorization Guide](https://developer.spotify.com/documentation/general/guides/authorization/)
- [Web Crypto API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Next.js 15 Documentation](https://nextjs.org/docs)
