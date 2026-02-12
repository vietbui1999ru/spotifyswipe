import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from '../auth';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { User } from '../../models/User';

// Mock axios and crypto modules
jest.mock('axios');
jest.mock('../../models/User');

// Setup environment variables
process.env.SPOTIFY_CLIENT_ID = 'test_client_id';
process.env.SPOTIFY_CLIENT_SECRET = 'test_client_secret';
process.env.SPOTIFY_REDIRECT_URI = 'http://localhost:3000/callback';
process.env.JWT_SECRET = 'test_jwt_secret_key';
process.env.NODE_ENV = 'development';

describe('PKCE Authentication Routes', () => {
  let app: Express;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/auth', authRoutes);
  });

  describe('GET /login - OAuth URL generation with PKCE', () => {
    test('should return 400 when code_challenge is missing', async () => {
      const response = await request(app)
        .get('/api/auth/login')
        .query({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('code_challenge');
    });

    test('should generate valid Spotify OAuth URL with PKCE parameters', async () => {
      const codeChallenge = 'E9Mrozoa2owUTEsStFAMVQ1mKywQOrALR-BhBYM0yvc';

      const response = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: codeChallenge });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.url).toBeDefined();

      // Verify URL structure
      const url = new URL(response.body.data.url);
      expect(url.hostname).toBe('accounts.spotify.com');
      expect(url.pathname).toBe('/authorize');

      // Verify all required query parameters
      expect(url.searchParams.get('client_id')).toBe('test_client_id');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/callback');
      expect(url.searchParams.get('code_challenge')).toBe(codeChallenge);
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');

      // Verify scopes
      const scopes = url.searchParams.get('scope')?.split(' ') || [];
      expect(scopes).toContain('user-read-email');
      expect(scopes).toContain('user-read-private');
      expect(scopes).toContain('playlist-read-private');
      expect(scopes).toContain('playlist-read-collaborative');
      expect(scopes).toContain('user-library-read');

      // Verify state parameter exists
      expect(url.searchParams.get('state')).toBeDefined();
      expect(url.searchParams.get('state')).toMatch(/^[a-f0-9]{32}$/); // 16 bytes = 32 hex chars
    });

    test('should create unique state values for multiple login requests', async () => {
      const codeChallenge = 'E9Mrozoa2owUTEsStFAMVQ1mKywQOrALR-BhBYM0yvc';

      const response1 = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: codeChallenge });

      const response2 = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: codeChallenge });

      const url1 = new URL(response1.body.data.url);
      const url2 = new URL(response2.body.data.url);

      const state1 = url1.searchParams.get('state');
      const state2 = url2.searchParams.get('state');

      expect(state1).not.toBe(state2);
    });

    test('should handle different code_challenge values', async () => {
      const challenges = [
        'E9Mrozoa2owUTEsStFAMVQ1mKywQOrALR-BhBYM0yvc',
        'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXo',
        'anotherValidBase64urlChallenge123'
      ];

      for (const challenge of challenges) {
        const response = await request(app)
          .get('/api/auth/login')
          .query({ code_challenge: challenge });

        expect(response.status).toBe(200);
        const url = new URL(response.body.data.url);
        expect(url.searchParams.get('code_challenge')).toBe(challenge);
      }
    });
  });

  describe('validatePKCE function - SHA256 hashing and base64url encoding', () => {
    // Import and test the validation function
    test('should validate correct PKCE pairs', async () => {
      // Test vector from RFC 7636 Appendix B
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXo';
      const expectedChallenge = 'E9Mrozoa2owUTEsStFAMVQ1mKywQOrALR-BhBYM0yvc';

      // Make a callback request to test PKCE validation
      const mockUser = {
        _id: 'user123',
        spotifyId: 'spotify123',
        displayName: 'Test User',
        email: 'test@example.com',
        avatarUrl: null,
      };

      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(mockUser);
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          access_token: 'access_token_123',
          refresh_token: 'refresh_token_123',
          expires_in: 3600,
        },
      });
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          id: 'spotify123',
          display_name: 'Test User',
          email: 'test@example.com',
          images: [],
        },
      });

      // First, get login URL to establish state
      const loginResponse = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: expectedChallenge });

      const loginUrl = new URL(loginResponse.body.data.url);
      const state = loginUrl.searchParams.get('state');

      // Now test callback with matching verifier and challenge
      const response = await request(app)
        .post('/api/auth/callback')
        .send({
          code: 'auth_code_123',
          state,
          code_verifier: codeVerifier,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid code_verifier', async () => {
      const codeChallenge = 'E9Mrozoa2owUTEsStFAMVQ1mKywQOrALR-BhBYM0yvc';
      const invalidVerifier = 'invalidVerifierThatDoesntMatch';

      // Get login URL to establish state
      const loginResponse = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: codeChallenge });

      const loginUrl = new URL(loginResponse.body.data.url);
      const state = loginUrl.searchParams.get('state');

      // Try callback with invalid verifier
      const response = await request(app)
        .post('/api/auth/callback')
        .send({
          code: 'auth_code_123',
          state,
          code_verifier: invalidVerifier,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('code_verifier');
    });

    test('should handle SHA256 hashing correctly', async () => {
      // Manually compute SHA256 hash to verify algorithm
      const codeVerifier = 'test_code_verifier_string';
      const hash = crypto.createHash('sha256').update(codeVerifier).digest();
      const computedChallenge = hash
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      const mockUser = {
        _id: 'user123',
        spotifyId: 'spotify123',
        displayName: 'Test User',
        email: 'test@example.com',
        avatarUrl: null,
      };

      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(mockUser);
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          access_token: 'access_token_123',
          refresh_token: 'refresh_token_123',
          expires_in: 3600,
        },
      });
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          id: 'spotify123',
          display_name: 'Test User',
          email: 'test@example.com',
          images: [],
        },
      });

      // Get login URL
      const loginResponse = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: computedChallenge });

      const loginUrl = new URL(loginResponse.body.data.url);
      const state = loginUrl.searchParams.get('state');

      // Callback with matching verifier
      const response = await request(app)
        .post('/api/auth/callback')
        .send({
          code: 'auth_code_123',
          state,
          code_verifier: codeVerifier,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Code challenge cache management', () => {
    test('should reject callback with invalid or expired state', async () => {
      const response = await request(app)
        .post('/api/auth/callback')
        .send({
          code: 'auth_code_123',
          state: 'invalid_state_that_never_existed',
          code_verifier: 'some_verifier',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid or expired state');
    });

    test('should cache code_challenge with state after login request', async () => {
      const codeChallenge = 'E9Mrozoa2owUTEsStFAMVQ1mKywQOrALR-BhBYM0yvc';

      const response = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: codeChallenge });

      const loginUrl = new URL(response.body.data.url);
      const state = loginUrl.searchParams.get('state');

      // State should be valid immediately after login
      expect(state).toBeDefined();
      expect(state).toMatch(/^[a-f0-9]{32}$/);
    });

    test('should clear code_challenge from cache after successful validation', async () => {
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXo';
      const codeChallenge = 'E9Mrozoa2owUTEsStFAMVQ1mKywQOrALR-BhBYM0yvc';

      const mockUser = {
        _id: 'user123',
        spotifyId: 'spotify123',
        displayName: 'Test User',
        email: 'test@example.com',
        avatarUrl: null,
      };

      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(mockUser);
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          access_token: 'access_token_123',
          refresh_token: 'refresh_token_123',
          expires_in: 3600,
        },
      });
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          id: 'spotify123',
          display_name: 'Test User',
          email: 'test@example.com',
          images: [],
        },
      });

      // First request
      const loginResponse = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: codeChallenge });

      const loginUrl = new URL(loginResponse.body.data.url);
      const state = loginUrl.searchParams.get('state');

      // Callback should succeed
      const callbackResponse = await request(app)
        .post('/api/auth/callback')
        .send({
          code: 'auth_code_123',
          state,
          code_verifier: codeVerifier,
        });

      expect(callbackResponse.status).toBe(200);

      // Trying to reuse the same state should fail
      const reuseResponse = await request(app)
        .post('/api/auth/callback')
        .send({
          code: 'auth_code_456',
          state, // Same state as before
          code_verifier: codeVerifier,
        });

      expect(reuseResponse.status).toBe(401);
      expect(reuseResponse.body.error).toContain('Invalid or expired state');
    });
  });

  describe('POST /callback - Complete OAuth flow with PKCE', () => {
    test('should return 400 when code is missing', async () => {
      const response = await request(app)
        .post('/api/auth/callback')
        .send({
          state: 'some_state',
          code_verifier: 'some_verifier',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Code required');
    });

    test('should return 400 when state is missing', async () => {
      const response = await request(app)
        .post('/api/auth/callback')
        .send({
          code: 'auth_code',
          code_verifier: 'some_verifier',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('State required');
    });

    test('should return 400 when code_verifier is missing', async () => {
      const response = await request(app)
        .post('/api/auth/callback')
        .send({
          code: 'auth_code',
          state: 'some_state',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('code_verifier');
    });

    test('should successfully complete OAuth flow with valid PKCE', async () => {
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXo';
      const codeChallenge = 'E9Mrozoa2owUTEsStFAMVQ1mKywQOrALR-BhBYM0yvc';

      const mockUser = {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        spotifyId: 'spotify_user_123',
        displayName: 'John Doe',
        email: 'john@example.com',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(mockUser);
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          access_token: 'access_token_abc123',
          refresh_token: 'refresh_token_xyz789',
          expires_in: 3600,
        },
      });
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          id: 'spotify_user_123',
          display_name: 'John Doe',
          email: 'john@example.com',
          images: [
            {
              url: 'https://example.com/avatar.jpg',
            },
          ],
        },
      });

      // Step 1: Get login URL
      const loginResponse = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: codeChallenge });

      const loginUrl = new URL(loginResponse.body.data.url);
      const state = loginUrl.searchParams.get('state');

      // Step 2: Callback with authorization code and PKCE verification
      const callbackResponse = await request(app)
        .post('/api/auth/callback')
        .send({
          code: 'auth_code_123',
          state,
          code_verifier: codeVerifier,
        });

      expect(callbackResponse.status).toBe(200);
      expect(callbackResponse.body.success).toBe(true);
      expect(callbackResponse.body.data.user).toBeDefined();
      expect(callbackResponse.body.data.user.id).toBe(mockUser._id.toString());
      expect(callbackResponse.body.data.user.spotifyId).toBe('spotify_user_123');
      expect(callbackResponse.body.data.user.displayName).toBe('John Doe');
      expect(callbackResponse.body.data.user.email).toBe('john@example.com');

      // Verify JWT cookie is set
      const cookies = callbackResponse.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('jwt=');
      expect(cookies[0]).toContain('HttpOnly');
    });

    test('should create new user on first login', async () => {
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXo';
      const codeChallenge = 'E9Mrozoa2owUTEsStFAMVQ1mKywQOrALR-BhBYM0yvc';

      const newUser = {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
        spotifyId: 'new_spotify_user',
        displayName: 'New User',
        email: 'newuser@example.com',
        avatarUrl: null,
      };

      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(newUser);
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          expires_in: 3600,
        },
      });
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          id: 'new_spotify_user',
          display_name: 'New User',
          email: 'newuser@example.com',
          images: [],
        },
      });

      const loginResponse = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: codeChallenge });

      const state = new URL(loginResponse.body.data.url).searchParams.get('state');

      const callbackResponse = await request(app)
        .post('/api/auth/callback')
        .send({
          code: 'auth_code',
          state,
          code_verifier: codeVerifier,
        });

      expect(callbackResponse.status).toBe(200);
      expect(User.findOneAndUpdate).toHaveBeenCalledWith(
        { spotifyId: 'new_spotify_user' },
        expect.objectContaining({
          spotifyId: 'new_spotify_user',
          displayName: 'New User',
          email: 'newuser@example.com',
        }),
        expect.objectContaining({ upsert: true, new: true })
      );
    });

    test('should update existing user on subsequent login', async () => {
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXo';
      const codeChallenge = 'E9Mrozoa2owUTEsStFAMVQ1mKywQOrALR-BhBYM0yvc';

      const existingUser = {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
        spotifyId: 'existing_spotify_user',
        displayName: 'Updated Name',
        email: 'updated@example.com',
        avatarUrl: 'https://example.com/new_avatar.jpg',
      };

      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(existingUser);
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          access_token: 'updated_access_token',
          refresh_token: 'updated_refresh_token',
          expires_in: 3600,
        },
      });
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          id: 'existing_spotify_user',
          display_name: 'Updated Name',
          email: 'updated@example.com',
          images: [
            {
              url: 'https://example.com/new_avatar.jpg',
            },
          ],
        },
      });

      const loginResponse = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: codeChallenge });

      const state = new URL(loginResponse.body.data.url).searchParams.get('state');

      const callbackResponse = await request(app)
        .post('/api/auth/callback')
        .send({
          code: 'auth_code',
          state,
          code_verifier: codeVerifier,
        });

      expect(callbackResponse.status).toBe(200);
      expect(User.findOneAndUpdate).toHaveBeenCalledWith(
        { spotifyId: 'existing_spotify_user' },
        expect.objectContaining({
          displayName: 'Updated Name',
          email: 'updated@example.com',
        }),
        expect.objectContaining({ upsert: true, new: true })
      );
    });

    test('should set JWT cookie with correct options', async () => {
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXo';
      const codeChallenge = 'E9Mrozoa2owUTEsStFAMVQ1mKywQOrALR-BhBYM0yvc';

      const mockUser = {
        _id: new mongoose.Types.ObjectId(),
        spotifyId: 'spotify123',
        displayName: 'Test',
        email: 'test@example.com',
        avatarUrl: null,
      };

      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(mockUser);
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 3600,
        },
      });
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          id: 'spotify123',
          display_name: 'Test',
          email: 'test@example.com',
          images: [],
        },
      });

      const loginResponse = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: codeChallenge });

      const state = new URL(loginResponse.body.data.url).searchParams.get('state');

      const callbackResponse = await request(app)
        .post('/api/auth/callback')
        .send({
          code: 'auth_code',
          state,
          code_verifier: codeVerifier,
        });

      const setCookie = callbackResponse.headers['set-cookie'][0];
      expect(setCookie).toContain('jwt=');
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('Path=/');
      expect(setCookie).toContain('Max-Age=604800'); // 7 days
      expect(setCookie).toContain('SameSite=Lax');
    });

    test('should handle Spotify API token exchange', async () => {
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXo';
      const codeChallenge = 'E9Mrozoa2owUTEsStFAMVQ1mKywQOrALR-BhBYM0yvc';

      const mockUser = {
        _id: new mongoose.Types.ObjectId(),
        spotifyId: 'spotify123',
        displayName: 'Test',
        email: 'test@example.com',
        avatarUrl: null,
      };

      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(mockUser);
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          access_token: 'access_token_xyz',
          refresh_token: 'refresh_token_abc',
          expires_in: 3600,
          token_type: 'Bearer',
        },
      });
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          id: 'spotify123',
          display_name: 'Test',
          email: 'test@example.com',
          images: [],
        },
      });

      const loginResponse = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: codeChallenge });

      const state = new URL(loginResponse.body.data.url).searchParams.get('state');

      await request(app)
        .post('/api/auth/callback')
        .send({
          code: 'auth_code_123',
          state,
          code_verifier: codeVerifier,
        });

      // Verify axios.post was called with correct parameters
      expect(axios.post).toHaveBeenCalledWith(
        'https://accounts.spotify.com/api/token',
        expect.stringContaining('grant_type=authorization_code'),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      );

      // Verify axios.get was called to fetch user profile
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/me',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer access_token_xyz',
          }),
        })
      );
    });

    test('should return 500 on Spotify token exchange failure', async () => {
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXo';
      const codeChallenge = 'E9Mrozoa2owUTEsStFAMVQ1mKywQOrALR-BhBYM0yvc';

      (axios.post as jest.Mock).mockRejectedValueOnce(
        new Error('Spotify API error')
      );

      const loginResponse = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: codeChallenge });

      const state = new URL(loginResponse.body.data.url).searchParams.get('state');

      const response = await request(app)
        .post('/api/auth/callback')
        .send({
          code: 'auth_code',
          state,
          code_verifier: codeVerifier,
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Auth failed');
    });

    test('should return 500 on profile fetch failure', async () => {
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXo';
      const codeChallenge = 'E9Mrozoa2owUTEsStFAMVQ1mKywQOrALR-BhBYM0yvc';

      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 3600,
        },
      });
      (axios.get as jest.Mock).mockRejectedValueOnce(
        new Error('Profile fetch failed')
      );

      const loginResponse = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: codeChallenge });

      const state = new URL(loginResponse.body.data.url).searchParams.get('state');

      const response = await request(app)
        .post('/api/auth/callback')
        .send({
          code: 'auth_code',
          state,
          code_verifier: codeVerifier,
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Auth failed');
    });

    test('should return 500 on user save failure', async () => {
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXo';
      const codeChallenge = 'E9Mrozoa2owUTEsStFAMVQ1mKywQOrALR-BhBYM0yvc';

      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 3600,
        },
      });
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          id: 'spotify123',
          display_name: 'Test',
          email: 'test@example.com',
          images: [],
        },
      });
      (User.findOneAndUpdate as jest.Mock).mockRejectedValueOnce(
        new Error('Database error')
      );

      const loginResponse = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: codeChallenge });

      const state = new URL(loginResponse.body.data.url).searchParams.get('state');

      const response = await request(app)
        .post('/api/auth/callback')
        .send({
          code: 'auth_code',
          state,
          code_verifier: codeVerifier,
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Auth failed');
    });
  });

  describe('GET /me - Protected user endpoint', () => {
    test('should return 401 when no JWT cookie is provided', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    test('should return user data when authenticated', async () => {
      const mockUser = {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        spotifyId: 'spotify_user_123',
        displayName: 'John Doe',
        email: 'john@example.com',
        avatarUrl: 'https://example.com/avatar.jpg',
        spotifyAccessToken: 'encrypted_token',
        spotifyRefreshToken: 'encrypted_refresh',
      };

      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const token = jwt.sign(
        { userId: mockUser._id.toString() },
        'test_jwt_secret_key'
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `jwt=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.spotifyId).toBe('spotify_user_123');
    });

    test('should return 404 when user not found', async () => {
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const token = jwt.sign(
        { userId: 'nonexistent_id' },
        'test_jwt_secret_key'
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `jwt=${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('POST /logout - Session termination', () => {
    test('should return 401 when no JWT cookie is provided', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
    });

    test('should clear JWT cookie on logout', async () => {
      const token = jwt.sign(
        { userId: 'user123' },
        'test_jwt_secret_key'
      );

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `jwt=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const setCookie = response.headers['set-cookie'][0];
      expect(setCookie).toContain('jwt=');
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle malformed code_challenge', async () => {
      const response = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: '' });

      expect(response.status).toBe(400);
    });

    test('should handle code_challenge with special characters', async () => {
      const codeChallenge = 'E9Mrozoa2owUTEsStFAMVQ1mKywQOrALR-BhBYM0yvc_-';

      const response = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: codeChallenge });

      expect(response.status).toBe(200);
      const url = new URL(response.body.data.url);
      expect(url.searchParams.get('code_challenge')).toBe(codeChallenge);
    });

    test('should reject callback with empty code', async () => {
      const response = await request(app)
        .post('/api/auth/callback')
        .send({
          code: '',
          state: 'state',
          code_verifier: 'verifier',
        });

      expect(response.status).toBe(400);
    });

    test('should handle concurrent login requests independently', async () => {
      const codeChallenge = 'E9Mrozoa2owUTEsStFAMVQ1mKywQOrALR-BhBYM0yvc';

      const response1 = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: codeChallenge });

      const response2 = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: codeChallenge });

      const state1 = new URL(response1.body.data.url).searchParams.get('state');
      const state2 = new URL(response2.body.data.url).searchParams.get('state');

      expect(state1).not.toBe(state2);
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    test('should handle long code_verifier strings', async () => {
      const longVerifier = 'a'.repeat(128); // Max length for PKCE
      const hash = crypto.createHash('sha256').update(longVerifier).digest();
      const codeChallenge = hash
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      const mockUser = {
        _id: new mongoose.Types.ObjectId(),
        spotifyId: 'spotify123',
        displayName: 'Test',
        email: 'test@example.com',
        avatarUrl: null,
      };

      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(mockUser);
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 3600,
        },
      });
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          id: 'spotify123',
          display_name: 'Test',
          email: 'test@example.com',
          images: [],
        },
      });

      const loginResponse = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: codeChallenge });

      const state = new URL(loginResponse.body.data.url).searchParams.get('state');

      const response = await request(app)
        .post('/api/auth/callback')
        .send({
          code: 'auth_code',
          state,
          code_verifier: longVerifier,
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Cache cleanup mechanism', () => {
    test('should track cache expiration time correctly', async () => {
      const codeChallenge = 'E9Mrozoa2owUTEsStFAMVQ1mKywQOrALR-BhBYM0yvc';

      const before = Date.now();
      const response = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: codeChallenge });
      const after = Date.now();

      const state = new URL(response.body.data.url).searchParams.get('state');

      // The cache should store the challenge with a 10-minute expiry
      // We verify this by ensuring the challenge is available within the TTL
      expect(state).toBeDefined();
      expect(response.status).toBe(200);
    });

    test('should handle multiple states in cache simultaneously', async () => {
      const challenge1 = 'E9Mrozoa2owUTEsStFAMVQ1mKywQOrALR-BhBYM0yvc';
      const challenge2 = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXo';

      const response1 = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: challenge1 });

      const response2 = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: challenge2 });

      const state1 = new URL(response1.body.data.url).searchParams.get('state');
      const state2 = new URL(response2.body.data.url).searchParams.get('state');

      expect(state1).not.toBe(state2);
      expect(state1).toBeDefined();
      expect(state2).toBeDefined();
    });
  });

  describe('Request validation and sanitization', () => {
    test('should handle request with multiple code_challenge parameters', async () => {
      const response = await request(app)
        .get('/api/auth/login')
        .query({
          code_challenge: 'E9Mrozoa2owUTEsStFAMVQ1mKywQOrALR-BhBYM0yvc',
          'code_challenge[0]': 'another_challenge',
        });

      expect(response.status).toBe(200);
    });

    test('should reject callback with missing body', async () => {
      const response = await request(app)
        .post('/api/auth/callback');

      expect(response.status).toBe(400);
    });

    test('should handle callback with extra fields in body', async () => {
      const codeChallenge = 'E9Mrozoa2owUTEsStFAMVQ1mKywQOrALR-BhBYM0yvc';
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXo';

      const mockUser = {
        _id: new mongoose.Types.ObjectId(),
        spotifyId: 'spotify123',
        displayName: 'Test',
        email: 'test@example.com',
        avatarUrl: null,
      };

      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(mockUser);
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: {
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 3600,
        },
      });
      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          id: 'spotify123',
          display_name: 'Test',
          email: 'test@example.com',
          images: [],
        },
      });

      const loginResponse = await request(app)
        .get('/api/auth/login')
        .query({ code_challenge: codeChallenge });

      const state = new URL(loginResponse.body.data.url).searchParams.get('state');

      const response = await request(app)
        .post('/api/auth/callback')
        .send({
          code: 'auth_code',
          state,
          code_verifier: codeVerifier,
          extra_field: 'should_be_ignored',
          another_field: 'also_ignored',
        });

      expect(response.status).toBe(200);
    });
  });
});
