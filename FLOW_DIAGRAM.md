# Spotify OAuth PKCE Flow Diagram

## Complete Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SPOTIFY OAUTH PKCE FLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 1: USER INITIATES LOGIN
──────────────────────────────
User on /auth/login
         │
         ├─ Clicks "Login with Spotify" button
         │
         └─> handleSpotifyLogin()
             ├─ generateCodeVerifier() → "random_128_char_string"
             ├─ storePKCEVerifier(verifier) → sessionStorage['pkce_code_verifier']
             └─ GET /api/auth/login
                └─> Backend returns: { url: "https://accounts.spotify.com/authorize?..." }


STEP 2: REDIRECT TO SPOTIFY
────────────────────────────
Frontend receives OAuth URL
         │
         └─> window.location.href = spotify_oauth_url
             │
             └─> User redirected to Spotify login page


STEP 3: USER AUTHENTICATES WITH SPOTIFY
─────────────────────────────────────────
Spotify Shows:
  ├─ Login form (email/password or SSO)
  └─ Scope approval: "We want access to your email, playlists, library..."

User clicks "Authorize Swipify"


STEP 4: SPOTIFY REDIRECTS BACK TO FRONTEND
────────────────────────────────────────────
Spotify redirect to:
  https://swipify.com/auth/callback?code=AUTHORIZATION_CODE&state=STATE

Browser navigates to /auth/callback


STEP 5: FRONTEND PROCESSES CALLBACK
────────────────────────────────────
CallbackPage mounts
  │
  ├─ Extract from URL: code, state
  │
  ├─ Retrieve from sessionStorage: pkce_code_verifier
  │
  ├─ Validate:
  │  ├─ code exists? ✓
  │  └─ verifier exists? ✓
  │
  └─> POST /api/auth/callback
      │
      ├─ Payload: {
      │    "code": "AUTHORIZATION_CODE",
      │    "codeVerifier": "random_128_char_string"
      │  }
      │
      └─> Backend validates PKCE:
          ├─ SHA-256(codeVerifier) == code_challenge ✓
          │
          ├─ Exchange code with Spotify API:
          │  └─> GET https://accounts.spotify.com/api/token
          │      ├─ client_id, client_secret, code, code_verifier
          │      └─ Returns: { access_token, refresh_token, expires_in }
          │
          ├─ Create/Update user in database
          │
          └─> Create JWT token
              ├─ Sign: { userId, email, spotifyId, exp: now + 24h }
              └─ Return as httpOnly cookie


STEP 6: FRONTEND COMPLETES LOGIN
─────────────────────────────────
On success response (status 200):
  │
  ├─ clearPKCEVerifier() → sessionStorage.removeItem('pkce_code_verifier')
  │
  ├─ refreshUser()
  │  └─> GET /api/auth/me
  │      └─> Returns: {
  │           id: "user_123",
  │           spotifyId: "spotify_user_id",
  │           displayName: "John Doe",
  │           email: "john@example.com",
  │           avatarUrl: "https://..."
  │         }
  │
  ├─ Update AuthContext with user data
  │
  └─> router.push('/dashboard/swipe')


STEP 7: USER ON DASHBOARD
──────────────────────────
/dashboard/swipe loads
  │
  ├─ DashboardLayout checks ProtectedRoute
  │  └─ isAuthenticated? Yes ✓
  │
  └─> Display welcome message with user's name
      └─ Ready to use app features


┌─────────────────────────────────────────────────────────────────────────────┐
│                          ERROR HANDLING PATHS                               │
└─────────────────────────────────────────────────────────────────────────────┘

ERROR PATH 1: USER DENIES AUTHORIZATION
────────────────────────────────────────
Spotify redirects to callback URL with:
  https://swipify.com/auth/callback?error=access_denied

Frontend detects:
  ├─ No 'code' parameter
  └─ Shows: "No authorization code received from Spotify. Please try logging in again."
     └─ User can click "Back to Login" button


ERROR PATH 2: SESSION EXPIRED
──────────────────────────────
User closes tab after login, reopens browser, completes Spotify auth
  │
  └─ sessionStorage is empty!
     └─ getPKCEVerifier() returns null
        └─> Shows: "PKCE verifier not found. Your session may have expired..."
            └─ User must start fresh login


ERROR PATH 3: INVALID CODE FROM SPOTIFY
────────────────────────────────────────
Spotify provides tampered/invalid code
  │
  └─ Backend validates with Spotify API
     └─> Spotify returns error
        └─> Frontend shows error message
            └─ User can "Back to Login" to retry


ERROR PATH 4: NETWORK/API ERROR
───────────────────────────────
POST /api/auth/callback fails (500, timeout, etc)
  │
  └─> Catch block:
      ├─ setError(errorMessage)
      └─ Show error UI with retry button


ERROR PATH 5: UNAUTHORIZED ACCESS TO DASHBOARD
──────────────────────────────────────────────
Unauthenticated user tries to access /dashboard/swipe
  │
  └─> ProtectedRoute checks isAuthenticated
     └─> isAuthenticated = false
        └─> router.push('/auth/login')


┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW DIAGRAM                                 │
└─────────────────────────────────────────────────────────────────────────────┘

FRONTEND STATE MANAGEMENT
─────────────────────────

AuthContext
  ├─ user: User | null
  │  ├─ id: string
  │  ├─ spotifyId: string
  │  ├─ displayName: string
  │  ├─ email: string
  │  └─ avatarUrl?: string
  │
  ├─ isAuthenticated: boolean (derived from !!user)
  ├─ isLoading: boolean
  │
  ├─ refreshUser(): Promise<void>
  │  └─ Calls GET /api/auth/me
  │
  └─ logout(): Promise<void>
     └─ Calls POST /api/auth/logout


sessionStorage
  └─ pkce_code_verifier: string
     ├─ Set at login
     └─ Cleared after callback success


HTTP Cookies (httpOnly)
  └─ jwt_token
     ├─ Set by backend on callback
     ├─ Automatically sent with credentials: true
     └─ Never accessible from JavaScript


┌─────────────────────────────────────────────────────────────────────────────┐
│                        SECURITY CONSIDERATIONS                              │
└─────────────────────────────────────────────────────────────────────────────┘

PKCE SECURITY
─────────────
Code Verifier: random_128_char_string
               (never sent to Spotify directly)

Code Challenge: SHA-256(verifier) → base64url encoded
                (sent with authorization request)

Verification:
  SHA-256(code_verifier_from_client) == code_challenge_from_request ✓

Prevents: Authorization code interception attack


SESSION STORAGE SECURITY
────────────────────────
├─ sessionStorage (not localStorage)
│  └─ Cleared when tab closes
│
├─ Same-origin policy enforced
│  └─ Only accessible from same domain
│
└─ Not transmitted with HTTP requests
   └─ Stays on client side


JWT TOKEN SECURITY
──────────────────
├─ httpOnly flag
│  └─ Not accessible from JavaScript
│  └─ Prevents XSS attacks
│
├─ Secure flag (in production)
│  └─ Only sent over HTTPS
│
├─ SameSite=Strict (recommended)
│  └─ Not sent with cross-site requests
│  └─ Prevents CSRF attacks
│
└─ Automatic credential sending
   └─ withCredentials: true in axios


CORS PROTECTION
───────────────
Backend configured with:
  ├─ Access-Control-Allow-Origin: frontend_origin
  ├─ Access-Control-Allow-Credentials: true
  ├─ Access-Control-Allow-Methods: GET, POST
  └─ Access-Control-Allow-Headers: Content-Type

Frontend sends:
  └─ withCredentials: true in axios


┌─────────────────────────────────────────────────────────────────────────────┐
│                          COMPONENT HIERARCHY                                │
└─────────────────────────────────────────────────────────────────────────────┘

RootLayout
└─ AuthProvider (manages auth state)
   ├─ /auth/layout
   │  ├─ /login/page
   │  │  ├─ Generates PKCE verifier
   │  │  └─ Initiates Spotify OAuth
   │  │
   │  └─ /callback/page
   │     ├─ Processes authorization code
   │     ├─ Exchanges code for JWT
   │     └─ Redirects to dashboard
   │
   └─ /dashboard/layout (ProtectedRoute)
      ├─ Redirects if not authenticated
      │
      └─ /swipe/page
         └─ Main application interface


┌─────────────────────────────────────────────────────────────────────────────┐
│                         TIMING SEQUENCE                                     │
└─────────────────────────────────────────────────────────────────────────────┘

                      Browser                    Backend
                        │                           │
  User clicks login      │                           │
         │               │                           │
         ├─>Generate PKCE│                           │
         │  verifier     │                           │
         │  (client)     │                           │
         │               │                           │
         ├─>GET /login   ├────────────────────────>  │
         │               │                      Generate OAuth URL
         │               │                      with code_challenge
         │               │  <─────────────────────  │
         │               │  { url: "spotify..." }   │
         │  Redirect to  │                           │
         │  Spotify      │                           │
         │               │  [User logs in at Spotify]
         │               │                           │
         │  [Spotify     │                           │
         │   redirects]  │                           │
         │               │                           │
         ├─>/callback    │                           │
         │  ?code=XXX    │                           │
         │               │                           │
         ├─>POST /auth/  ├────────────────────────>  │
         │   callback    │  { code, codeVerifier }   │
         │               │                      Validate PKCE
         │               │                      Exchange with Spotify
         │               │                      Create user
         │               │                      Generate JWT
         │               │  <─────────────────────  │
         │               │  Set-Cookie: jwt=...     │
         │               │  { success: true }       │
         │  GET /me      ├────────────────────────>  │
         │               │  (Cookie auto-sent)      │
         │               │  <─────────────────────  │
         │               │  { user data }           │
         │  Redirect to  │                           │
         │  /dashboard   │                           │
         │               │                           │

