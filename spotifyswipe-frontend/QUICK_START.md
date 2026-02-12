# Quick Start Guide

## Installation & Run

```bash
cd spotifyswipe-frontend
npm install
npm run dev
```

Open http://localhost:3000

## What's Ready

- Full authentication system with Spotify OAuth
- Protected routes for authenticated users
- Tailwind CSS with Spotify color palette
- API client with automatic 401 handling
- TypeScript strict mode enabled
- Next.js 15 with App Router
- Dark mode by default

## File Locations

**Key Files to Know:**
- Auth logic: `src/contexts/AuthContext.tsx`
- API setup: `src/lib/apiClient.ts`
- Home page: `src/app/page.tsx`
- Login page: `src/app/auth/login/page.tsx`
- Colors config: `tailwind.config.ts`

## Available Scripts

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Build for production
npm start        # Run production build
npm run lint     # Check code quality
```

## Environment

Backend API URL is set to: `http://127.0.0.1:3001`

To change, edit `.env.local`:
```
NEXT_PUBLIC_API_URL=your-api-url
```

## Backend API Expectations

Your backend needs these endpoints:

```
GET /api/auth/login
Response: { url: "spotify-oauth-url" }

POST /api/auth/callback
Body: { code: "auth-code" }

GET /api/auth/me
Response: User object

POST /api/auth/logout
Response: 200 OK
```

## Using the Auth Hook

```tsx
import { useAuth } from '@/contexts/AuthContext';

export function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <div>
      {user && <p>Welcome, {user.displayName}!</p>}
    </div>
  );
}
```

## Making API Calls

```tsx
import apiClient from '@/lib/apiClient';

// GET request
const response = await apiClient.get('/api/endpoint');

// POST request
const response = await apiClient.post('/api/endpoint', data);
```

## Spotify Colors

Use in TailwindCSS classes:
- `bg-spotify-dark` - #191414
- `bg-spotify-gray` - #282828
- `bg-spotify-green` - #1DB954
- `text-spotify-light` - #FFFFFF

Example:
```jsx
<div className="bg-spotify-dark text-spotify-light p-4">
  <button className="bg-spotify-green hover:bg-green-600">
    Play
  </button>
</div>
```

## Protected Pages

Wrap pages with ProtectedRoute to require authentication:

```tsx
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function Page() {
  return (
    <ProtectedRoute>
      <YourContent />
    </ProtectedRoute>
  );
}
```

## TypeScript Path Alias

Use `@/` to import from src:
```tsx
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { ProtectedRoute } from '@/components/ProtectedRoute';
```

## Next Steps

1. Run `npm install` to download dependencies
2. Start with `npm run dev`
3. Test login flow with Spotify
4. Add music discovery features to home page
5. Build out additional pages as needed

## Troubleshooting

**Port 3000 already in use:**
```bash
npm run dev -- -p 3001
```

**API connection issues:**
- Check backend is running on http://127.0.0.1:3001
- Verify `.env.local` has correct API URL
- Check CORS settings in backend

**Login not working:**
- Verify backend has Spotify OAuth configured
- Check browser console for error messages
- Ensure callback URL is registered with Spotify

---

For more details, see `PROJECT_SUMMARY.md` or `SETUP.md`
