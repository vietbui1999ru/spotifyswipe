# PKCE Flow Diagrams

## Complete OAuth 2.0 PKCE Flow

### Diagram 1: Happy Path (Successful Authentication)

```
┌─────────────┐              ┌─────────────┐              ┌──────────────┐
│  Frontend   │              │   Backend   │              │   Spotify    │
│  (Browser)  │              │  (Express)  │              │   OAuth      │
└──────┬──────┘              └──────┬──────┘              └──────┬───────┘
       │                             │                            │
       │                             │                            │
       │ 1. Generate PKCE Pair       │                            │
       │    - code_verifier (random) │                            │
       │    - code_challenge (SHA256)│                            │
       ├──────────────────────┐      │                            │
       │ Store code_verifier  │      │                            │
       │ in sessionStorage    │      │                            │
       ├──────────────────────┘      │                            │
       │                             │                            │
       │ 2. GET /api/auth/login      │                            │
       │    ?code_challenge=ABC...   │                            │
       ├────────────────────────────>│                            │
       │                             │ 3. Validate code_challenge│
       │                             │    present                 │
       │                             │                            │
       │                             │ 4. Generate state         │
       │                             │    (random)                │
       │                             │                            │
       │                             │ 5. Store in cache         │
       │                             │    cache[state] = {       │
       │                             │      codeChallenge,       │
       │                             │      expiresAt: now+10min │
       │                             │    }                       │
       │                             │                            │
       │ 6. Return OAuth URL         │                            │
       │    with code_challenge,     │                            │
       │    state, S256 method       │                            │
       │<────────────────────────────┤                            │
       │                             │                            │
       │ 7. Redirect to Spotify      │                            │
       ├────────────────────────────────────────────────────────>│
       │                             │                            │
       │                             │                       8. Show login
       │                             │                           form
       │                             │                            │
       │ (User enters credentials)    │                            │
       │ (User clicks Approve)        │                            │
       │                             │                            │
       │ 9. Redirect to callback      │                            │
       │    /auth/login/callback      │                            │
       │    ?code=AUTH_CODE           │                            │
       │    &state=SAME_STATE         │                            │
       │<────────────────────────────────────────────────────────┤
       │                             │                            │
       │ 10. Extract code & state    │                            │
       │     from URL                │                            │
       │     Retrieve code_verifier  │                            │
       │     from sessionStorage     │                            │
       │                             │                            │
       │ 11. POST /api/auth/callback │                            │
       │     {                        │                            │
       │       code: AUTH_CODE,      │                            │
       │       state: SAME_STATE,    │                            │
       │       code_verifier: ...    │                            │
       │     }                        │                            │
       ├────────────────────────────>│                            │
       │                             │ 12. Validate parameters   │
       │                             │     (code, state, verifier)│
       │                             │                            │
       │                             │ 13. Retrieve from cache   │
       │                             │     cached = cache[state] │
       │                             │     if (!cached) return 401│
       │                             │                            │
       │                             │ 14. PKCE Validation       │
       │                             │     computed =            │
       │                             │     base64url(            │
       │                             │      SHA256(code_verifier)│
       │                             │     )                      │
       │                             │     if (computed !=       │
       │                             │      cached.codeChall.)   │
       │                             │      return 401           │
       │                             │                            │
       │                             │ 15. Delete from cache     │
       │                             │     cache.delete(state)   │
       │                             │     (one-time use)        │
       │                             │                            │
       │                             │ 16. Exchange code with    │
       │                             │     Spotify               │
       │                             ├────────────────────────>│
       │                             │                        │
       │                             │ 17. Get access_token   │
       │                             │     & refresh_token    │
       │                             │<────────────────────────┤
       │                             │                            │
       │                             │ 18. Fetch user profile   │
       │                             ├────────────────────────>│
       │                             │                        │
       │                             │ 19. Get user data      │
       │                             │<────────────────────────┤
       │                             │                            │
       │                             │ 20. Save/update user    │
       │                             │     in MongoDB           │
       │                             │                            │
       │                             │ 21. Generate JWT        │
       │                             │     (7-day expiry)       │
       │                             │                            │
       │ 22. Set-Cookie: jwt=...     │                            │
       │     HttpOnly, Secure, ...   │                            │
       │     + User data JSON        │                            │
       │<────────────────────────────┤                            │
       │                             │                            │
       │ 23. Clear sessionStorage    │                            │
       │     - code_verifier         │                            │
       │     - code_challenge        │                            │
       │                             │                            │
       │ 24. Redirect to /swipe      │                            │
       │                             │                            │
```

---

## Error Cases

### Diagram 2: Invalid code_verifier (PKCE Failure)

```
┌─────────────┐              ┌─────────────┐
│  Frontend   │              │   Backend   │
└──────┬──────┘              └──────┬──────┘
       │                             │
       │ POST /api/auth/callback     │
       │ {                            │
       │   code: "AUTH_CODE",        │
       │   state: "VALID_STATE",     │
       │   code_verifier: "WRONG"    │
       │ }                            │
       ├────────────────────────────>│
       │                             │
       │                             │ 1. Retrieve cached entry
       │                             │    cache[state] = {
       │                             │      codeChallenge: "ABC123..."
       │                             │    }
       │                             │
       │                             │ 2. Compute challenge from
       │                             │    received verifier
       │                             │    computed = SHA256("WRONG")
       │                             │    = "XYZ789..."
       │                             │
       │                             │ 3. Compare
       │                             │    "XYZ789..." != "ABC123..."
       │                             │    MISMATCH!
       │                             │
       │ 401 Unauthorized            │
       │ {                            │
       │   success: false,           │
       │   error: "Invalid           │
       │   code_verifier"            │
       │ }                            │
       │<────────────────────────────┤
       │                             │
       │ NO JWT COOKIE SET           │
       │ NO TOKEN EXCHANGE           │
       │ Cache entry STILL VALID     │
       │                             │
```

---

### Diagram 3: Invalid State (Expired or Non-existent)

```
┌─────────────┐              ┌─────────────┐
│  Frontend   │              │   Backend   │
└──────┬──────┘              └──────┬──────┘
       │                             │
       │ POST /api/auth/callback     │
       │ {                            │
       │   code: "AUTH_CODE",        │
       │   state: "INVALID_STATE",   │
       │   code_verifier: "..."      │
       │ }                            │
       ├────────────────────────────>│
       │                             │
       │                             │ 1. Retrieve from cache
       │                             │    cache["INVALID_STATE"]
       │                             │    = undefined
       │                             │
       │                             │ 2. Check if exists
       │                             │    !cacheEntry
       │                             │    Reason: never existed
       │                             │    OR expired (>10 min)
       │                             │    OR already used
       │                             │
       │ 401 Unauthorized            │
       │ {                            │
       │   success: false,           │
       │   error: "Invalid or        │
       │   expired state"            │
       │ }                            │
       │<────────────────────────────┤
       │                             │
```

---

### Diagram 4: Replay Attack Prevention

```
First Request:                    Second Request (Same State):
┌─────────────┐              ┌─────────────┐              ┌─────────────┐              ┌─────────────┐
│  Frontend   │              │   Backend   │              │  Frontend   │              │   Backend   │
└──────┬──────┘              └──────┬──────┘              └──────┬──────┘              └──────┬──────┘
       │                             │                            │                             │
       │ POST /api/auth/callback     │                            │ POST /api/auth/callback     │
       │ (valid code_verifier)       │                            │ (same state, verifier)     │
       ├────────────────────────────>│                            ├────────────────────────────>│
       │                             │                            │                             │
       │                             │ 1. Validate PKCE           │                             │
       │                             │    SHA256(...) == cached    │                             │
       │                             │    ✓ MATCH                 │                             │
       │                             │                            │                             │
       │                             │ 2. Delete from cache       │                             │
       │                             │    cache.delete(state)     │                             │
       │                             │                            │                             │
       │                             │ 3. Exchange with Spotify   │                             │
       │                             │    (may fail if code       │                             │
       │                             │     already used)          │                             │
       │                             │                            │                             │
       │ 200 OK + JWT cookie         │                            │                             │
       │<────────────────────────────┤                            │                             │
       │                             │                            │                             │
       │                             │                            │                             │
       │                             │                            │ Attempt to reuse state     │
       │                             │                            │ (now deleted from cache)   │
       │                             │                            ├────────────────────────────>│
       │                             │                            │                             │
       │                             │                            │ 1. Retrieve from cache     │
       │                             │                            │    cache[state] = null     │
       │                             │                            │    (was deleted!)          │
       │                             │                            │                             │
       │                             │                            │ 2. Fail immediately       │
       │                             │                            │    No PKCE validation      │
       │                             │                            │    No Spotify call         │
       │                             │                            │                             │
       │                             │                            │ 401 Unauthorized           │
       │                             │                            │<────────────────────────────┤
       │                             │                            │                             │
       │                             │                            │ ATTACK BLOCKED!            │
       │                             │                            │ NO JWT ISSUED              │
       │                             │                            │                             │
```

---

## Cache Lifecycle Diagram

### Diagram 5: Code Challenge Cache Lifecycle

```
Time:          Cache State:              Action:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

T0:            {}                        User clicks "Login"
               (empty)

T0+1ms:        {state1: {                GET /api/auth/login
               codeChallenge,            called with code_challenge
               expiresAt: T0+10min       -> generated state1
               }}                        -> stored in cache

T0+5s:         {state1: {...},           Another user logs in
               state2: {...}}            GET /api/auth/login called
                                         -> generated state2
                                         -> stored in cache

T0+50s:        {state1: {...},           POST /api/auth/callback
               state2: {...},            called with state1
               state3: {...}}            -> validation succeeds
                                         -> state1 DELETED from cache
                                         (one-time use enforced)

T0+1m:         {state2: {...},           Cleanup interval runs
               state3: {...}}            (every 60 seconds)
                                         No entries expired yet

T0+5m:         {state2: {...},           More users logging in
               state3: {...},            Multiple new states added
               state4: {...},
               state5: {...}}

T0+10m01s:     {state2: {...},           Cleanup interval runs
               state3: {...},            state1 would be expired
               state4: {...},            (but already deleted)
               state5: {...}}

T0+11m:        {state2: {...},           User tries to use state3
               state3: {...},            POST /api/auth/callback
               state4: {...}}            with state3
                                         -> 401! State expired!
                                         After validation:
                                         -> state3 DELETED

T0+15m:        {state2: {...},           Cleanup runs
               state4: {...}}            state3 expired
                                         -> DELETED

T0+21m:        {state4: {...}}           More cleanup
               (other states deleted)

T0+30m+1s:     {}                        Cleanup runs
               (state4 finally expired   All entries cleared
                and removed)
```

---

## Security Properties Visualization

### Diagram 6: Attack Prevention Comparison

```
WITHOUT PKCE:
┌─────────────────────────────────────┐
│ Authorization Code Intercepted      │
│                                     │
│ Attacker gets: code = "ABC123"      │
│ Attacker has: ✓ code                │
│                                     │
│ → Attacker CAN exchange code for    │
│   access_token (uses client_secret) │
│                                     │
│ VULNERABLE!                         │
└─────────────────────────────────────┘

WITH PKCE (RFC 7636):
┌─────────────────────────────────────────────┐
│ Authorization Code Intercepted              │
│                                             │
│ Attacker gets: code = "ABC123"              │
│ Attacker has: ✓ code                        │
│              ✗ code_verifier (not sent)     │
│              ✗ client_secret (not sent)     │
│                                             │
│ → Attacker CANNOT exchange code             │
│   (needs original code_verifier)            │
│                                             │
│ Verification fails:                         │
│ SHA256(guessed_verifier) ≠ stored_challenge│
│                                             │
│ PROTECTED!                                  │
└─────────────────────────────────────────────┘
```

---

## Data Flow Diagram: Code Challenge vs Code Verifier

### Diagram 7: Secure PKCE Data Flow

```
FRONTEND (Browser):
┌──────────────────────────────────────┐
│ Code Verifier                        │
│ "aBcD1234EfGhIjKlMnOpQrStUvWxYz"   │
│                                      │
│ ↓ SHA256 hash                        │
│                                      │
│ Code Challenge                       │
│ "E9Mrozoa0owWoUgT5K61FQqkrmHRH3d..." │
└──────────────────────────────────────┘
       │                        │
       │ NEVER SENT             │ SENT TO BACKEND
       │                        │
       ▼                        ▼
SECURE STORAGE            /api/auth/login
sessionStorage            ?code_challenge=E9M...
       │                        │
       │ KEPT SECRET            │
       │                        ▼
       │              BACKEND (Express)
       │              ┌──────────────────┐
       │              │ In-Memory Cache  │
       │              │ state1: {        │
       │              │   code_challenge│
       │              │   expiresAt     │
       │              │ }               │
       │              └──────────────────┘
       │
       │              ↓ OAuth Flow ↓
       │
       │ SENT DURING   Spotify OAuth
       │ CALLBACK      (code_challenge passed)
       │                        │
       ▼                        ▼
POST /api/auth/callback
{
  code: "...",
  state: "...",
  code_verifier: "aBcD1234..."    ← Only at callback
}
       │
       ▼
BACKEND VALIDATION
Compute: SHA256(received_verifier)
Compare: computed_challenge === stored_challenge
Result: ✓ MATCH = Authorization successful


KEY SECURITY PROPERTIES:
════════════════════════════════════════
1. code_verifier NEVER sent to Spotify
2. code_verifier NEVER sent until callback
3. Attacker intercepting code cannot guess verifier
4. Attacker would need SHA256 pre-image (impossible)
5. Stateless on backend (cache is temporary)
6. One-time use (deleted after validation)
```

---

## Component Interaction Diagram

### Diagram 8: PKCE Component Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Login Page Component                                 ││
│  │ ┌────────────────────────────────────────────────┐  ││
│  │ │ 1. Generate PKCE Pair                          │  ││
│  │ │    - generateCodeVerifier()                    │  ││
│  │ │    - generateCodeChallenge()                   │  ││
│  │ │ 2. Store in sessionStorage                     │  ││
│  │ │ 3. Call GET /api/auth/login                    │  ││
│  │ └────────────────────────────────────────────────┘  ││
│  │                        ↓                             ││
│  │ ┌────────────────────────────────────────────────┐  ││
│  │ │ OAuth Service                                  │  ││
│  │ │ - Handle OAuth redirect                        │  ││
│  │ │ - Manage state parameter                       │  ││
│  │ └────────────────────────────────────────────────┘  ││
│  └──────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────┘
                            ↓ HTTP
┌──────────────────────────────────────────────────────────┐
│                  Backend (Express/Node)                  │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Auth Routes (/routes/auth.ts)                        ││
│  │                                                      ││
│  │ ┌──────────────────────────────────────────────────┐││
│  │ │ GET /login                                       │││
│  │ │ - Receive code_challenge parameter              │││
│  │ │ - Generate secure state (16 bytes)              │││
│  │ │ - Store in cache[state]                         │││
│  │ │ - Return OAuth URL                              │││
│  │ └──────────────────────────────────────────────────┘││
│  │                                                      ││
│  │ ┌──────────────────────────────────────────────────┐││
│  │ │ POST /callback                                   │││
│  │ │ - Validate code, state, code_verifier           │││
│  │ │ - Retrieve from cache using state               │││
│  │ │ - Call validatePKCE() helper                     │││
│  │ │ - Delete from cache (one-time use)              │││
│  │ │ - Exchange code with Spotify                     │││
│  │ │ - Create JWT and user                           │││
│  │ │ - Set httpOnly cookie                           │││
│  │ └──────────────────────────────────────────────────┘││
│  │                                                      ││
│  │ ┌──────────────────────────────────────────────────┐││
│  │ │ PKCE Cache (In-Memory)                           │││
│  │ │ Map<state, CodeChallengeEntry>                   │││
│  │ │                                                  │││
│  │ │ CodeChallengeEntry {                             │││
│  │ │   codeChallenge: string                          │││
│  │ │   expiresAt: number (10 min TTL)                 │││
│  │ │ }                                                │││
│  │ │                                                  │││
│  │ │ Cleanup Task (every 60s):                        │││
│  │ │ - Remove expired entries                         │││
│  │ │ - Prevent memory leaks                           │││
│  │ └──────────────────────────────────────────────────┘││
│  │                                                      ││
│  │ ┌──────────────────────────────────────────────────┐││
│  │ │ PKCE Validation Function                         │││
│  │ │ validatePKCE(verifier, challenge):               │││
│  │ │   hash = SHA256(verifier)                        │││
│  │ │   computed = base64url(hash)                     │││
│  │ │   return computed === challenge                  │││
│  │ └──────────────────────────────────────────────────┘││
│  │                                                      ││
│  │ ┌──────────────────────────────────────────────────┐││
│  │ │ User Model (/models/User.ts)                     │││
│  │ │ - Save Spotify tokens                            │││
│  │ │ - Create/update user on first login              │││
│  │ │ (NO CHANGES - PKCE is stateless)                 │││
│  │ └──────────────────────────────────────────────────┘││
│  └──────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────┘
                            ↓ HTTPS
┌──────────────────────────────────────────────────────────┐
│              External Services                           │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Spotify OAuth                                        │ │
│ │ - /authorize (with code_challenge)                  │ │
│ │ - /api/token (exchange code)                        │ │
│ │ - /v1/me (get user profile)                         │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ MongoDB                                              │ │
│ │ - User collection (store tokens)                    │ │
│ │ (NO CHANGES - PKCE doesn't affect schema)           │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## Summary

These diagrams illustrate:

1. **Diagram 1:** Complete successful authentication flow with all PKCE steps
2. **Diagram 2:** What happens when code_verifier doesn't match code_challenge
3. **Diagram 3:** What happens when state is invalid or expired
4. **Diagram 4:** How one-time use prevents replay attacks
5. **Diagram 5:** Cache lifecycle over time, showing creation, use, and cleanup
6. **Diagram 6:** Security comparison between OAuth without PKCE vs with PKCE
7. **Diagram 7:** Secure data flow showing what gets sent where and when
8. **Diagram 8:** Component architecture showing all interacting parts

**Key Takeaway:** PKCE ensures that even if an attacker intercepts the authorization code, they cannot complete the authentication without the original code_verifier, which is only held by the frontend and never transmitted to Spotify.
