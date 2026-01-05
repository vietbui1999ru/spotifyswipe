# PKCE Integration Guide for Frontend

## Overview
Your frontend must implement PKCE (Proof Key for Code Exchange) to securely authenticate with Spotify and the backend. This prevents authorization code interception attacks.

## Step-by-Step Implementation

### 1. Generate Code Verifier (On Login Page Load)

```typescript
// Generate random code verifier (43-128 characters, URL-safe)
function generateCodeVerifier(): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let verifier = '';
  const randomValues = new Uint8Array(32);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < randomValues.length; i++) {
    verifier += charset[randomValues[i] % charset.length];
  }
  return verifier;
}
```

### 2. Generate Code Challenge

```typescript
// Generate code challenge from verifier (S256 method)
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert to base64url
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashString = String.fromCharCode(...hashArray);
  const challenge = btoa(hashString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return challenge;
}
```

### 3. Store Code Verifier Securely

```typescript
// Store in sessionStorage (cleared when tab closes)
// IMPORTANT: Do NOT use localStorage (persists to disk, less secure)
const codeVerifier = generateCodeVerifier();
const codeChallenge = await generateCodeChallenge(codeVerifier);

// Store verifier in sessionStorage
sessionStorage.setItem('pkce_code_verifier', codeVerifier);
```

### 4. Get OAuth URL from Backend

```typescript
// Call backend to get OAuth URL with code_challenge
async function getSpotifyOAuthUrl(): Promise<string> {
  const codeChallenge = sessionStorage.getItem('pkce_code_challenge');

  const response = await fetch(
    `/api/auth/login?code_challenge=${encodeURIComponent(codeChallenge)}`,
    {
      method: 'GET',
      credentials: 'include' // Important: include cookies
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get OAuth URL');
  }

  const data = await response.json();
  return data.data.url;
}
```

### 5. Redirect to Spotify

```typescript
// Redirect user to Spotify authorization
const oauthUrl = await getSpotifyOAuthUrl();
window.location.href = oauthUrl;
// User logs in and approves, gets redirected back to your app
```

### 6. Handle OAuth Callback

```typescript
// In your callback page component (e.g., /auth/login/callback)

useEffect(() => {
  const handleCallback = async () => {
    // Extract code and state from URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    if (error) {
      console.error('OAuth error:', error);
      // Redirect to login with error
      navigate('/login', { state: { error } });
      return;
    }

    if (!code || !state) {
      console.error('Missing code or state');
      navigate('/login', { state: { error: 'Missing authorization code' } });
      return;
    }

    // Retrieve code_verifier from sessionStorage
    const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
    if (!codeVerifier) {
      console.error('Code verifier not found');
      navigate('/login', { state: { error: 'Session invalid' } });
      return;
    }

    // Exchange code with backend
    const response = await fetch('/api/auth/callback', {
      method: 'POST',
      credentials: 'include', // Important: include cookies for JWT
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code,
        state,
        code_verifier: codeVerifier
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Auth callback error:', error);
      navigate('/login', { state: { error: error.error } });
      return;
    }

    // Clear code verifier from sessionStorage
    sessionStorage.removeItem('pkce_code_verifier');
    sessionStorage.removeItem('pkce_code_challenge');

    // Success! User is now logged in
    // Backend has set JWT cookie automatically
    navigate('/swipe');
  };

  handleCallback();
}, [navigate]);
```

## Complete Login Flow Example

```typescript
// Login Page
export function LoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSpotifyLogin = async () => {
    setIsLoading(true);
    try {
      // Step 1: Generate PKCE pair
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // Step 2: Store verifier in sessionStorage
      sessionStorage.setItem('pkce_code_verifier', codeVerifier);
      sessionStorage.setItem('pkce_code_challenge', codeChallenge);

      // Step 3: Get OAuth URL from backend
      const response = await fetch(
        `/api/auth/login?code_challenge=${encodeURIComponent(codeChallenge)}`,
        { credentials: 'include' }
      );

      if (!response.ok) throw new Error('Failed to get login URL');

      const data = await response.json();

      // Step 4: Redirect to Spotify
      window.location.href = data.data.url;
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
    }
  };

  return (
    <button onClick={handleSpotifyLogin} disabled={isLoading}>
      {isLoading ? 'Loading...' : 'Login with Spotify'}
    </button>
  );
}
```

## Security Best Practices

1. **Always Use HTTPS in Production**: PKCE is designed for public clients. In production, your app must be served over HTTPS.

2. **Store Code Verifier in SessionStorage**: Never use localStorage or window variables for code_verifier. SessionStorage is cleared when the tab closes.

3. **Include `credentials: 'include'`**: This ensures cookies (JWT) are sent with requests.

4. **Validate Code Challenge Format**: Ensure code_challenge is properly base64url encoded before sending to backend.

5. **Clear Sensitive Data**: After successful login, clear code_verifier and code_challenge from sessionStorage.

6. **Handle Errors Gracefully**: If callback fails, redirect to login with error message instead of showing technical details to user.

## API Contract

### GET /api/auth/login

```
Query Parameter:
  code_challenge: string (required)
    - SHA256(code_verifier) in base64url format
    - 43 characters

Response (200):
{
  "success": true,
  "data": {
    "url": "https://accounts.spotify.com/authorize?client_id=...&code_challenge=...&code_challenge_method=S256&..."
  }
}

Error (400):
{
  "success": false,
  "error": "code_challenge query parameter required"
}
```

### POST /api/auth/callback

```
Content-Type: application/json

Request Body:
{
  "code": string,           // authorization code from Spotify
  "state": string,          // state value from Spotify callback
  "code_verifier": string   // original code_verifier from PKCE
}

Response (200):
{
  "success": true,
  "data": {
    "user": {
      "id": "mongo_object_id",
      "spotifyId": "spotify_id",
      "displayName": "User Name",
      "email": "user@example.com",
      "avatarUrl": "https://..."
    }
  }
}
Set-Cookie: jwt=<token>; HttpOnly; Path=/; Max-Age=604800; Secure; SameSite=Lax

Error (401):
{
  "success": false,
  "error": "Invalid code_verifier" | "Invalid or expired state"
}

Error (400):
{
  "success": false,
  "error": "code_verifier required" | "Code required" | "State required"
}
```

## Troubleshooting

**Error: "code_challenge query parameter required"**
- Make sure you're passing code_challenge as a query parameter to GET /api/auth/login
- Verify code_challenge is properly base64url encoded

**Error: "Invalid code_verifier"**
- Code verifier doesn't match the code challenge
- Verify you're computing SHA256(code_verifier) correctly
- Ensure base64url encoding is correct (replace +, /, = characters)
- Make sure you're using the same code_verifier from sessionStorage

**Error: "Invalid or expired state"**
- State value from Spotify doesn't match backend cache
- User took too long to complete OAuth (>10 minutes)
- Start a new login attempt

**JWT Not Set in Cookie**
- Verify fetch request includes `credentials: 'include'`
- Check browser DevTools: Application > Cookies should show "jwt"
- Verify backend is setting cookie with correct domain

**Frontend Can't Access User After Login**
- Call GET /api/auth/me to verify JWT is working
- Check that cookies are being sent with requests (credentials: 'include')
- Verify CORS is properly configured on backend

## Testing Checklist

- [ ] Code verifier generates 43+ character random string
- [ ] Code challenge is properly base64url encoded
- [ ] Code verifier stored in sessionStorage (not localStorage)
- [ ] GET /api/auth/login request includes code_challenge query param
- [ ] Backend returns OAuth URL with code_challenge and S256 method
- [ ] Redirect to Spotify works and shows login
- [ ] Spotify redirects back with code and state
- [ ] POST /api/auth/callback sent with code, state, code_verifier
- [ ] JWT cookie set after successful callback
- [ ] Can fetch /api/auth/me and get user data
- [ ] Code verifier cleared from sessionStorage after login
- [ ] Login fails gracefully with error messages for invalid flows
- [ ] No console errors during auth flow
