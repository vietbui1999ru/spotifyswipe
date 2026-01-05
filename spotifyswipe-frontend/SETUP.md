# Swipify Frontend - Setup Complete

## Overview
Fresh, clean Next.js 15 frontend for Swipify with proper configuration, authentication, and API integration.

## File Structure
```
spotifyswipe-frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx           (Root layout with AuthProvider)
│   │   ├── page.tsx             (Home page - protected)
│   │   ├── globals.css          (Tailwind directives)
│   │   └── auth/
│   │       ├── layout.tsx       (Auth layout wrapper)
│   │       └── login/
│   │           └── page.tsx     (Spotify login page)
│   ├── components/
│   │   └── ProtectedRoute.tsx   (Auth guard component)
│   ├── contexts/
│   │   └── AuthContext.tsx      (Auth state management)
│   └── lib/
│       └── apiClient.ts         (Axios with interceptors)
├── package.json                 (Dependencies)
├── tsconfig.json               (TypeScript config with @ alias)
├── tailwind.config.ts          (Spotify colors configured)
├── postcss.config.mjs          (PostCSS + Tailwind + Autoprefixer)
├── next.config.js              (Image optimization, SWC minify)
├── .env.local                  (API URL)
├── .gitignore                  (Standard Next.js ignores)
└── SETUP.md                    (This file)
```

## Technologies
- React 19.0.0
- Next.js 15.1.3
- TypeScript 5.7.2
- TailwindCSS 4.0.0
- Axios 1.7.7

## Configuration Details

### Package.json
- Clean dependencies: React, Next, Axios, TailwindCSS
- No conflicting packages
- Standard scripts: dev, build, start, lint
- Node.js >= 18.0.0

### TypeScript
- Strict mode enabled
- Path alias: @/* → ./src/*
- Proper JSX configuration
- Modern ES2020 target

### TailwindCSS (v4)
- Dark mode support with class strategy
- Spotify colors:
  - spotify-green: #1DB954
  - spotify-dark: #191414
  - spotify-gray: #282828
  - spotify-light: #FFFFFF
- Clean configuration, no conflicts

### CSS
- Only @tailwind directives
- No @layer or custom variants
- Minimal and clean

### API Client
- Axios instance with credentials
- Automatic 401 redirect to /auth/login
- Properly typed with TypeScript

### Authentication Flow
1. User visits /auth/login
2. Clicks "Login with Spotify" button
3. GET /api/auth/login returns OAuth URL
4. User redirected to Spotify
5. Spotify redirects back with code
6. POST /api/auth/callback with code
7. refreshUser() fetches authenticated user
8. User redirected to home page

## Components

### AuthContext (src/contexts/AuthContext.tsx)
- User interface with: id, spotifyId, displayName, email, avatarUrl
- Manages auth state globally
- Methods: login(), logout(), refreshUser()
- useAuth() hook for access

### ProtectedRoute (src/components/ProtectedRoute.tsx)
- Wraps protected pages
- Shows loading spinner
- Redirects unauthenticated users to login

### Root Layout (src/app/layout.tsx)
- Wraps entire app with AuthProvider
- Imports Tailwind globals
- Sets dark theme and Spotify colors
- Metadata export

### Login Page (src/app/auth/login/page.tsx)
- Spotify button with error handling
- Handles OAuth callback with code
- Loading states
- Automatic redirect if already authenticated

### Home Page (src/app/page.tsx)
- Protected with ProtectedRoute component
- Displays user info
- Logout button
- Ready for music discovery features

## Environment Variables
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:3001
```

## Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
Visit http://localhost:3000

### Build
```bash
npm run build
npm start
```

### Lint
```bash
npm run lint
```

## API Endpoints Expected

The frontend assumes these backend endpoints:

1. **GET /api/auth/login**
   - Returns: { url: "spotify_oauth_url" }

2. **POST /api/auth/callback**
   - Body: { code: "auth_code" }
   - Sets authentication cookie/session

3. **GET /api/auth/me**
   - Returns: User object
   - Used for checking auth status

4. **POST /api/auth/logout**
   - Clears authentication

## Notes

- All imports use @ alias (e.g., @/lib/apiClient)
- No experimental features or beta dependencies
- CSS is clean with only Tailwind directives
- TypeScript strict mode enabled
- All files properly formatted
- No conflicting dependencies
