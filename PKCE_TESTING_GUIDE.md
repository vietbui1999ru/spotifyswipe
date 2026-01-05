# PKCE Implementation Testing Guide

## Backend Testing

### Setup
1. Ensure backend is running: `npm run dev` or `bun run dev`
2. Backend should be listening on http://localhost:3001

### Test 1: GET /api/auth/login - Missing code_challenge

**Request:**
```bash
curl -X GET http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json"
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "code_challenge query parameter required"
}
```

**Pass/Fail:** ___________

---

### Test 2: GET /api/auth/login - Valid code_challenge

**Request:**
```bash
curl -X GET "http://localhost:3001/api/auth/login?code_challenge=E9Mrozoa0owWoUgT5K61FQqkrmHRH3dY8ns2BVot-kM" \
  -H "Content-Type: application/json"
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "url": "https://accounts.spotify.com/authorize?client_id=...&response_type=code&redirect_uri=...&scope=...&state=<random>&code_challenge=E9Mrozoa0owWoUgT5K61FQqkrmHRH3dY8ns2BVot-kM&code_challenge_method=S256"
  }
}
```

**Verification:**
- URL contains `code_challenge` parameter with exact value sent
- URL contains `code_challenge_method=S256`
- URL contains `state` parameter (random value)
- Store the `state` value for Test 3

**Pass/Fail:** ___________

---

### Test 3: POST /api/auth/callback - Missing code

**Request:**
```bash
curl -X POST http://localhost:3001/api/auth/callback \
  -H "Content-Type: application/json" \
  -d '{
    "state": "some_state",
    "code_verifier": "some_verifier"
  }'
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Code required"
}
```

**Pass/Fail:** ___________

---

### Test 4: POST /api/auth/callback - Missing state

**Request:**
```bash
curl -X POST http://localhost:3001/api/auth/callback \
  -H "Content-Type: application/json" \
  -d '{
    "code": "some_code",
    "code_verifier": "some_verifier"
  }'
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "State required"
}
```

**Pass/Fail:** ___________

---

### Test 5: POST /api/auth/callback - Missing code_verifier

**Request:**
```bash
curl -X POST http://localhost:3001/api/auth/callback \
  -H "Content-Type: application/json" \
  -d '{
    "code": "some_code",
    "state": "some_state"
  }'
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "code_verifier required"
}
```

**Pass/Fail:** ___________

---

### Test 6: POST /api/auth/callback - Invalid/Expired state

**Request:**
```bash
curl -X POST http://localhost:3001/api/auth/callback \
  -H "Content-Type: application/json" \
  -d '{
    "code": "some_code",
    "state": "invalid_state_not_in_cache",
    "code_verifier": "some_verifier"
  }'
```

**Expected Response (401):**
```json
{
  "success": false,
  "error": "Invalid or expired state"
}
```

**Pass/Fail:** ___________

---

### Test 7: POST /api/auth/callback - Invalid code_verifier

**Manual Steps:**
1. Run Test 2 to get a state value and store it
2. Code verifier must hash to match the code challenge

**Request Example:**
```bash
curl -X POST http://localhost:3001/api/auth/callback \
  -H "Content-Type: application/json" \
  -d '{
    "code": "some_code",
    "state": "<state_from_test2>",
    "code_verifier": "wrong_verifier_that_doesnt_match_challenge"
  }'
```

**Expected Response (401):**
```json
{
  "success": false,
  "error": "Invalid code_verifier"
}
```

**Pass/Fail:** ___________

---

### Test 8: PKCE Validation Logic - Correct code_verifier

**Manual Steps:**
1. Generate a code_verifier: `test_code_verifier_12345678901234567890123456789`
2. Compute SHA256(verifier) in base64url format
3. Use that as code_challenge in Test 2
4. Extract state from response
5. Call callback with same code_verifier

**Verification Script (Node.js):**
```javascript
const crypto = require('crypto');

// Step 1: Generate verifier
const verifier = 'test_code_verifier_12345678901234567890123456789';

// Step 2: Compute challenge
const hash = crypto.createHash('sha256').update(verifier).digest();
const challenge = hash.toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=/g, '');

console.log('Verifier:', verifier);
console.log('Challenge:', challenge);

// Step 3: Use challenge in GET /api/auth/login
// Step 4: Extract state from response
// Step 5: Call POST /api/auth/callback with verifier

// Expected: Should fail with "Auth failed" because code is invalid
// But PKCE validation should pass (state and verifier match)
```

**Expected Response (500):**
```json
{
  "success": false,
  "error": "Auth failed"
}
```

**Verification:**
- Error is "Auth failed" (from Spotify token exchange), NOT "Invalid code_verifier"
- This proves PKCE validation passed and code_challenge validation succeeded

**Pass/Fail:** ___________

---

### Test 9: Code Challenge Cleanup

**Steps:**
1. Call GET /api/auth/login to get a state value
2. Wait 11+ minutes
3. Try to use that state in POST /api/auth/callback

**Expected Response (401):**
```json
{
  "success": false,
  "error": "Invalid or expired state"
}
```

**Note:** This test requires manual waiting or mocking time. For MVP testing, skip this and trust the cleanup interval logic.

**Pass/Fail:** ___________

---

### Test 10: One-Time Use Prevention (Replay Attack)

**Steps:**
1. Call GET /api/auth/login to get state and code_challenge
2. Compute code_verifier that matches code_challenge
3. Call POST /api/auth/callback with code, state, code_verifier
4. Immediately call POST /api/auth/callback again with same values

**Expected First Response (500):**
```json
{
  "success": false,
  "error": "Auth failed"
}
```
(Code invalid, but PKCE passed)

**Expected Second Response (401):**
```json
{
  "success": false,
  "error": "Invalid or expired state"
}
```

**Verification:**
- First request passes PKCE validation
- After first request, state is deleted from cache
- Second request fails because state no longer in cache
- Proves one-time use enforcement

**Pass/Fail:** ___________

---

## Integration Testing (End-to-End with Frontend)

### Test 11: Full Login Flow

**Prerequisites:**
- Frontend is running on http://localhost:3000
- Login page has button that calls `GET /api/auth/login?code_challenge=...`
- Callback page extracts code and state, calls `POST /api/auth/callback`

**Manual Steps:**
1. Open http://localhost:3000 in browser
2. Click "Login with Spotify" button
3. You should be redirected to Spotify login
4. Log in with valid Spotify account
5. Click "Approve" on permission screen
6. You should be redirected back to http://localhost:3000/auth/login/callback
7. Page should automatically redirect to http://localhost:3000/swipe
8. Check DevTools > Application > Cookies
9. Should see "jwt" cookie with httpOnly flag

**Verification:**
- [ ] Redirected to Spotify login page
- [ ] Spotify shows correct scopes (email, profile, playlists, etc.)
- [ ] Redirected back to callback page
- [ ] Callback page shows loading spinner briefly
- [ ] Redirected to /swipe page
- [ ] JWT cookie present with HttpOnly flag
- [ ] GET /api/auth/me returns user data
- [ ] No console errors in browser DevTools

**Pass/Fail:** ___________

---

### Test 12: Session Persistence

**Steps:**
1. Complete Test 11 (full login flow)
2. Refresh the page
3. Verify you're still logged in
4. Call GET /api/auth/me in console

**Expected:**
```javascript
// In browser console
fetch('/api/auth/me', { credentials: 'include' })
  .then(r => r.json())
  .then(console.log)

// Should output:
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "spotifyId": "...",
      "displayName": "...",
      "email": "...",
      "avatarUrl": "..."
    }
  }
}
```

**Pass/Fail:** ___________

---

### Test 13: Logout

**Steps:**
1. Complete Test 11 (full login flow)
2. Call POST /api/auth/logout
3. Verify JWT cookie is cleared
4. Try to call GET /api/auth/me

**Expected:**
```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Content-Type: application/json" \
  --cookie "jwt=<token>"

# Response (200):
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}

# After logout, GET /api/auth/me returns:
{
  "success": false,
  "error": "Unauthorized"
}
```

**Pass/Fail:** ___________

---

### Test 14: CORS and Credentials

**Steps:**
1. Open browser DevTools Network tab
2. Complete Test 11 login flow
3. Check requests to backend

**Verification in Network Tab:**
- [ ] POST /api/auth/callback request includes "credentials: include"
- [ ] Request has "Cookie" header with JWT value
- [ ] Response has "Set-Cookie" header for JWT
- [ ] Response has proper CORS headers (if cross-origin)

**Pass/Fail:** ___________

---

### Test 15: Error Handling

**Steps:**
1. Navigate to login page
2. Disconnect internet or mock network error
3. Click "Login with Spotify" button
4. Verify error message is shown

**Expected:**
- User-friendly error message (not technical stack trace)
- Option to retry login
- No unhandled promise rejections in console

**Pass/Fail:** ___________

---

## Security Verification

### Checklist

- [ ] Code verifier NEVER sent to Spotify (only code_challenge)
- [ ] Code challenge NEVER transmitted over HTTP (always HTTPS in production)
- [ ] Code verifier stored in sessionStorage (cleared on tab close)
- [ ] State parameter prevents CSRF attacks
- [ ] One-time use prevents replay attacks
- [ ] TTL prevents stale challenges from being accepted
- [ ] No sensitive data in error messages
- [ ] JWT cookie has HttpOnly flag
- [ ] JWT cookie has Secure flag (production)
- [ ] JWT cookie has SameSite=Lax flag

---

## Performance Testing

### Test 16: Response Times

**Baseline:**
- GET /api/auth/login: < 100ms
- POST /api/auth/callback (with Spotify API call): < 2s

**Steps:**
1. Run 10 consecutive GET /api/auth/login requests
2. Measure average response time
3. Should be consistently < 100ms

**Result:** ___________ ms average

**Pass/Fail:** ___________

---

## Debugging Tips

### Check Code Challenge Cache Status

**In browser console:**
```javascript
// Cannot directly access backend cache, but can verify:
fetch('/api/auth/login?code_challenge=test')
  .then(r => r.json())
  .then(data => console.log('Backend is accepting code_challenge:', data.success))
```

### Verify PKCE Computation

**In Node.js:**
```javascript
const crypto = require('crypto');

function generateChallenge(verifier) {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return hash.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Test
const verifier = 'test_verifier_1234567890123456789012345678';
const challenge = generateChallenge(verifier);
console.log(`Verifier: ${verifier}`);
console.log(`Challenge: ${challenge}`);
console.log(`Length: ${verifier.length}`);
```

### Enable Verbose Logging

**Backend:**
```typescript
// In auth.ts, add before PKCE validation:
console.log('PKCE Validation:', {
  receivedVerifier: code_verifier,
  storedChallenge: cacheEntry.codeChallenge,
  computedChallenge: validatePKCE(code_verifier, cacheEntry.codeChallenge),
  state: state
});
```

---

## Summary

**Total Tests:** 16
**Required Tests:** 1-11 (core functionality)
**Optional Tests:** 12-16 (advanced scenarios)

**Minimum Pass Rate for MVP:** 10/11 required tests passing

---

## Sign-Off

**Tested By:** _______________________
**Date:** _______________________
**Result:** [ ] PASS [ ] FAIL

**Notes:**
```


```

---

## Known Issues / Quirks

1. **Multiple PKCE Requests:** If user clicks "Login" button multiple times before redirecting, multiple state values will be created. Only the most recent one will work.
   - Mitigation: Disable button after first click

2. **SessionStorage Cleared:** If user clears sessionStorage before callback is processed, auth will fail
   - Mitigation: Use reliable storage (not localStorage due to security)

3. **Slow Network:** If code_challenge expires (> 10 minutes) before OAuth completes, auth will fail
   - Mitigation: Show warning if OAuth takes too long

4. **Cache Per-Process:** In-memory cache is per Node process. Clustered deployments need Redis
   - Mitigation: For MVP, use single process. For production, implement Redis cache

---

## Rollback Plan

If PKCE implementation causes issues:

1. Revert auth.ts to previous version
2. Frontend will need to remove code_challenge from requests
3. Backend will automatically accept requests without PKCE
4. No database migration needed (PKCE is stateless)
