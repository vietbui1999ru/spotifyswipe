# NextAuth Localhost Issue - Diagnostic & Fix

## The Problem
- You access app at `http://127.0.0.1:3000`
- But NextAuth is sending `redirect_uri=http://localhost:3000/api/auth/callback/spotify` to Spotify
- Spotify returns 400 Bad Request because redirect URI doesn't match

## Step-by-Step Fix

### 1. Stop dev server (Ctrl+C)

### 2. Clean up
```bash
rm -rf .next
rm -rf node_modules/.vite  # Clear any vite cache
```

### 3. Verify your `.env` has these EXACT values
```env
NEXTAUTH_URL="http://127.0.0.1:3000"
NEXTAUTH_URL_INTERNAL="http://127.0.0.1:3000"
NEXTAUTH_TRUST_HOST=true
```

### 4. Start dev server
```bash
npm run dev
```

### 5. Run diagnostics (in order)

#### 5a. Check debug endpoint
```
http://127.0.0.1:3000/api/debug/auth
```

Should show:
```json
{
  "url": {
    "host": "127.0.0.1:3000",
    "constructedUrl": "http://127.0.0.1:3000"
  }
}
```

If `host` shows `localhost`, **stop and tell me**.

#### 5b. Check signin URL construction
```
http://127.0.0.1:3000/api/test/signin-url
```

Should show:
```json
{
  "constructedUrls": {
    "callbackUrl": "http://127.0.0.1:3000/api/auth/callback/spotify"
  },
  "issue": {
    "hasIssue": false,
    "message": "✅ Callback URL matches NEXTAUTH_URL"
  }
}
```

If `hasIssue` is true, **stop and tell me**.

#### 5c. Check server logs
Look at terminal where you ran `npm run dev`. You should see:
```
MIDDLEWARE HOST: 127.0.0.1:3000
```

Not `localhost:3000`.

#### 5d. Open DevTools Network Tab
1. F12 → Network tab
2. Filter by "accounts.spotify"
3. Click "Sign in with Spotify"
4. Look for request to `https://accounts.spotify.com/authorize?...`
5. **Copy the full URL**
6. Check the `redirect_uri` parameter

It should be:
```
redirect_uri=http%3A%2F%2F127.0.0.1%3A3000%2Fapi%2Fauth%2Fcallback%2Fspotify
```

**Not**:
```
redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fcallback%2Fspotify
```

### 6. Verify Spotify Dashboard
https://developer.spotify.com/dashboard

Redirect URIs section must have:
```
http://127.0.0.1:3000/api/auth/callback/spotify
```

### 7. Try signing in
1. Go to `http://127.0.0.1:3000`
2. Click "Sign in with Spotify"
3. Should redirect to Spotify login (no 400 error)

## Troubleshooting

### Issue: Still seeing localhost in redirect_uri

This likely means your browser is internally resolving 127.0.0.1 to localhost. Try:

**Option A: Use localhost everywhere**
```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_URL_INTERNAL="http://localhost:3000"
```

And in Spotify Dashboard:
```
http://localhost:3000/api/auth/callback/spotify
```

Access app at: `http://localhost:3000`

**Option B: Force strict 127.0.0.1**
Add this to `next.config.js`:
```js
module.exports = {
  experimental: {
    allowedOrigins: ['127.0.0.1:3000'],
  },
}
```

### Issue: Debug endpoints return localhost

This means the Host header itself is localhost. This could be:

1. **Browser DNS resolution issue**
   - Clear browser cache (Ctrl+Shift+Delete)
   - Hard refresh (Ctrl+Shift+R)
   - Try incognito mode

2. **Dev server not listening on 127.0.0.1**
   - Check terminal output when starting dev server
   - Should say something like "ready on 127.0.0.1:3000"

3. **Proxy issue**
   - Check if you're using a proxy that's rewriting the host header
   - Check browser proxy settings

### Issue: "Invalid redirect URI" after all of above

1. Clear browser cookies for both:
   - `http://127.0.0.1:3000`
   - `https://accounts.spotify.com`

2. Wait 5 minutes (Spotify caches whitelisted URIs)

3. Try again

## Reference

- NextAuth v5 docs: https://authjs.dev/getting-started/installation?framework=next.js
- Spotify OAuth: https://developer.spotify.com/documentation/general/guides/authorization/
- Localhost vs 127.0.0.1: https://stackoverflow.com/questions/20106547/why-do-we-use-127-0-0-1-instead-of-localhost

## Still Stuck?

Share this information:
1. Output from `/api/debug/auth`
2. Output from `/api/test/signin-url`
3. The terminal log when dev server starts
4. The Spotify authorize URL from Network tab (DevTools)
5. Screenshot of "Redirect URIs" in Spotify Dashboard
