# Jest Unit Test Execution Guide

## Quick Start

### Prerequisites
- Node.js 18+ installed
- npm dependencies installed
- Backend project set up

### Installation

```bash
# Navigate to backend directory
cd /Users/vietquocbui/repos/VsCode/vietbui1999ru/CodePath/Web/Web102/spotiswipe/spotifyswipe-backend

# Install dependencies (if not done)
npm install

# Dependencies needed for tests (should already be installed):
# - jest@^29.7.0
# - ts-jest
# - supertest@^7.1.4
# - @types/jest
```

---

## Running Tests

### 1. Run All Tests

```bash
npm test
```

**Expected Output:**
```
PASS  src/routes/__tests__/auth.test.ts (1.234s)
PASS  src/routes/__tests__/playlists.test.ts (2.456s)
PASS  src/routes/__tests__/swipe.test.ts (1.789s)

Test Suites: 3 passed, 3 total
Tests:       100+ passed, 100+ total
```

### 2. Run Specific Test File

#### Playlist Tests Only
```bash
npm test -- playlists.test.ts
```

#### Swipe Tests Only
```bash
npm test -- swipe.test.ts
```

#### Auth Tests Only
```bash
npm test -- auth.test.ts
```

### 3. Run Tests with Coverage Report

```bash
npm test -- --coverage
```

**This will:**
- Execute all tests
- Generate coverage metrics
- Create `coverage/` directory with HTML report
- Display summary in console

**Coverage Output Example:**
```
-----------|---------|---------|---------|---------|-------------------
File       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Lines
-----------|---------|---------|---------|---------|-------------------
All files  |   65.23 |   58.45 |   70.12 |   64.89 |
 playlists |   92.50 |   85.00 |   95.00 |   91.20 |
 swipe.ts  |   94.30 |   88.50 |   96.00 |   93.80 |
-----------|---------|---------|---------|---------|-------------------
```

### 4. Watch Mode (for Development)

```bash
npm test -- --watch
```

- Reruns tests when files change
- Useful during development
- Press 'q' to exit

### 5. View Coverage Report in Browser

```bash
# After running coverage, open HTML report
open coverage/lcov-report/index.html
```

---

## Test Organization

### File Structure
```
spotifyswipe-backend/src/routes/
├── __tests__/
│   ├── auth.test.ts (existing)
│   ├── playlists.test.ts (new)
│   └── swipe.test.ts (new)
├── auth.ts
├── playlists.ts
├── swipe.ts
└── index.ts
```

### Test Grouping

Each test file is organized by endpoint:

#### playlists.test.ts Structure
```
Playlist CRUD Endpoints
├── GET /api/playlists - List user playlists (5 tests)
├── POST /api/playlists - Create new playlist (8 tests)
├── GET /api/playlists/:id - Get playlist detail (8 tests)
├── PATCH /api/playlists/:id - Update playlist (12 tests)
├── DELETE /api/playlists/:id - Delete playlist (6 tests)
├── POST /api/playlists/:id/songs - Add song (10 tests)
└── DELETE /api/playlists/:id/songs/:songId - Remove song (9 tests)
```

#### swipe.test.ts Structure
```
Swipe Session Endpoints
├── POST /api/swipe/session - Create session (9 tests)
├── PATCH /api/swipe/session/:id - Record swipe (16 tests)
├── GET /api/swipe/session/:id - Get session details (5 tests)
├── POST /api/swipe/session/:id/complete - Complete session (11 tests)
└── Integration Tests (2 tests)
```

---

## Understanding Test Output

### Successful Test Output

```
 PASS  src/routes/__tests__/playlists.test.ts
  Playlist CRUD Endpoints
    GET /api/playlists - List user playlists
      ✓ should return 401 without authentication (25ms)
      ✓ should return empty array for new user (18ms)
      ✓ should return user playlists with metadata (22ms)
    POST /api/playlists - Create new playlist
      ✓ should return 401 without authentication (20ms)
      ✓ should create playlist with valid name (30ms)
```

**Legend:**
- ✓ = Test passed
- (XXms) = Execution time
- Indentation = Test hierarchy

### Failed Test Output

```
 FAIL  src/routes/__tests__/playlists.test.ts
  Playlist CRUD Endpoints
    POST /api/playlists
      ✕ should create playlist with valid name (45ms)

  ● Playlist CRUD Endpoints › POST /api/playlists › should create playlist

    Expected: 201
    Received: 400

    at Object.<anonymous> (src/routes/__tests__/playlists.test.ts:145:10)
```

**How to Debug:**
1. Read the error message carefully
2. Check expected vs received values
3. Look at the file and line number
4. Review the test setup and mocks
5. Check if production code matches expectations

---

## Test Categories

### 1. Authentication Tests (30+ tests)

**Purpose:** Verify 401 Unauthorized responses when no JWT token

**Example:**
```
✓ should return 401 without authentication
```

**How:** Run request without `jwt` cookie header

### 2. Authorization Tests (25+ tests)

**Purpose:** Verify 403 Forbidden responses when user not authorized

**Example:**
```
✓ should return 403 if user is not playlist owner
```

**How:** Create resource with different userId, access with different auth token

### 3. Validation Tests (20+ tests)

**Purpose:** Verify 400 Bad Request for invalid input

**Examples:**
```
✓ should return 400 for missing name
✓ should return 400 for name exceeding 100 characters
✓ should return 400 for invalid action type
```

### 4. Happy Path Tests (15+ tests)

**Purpose:** Verify successful operations with valid inputs

**Examples:**
```
✓ should create playlist with valid name
✓ should add song to playlist successfully
✓ should mark session as completed
```

### 5. Edge Case Tests (10+ tests)

**Purpose:** Verify behavior with boundary conditions

**Examples:**
```
✓ should handle playlist at max capacity (500 songs)
✓ should prevent duplicate songs
✓ should handle empty songs array
```

---

## Key Testing Patterns

### Pattern 1: Authentication Pattern

```typescript
test('should return 401 without authentication', async () => {
  const response = await request(app)
    .get('/api/playlists');  // No JWT cookie

  expect(response.status).toBe(401);
  expect(response.body.error).toBeDefined();
});
```

**Used In:** All endpoints (30+ tests)

### Pattern 2: Authorization Pattern

```typescript
test('should return 403 if user is not owner', async () => {
  // Create resource with otherUserId
  const mockPlaylist = {
    _id: playlistId,
    ownerId: otherUserId,  // Different user
    // ...
  };

  (Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

  const response = await request(app)
    .patch(`/api/playlists/${playlistId}`)
    .set('Cookie', `jwt=${authToken}`)  // Current user's token
    .send({ name: 'Updated' });

  expect(response.status).toBe(403);
});
```

**Used In:** All endpoints (25+ tests)

### Pattern 3: State Verification Pattern

```typescript
test('should move song from disliked to liked', async () => {
  const mockSession = {
    likedSongIds: [],
    dislikedSongIds: ['track1'],
    // ...
  };

  // Record like for track1
  await request(app)
    .patch(`/api/swipe/session/${sessionId}`)
    .set('Cookie', `jwt=${authToken}`)
    .send({ action: 'like', songId: 'track1' });

  // Verify state changed
  expect(mockSession.dislikedSongIds).not.toContain('track1');
  expect(mockSession.likedSongIds).toContain('track1');
});
```

**Used In:** Swipe session tests (5+ tests)

### Pattern 4: Integration Pattern

```typescript
test('should complete full session lifecycle', async () => {
  // 1. Create session
  const createResponse = await request(app)
    .post('/api/swipe/session')
    .set('Cookie', `jwt=${authToken}`)
    .send({});

  const sessionId = createResponse.body.data.session.id;

  // 2. Record swipes
  await request(app)
    .patch(`/api/swipe/session/${sessionId}`)
    .set('Cookie', `jwt=${authToken}`)
    .send({ action: 'like', songId: 'track1' });

  // 3. Complete session
  const completeResponse = await request(app)
    .post(`/api/swipe/session/${sessionId}/complete`)
    .set('Cookie', `jwt=${authToken}`)
    .send({});

  expect(completeResponse.status).toBe(200);
  expect(completeResponse.body.data.session.completedAt).toBeDefined();
});
```

**Used In:** Integration tests (2 tests)

---

## Debugging Failed Tests

### Step 1: Identify the failing test

From Jest output:
```
FAIL  src/routes/__tests__/playlists.test.ts

● Playlist CRUD › POST /api/playlists › should create playlist with valid name
```

### Step 2: Look at the assertion

```
Expected: 201
Received: 400
```

### Step 3: Review test code

Look at the test in the file to understand what it's testing:

```typescript
test('should create playlist with valid name and description', async () => {
  const mockPlaylist = { /* ... */ };
  (Playlist as jest.Mock).mockImplementation(() => mockPlaylist);

  const response = await request(app)
    .post('/api/playlists')
    .set('Cookie', `jwt=${authToken}`)
    .send({
      name: 'My New Playlist',
      description: 'Test description'
    });

  expect(response.status).toBe(201);  // Expected 201, got 400
});
```

### Step 4: Check the mock

Is the mock returning the right data?

```typescript
const mockPlaylist = {
  _id: testPlaylistId,
  name: 'My New Playlist',
  description: 'Test description',
  songIds: [],
  createdAt: new Date('2025-01-01'),
  save: jest.fn().mockResolvedValue(true)  // Does save resolve?
};
```

### Step 5: Run single test for details

```bash
npm test -- playlists.test.ts -t "should create playlist with valid name"
```

---

## Coverage Analysis

### Reading Coverage Reports

```
-----------|---------|---------|---------|---------|-------------------
File       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Lines
-----------|---------|---------|---------|---------|-------------------
playlists  |   92.50 |   85.00 |   95.00 |   91.20 | 45,123,200
-----------|---------|---------|---------|---------|-------------------
```

**Meaning:**
- **% Stmts (92.50%):** 92.5% of code statements executed
- **% Branch (85.00%):** 85% of conditional branches covered
- **% Funcs (95.00%):** 95% of functions called
- **% Lines (91.20%):** 91.2% of lines executed
- **Uncovered Lines:** Lines 45, 123, 200 not hit by tests

### Improving Coverage

If coverage is below 60% for playlist/swipe routes:

1. **Identify uncovered lines** from coverage report
2. **Write tests** for those code paths
3. **Run coverage** again to verify
4. **Iterate** until target is met

Example:
```bash
# Run coverage
npm test -- --coverage

# Open report
open coverage/lcov-report/index.html

# Find uncovered lines in playlists.ts
# Write tests to cover those lines
# Rerun coverage to verify increase
```

---

## Common Issues & Solutions

### Issue 1: Tests Timeout

**Problem:**
```
FAIL  src/routes/__tests__/playlists.test.ts
  timeout - Async callback was not invoked within the 5000ms timeout
```

**Solution:**
- Mocks might not be resolving
- Check if `save()` mock returns a promise
- Increase timeout: `jest.setTimeout(10000)`

### Issue 2: Mock Not Working

**Problem:**
```
Expected: 201
Received: 500
```

**Solution:**
```typescript
// Make sure mock is set before request
(Playlist as jest.Mock).mockImplementation(() => mockPlaylist);

// Before:
const response = await request(app).post('/api/playlists');
```

### Issue 3: Authentication Failing

**Problem:**
```
Expected: 201
Received: 401
```

**Solution:**
```typescript
// Make sure token is in cookie header
const response = await request(app)
  .post('/api/playlists')
  .set('Cookie', `jwt=${authToken}`)  // Add this line
  .send({});
```

### Issue 4: ObjectId Not Valid

**Problem:**
```
Expected: 404 or 403
Received: 404 (from invalid ObjectId check)
```

**Solution:**
```typescript
// Use valid MongoDB ObjectId string
const testPlaylistId = new mongoose.Types.ObjectId().toString();

// Don't use random strings
const badId = 'not-a-valid-id';
```

---

## Performance Optimization

### Run Tests in Parallel

Jest runs tests in parallel by default. If you want sequential:

```bash
npm test -- --runInBand
```

### Run Only Changed Tests

```bash
npm test -- --onlyChanged
```

### Focus on Specific Tests

```bash
# Run tests matching pattern
npm test -- --testNamePattern="should return 401"

# Short form
npm test -- -t "should return 401"
```

---

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v2
```

---

## Summary

| Command | Purpose |
|---------|---------|
| `npm test` | Run all tests |
| `npm test -- playlists.test.ts` | Run playlist tests only |
| `npm test -- --coverage` | Run with coverage report |
| `npm test -- --watch` | Watch mode for development |
| `npm test -- -t "pattern"` | Run matching tests |
| `npm test -- --runInBand` | Sequential execution |

---

## References

- Jest Documentation: https://jestjs.io/
- Supertest Documentation: https://github.com/visionmedia/supertest
- MongoDB Testing: https://mongoosejs.com/docs/api/model.html
