# Debugging Spotify Auth Flow

## Steps to Debug:

1. **Open Developer Tools** (F12 or Right-click → Inspect)

2. **Go to Network Tab**
   - Check "Preserve log" checkbox
   - Clear the log

3. **Click "Continue with Spotify"** and watch for these requests:

### Expected Flow:

```
✅ localhost:3000/api/auth/spotify/login
   Status: 307 (Redirect)
   
✅ localhost:3000/api/auth/spotify/authorize  
   Status: 307 (Redirect)
   
✅ accounts.spotify.com/authorize?client_id=...
   Status: 200
   (You see Spotify login page)
   
✅ localhost:3000/api/auth/spotify/callback?code=...&state=...
   Status: 307 (Redirect to /dashboard)
   
✅ localhost:3000/dashboard
   Status: 200
```

## Common Issues:

### Issue 1: No redirect to callback
**Symptom:** After Spotify login, nothing happens
**Solution:** Check redirect URI in Spotify Dashboard matches exactly:
```
http://127.0.0.1:3000/api/auth/spotify/callback
```

### Issue 2: State mismatch error
**Symptom:** Redirects to `/auth/error?message=State mismatch`
**Solution:** Check your terminal logs for state comparison

### Issue 3: Code verifier missing
**Symptom:** Redirects to `/auth/error?message=Code verifier missing`
**Solution:** Cookies aren't being set/read properly

## Check Terminal Logs:

You should see:
```
Code verifier: [64 character string]
State: [16 character string]
Redirecting to authorize route...
Code verifier received: true
State received: true
Redirecting to Spotify auth URL: https://accounts.spotify.com...
Callback received:
- State from URL: [matches the state above]
- Stored state from cookie: [matches the state above]
- Code verifier from cookie: true
- States match: true
```

## If Still Failing:

1. Clear browser cookies completely
2. Restart dev server
3. Try in incognito/private window
4. Send terminal logs from the flow
