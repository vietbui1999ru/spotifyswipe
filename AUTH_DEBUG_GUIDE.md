# NextAuth + Spotify OAuth Debug Guide

## Current Setup (HTTP for local debugging)

### 1. Environment Variables (`.env`)
```env
NEXTAUTH_URL="http://127.0.0.1:3000"
NEXTAUTH_URL_INTERNAL="http://127.0.0.1:3000"
AUTHTRUST_HOST=true
SPOTIFY_CLIENT_ID="467b01ab361c4cf5b2f59b1584850d1c"
SPOTIFY_CLIENT_SECRET="123045ed37654ba5b8e1494087f21db2"
AUTH_SECRET="4BFFON1yl+21O0L4qG4ctbm39Z/Rki/kZifx1NhY7eo="
```

### 2. Spotify Dashboard Redirect URI
```
http://127.0.0.1:3000/api/auth/callback/spotify
```

### 3. Run Dev Server (HTTP, not HTTPS)
```bash
npm run dev
```

This runs:
```bash
next dev --turbo --hostname 127.0.0.1 --port 3000
```

### 4. Access Your App
```
http://127.0.0.1:3000
```

## Debugging Steps

### Step 1: Check Auth Debug Endpoint

1. Go to: `http://127.0.0.1:3000/api/debug/auth`
2. You should see:
```json
{
  "env": {
    "NEXTAUTH_URL": "http://127.0.0.1:3000",
    "NEXTAUTH_URL_INTERNAL": "http://127.0.0.1:3000",
    "NODE_ENV": "development"
  },
  "headers": {
    "host": "127.0.0.1:3000",
    "x-forwarded-proto": null,
    "x-forwarded-host": null,
    "origin": "http://127.0.0.1:3000"
  },
  "url": {
    "protocol": "http",
    "host": "127.0.0.1:3000",
    "constructedUrl": "http://127.0.0.1:3000"
  }
}
```

If `host` shows `localhost:3000` instead of `127.0.0.1:3000`, that's your problem!

### Step 2: Check NextAuth Providers Endpoint

1. Go to: `http://127.0.0.1:3000/api/auth/providers`
2. You should see Spotify provider info

### Step 3: Monitor Network Tab (Browser DevTools)

1. Open DevTools (F12)
2. Go to Network tab
3. Click "Sign in with Spotify"
4. Look for the request to `https://accounts.spotify.com/authorize?...`
5. **Check the `redirect_uri` parameter** - it MUST be:
   ```
   http://127.0.0.1:3000/api/auth/callback/spotify
   ```

If it shows `localhost` instead, that's the issue!

### Step 4: Check Browser Console

Look for any console errors. NextAuth might log redirect issues.

### Step 5: Check Server Logs

Look at terminal output when starting dev server for any errors.

## Testing with Postman

### Get OAuth Flow Info

1. **POST** to: `http://127.0.0.1:3000/api/auth/signin/spotify`
2. Headers:
   ```
   Content-Type: application/x-www-form-urlencoded
   ```
3. Body:
   ```
   csrfToken=<get from /api/auth/csrf endpoint first>
   ```

### Get CSRF Token First

1. **GET** to: `http://127.0.0.1:3000/api/auth/csrf`
2. Response contains `csrfToken`

## Common Issues & Solutions

### Issue 1: `redirect_uri` shows `localhost` instead of `127.0.0.1`

**Cause:** Browser is resolving to localhost

**Solution:**
- Make sure you're accessing `http://127.0.0.1:3000` (not `localhost`)
- Check `host` header in `/api/debug/auth` endpoint
- If it still shows localhost, you might need:
  ```bash
  npm run dev -- --hostname 127.0.0.1
  ```

### Issue 2: "Invalid redirect URI" after signing in

**Cause:** Spotify dashboard Redirect URI doesn't match what's being sent

**Solution:**
1. Go to https://developer.spotify.com/dashboard
2. Check Redirect URIs - must be EXACTLY:
   ```
   http://127.0.0.1:3000/api/auth/callback/spotify
   ```
3. Clear browser cookies
4. Try again

### Issue 3: `NEXTAUTH_URL` env var not being used

**Cause:** Environment variables not reloaded

**Solution:**
1. Stop dev server (Ctrl+C)
2. Delete `.next` folder: `rm -rf .next`
3. Clear browser cache/cookies
4. Start again: `npm run dev`

### Issue 4: CSRF token mismatch

**Cause:** Session/cookies not properly configured

**Solution:**
- Clear browser cookies
- Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
- Try signing in again

## Complete Flow Debugging

### 1. Start Fresh
```bash
rm -rf .next
npm run dev
```

### 2. Verify Setup
- Go to `http://127.0.0.1:3000/api/debug/auth` ✅
- Go to `http://127.0.0.1:3000/api/auth/providers` ✅
- Check `host` shows `127.0.0.1:3000` ✅

### 3. Monitor Sign-In
- Open DevTools → Network tab
- Click "Sign in with Spotify"
- Look at authorize request URL
- Check `redirect_uri` parameter

### 4. Check Spotify Dashboard
- https://developer.spotify.com/dashboard
- Redirect URI matches `http://127.0.0.1:3000/api/auth/callback/spotify`

### 5. Sign In
- Complete Spotify login
- Should redirect to `http://127.0.0.1:3000/api/auth/callback/spotify?code=...`
- Should then redirect to `/dashboard`

## If Still Not Working

1. Check server logs for errors
2. Check browser console for errors
3. Verify all URLs use `127.0.0.1`, not `localhost`
4. Verify Spotify dashboard has correct redirect URI
5. Clear `.next` and cookies, restart dev server
6. Try signing out completely before retrying

## Production Setup (HTTPS)

For production, use HTTPS:
```env
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_URL_INTERNAL="https://yourdomain.com"
```

And add to Spotify:
```
https://yourdomain.com/api/auth/callback/spotify
```
