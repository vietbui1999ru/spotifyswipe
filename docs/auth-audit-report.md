# SpotiSwipe Authentication & Authorization Audit Report

**Date**: 2026-02-13
**Branch**: `spotify-playback-sdk`
**Auditors**: Frontend Engineer, Backend Engineer, Code Reviewer, Debugger, Security Engineer
**Scope**: All auth-related code audited against `docs/auth-flow-diagram.md`

---

## 1. Executive Summary

**Overall Health: GOOD with noted gaps**

The authentication and authorization implementation is largely solid and functional. All four auth methods described in the diagram (Spotify, Last.fm, Email/Password, Google) are implemented and operational. The auth-flow-diagram.md is **mostly accurate** but contains an **outdated TODO table** — several items listed as "TODO" are already implemented. A handful of security and edge-case findings warrant attention, none critical.

| Category | Findings | Critical | High | Medium | Low | Info |
|----------|----------|----------|------|--------|-----|------|
| Diagram Accuracy | 6 | 0 | 0 | 1 | 4 | 1 |
| Frontend Auth | 8 | 0 | 0 | 1 | 2 | 5 |
| Backend Auth | 10 | 0 | 0 | 2 | 3 | 5 |
| Bugs & Edge Cases | 6 | 0 | 1 | 2 | 3 | 0 |
| Security | 9 | 0 | 1 | 3 | 3 | 2 |

---

## 2. Diagram Accuracy Review

### 2.1 Verified Correct

| Diagram Claim | Verdict | Evidence |
|---------------|---------|----------|
| Spotify OAuth 2.0 Authorization Code Flow | CORRECT | `src/server/auth/index.ts:33-38` — uses better-auth `socialProviders.spotify` |
| 11 Spotify scopes (streaming, user-read-private, etc.) | CORRECT | `src/server/auth/index.ts:7-19` — all 11 scopes match diagram exactly |
| Redirect URI uses `127.0.0.1:3000` | CORRECT | `src/server/auth/index.ts:36`, `middleware.ts:27-31` redirects localhost |
| Last.fm Web Auth with MD5 signatures | CORRECT | `src/server/auth/lastfm.ts:14-27` — `generateApiSig()` uses MD5 |
| Last.fm session key is permanent | CORRECT | Stored as `Account.accessToken`, never refreshed |
| Spotify token auto-refresh with 60s buffer | CORRECT | `src/server/spotify/api.ts:80-86` — exact 60s buffer check |
| Session cookie name `better-auth.session_token` | CORRECT | `src/app/api/auth/callback/lastfm/route.ts:150` and `middleware.ts:38` |
| Account model camelCase fields | CORRECT | `prisma/schema.prisma:38-54` — `providerId`, `accountId`, `accessToken`, etc. |
| Email/Password auth | CORRECT | `src/server/auth/index.ts:27-30` — `emailAndPassword: { enabled: true }` |
| Google OAuth | CORRECT | `src/server/auth/index.ts:39-43` — Google social provider configured |
| Account linking with trustedProviders | CORRECT | `src/server/auth/index.ts:49-52` — `["spotify", "lastfm", "google"]` |
| Token refresh rotates refresh_token when provided | CORRECT | `src/server/spotify/api.ts:99-101` — conditional refresh_token update |

### 2.2 Inaccuracies Found

#### INACCURACY-1: "Current vs Needed" TODO Table is Outdated (Medium)

**Diagram claims these are "TODO":**
- Last.fm scrobble
- Last.fm love/unlove
- Last.fm updateNowPlaying
- Last.fm write tRPC routes
- Client-side scrobble integration

**Actual state:**
- `src/server/auth/lastfm.ts:422-502` — `scrobbleTrack()`, `loveTrack()`, `unloveTrack()`, `updateNowPlaying()` all implemented
- `src/server/api/routers/lastfm.ts` — Full tRPC router with `scrobble`, `love`, `unlove`, `updateNowPlaying` mutations
- Router registered in `src/server/api/root.ts:2,17`

**Recommendation**: Update the TODO table in the diagram to mark these as "Done".

#### INACCURACY-2: Missing `song` Router Reference (Low)

The diagram lists `song` as a tRPC router, but `src/server/api/root.ts` does not include a `song` router. The root router includes: `admin`, `lastfm`, `playlist`, `swipe`, `social`, `spotify`, `token`, `user`.

**Recommendation**: Update diagram to reflect current router list.

#### INACCURACY-3: Diagram Missing `token`, `user`, `admin` Routers (Low)

Three routers exist that the diagram doesn't document:
- `token` — serves Spotify access tokens and Last.fm session keys to client
- `user` — includes `getConnectedProviders` (used by OnboardingGuard)
- `admin` — admin-only procedures

#### INACCURACY-4: Redirect Destination Nuance (Low)

Diagram says redirect goes to "/onboarding or /dashboard". The actual logic is more nuanced:
- Sign-in (all methods): redirects to `/dashboard`
- Sign-up (email/password): redirects to `/onboarding`
- Last.fm callback: defaults to `/dashboard`, configurable via `?redirect=` param
- Onboarding page auto-redirects to `/dashboard` if provider already connected

#### INACCURACY-5: OnboardingGuard is Client-Side Only (Low)

Diagram 3 implies OnboardingGuard blocks access at the routing layer. In reality:
- `middleware.ts` only checks for session cookie presence (not provider connection)
- OnboardingGuard is client-side in `src/app/onboarding/page.tsx` via `api.user.getConnectedProviders`
- A user with a session cookie but no music provider CAN access `/dashboard` directly (they just won't have discovery data)

#### INACCURACY-6: Diagram Shows Public Routes as `/ /sign-in /sign-up` (Info)

These routes exist and work correctly. Additionally, `/onboarding` is listed as a protected route in `middleware.ts:16-22`, which matches the diagram's intent (user must be authenticated to reach onboarding).

---

## 3. Frontend Auth Audit

### Files Reviewed

| File | Purpose | Auth Status |
|------|---------|-------------|
| `src/lib/auth-client.ts` | better-auth client instance | Uses `127.0.0.1` baseURL |
| `src/app/_components/SignIn.tsx` | Sign in/up form with all 4 auth methods | All flows implemented |
| `src/app/sign-in/page.tsx` | Sign-in page wrapper | Redirects authenticated users |
| `src/app/sign-up/page.tsx` | Sign-up page wrapper | Redirects authenticated users |
| `src/app/onboarding/page.tsx` | OnboardingGuard + provider connection | Polls `getConnectedProviders` |
| `src/lib/hooks/useSpotifyPlayer.ts` | Spotify Web Playback SDK | Uses `getToken` callback |
| `middleware.ts` | Route protection + localhost redirect | Checks session cookie |

### Findings

| ID | Finding | Severity | File:Line |
|----|---------|----------|-----------|
| FE-1 | All 4 auth methods (Email, Google, Spotify, Last.fm) properly implemented in SignIn component | Info | `SignIn.tsx:42-93` |
| FE-2 | `useSession()` hook used for client-side session state | Info | `sign-in/page.tsx:10`, `sign-up/page.tsx:10` |
| FE-3 | Spotify Web Playback SDK `getOAuthToken` callback correctly uses ref-stable token getter | Info | `useSpotifyPlayer.ts:107-111` |
| FE-4 | Last.fm auth URL uses `NEXT_PUBLIC_LASTFM_API_KEY` (public key, safe to expose) | Info | `SignIn.tsx:25` |
| FE-5 | Middleware correctly redirects `localhost` → `127.0.0.1` with 308 permanent redirect | Info | `middleware.ts:27-31` |
| FE-6 | Protected route list in middleware matches diagram routes | Match | `middleware.ts:16-22` |
| FE-7 | Onboarding auto-redirects to dashboard when provider connected (polls every 3s) | Low | `onboarding/page.tsx:34-43` |
| FE-8 | Sign-in/sign-up pages redirect already-authenticated users to dashboard | Match | `sign-in/page.tsx:13-17` |

### FE-ISSUE-1: No Server-Side OnboardingGuard Enforcement (Medium)

Users with a valid session but no music provider can access `/dashboard` directly. The middleware only checks cookie existence, not provider status. The onboarding page is purely advisory.

**Impact**: Users may land on a broken dashboard with no discovery data.

**Recommendation**: Either add middleware-level provider check or add a client-side guard in the dashboard layout that redirects to onboarding.

### FE-ISSUE-2: Polling Interval for Provider Check (Low)

`onboarding/page.tsx:33` polls `getConnectedProviders` every 3 seconds. This generates unnecessary server load if the user stays on the page without connecting.

**Recommendation**: Use `refetchOnWindowFocus` instead of interval polling, or increase interval to 5-10s.

### FE-ISSUE-3: Last.fm Auth URL Not Using Validated Env (Low)

`SignIn.tsx:25` uses `process.env.NEXT_PUBLIC_LASTFM_API_KEY` directly instead of the Zod-validated `env` from `~/env`. While NEXT_PUBLIC vars are safe, it bypasses the validation layer.

---

## 4. Backend Auth Audit

### Files Reviewed

| File | Purpose |
|------|---------|
| `src/server/auth/index.ts` | better-auth configuration |
| `src/server/auth/lastfm.ts` | Last.fm API client (read + write) |
| `src/app/api/auth/callback/lastfm/route.ts` | Custom Last.fm callback handler |
| `src/server/spotify/api.ts` | Spotify API with token auto-refresh |
| `src/server/api/trpc.ts` | tRPC context, procedures, middleware |
| `src/server/api/root.ts` | Root router composition |
| `src/server/api/routers/lastfm.ts` | Last.fm write operations tRPC router |
| `src/server/api/routers/token.ts` | Token serving router |
| `prisma/schema.prisma` | Database schema |
| `src/env.js` | Environment variable validation |

### Findings

| ID | Finding | Severity | File:Line |
|----|---------|----------|-----------|
| BE-1 | Spotify OAuth configured with all 11 required scopes | Match | `auth/index.ts:7-19` |
| BE-2 | `emailAndPassword.enabled: true` with `autoSignIn: true` | Match | `auth/index.ts:27-30` |
| BE-3 | Google OAuth properly configured as social provider | Match | `auth/index.ts:39-43` |
| BE-4 | Account linking enabled for spotify, lastfm, google | Match | `auth/index.ts:49-52` |
| BE-5 | tRPC `protectedProcedure` correctly throws UNAUTHORIZED when no session | Match | `trpc.ts:142-154` |
| BE-6 | `adminProcedure` exists for role-based access control | Info | `trpc.ts:161-182` |
| BE-7 | Lazy Spotify token getter in tRPC context prevents unnecessary refreshes | Good | `trpc.ts:38-47` |
| BE-8 | Last.fm callback validates redirect param starts with "/" | Good | `lastfm/route.ts:25-28` |
| BE-9 | Session cookie set with `httpOnly: true`, `sameSite: "lax"` | Good | `lastfm/route.ts:150-156` |
| BE-10 | All Last.fm write operations (scrobble, love, unlove, nowPlaying) implemented | Match | `lastfm.ts:422-502` |

### BE-ISSUE-1: Token Refresh Race Condition (Medium)

`getSpotifyToken()` in `src/server/spotify/api.ts:65-106` has no mutex/lock. Concurrent requests for the same user can trigger multiple simultaneous token refreshes against Spotify's API.

**Impact**: Potential for wasted API calls and, in rare cases, one refresh overwriting another's result.

**Recommendation**: Add a per-user in-memory lock or use `spotifyTokenPromise` pattern at the module level (not just per-request as in tRPC context).

### BE-ISSUE-2: Account Hijacking via Last.fm Re-link (Medium)

`src/app/api/auth/callback/lastfm/route.ts:110-127` upserts the Account record keyed by `(providerId, accountId)`. If User A links Last.fm account "bob", then User B (with existing session) links the same "bob" Last.fm account, the upsert will change `userId` to User B, effectively stealing the Last.fm connection from User A.

**Impact**: One user can take another user's Last.fm connection.

**Recommendation**: Before upserting, check if the account already belongs to a different user and return an error.

### BE-ISSUE-3: Fake Email for Last.fm-Only Users (Low)

`src/app/api/auth/callback/lastfm/route.ts:88-98` creates users with email `username@last.fm`. This isn't a real email and could cause issues if email verification or password reset is later enabled.

### BE-ISSUE-4: `AUTH_SECRET` Optional in Development (Low)

`src/env.js:11-13` makes `AUTH_SECRET` optional in non-production. better-auth may use a weak default secret in development.

### BE-ISSUE-5: No Song Router (Low)

The diagram references a `song` router but it's not in `root.ts`. Song-related operations may have been consolidated elsewhere.

---

## 5. Bug Report (Runtime Issues & Edge Cases)

### BUG-1: Concurrent Token Refresh (High)

**Description**: Multiple simultaneous requests for the same user can each independently detect the token as expired and call `refreshSpotifyToken()` concurrently.

**Location**: `src/server/spotify/api.ts:65-106`

**Severity**: High — Spotify's API may return different tokens for each refresh call, and only the last `db.account.update` wins.

**Proposed Fix**:
```typescript
// Module-level lock per user
const refreshLocks = new Map<string, Promise<string>>();

export async function getSpotifyToken(userId: string): Promise<string> {
  const existing = refreshLocks.get(userId);
  if (existing) return existing;

  const promise = getSpotifyTokenInner(userId).finally(() => {
    refreshLocks.delete(userId);
  });
  refreshLocks.set(userId, promise);
  return promise;
}
```

### BUG-2: Account Linking Conflict (Medium)

**Description**: When linking Last.fm, if the Last.fm account is already linked to a different user, the upsert silently reassigns it.

**Location**: `src/app/api/auth/callback/lastfm/route.ts:110-127`

**Proposed Fix**: Check for existing account ownership before upsert.

### BUG-3: Missing `ipAddress`/`userAgent` on Last.fm Sessions (Medium)

**Description**: The Last.fm callback creates sessions (`route.ts:136-142`) without `ipAddress` or `userAgent` fields, which are available in the Session model.

**Impact**: Reduced auditability for Last.fm-initiated sessions.

### BUG-4: No Error Recovery on Spotify SDK Auth Error (Low)

**Description**: `useSpotifyPlayer.ts:150-153` sets error state on `authentication_error` but doesn't attempt token re-fetch.

**Impact**: User must manually refresh page if Spotify token expires mid-session.

### BUG-5: Polling Doesn't Clear on Unmount Race (Low)

**Description**: `useSpotifyPlayer.ts:182-190` cleanup sets `cancelled = true` but `player_state_changed` callback (line 129) checks `cancelled` — however `startPolling`/`stopPolling` are not guarded by `cancelled`.

### BUG-6: Sign-up Redirects to Dashboard Instead of Onboarding (Low)

**Description**: `sign-up/page.tsx:14-17` redirects already-authenticated users to `/dashboard` instead of `/onboarding`, skipping the provider connection step.

---

## 6. Security Assessment

### SEC-1: Spotify Access Token Exposed to Client (High)

**Description**: `src/server/api/routers/token.ts:10-30` serves raw Spotify access tokens to the browser via `token.getSpotifyToken` tRPC query.

**Justification**: Required for Spotify Web Playback SDK (`useSpotifyPlayer.ts:107-111`). The SDK cannot work without a client-side token.

**Mitigation**: Token is short-lived (1 hour) and scoped. This is the standard pattern for Spotify SDK integration. Accept as necessary risk.

**Severity**: High (impact) but **accepted risk** due to SDK requirement.

### SEC-2: Last.fm Session Key Exposed to Client (Medium)

**Description**: `src/server/api/routers/token.ts:35-67` serves the permanent Last.fm session key to the client.

**Impact**: The session key never expires and can be used for write operations (scrobble, love).

**Recommendation**: Consider proxying all Last.fm write operations through tRPC server-side only (already done via `lastfm` router). If client-side reads are needed, consider a read-only token or separate endpoint.

### SEC-3: Open Image Remote Patterns (Medium)

**Description**: `next.config.js:13-22` allows image loading from any hostname (`**`) over both HTTP and HTTPS.

**Impact**: Could be used for SSRF-like attacks via `next/image` optimization or tracking pixel injection.

**Recommendation**: Restrict to known image sources:
```javascript
remotePatterns: [
  { protocol: "https", hostname: "*.scdn.co" },      // Spotify
  { protocol: "https", hostname: "*.spotifycdn.com" },
  { protocol: "https", hostname: "lastfm.freetls.fastly.net" },
  { protocol: "https", hostname: "*.lastfm.freetls.fastly.net" },
]
```

### SEC-4: Protocol-Relative Open Redirect (Medium)

**Description**: `src/app/api/auth/callback/lastfm/route.ts:25-28` validates redirect starts with "/" but doesn't block `//evil.com` (protocol-relative URL).

**Proposed Fix**:
```typescript
const redirectTo =
  redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
    ? redirectParam
    : "/dashboard";
```

### SEC-5: No Rate Limiting on Auth Endpoints (Low)

**Description**: No rate limiting on the custom Last.fm callback (`/api/auth/callback/lastfm`). better-auth may have built-in rate limiting for its own endpoints.

**Recommendation**: Add rate limiting middleware or use a service like `@unkey/ratelimit`.

### SEC-6: Session Duration (Low)

**Description**: Last.fm callback creates 30-day sessions (`route.ts:134`). better-auth's default session duration may differ, creating inconsistency.

**Recommendation**: Align session durations or configure better-auth's session expiry explicitly.

### SEC-7: AUTH_SECRET Optional in Dev (Low)

**Description**: `src/env.js:11-13` makes AUTH_SECRET optional in non-production. better-auth might use a predictable fallback.

**Recommendation**: Always require AUTH_SECRET, even in development.

### SEC-8: MD5 for Last.fm API Signatures (Info)

**Description**: `src/server/auth/lastfm.ts:26` uses MD5 for API signature generation.

**Assessment**: Required by Last.fm's API specification. Not a vulnerability — it's a protocol requirement. The secret (`LASTFM_API_SECRET`) is never transmitted, only used locally for signature computation.

### SEC-9: CORS Configuration (Info)

**Description**: No custom CORS headers configured in `next.config.js` or middleware. Next.js defaults apply (same-origin for API routes).

**Assessment**: Acceptable. tRPC endpoints are same-origin. better-auth handles its own CORS.

---

## 7. Action Items (Prioritized)

### High Priority

| # | Action | Owner | File(s) |
|---|--------|-------|---------|
| 1 | Fix Spotify token refresh race condition (add per-user lock) | Backend | `src/server/spotify/api.ts` |
| 2 | Fix protocol-relative open redirect in Last.fm callback | Backend | `src/app/api/auth/callback/lastfm/route.ts` |

### Medium Priority

| # | Action | Owner | File(s) |
|---|--------|-------|---------|
| 3 | Add account ownership check before Last.fm re-link | Backend | `src/app/api/auth/callback/lastfm/route.ts` |
| 4 | Restrict `next/image` remote patterns to known domains | Backend | `next.config.js` |
| 5 | Add dashboard-level redirect to onboarding if no provider | Frontend | Dashboard layout |
| 6 | Update auth-flow-diagram.md TODO table (mark scrobble/love/nowPlaying as Done) | Reviewer | `docs/auth-flow-diagram.md` |

### Low Priority

| # | Action | Owner | File(s) |
|---|--------|-------|---------|
| 7 | Populate `ipAddress`/`userAgent` in Last.fm session creation | Backend | `lastfm/route.ts` |
| 8 | Handle Spotify SDK `authentication_error` with token re-fetch | Frontend | `useSpotifyPlayer.ts` |
| 9 | Make AUTH_SECRET required in all environments | Backend | `src/env.js` |
| 10 | Update diagram router list (remove `song`, add `token`, `user`, `admin`, `lastfm`) | Reviewer | `docs/auth-flow-diagram.md` |
| 11 | Reduce onboarding polling interval or use refetchOnWindowFocus | Frontend | `onboarding/page.tsx` |

---

## 8. Fixes Applied During This Audit

| # | Fix | File | Action Item |
|---|-----|------|-------------|
| 1 | **Token refresh race condition** — Added per-user `refreshLocks` Map to coalesce concurrent refresh requests | `src/server/spotify/api.ts` | #1 (High) |
| 2 | **Protocol-relative open redirect** — Block `//` prefix in Last.fm callback redirect param | `src/app/api/auth/callback/lastfm/route.ts` | #2 (High) |
| 3 | **Account linking conflict** — Check if Last.fm account belongs to different user before upsert; return error if so | `src/app/api/auth/callback/lastfm/route.ts` | #3 (Medium) |
| 4 | **Outdated TODO table** — Updated auth-flow-diagram.md to mark Last.fm scrobble/love/unlove/nowPlaying as Done | `docs/auth-flow-diagram.md` | #6 (Medium) |

All fixes pass `bun run check:write` (Biome) and `bun run typecheck` (TypeScript).

---

## Appendix A: Files Audited

```
src/server/auth/index.ts              # better-auth config
src/server/auth/lastfm.ts             # Last.fm API client (read + write)
src/app/api/auth/callback/lastfm/route.ts  # Custom Last.fm OAuth callback
src/server/spotify/api.ts             # Spotify API + token refresh
src/server/api/trpc.ts                # tRPC context, procedures
src/server/api/root.ts                # Root router
src/server/api/routers/lastfm.ts      # Last.fm tRPC router
src/server/api/routers/token.ts       # Token serving router
src/lib/auth-client.ts                # Client-side auth
src/app/_components/SignIn.tsx         # Sign in/up component
src/app/sign-in/page.tsx              # Sign-in page
src/app/sign-up/page.tsx              # Sign-up page
src/app/onboarding/page.tsx           # Onboarding + provider guard
src/lib/hooks/useSpotifyPlayer.ts     # Spotify Web Playback SDK hook
middleware.ts                         # Route protection + localhost redirect
prisma/schema.prisma                  # Database schema
src/env.js                            # Environment validation
next.config.js                        # Next.js config
docs/auth-flow-diagram.md             # Auth flow diagram (audit target)
```

## Appendix B: Diagram Verdict

**Is `auth-flow-diagram.md` entirely correct?** **No, but close.**

- **Diagram 1 (Auth Flows)**: 95% accurate. Sequences are correct. Minor: redirect destinations are simplified.
- **Diagram 2 (API Authorization Matrix)**: 90% accurate. Missing `token` router. Client-side section doesn't mention tRPC token endpoints.
- **Diagram 3 (Onboarding & Route Protection)**: 85% accurate. OnboardingGuard is client-only, not middleware-enforced as implied.
- **TODO Table**: **Outdated** — 4 of 5 items are already implemented.

**Recommendation**: Update the diagram to reflect current implementation state, especially the TODO table.
