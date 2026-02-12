# Code Reference Guide

Quick reference to all key code in the Swipify frontend.

## Authentication Hook Usage

```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const {
    user,              // User object or null
    isAuthenticated,   // Boolean
    isLoading,         // Boolean
    login,             // Function
    logout,            // Function
    refreshUser        // Function
  } = useAuth();

  if (isLoading) return <p>Loading...</p>;

  if (!isAuthenticated) return <p>Please login</p>;

  return <p>Welcome, {user?.displayName}!</p>;
}
```

## Protected Route Usage

```tsx
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function ProtectedPage() {
  return (
    <ProtectedRoute>
      <h1>This page requires authentication</h1>
      {/* Content here is only shown if authenticated */}
    </ProtectedRoute>
  );
}
```

## API Client Usage

```tsx
import apiClient from '@/lib/apiClient';

// GET request
const response = await apiClient.get('/api/endpoint');
const data = response.data;

// POST request
const response = await apiClient.post('/api/endpoint', {
  key: 'value'
});

// Error handling
try {
  await apiClient.get('/api/data');
} catch (error) {
  if (error.response?.status === 401) {
    // User is redirected automatically to /auth/login
  }
}
```

## Tailwind Color Classes

```tsx
// Background colors
<div className="bg-spotify-dark">      {/* #191414 */}
<div className="bg-spotify-gray">      {/* #282828 */}
<div className="bg-spotify-green">     {/* #1DB954 */}
<div className="bg-spotify-light">     {/* #FFFFFF */}

// Text colors
<p className="text-spotify-dark">      {/* #191414 */}
<p className="text-spotify-gray">      {/* #282828 */}
<p className="text-spotify-green">     {/* #1DB954 */}
<p className="text-spotify-light">     {/* #FFFFFF */}

// Border colors
<div className="border-spotify-green">
```

## User Interface Definition

```tsx
interface User {
  id: string;
  spotifyId: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
}
```

## OAuth Login Flow

1. User clicks login button
2. Frontend calls backend: `GET /api/auth/login`
3. Backend returns: `{ url: "https://accounts.spotify.com/authorize?..." }`
4. Frontend redirects browser to Spotify
5. User authenticates with Spotify
6. Spotify redirects to callback with code
7. Frontend posts: `POST /api/auth/callback { code }`
8. Backend validates and creates session
9. Frontend calls: `GET /api/auth/me`
10. Returns user object

## API Endpoints

### GET /api/auth/login
Request: None
Response:
```json
{
  "url": "https://accounts.spotify.com/authorize?..."
}
```

### POST /api/auth/callback
Request:
```json
{
  "code": "authorization_code_from_spotify"
}
```
Response: Session created

### GET /api/auth/me
Request: None
Response:
```json
{
  "id": "user_id",
  "spotifyId": "spotify_user_id",
  "displayName": "User Name",
  "email": "user@example.com",
  "avatarUrl": "https://i.scdn.co/..."
}
```

### POST /api/auth/logout
Request: None
Response: 200 OK

## Environment Variables

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:3001
```

Accessible in frontend via:
```tsx
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

## Project Structure

### Pages
- `/` - Home page (requires auth)
- `/auth/login` - Spotify login page

### Components
- `<ProtectedRoute>` - Wraps protected pages

### Contexts
- `AuthContext` - Global auth state

### Libraries
- `apiClient` - Axios configuration

## TypeScript Paths

All imports can use the @/ alias:

```tsx
// ✓ Correct
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/apiClient';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// ✗ Avoid relative imports
import { useAuth } from '../../contexts/AuthContext';
```

## Common Patterns

### Check if User is Authenticated

```tsx
import { useAuth } from '@/contexts/AuthContext';

function Component() {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? (
    <p>User is logged in</p>
  ) : (
    <p>User is not logged in</p>
  );
}
```

### Get Current User Data

```tsx
import { useAuth } from '@/contexts/AuthContext';

function Component() {
  const { user } = useAuth();

  return (
    <div>
      <h1>{user?.displayName}</h1>
      <p>{user?.email}</p>
      {user?.avatarUrl && (
        <img src={user.avatarUrl} alt={user.displayName} />
      )}
    </div>
  );
}
```

### Logout User

```tsx
import { useAuth } from '@/contexts/AuthContext';

function Component() {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/auth/login';
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

### Make API Call

```tsx
import apiClient from '@/lib/apiClient';
import { useEffect, useState } from 'react';

function Component() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get('/api/data');
        setData(response.data);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchData();
  }, []);

  return <div>{/* Display data */}</div>;
}
```

### Protected Page Component

```tsx
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

export default function MyPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-spotify-dark p-8">
        <h1 className="text-4xl font-bold text-spotify-light">
          Welcome, {user?.displayName}!
        </h1>
      </div>
    </ProtectedRoute>
  );
}
```

## Client vs Server Components

All components with hooks must have `'use client'` directive:

```tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';

export function MyComponent() {
  const { user } = useAuth();
  // ...
}
```

Root layouts don't need it, only their children.

## Error Handling

### API Errors
```tsx
try {
  await apiClient.get('/api/data');
} catch (error) {
  if (error.response?.status === 401) {
    // Auto-redirected to login
  } else if (error.response?.status === 500) {
    // Server error
  }
}
```

### Component Errors
```tsx
try {
  await logout();
} catch (error) {
  console.error('Logout failed:', error);
}
```

## Dark Mode

The app runs in dark mode by default via:
- `<html className="dark">` in root layout
- `darkMode: 'class'` in Tailwind config
- Global dark theme colors applied

## Next.js Features Used

- App Router (not Pages Router)
- Dynamic routing
- Layout system
- Client components
- Metadata export
- Image optimization
- Environment variables

## Build & Deploy Commands

```bash
# Development
npm install
npm run dev

# Production build
npm run build
npm start

# Type checking
npm run lint

# Full build verification
npm run build && npm start
```

## Spotify Integration Points

1. **Login Button** - Links to Spotify OAuth
2. **User Avatar** - From Spotify profile image
3. **Color Scheme** - Uses Spotify brand colors
4. **API Base** - Points to backend that uses Spotify API
5. **User Data** - From Spotify authentication

## Testing the Auth Flow

1. Run `npm run dev`
2. Visit http://localhost:3000
3. You'll be redirected to /auth/login
4. Click "Login with Spotify"
5. Authenticate with Spotify
6. You should return to home page
7. User data should display
8. Click Logout to test logout

---

This guide covers all the core functionality. For more details, see the full documentation files.
