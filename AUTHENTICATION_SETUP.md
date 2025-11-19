# Authentication Setup Guide

## Overview
This document provides a complete guide for setting up and testing the authentication system in SpotifySwipe. The app uses Spotify OAuth 2.0 with PKCE (Proof Key for Code Exchange) for secure authentication, integrated with Supabase for persistent user data storage.

---

## 🎯 What's Implemented

### 1. Authentication Pages

#### Login Page (`/auth/login`)
- **Location**: `src/app/auth/login/page.tsx`
- **Features**:
  - Beautiful landing page with Spotify branding
  - "Continue with Spotify" button that initiates OAuth flow
  - Feature highlights and app benefits
  - Fully responsive design
  - Green Spotify-themed color scheme

#### Error Page (`/auth/error`)
- **Location**: `src/app/auth/error/page.tsx`
- **Features**:
  - User-friendly error messages
  - Common error descriptions with helpful context
  - "Try Again" button to restart auth flow
  - "Go to Home" button for navigation
  - Troubleshooting tips section
  - Displays error details in a formatted way

### 2. Authentication State Management

#### AuthContext
- **Location**: `src/contexts/AuthContext.tsx`
- **Provides**:
  - `user`: Current user object or null
  - `loading`: Boolean indicating if auth state is being loaded
  - `error`: Error message if any
  - `login()`: Function to initiate Spotify OAuth
  - `logout()`: Function to log out user
  - `refreshUser()`: Function to refresh user data
  - `isAuthenticated`: Boolean indicating if user is logged in

#### useAuth Hook
- **Location**: `src/hooks/useAuth.ts`
- **Usage**: Simple hook to access auth context
- **Example**:
  ```tsx
  const { user, isAuthenticated, login, logout } = useAuth();
  ```

### 3. Navigation with Auth

#### Updated Navigation Bar
- **Location**: `src/app/navigation.tsx`
- **Features**:
  - Shows "Sign in with Spotify" button when logged out
  - Displays user avatar and name when logged in
  - Dropdown menu with:
    - User profile information
    - Link to profile/dashboard
    - Logout button
  - Loading skeleton while checking auth status
  - Responsive design

### 4. Landing Page

#### Enhanced Home Page
- **Location**: `src/app/page.tsx`
- **Features**:
  - Auto-redirects to dashboard if authenticated
  - Beautiful hero section with CTA
  - Feature showcase grid
  - "How It Works" section
  - Multiple call-to-action buttons
  - Fully responsive layout

---

## 🔧 Setup Instructions

### Prerequisites

1. **Spotify Developer Account**
   - Go to https://developer.spotify.com/dashboard
   - Create a new app
   - Note your Client ID and Client Secret

2. **Supabase Project**
   - Go to https://supabase.com
   - Create a new project
   - Run the database schema from `supabase-schema.sql`
   - Note your Project URL and API keys

### Environment Configuration

1. Create `.env.local` in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Spotify API Configuration
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/spotify/callback

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

2. **Configure Spotify App**:
   - Go to your Spotify app settings
   - Add Redirect URI: `http://localhost:3000/api/auth/spotify/callback`
   - Save changes

3. **Configure Supabase**:
   - Run the SQL schema in Supabase SQL Editor
   - Verify all tables are created
   - Check that RLS policies are enabled

---

## 🚀 Testing the Authentication Flow

### Step-by-Step Testing

1. **Start the Development Server**:
   ```bash
   npm run dev
   ```

2. **Visit the Home Page**:
   - Navigate to http://localhost:3000
   - You should see the landing page with "Get Started with Spotify" button
   - The navigation should show "Sign in with Spotify" button

3. **Initiate Login**:
   - Click "Get Started with Spotify" or "Sign in with Spotify"
   - You'll be redirected to Spotify's authorization page
   - If not logged into Spotify, you'll need to log in

4. **Grant Permissions**:
   - Review the permissions requested
   - Click "Agree" to grant access
   - You'll be redirected back to the app

5. **Verify Authentication**:
   - You should be redirected to `/dashboard`
   - The navigation should now show your Spotify profile picture
   - Click on your avatar to see the dropdown menu

6. **Check Database**:
   - Go to Supabase dashboard
   - Open the `users` table
   - Verify your user was created with Spotify data

7. **Test Logout**:
   - Click your avatar in the navigation
   - Click "Log out"
   - You should be redirected to home page
   - Navigation should show "Sign in" button again

### Error Testing

1. **Test CSRF Protection**:
   - Try accessing `/api/auth/spotify/callback` directly
   - You should be redirected to `/auth/error` with state mismatch error

2. **Test Missing Data**:
   - Clear cookies mid-auth flow
   - You should see appropriate error messages

3. **Test Denied Access**:
   - Start auth flow but click "Cancel" on Spotify
   - You should see "access_denied" error page

---

## 🔒 Security Features

### Implemented Security Measures

1. **PKCE Flow**:
   - Code verifier and challenge generated client-side
   - Prevents authorization code interception
   - No client secret exposed to browser

2. **CSRF Protection**:
   - State parameter generated and verified
   - Prevents cross-site request forgery attacks
   - Stored in HTTP-only cookies

3. **Secure Token Storage**:
   - Access tokens stored in Supabase (server-side)
   - Session managed via HTTP-only cookies
   - No sensitive data in localStorage

4. **Row Level Security**:
   - Supabase RLS policies enforce access control
   - Users can only access their own data
   - Prevents unauthorized data access

---

## 📍 Key Files and Their Purpose

```
src/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx       # Login/signup page
│   │   └── error/page.tsx       # Error handling page
│   ├── layout.tsx               # Wrapped with AuthProvider
│   ├── navigation.tsx           # Auth-aware navigation
│   └── page.tsx                 # Landing page with auth redirect
├── contexts/
│   └── AuthContext.tsx          # Global auth state management
├── hooks/
│   └── useAuth.ts               # Auth hook for components
└── components/ui/
    └── dropdown-menu.tsx        # User menu dropdown

Backend API:
src/app/api/
├── auth/spotify/
│   ├── login/route.ts           # Initiates OAuth
│   ├── authorize/route.ts       # Redirects to Spotify
│   ├── callback/route.ts        # Handles OAuth callback
│   ├── logout/route.ts          # Logs out user
│   └── refresh/route.ts         # Refreshes tokens
└── users/
    └── me/route.ts              # Gets current user
```

---

## 🎨 UI Components Used

- **Button** (`src/components/ui/button.tsx`)
- **Card** (`src/components/ui/card.tsx`)
- **Avatar** (`src/components/ui/avatar.tsx`)
- **Dropdown Menu** (`src/components/ui/dropdown-menu.tsx`)
- **Lucide Icons** (for UI icons)

---

## 🔄 Authentication Flow Diagram

```
User Visits App
     │
     ├─> Not Authenticated
     │   ├─> Shows Landing Page
     │   ├─> Clicks "Sign in with Spotify"
     │   ├─> Redirected to /api/auth/spotify/login
     │   ├─> Code verifier generated, stored in cookie
     │   ├─> Redirected to Spotify OAuth
     │   ├─> User authorizes app
     │   ├─> Redirected to /api/auth/spotify/callback
     │   ├─> Code exchanged for tokens
     │   ├─> User profile fetched from Spotify
     │   ├─> User created/updated in Supabase
     │   ├─> Session cookie set
     │   └─> Redirected to /dashboard
     │
     └─> Already Authenticated
         ├─> AuthContext fetches user data
         ├─> User data stored in React state
         ├─> Navigation shows user avatar
         └─> Can access protected pages
```

---

## 🐛 Troubleshooting

### Common Issues and Solutions

#### 1. "Not authenticated" error on protected pages
**Problem**: Session cookie not being sent
**Solution**:
- Check that cookies are enabled in browser
- Verify `credentials: 'include'` in fetch calls
- Check cookie domain settings

#### 2. "Token expired" error
**Problem**: Access token expired after 1 hour
**Solution**:
- Implement automatic token refresh
- Call `/api/auth/spotify/refresh` endpoint
- Update user tokens in Supabase

#### 3. "State mismatch" error
**Problem**: CSRF protection triggered
**Solution**:
- This is expected if cookies are cleared mid-auth
- User should restart the auth flow
- Make sure cookies are not being blocked

#### 4. Redirect URI mismatch
**Problem**: Spotify redirect doesn't match configured URI
**Solution**:
- Check Spotify app settings
- Ensure exact match: `http://localhost:3000/api/auth/spotify/callback`
- No trailing slashes

#### 5. User not created in Supabase
**Problem**: Database insert fails
**Solution**:
- Check Supabase connection
- Verify RLS policies allow inserts
- Check service role key is correct
- Look at API logs for errors

---

## 📊 Testing Checklist

- [ ] User can sign in with Spotify
- [ ] User is redirected to dashboard after auth
- [ ] User profile appears in navigation
- [ ] User dropdown menu works
- [ ] User can log out
- [ ] User is redirected to home after logout
- [ ] Protected pages redirect to login when not authenticated
- [ ] Error page shows appropriate messages
- [ ] User data is stored in Supabase
- [ ] Session persists across page refreshes
- [ ] Navigation shows correct state (logged in/out)
- [ ] Landing page redirects authenticated users
- [ ] CSRF protection works (state verification)
- [ ] Token refresh works after expiration

---

## 🔐 Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key | `eyJhb...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (secret!) | `eyJhb...` |
| `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` | Yes | Spotify app client ID | `abc123...` |
| `SPOTIFY_CLIENT_SECRET` | Yes | Spotify app client secret (secret!) | `def456...` |
| `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI` | Yes | OAuth callback URL | `http://localhost:3000/api/auth/spotify/callback` |
| `NEXT_PUBLIC_APP_URL` | Yes | Application base URL | `http://localhost:3000` |

---

## 🚀 Production Deployment Checklist

### Before Deploying

- [ ] Update `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI` to production URL
- [ ] Add production redirect URI to Spotify app settings
- [ ] Update `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Set all environment variables in hosting platform
- [ ] Enable HTTPS for secure cookies
- [ ] Test auth flow in production environment
- [ ] Verify Supabase RLS policies are enabled
- [ ] Check that service role key is kept secret
- [ ] Set up error logging (e.g., Sentry)
- [ ] Configure CORS if needed
- [ ] Test from different browsers and devices
- [ ] Verify mobile responsiveness

### After Deploying

- [ ] Test complete auth flow on production
- [ ] Verify tokens are being stored correctly
- [ ] Check that sessions persist correctly
- [ ] Test logout functionality
- [ ] Monitor error rates
- [ ] Check Supabase database for new users
- [ ] Verify all pages load correctly

---

## 📝 API Endpoints Reference

### Authentication Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/auth/spotify/login` | GET | Initiate OAuth flow | No |
| `/api/auth/spotify/callback` | GET | Handle OAuth callback | No |
| `/api/auth/spotify/logout` | POST | Log out user | Yes |
| `/api/auth/spotify/refresh` | POST | Refresh access token | Yes |
| `/api/users/me` | GET | Get current user | Yes |

---

## 💡 Usage Examples

### Using Auth in Components

```tsx
'use client';

import { useAuth } from '@/hooks/useAuth';

export function MyComponent() {
  const { user, isAuthenticated, loading, login, logout } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <button onClick={login}>
        Sign in with Spotify
      </button>
    );
  }

  return (
    <div>
      <p>Welcome, {user.display_name}!</p>
      <button onClick={logout}>Log out</button>
    </div>
  );
}
```

### Protected Page Example

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function ProtectedPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <div>Protected content</div>;
}
```

---

## 🎉 Success Indicators

When everything is working correctly:

1. ✅ You can click "Sign in with Spotify" and complete OAuth flow
2. ✅ You're redirected to dashboard after authentication
3. ✅ Your Spotify avatar appears in navigation
4. ✅ Dropdown menu shows your name and email
5. ✅ User record appears in Supabase `users` table
6. ✅ Session persists after page refresh
7. ✅ Logout works and redirects to home
8. ✅ Navigation updates based on auth state
9. ✅ Protected pages redirect to login when needed
10. ✅ Error page shows helpful messages when issues occur

---

**Last Updated**: 2025-11-19
**Version**: 1.0.0
**Status**: ✅ Ready for Testing
