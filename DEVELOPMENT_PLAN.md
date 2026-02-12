# SpotiSwipe Comprehensive Development Plan

**Date:** 2025-01-03
**Project:** SpotiSwipe - Spotify Music Discovery App
**Status:** Backend Complete, Frontend Partially Complete, Testing & Features Required

---

## Executive Summary

This document provides a complete analysis of the SpotiSwipe project current state, identifies remaining work, and establishes a priority-based development plan with clear task delegation to specialized agents.

### Current State Overview

**Backend Status:** COMPLETE (100%)
- All authentication routes implemented with OAuth 2.0
- Spotify API integration complete with token refresh
- All CRUD endpoints for playlists implemented
- Swipe session management implemented
- MongoDB models defined and integrated
- Express middleware configured

**Frontend Status:** PARTIALLY COMPLETE (60%)
- Authentication flow with PKCE implemented
- Basic dashboard structure created
- SongCard component implemented
- Basic swipe page with single recommendation
- Auth context and protected routes working

**Infrastructure Status:** PARTIALLY COMPLETE (50%)
- Docker, Terraform, Ansible directories created
- Configurations need to be implemented

**Testing Status:** NOT STARTED (0%)
- No Jest test files exist
- Backend has Jest installed but no tests written
- Frontend has no test framework configured

---

## Detailed Gap Analysis

### 1. Frontend UI/UX Gaps

#### Missing Core Features (P0 - Must Have)
1. **Full Swipe Interface**
   - Current: Shows only 1 track, no queue management
   - Needed: Track queue (20+ tracks), swipe animations, navigation
   - Impact: Blocks core user story US-04, US-05, US-06, US-07

2. **Audio Preview Player**
   - Current: Not implemented
   - Needed: 30-second audio playback, play/pause, progress bar
   - Impact: Blocks user story US-05 (critical P0 feature)

3. **Playlist Management UI**
   - Current: No playlist pages exist
   - Needed: View playlists page, create playlist, playlist detail page
   - Impact: Blocks user stories US-09, US-10, US-11, US-12, US-13

4. **Save to Playlist Flow**
   - Current: Not implemented
   - Needed: Modal/dialog to save liked songs to playlists
   - Impact: Blocks user story US-11 (critical P0 feature)

#### Missing Nice-to-Have Features (P1 - Should Have)
5. **Spotify Playlists View**
   - Current: Not implemented
   - Needed: Page to view user's Spotify playlists
   - Impact: User story US-09 (P1)

6. **Previous/Next Navigation**
   - Current: Not implemented
   - Needed: Navigate through swipe queue
   - Impact: User story US-08 (P1)

#### Polish Items (P2 - Nice to Have)
7. **Playlist Rename**
   - Current: Not implemented
   - Needed: Edit playlist name/description
   - Impact: User story US-14 (P2)

8. **Loading States & Error Handling**
   - Current: Basic implementation
   - Needed: Consistent loading skeletons, error boundaries
   - Impact: UX quality

### 2. Backend Gaps

**Analysis:** Backend is feature-complete according to MASTERPLAN.md
- All Phase 1-3 backend tasks complete
- PKCE support needs to be added to auth routes (see note below)

#### PKCE Implementation Gap (CRITICAL)
**Current State:** Backend auth routes use standard OAuth (no PKCE)
- `/api/auth/login` does not generate or accept code_challenge
- `/api/auth/callback` does not validate code_verifier

**Frontend Expectation:** Frontend sends `codeVerifier` in callback request
- This creates a mismatch that will cause authentication failures

**Required Fix:** Backend must implement PKCE validation
- Accept and validate `codeVerifier` in callback
- Generate `code_challenge` for Spotify OAuth URL

### 3. Testing Gaps

**Backend Tests:** None exist
- No unit tests for routes
- No integration tests for Spotify service
- No tests for auth middleware

**Frontend Tests:** None exist
- No component tests
- No integration tests
- No E2E tests

**Test Coverage Target:** Per MASTERPLAN acceptance criteria
- All P0 user stories must be tested
- Critical paths (auth, swipe, playlist) must have coverage

### 4. Infrastructure Gaps

**Docker:**
- Directory exists but configurations not implemented
- Need: Dockerfiles, docker-compose.yml

**Terraform:**
- Directory exists but configurations not implemented
- Need: main.tf, variables.tf for Proxmox VM

**Ansible:**
- Directory exists but configurations not implemented
- Need: playbooks, roles for deployment

---

## Risk Assessment

### High-Risk Items (Block MVP Release)

| Risk | Impact | Mitigation |
|------|--------|-----------|
| PKCE backend mismatch | Auth fails completely | Immediate fix required in Phase 1 |
| No audio preview | Core feature missing | Must implement in Phase 2 |
| No playlist save | Core feature missing | Must implement in Phase 2 |
| Zero test coverage | Cannot verify quality | Parallel testing in Phase 3 |

### Medium-Risk Items (Degrade Experience)

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Poor loading states | Bad UX during API calls | Add in Phase 2 polish |
| No error boundaries | Crashes show white screen | Add in Phase 2 polish |
| Missing track queue | Limited discovery | Implement in Phase 2 |

### Low-Risk Items (Future Enhancement)

| Risk | Impact | Mitigation |
|------|--------|-----------|
| No playlist rename | Minor UX limitation | Defer to Phase 3 or post-MVP |
| No analytics | Can't measure engagement | Defer to post-MVP |
| Missing deployment | Can't demo publicly | Complete in Phase 3 |

---

## Priority-Based Development Plan

## PHASE 1: Critical Fixes & Foundations (Immediate - Day 1)

**Objective:** Fix blocking issues, complete core infrastructure

**Priority:** P0 (Must Have)
**Estimated Time:** 4-6 hours
**Owner:** @agent-backend-code-writer, @agent-frontend-code-writer

### Tasks

#### 1.1 Backend: Implement PKCE Support (CRITICAL)
**Agent:** @agent-backend-code-writer
**Priority:** P0
**Time:** 2 hours

**Description:**
Update backend auth routes to support PKCE flow matching frontend implementation.

**Acceptance Criteria:**
- [ ] `GET /api/auth/login` generates code_challenge from frontend verifier
- [ ] `GET /api/auth/login` includes `code_challenge` and `code_challenge_method=S256` in Spotify OAuth URL
- [ ] `POST /api/auth/callback` accepts `codeVerifier` in request body
- [ ] `POST /api/auth/callback` validates verifier against Spotify's PKCE requirements
- [ ] Auth flow completes successfully with PKCE enabled
- [ ] Tokens stored correctly after successful validation

**Files to Modify:**
- `/spotifyswipe-backend/src/routes/auth.ts`

**Test Plan:**
1. Start backend server
2. Call GET /api/auth/login - verify code_challenge in returned URL
3. Complete OAuth flow with code_verifier
4. Verify JWT cookie set correctly
5. Verify user can access protected endpoints

---

#### 1.2 Frontend: Complete Track Queue Management
**Agent:** @agent-frontend-code-writer
**Priority:** P0
**Time:** 3 hours

**Description:**
Extend swipe page to fetch and manage a queue of 20+ tracks instead of single track.

**Acceptance Criteria:**
- [ ] Fetch 20 tracks on page load
- [ ] Maintain current track index
- [ ] Next/previous navigation works
- [ ] Fetch more tracks when queue depletes to <5
- [ ] Handle empty queue gracefully
- [ ] Loading states for queue refills

**Files to Modify:**
- `/spotifyswipe-frontend/src/app/dashboard/swipe/page.tsx`

**New State to Add:**
```typescript
const [tracks, setTracks] = useState<Track[]>([]);
const [currentIndex, setCurrentIndex] = useState(0);
const [isLoadingMore, setIsLoadingMore] = useState(false);
```

**Test Plan:**
1. Load swipe page
2. Verify 20 tracks fetched
3. Swipe through 15 tracks
4. Verify new batch fetched automatically
5. Verify smooth transitions

---

#### 1.3 Frontend: Implement Session Storage for Swipe State
**Agent:** @agent-frontend-code-writer
**Priority:** P1
**Time:** 1 hour

**Description:**
Persist liked/disliked song IDs during swipe session to prevent loss on page refresh.

**Acceptance Criteria:**
- [ ] Create swipe session on mount (POST /api/swipe/session)
- [ ] Store liked song IDs in session state
- [ ] Store disliked song IDs in session state
- [ ] Update session on each swipe (PATCH /api/swipe/session/:id)
- [ ] Persist session ID in component state
- [ ] Load existing session if available

**Files to Modify:**
- `/spotifyswipe-frontend/src/app/dashboard/swipe/page.tsx`

**Test Plan:**
1. Start swipe session
2. Like 3 songs
3. Verify PATCH calls to backend
4. Check MongoDB for session with liked songs
5. Refresh page
6. Verify liked count persists

---

## PHASE 2: Core Features (Day 1-2)

**Objective:** Complete P0 features required for MVP

**Priority:** P0
**Estimated Time:** 10-12 hours
**Owner:** @agent-frontend-code-writer

### Tasks

#### 2.1 Audio Preview Player Component
**Agent:** @agent-frontend-code-writer
**Priority:** P0 (Blocks US-05)
**Time:** 3 hours

**Description:**
Create audio player component that plays 30-second Spotify previews with controls.

**Acceptance Criteria:**
- [ ] Component accepts `previewUrl` prop
- [ ] Play/pause button
- [ ] Progress bar showing current time
- [ ] Audio auto-plays on track change (with user permission)
- [ ] Handle tracks with no preview (show message)
- [ ] Pause previous track when new track loads
- [ ] Volume control

**New File:**
- `/spotifyswipe-frontend/src/components/AudioPlayer.tsx`

**Component Structure:**
```typescript
interface AudioPlayerProps {
  previewUrl: string | null;
  trackName: string;
  autoPlay?: boolean;
}

export function AudioPlayer({ previewUrl, trackName, autoPlay }: AudioPlayerProps) {
  // Implementation with HTML5 Audio API
}
```

**Integration:**
- Integrate into `SongCard` component

**Test Plan:**
1. Load track with preview URL
2. Verify audio plays automatically
3. Test play/pause toggle
4. Verify progress bar updates
5. Test track without preview (null URL)
6. Verify old audio stops when new track loads

---

#### 2.2 Swipe Animations & Gestures
**Agent:** @agent-frontend-code-writer
**Priority:** P1
**Time:** 2 hours

**Description:**
Add swipe animations to make card transitions smooth and intuitive.

**Acceptance Criteria:**
- [ ] Card slides left on dislike with fade-out
- [ ] Card slides right on like with fade-out
- [ ] Next card fades in from center
- [ ] Touch gestures supported (mobile)
- [ ] Mouse drag supported (desktop)
- [ ] Smooth CSS transitions (300ms)

**Files to Modify:**
- `/spotifyswipe-frontend/src/components/SongCard.tsx`
- `/spotifyswipe-frontend/src/app/dashboard/swipe/page.tsx`

**CSS Classes to Add:**
```css
.swipe-left { /* slide left animation */ }
.swipe-right { /* slide right animation */ }
.fade-in { /* fade in animation */ }
```

**Test Plan:**
1. Click dislike - card animates left
2. Click like - card animates right
3. Test on mobile device (touch)
4. Verify animations smooth at 60fps

---

#### 2.3 Playlist Management Pages
**Agent:** @agent-frontend-code-writer
**Priority:** P0 (Blocks US-09, US-10, US-11)
**Time:** 5 hours

**Description:**
Create complete playlist management UI (list, create, view, edit, delete).

**Acceptance Criteria:**
- [ ] Playlists list page shows all user playlists
- [ ] Create playlist button opens modal
- [ ] Create playlist form validates input
- [ ] Playlist detail page shows songs
- [ ] Remove song from playlist works
- [ ] Delete playlist with confirmation
- [ ] Edit playlist name/description (P2, optional)

**New Files:**
- `/spotifyswipe-frontend/src/app/dashboard/playlists/page.tsx`
- `/spotifyswipe-frontend/src/app/dashboard/playlists/[id]/page.tsx`
- `/spotifyswipe-frontend/src/components/PlaylistCard.tsx`
- `/spotifyswipe-frontend/src/components/CreatePlaylistModal.tsx`

**API Endpoints Used:**
- GET /api/playlists
- POST /api/playlists
- GET /api/playlists/:id
- PATCH /api/playlists/:id
- DELETE /api/playlists/:id
- DELETE /api/playlists/:id/songs/:songId

**Test Plan:**
1. Navigate to /dashboard/playlists
2. Verify playlists load from backend
3. Create new playlist
4. View playlist detail
5. Remove song from playlist
6. Delete playlist
7. Verify empty state when no playlists

---

#### 2.4 Save to Playlist Flow
**Agent:** @agent-frontend-code-writer
**Priority:** P0 (Blocks US-11)
**Time:** 2 hours

**Description:**
Create modal that allows saving liked songs to existing or new playlist.

**Acceptance Criteria:**
- [ ] Modal shows list of user playlists
- [ ] Select existing playlist to add songs
- [ ] Create new playlist option
- [ ] Batch add all liked songs
- [ ] Success/error feedback
- [ ] Close modal after save
- [ ] Clear liked songs after save

**New File:**
- `/spotifyswipe-frontend/src/components/SaveToPlaylistModal.tsx`

**Integration:**
- Add "Save Liked Songs" button to swipe page
- Show liked song count badge

**Test Plan:**
1. Like 5 songs in swipe interface
2. Click "Save to Playlist" button
3. Select existing playlist
4. Verify songs added to playlist
5. Verify liked songs counter resets
6. Test creating new playlist from modal

---

## PHASE 3: Testing & Quality (Day 2-3)

**Objective:** Establish test coverage for critical paths

**Priority:** P0 (Quality Gate)
**Estimated Time:** 8-10 hours
**Owner:** @jest-unit-tester

### Tasks

#### 3.1 Backend Unit Tests
**Agent:** @jest-unit-tester
**Priority:** P0
**Time:** 4 hours

**Description:**
Write Jest unit tests for backend routes and services.

**Acceptance Criteria:**
- [ ] Auth routes tests (login, callback, me, logout)
- [ ] Playlist CRUD route tests
- [ ] Swipe session route tests
- [ ] SpotifyService token refresh tests
- [ ] Auth middleware tests
- [ ] Minimum 70% code coverage on critical paths

**New Files:**
- `/spotifyswipe-backend/src/routes/__tests__/auth.test.ts`
- `/spotifyswipe-backend/src/routes/__tests__/playlists.test.ts`
- `/spotifyswipe-backend/src/routes/__tests__/swipe.test.ts`
- `/spotifyswipe-backend/src/services/__tests__/SpotifyService.test.ts`
- `/spotifyswipe-backend/src/middleware/__tests__/auth.test.ts`

**Test Framework:**
- Jest (already installed)
- Supertest for HTTP testing (already installed)

**Coverage Command:**
```bash
npm test -- --coverage
```

**Test Plan:**
1. Write tests for all auth flows
2. Mock Spotify API calls
3. Test token refresh logic
4. Test playlist ownership validation
5. Verify auth middleware rejects invalid JWT
6. Run coverage report

---

#### 3.2 Frontend Component Tests
**Agent:** @jest-unit-tester
**Priority:** P1
**Time:** 3 hours

**Description:**
Write tests for React components using React Testing Library.

**Acceptance Criteria:**
- [ ] SongCard component tests
- [ ] AudioPlayer component tests
- [ ] CreatePlaylistModal tests
- [ ] AuthContext tests
- [ ] Protected route tests
- [ ] Minimum 60% component coverage

**Setup Required:**
1. Install dependencies:
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

2. Create jest.config.js in frontend

**New Files:**
- `/spotifyswipe-frontend/src/components/__tests__/SongCard.test.tsx`
- `/spotifyswipe-frontend/src/components/__tests__/AudioPlayer.test.tsx`
- `/spotifyswipe-frontend/src/contexts/__tests__/AuthContext.test.tsx`

**Test Plan:**
1. Test component rendering
2. Test user interactions (clicks)
3. Test prop passing
4. Test error states
5. Test loading states

---

#### 3.3 Integration & E2E Testing
**Agent:** @jest-unit-tester
**Priority:** P1
**Time:** 3 hours

**Description:**
Manual and automated E2E tests for critical user flows.

**Acceptance Criteria:**
- [ ] Complete auth flow works (login -> callback -> dashboard)
- [ ] Swipe flow works (fetch -> swipe -> save)
- [ ] Playlist flow works (create -> add -> remove -> delete)
- [ ] Token refresh works (force expiry test)
- [ ] All P0 user stories verified

**Test Cases:**

**TC-01: Authentication Flow**
1. Visit /auth/login
2. Click "Login with Spotify"
3. Authorize on Spotify
4. Redirected to /dashboard/swipe
5. User data displayed correctly

**TC-02: Swipe & Save Flow**
1. Load /dashboard/swipe
2. Play audio preview
3. Like 10 songs
4. Click "Save to Playlist"
5. Create new playlist
6. Verify songs added

**TC-03: Playlist Management**
1. Navigate to /dashboard/playlists
2. Click playlist
3. View songs
4. Remove song
5. Delete playlist

**TC-04: Token Refresh**
1. Login
2. Manually expire token in DB
3. Make API call
4. Verify auto-refresh works
5. Verify call succeeds

---

## PHASE 4: Polish & Enhancement (Day 3)

**Objective:** Improve UX, add P1 features, fix minor bugs

**Priority:** P1 (Should Have)
**Estimated Time:** 6-8 hours
**Owner:** @agent-frontend-code-writer

### Tasks

#### 4.1 Spotify Playlists View
**Agent:** @agent-frontend-code-writer
**Priority:** P1
**Time:** 2 hours

**Description:**
Create page to view user's Spotify playlists (read-only).

**Acceptance Criteria:**
- [ ] Page at /dashboard/spotify-playlists
- [ ] Fetch playlists from GET /api/spotify/playlists
- [ ] Display playlist cards (image, name, track count)
- [ ] Click to view tracks (modal or detail page)
- [ ] "Use as seed" button to start recommendations

**New Files:**
- `/spotifyswipe-frontend/src/app/dashboard/spotify-playlists/page.tsx`

**Test Plan:**
1. Navigate to page
2. Verify user's playlists load
3. Click playlist to view tracks
4. Test "Use as seed" functionality

---

#### 4.2 Enhanced Error Handling
**Agent:** @agent-frontend-code-writer
**Priority:** P1
**Time:** 2 hours

**Description:**
Add error boundaries, better error messages, retry logic.

**Acceptance Criteria:**
- [ ] Error boundary component catches React errors
- [ ] Network errors show user-friendly messages
- [ ] Retry button on failed API calls
- [ ] 401 errors redirect to login
- [ ] Toast notifications for actions (optional)

**New Files:**
- `/spotifyswipe-frontend/src/components/ErrorBoundary.tsx`

**Test Plan:**
1. Simulate network error
2. Verify error message shows
3. Test retry button
4. Force 401 error
5. Verify redirect to login

---

#### 4.3 Loading States & Skeletons
**Agent:** @agent-frontend-code-writer
**Priority:** P1
**Time:** 2 hours

**Description:**
Add consistent loading indicators and skeleton screens.

**Acceptance Criteria:**
- [ ] Skeleton for song card
- [ ] Skeleton for playlist list
- [ ] Spinner for async operations
- [ ] Loading state during audio load
- [ ] Consistent styling across all loaders

**Files to Modify:**
- All page components

**Test Plan:**
1. Test slow network (throttle to 3G)
2. Verify skeletons show during load
3. Verify smooth transition to content

---

#### 4.4 Navigation & Header Enhancement
**Agent:** @agent-frontend-code-writer
**Priority:** P1
**Time:** 2 hours

**Description:**
Improve header navigation with active states, user menu.

**Acceptance Criteria:**
- [ ] Navigation highlights active page
- [ ] User menu with avatar
- [ ] Logout button in menu
- [ ] Mobile-responsive hamburger menu
- [ ] Links to all main pages

**Files to Modify:**
- `/spotifyswipe-frontend/src/components/Header.tsx`
- `/spotifyswipe-frontend/src/components/Navigation.tsx`

**Test Plan:**
1. Navigate between pages
2. Verify active state updates
3. Test user menu dropdown
4. Test logout flow
5. Test on mobile viewport

---

## PHASE 5: Deployment (Day 4)

**Objective:** Deploy to production environment (Proxmox VM)

**Priority:** P0 (For Public Demo)
**Estimated Time:** 6-8 hours
**Owner:** @agent-backend-code-writer (infrastructure)

### Tasks

#### 5.1 Docker Configuration
**Agent:** @agent-backend-code-writer
**Priority:** P0
**Time:** 2 hours

**Description:**
Create Docker configurations for containerized deployment.

**Acceptance Criteria:**
- [ ] Backend Dockerfile
- [ ] Frontend Dockerfile (Next.js production build)
- [ ] MongoDB container config
- [ ] Docker Compose for local orchestration
- [ ] Nginx reverse proxy config
- [ ] All services start successfully

**New Files:**
- `/infra/docker/backend.Dockerfile`
- `/infra/docker/frontend.Dockerfile`
- `/infra/docker/docker-compose.yml`
- `/infra/docker/nginx.conf`

**Test Plan:**
1. Build images locally
2. Start all containers with docker-compose
3. Verify backend responds on :3001
4. Verify frontend responds on :3000
5. Verify MongoDB connection

---

#### 5.2 Terraform VM Provisioning
**Agent:** @agent-backend-code-writer
**Priority:** P0
**Time:** 2 hours

**Description:**
Create Terraform configs to provision Ubuntu VM on Proxmox.

**Acceptance Criteria:**
- [ ] main.tf defines VM resource
- [ ] variables.tf for VM specs
- [ ] outputs.tf exports VM IP
- [ ] Successfully creates VM
- [ ] SSH access configured

**New Files:**
- `/infra/terraform/main.tf`
- `/infra/terraform/variables.tf`
- `/infra/terraform/outputs.tf`
- `/infra/terraform/terraform.tfvars` (gitignored)

**Test Plan:**
1. Run terraform init
2. Run terraform plan
3. Run terraform apply
4. Verify VM created in Proxmox
5. SSH into VM

---

#### 5.3 Ansible Deployment Automation
**Agent:** @agent-backend-code-writer
**Priority:** P0
**Time:** 3 hours

**Description:**
Create Ansible playbooks to configure VM and deploy app.

**Acceptance Criteria:**
- [ ] Install Docker on VM
- [ ] Copy Docker configs to VM
- [ ] Start containers on VM
- [ ] Configure SSL with Let's Encrypt
- [ ] Set up nginx reverse proxy
- [ ] Configure firewall rules
- [ ] App accessible at domain

**New Files:**
- `/infra/ansible/inventory.ini`
- `/infra/ansible/playbook.yml`
- `/infra/ansible/roles/docker/tasks/main.yml`
- `/infra/ansible/roles/app/tasks/main.yml`
- `/infra/ansible/roles/nginx/tasks/main.yml`

**Test Plan:**
1. Run ansible-playbook
2. Verify Docker installed
3. Verify containers running
4. Access app at https://domain.com
5. Test SSL certificate
6. Test all features in production

---

#### 5.4 Monitoring & Logging Setup
**Agent:** @agent-backend-code-writer
**Priority:** P1
**Time:** 1 hour

**Description:**
Set up basic monitoring and logging for production.

**Acceptance Criteria:**
- [ ] Docker logs accessible
- [ ] PM2 or similar for process management
- [ ] Health check endpoints (/health)
- [ ] Error logging to file
- [ ] Basic uptime monitoring

**Files to Modify:**
- `/spotifyswipe-backend/src/app.ts` (add /health endpoint)
- Docker compose (add logging config)

**Test Plan:**
1. Check logs: docker logs <container>
2. Hit /health endpoint
3. Verify logs written to volume
4. Test automatic restart on crash

---

## PHASE 6: Buffer & Bug Fixes (Day 4-5)

**Objective:** Address bugs found during testing, polish rough edges

**Priority:** P0 (Fix Critical Bugs)
**Estimated Time:** 4-8 hours
**Owner:** All agents as needed

### Tasks

#### 6.1 Bug Triage & Fixes
**Agent:** Varies by bug type
**Priority:** P0
**Time:** 4 hours

**Description:**
Address all critical and high-priority bugs found during testing.

**Process:**
1. Maintain bug list in GitHub Issues or PROGRESS.md
2. Prioritize by severity (P0 = blocker, P1 = major, P2 = minor)
3. Assign to appropriate agent
4. Verify fixes with tests

**Example Bug Categories:**
- Auth bugs → @agent-backend-code-writer
- UI bugs → @agent-frontend-code-writer
- Test failures → @jest-unit-tester

---

#### 6.2 Performance Optimization
**Agent:** @agent-backend-code-writer, @agent-frontend-code-writer
**Priority:** P1
**Time:** 2 hours

**Description:**
Optimize slow API calls, large bundle sizes, unnecessary re-renders.

**Acceptance Criteria:**
- [ ] API response time < 500ms (p95)
- [ ] Frontend Lighthouse score > 70
- [ ] No N+1 query issues
- [ ] Images optimized
- [ ] Code splitting implemented

**Test Plan:**
1. Run Lighthouse audit
2. Check API response times
3. Profile React renders
4. Optimize as needed

---

#### 6.3 Documentation Updates
**Agent:** All
**Priority:** P1
**Time:** 2 hours

**Description:**
Update README, API docs, deployment guide.

**Acceptance Criteria:**
- [ ] README.md with setup instructions
- [ ] API documentation complete
- [ ] Deployment guide tested
- [ ] Architecture diagrams updated
- [ ] Troubleshooting guide

**Files to Update:**
- `/README.md`
- `/DEPLOYMENT.md`
- `/API_DOCS.md`

---

## Task Delegation Matrix

| Phase | Task | Agent | Priority | Time | Dependencies |
|-------|------|-------|----------|------|--------------|
| 1 | Backend PKCE Support | @agent-backend-code-writer | P0 | 2h | None |
| 1 | Track Queue Management | @agent-frontend-code-writer | P0 | 3h | None |
| 1 | Swipe Session Storage | @agent-frontend-code-writer | P1 | 1h | Task 1.2 |
| 2 | Audio Player Component | @agent-frontend-code-writer | P0 | 3h | None |
| 2 | Swipe Animations | @agent-frontend-code-writer | P1 | 2h | Task 1.2 |
| 2 | Playlist Management UI | @agent-frontend-code-writer | P0 | 5h | None |
| 2 | Save to Playlist Flow | @agent-frontend-code-writer | P0 | 2h | Task 2.3 |
| 3 | Backend Unit Tests | @jest-unit-tester | P0 | 4h | Task 1.1 |
| 3 | Frontend Component Tests | @jest-unit-tester | P1 | 3h | Tasks 2.1-2.4 |
| 3 | Integration Testing | @jest-unit-tester | P1 | 3h | All Phase 2 |
| 4 | Spotify Playlists View | @agent-frontend-code-writer | P1 | 2h | None |
| 4 | Error Handling | @agent-frontend-code-writer | P1 | 2h | None |
| 4 | Loading States | @agent-frontend-code-writer | P1 | 2h | None |
| 4 | Navigation Enhancement | @agent-frontend-code-writer | P1 | 2h | None |
| 5 | Docker Setup | @agent-backend-code-writer | P0 | 2h | None |
| 5 | Terraform Config | @agent-backend-code-writer | P0 | 2h | None |
| 5 | Ansible Playbooks | @agent-backend-code-writer | P0 | 3h | Tasks 5.1, 5.2 |
| 5 | Monitoring Setup | @agent-backend-code-writer | P1 | 1h | Task 5.3 |
| 6 | Bug Fixes | All | P0 | 4h | All previous |
| 6 | Performance Tuning | All | P1 | 2h | All previous |
| 6 | Documentation | All | P1 | 2h | All previous |

---

## Acceptance Criteria Summary

### MVP Release Checklist (All P0 Items)

**Authentication:**
- [x] User can login with Spotify OAuth + PKCE
- [x] User remains logged in across sessions
- [x] User can logout
- [ ] Backend validates PKCE correctly (Task 1.1)

**Music Discovery:**
- [x] User sees personalized recommendations
- [ ] User can play 30-second audio previews (Task 2.1)
- [x] User can swipe right to like
- [x] User can swipe left to skip
- [ ] User has queue of 20+ tracks (Task 1.2)
- [ ] Swipe actions are saved to session (Task 1.3)

**Playlist Management:**
- [ ] User can create custom playlist (Task 2.3)
- [ ] User can view their playlists (Task 2.3)
- [ ] User can add liked songs to playlist (Task 2.4)
- [ ] User can view playlist details (Task 2.3)
- [ ] User can delete playlist (Task 2.3)
- [ ] User can remove songs from playlist (Task 2.3)

**Quality Gates:**
- [ ] No console errors in browser
- [ ] No unhandled errors in backend
- [ ] All P0 user stories tested (Phase 3)
- [ ] OAuth success rate 100%
- [ ] API response time < 500ms p95
- [ ] Frontend Lighthouse score > 70

**Deployment:**
- [ ] App deployed to production VM (Phase 5)
- [ ] HTTPS configured
- [ ] Domain configured
- [ ] Monitoring active

---

## Test Coverage Requirements

### Backend Test Coverage Targets
- **Auth Routes:** 90% coverage
- **Playlist Routes:** 85% coverage
- **Spotify Service:** 80% coverage
- **Middleware:** 100% coverage
- **Overall:** 70% minimum

### Frontend Test Coverage Targets
- **Components:** 60% coverage
- **Auth Context:** 90% coverage
- **Critical Flows:** 100% E2E coverage
- **Overall:** 50% minimum

### Critical Path Tests (Must Have)
1. Complete auth flow (login → callback → dashboard)
2. Swipe flow (recommendations → swipe → save)
3. Playlist CRUD (create → add songs → remove → delete)
4. Token refresh (auto-refresh on expiry)
5. Protected routes (redirect when not authenticated)

---

## Deployment Checklist

### Pre-Deployment
- [ ] All P0 tasks complete
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database backups configured
- [ ] SSL certificate acquired

### Deployment Steps
1. [ ] Provision VM with Terraform
2. [ ] Configure VM with Ansible
3. [ ] Build Docker images
4. [ ] Push images to registry (optional)
5. [ ] Deploy containers on VM
6. [ ] Configure nginx reverse proxy
7. [ ] Set up SSL with Let's Encrypt
8. [ ] Configure firewall rules
9. [ ] Test all features in production
10. [ ] Set up monitoring

### Post-Deployment
- [ ] Smoke test all features
- [ ] Verify analytics/logging
- [ ] Document known issues
- [ ] Create backup/restore procedure
- [ ] Set up alerting for downtime

---

## Timeline Summary

| Phase | Duration | Start | End | Status |
|-------|----------|-------|-----|--------|
| Phase 1: Critical Fixes | 6h | Day 1 AM | Day 1 PM | Not Started |
| Phase 2: Core Features | 12h | Day 1 PM | Day 2 PM | Not Started |
| Phase 3: Testing | 10h | Day 2 PM | Day 3 PM | Not Started |
| Phase 4: Polish | 8h | Day 3 PM | Day 4 AM | Not Started |
| Phase 5: Deployment | 8h | Day 4 AM | Day 4 PM | Not Started |
| Phase 6: Buffer | 8h | Day 5 | Day 5 | Not Started |

**Total Estimated Time:** 52 hours
**Timeline:** 5 working days (assuming 8-10h/day with breaks)

---

## Next Immediate Steps

### Step 1: Begin Phase 1 - Task 1.1
**Action:** Delegate backend PKCE implementation to @agent-backend-code-writer

**Delegation:**
```json
{
  "agent": "@agent-backend-code-writer",
  "task": "Implement PKCE support in backend auth routes",
  "priority": "P0",
  "blocking": true,
  "description": "Update /api/auth/login and /api/auth/callback to support PKCE flow",
  "acceptance_criteria": [
    "Generate code_challenge from verifier",
    "Include code_challenge in Spotify OAuth URL",
    "Validate code_verifier in callback",
    "Return JWT on successful validation"
  ],
  "files_to_modify": [
    "/spotifyswipe-backend/src/routes/auth.ts"
  ],
  "estimated_time": "2 hours"
}
```

### Step 2: Begin Phase 1 - Task 1.2
**Action:** Delegate track queue management to @agent-frontend-code-writer

**Delegation:**
```json
{
  "agent": "@agent-frontend-code-writer",
  "task": "Implement track queue management in swipe page",
  "priority": "P0",
  "blocking": true,
  "description": "Extend swipe page to manage queue of 20+ tracks with auto-refill",
  "acceptance_criteria": [
    "Fetch 20 tracks on mount",
    "Track current index",
    "Auto-refill when < 5 tracks remain",
    "Handle empty queue gracefully"
  ],
  "files_to_modify": [
    "/spotifyswipe-frontend/src/app/dashboard/swipe/page.tsx"
  ],
  "estimated_time": "3 hours"
}
```

### Step 3: Monitor Progress
**Action:** Update PROGRESS.md after each task completion

---

## Contact & Support

**Project Manager:** Claude Orchestrator
**Backend Lead:** @agent-backend-code-writer
**Frontend Lead:** @agent-frontend-code-writer
**QA Lead:** @jest-unit-tester

**Escalation Path:**
1. Try to resolve blocker independently
2. Document blocker in PROGRESS.md
3. Request assistance from project manager
4. Adjust timeline if needed

---

## Document Version Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-03 | Claude Orchestrator | Initial comprehensive plan |

---

**Status:** Ready for Phase 1 execution
**Next Review:** After Phase 1 completion
