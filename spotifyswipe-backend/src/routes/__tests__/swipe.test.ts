import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import swipeRoutes from '../swipe';
import { SwipeSession } from '../../models/SwipeSession';

// Mock modules
jest.mock('../../models/SwipeSession');

// Setup environment variables
process.env.JWT_SECRET = 'test_jwt_secret_key';
process.env.NODE_ENV = 'development';

describe('Swipe Session Endpoints', () => {
	let app: Express;
	let testUserId: string;
	let testSessionId: string;
	let authToken: string;

	beforeEach(() => {
		// Clear all mocks
		jest.clearAllMocks();

		// Create fresh Express app for each test
		app = express();
		app.use(express.json());
		app.use(cookieParser());
		app.use('/api/swipe', swipeRoutes);

		// Create test user ID and session ID
		testUserId = new mongoose.Types.ObjectId().toString();
		testSessionId = new mongoose.Types.ObjectId().toString();

		// Create JWT token
		authToken = jwt.sign({ userId: testUserId }, process.env.JWT_SECRET!);
	});

	// ============== POST /api/swipe/session Tests ==============
	describe('POST /api/swipe/session - Create new session', () => {
		test('should return 401 without authentication', async () => {
			const response = await request(app)
				.post('/api/swipe/session')
				.send({});

			expect(response.status).toBe(401);
		});

		test('should create session for authenticated user', async () => {
			const mockSession = {
				_id: testSessionId,
				userId: testUserId,
				likedSongIds: [],
				dislikedSongIds: [],
				seedTrackIds: [],
				createdAt: new Date('2025-01-01'),
				save: jest.fn().mockResolvedValue(true)
			};

			(SwipeSession as jest.Mock).mockImplementation(() => mockSession);

			const response = await request(app)
				.post('/api/swipe/session')
				.set('Cookie', `jwt=${authToken}`)
				.send({});

			expect(response.status).toBe(201);
			expect(response.body.success).toBe(true);
			expect(response.body.data.session).toBeDefined();
			expect(response.body.data.session.id).toBe(testSessionId);
		});

		test('should return sessionId, userId, and timestamps', async () => {
			const createdAt = new Date('2025-01-01T10:00:00Z');
			const mockSession = {
				_id: testSessionId,
				userId: testUserId,
				likedSongIds: [],
				dislikedSongIds: [],
				seedTrackIds: [],
				createdAt,
				save: jest.fn().mockResolvedValue(true)
			};

			(SwipeSession as jest.Mock).mockImplementation(() => mockSession);

			const response = await request(app)
				.post('/api/swipe/session')
				.set('Cookie', `jwt=${authToken}`)
				.send({});

			expect(response.body.data.session).toMatchObject({
				id: testSessionId,
				likedSongIds: [],
				dislikedSongIds: [],
				seedTrackIds: [],
				createdAt: createdAt.toISOString()
			});
		});

		test('should create session with seed track IDs', async () => {
			const seedTracks = ['track1', 'track2', 'track3'];
			const mockSession = {
				_id: testSessionId,
				userId: testUserId,
				likedSongIds: [],
				dislikedSongIds: [],
				seedTrackIds,
				createdAt: new Date(),
				save: jest.fn().mockResolvedValue(true)
			};

			(SwipeSession as jest.Mock).mockImplementation(() => mockSession);

			const response = await request(app)
				.post('/api/swipe/session')
				.set('Cookie', `jwt=${authToken}`)
				.send({ seedTrackIds });

			expect(response.status).toBe(201);
			expect(response.body.data.session.seedTrackIds).toEqual(seedTracks);
		});

		test('should create session without seed track IDs', async () => {
			const mockSession = {
				_id: testSessionId,
				userId: testUserId,
				likedSongIds: [],
				dislikedSongIds: [],
				seedTrackIds: [],
				createdAt: new Date(),
				save: jest.fn().mockResolvedValue(true)
			};

			(SwipeSession as jest.Mock).mockImplementation(() => mockSession);

			const response = await request(app)
				.post('/api/swipe/session')
				.set('Cookie', `jwt=${authToken}`)
				.send({});

			expect(response.status).toBe(201);
			expect(response.body.data.session.seedTrackIds).toEqual([]);
		});

		test('should return 400 for invalid seedTrackIds format', async () => {
			const response = await request(app)
				.post('/api/swipe/session')
				.set('Cookie', `jwt=${authToken}`)
				.send({ seedTrackIds: 'not_an_array' });

			expect(response.status).toBe(400);
			expect(response.body.error).toContain('array');
		});

		test('should assign userId from authenticated user', async () => {
			let capturedData: any;
			const mockSession = {
				_id: testSessionId,
				userId: testUserId,
				likedSongIds: [],
				dislikedSongIds: [],
				seedTrackIds: [],
				createdAt: new Date(),
				save: jest.fn().mockResolvedValue(true)
			};

			(SwipeSession as jest.Mock).mockImplementation((data) => {
				capturedData = data;
				return mockSession;
			});

			await request(app)
				.post('/api/swipe/session')
				.set('Cookie', `jwt=${authToken}`)
				.send({});

			expect(capturedData.userId).toBe(testUserId);
		});

		test('should initialize with empty liked and disliked arrays', async () => {
			const mockSession = {
				_id: testSessionId,
				userId: testUserId,
				likedSongIds: [],
				dislikedSongIds: [],
				seedTrackIds: [],
				createdAt: new Date(),
				save: jest.fn().mockResolvedValue(true)
			};

			(SwipeSession as jest.Mock).mockImplementation(() => mockSession);

			const response = await request(app)
				.post('/api/swipe/session')
				.set('Cookie', `jwt=${authToken}`)
				.send({});

			expect(response.body.data.session.likedSongIds).toEqual([]);
			expect(response.body.data.session.dislikedSongIds).toEqual([]);
		});
	});

	// ============== PATCH /api/swipe/session/:id Tests ==============
	describe('PATCH /api/swipe/session/:id - Record swipe action', () => {
		test('should return 401 without authentication', async () => {
			const response = await request(app)
				.patch(`/api/swipe/session/${testSessionId}`)
				.send({ action: 'like', songId: 'track1' });

			expect(response.status).toBe(401);
		});

		test('should return 404 for invalid ObjectId', async () => {
			const response = await request(app)
				.patch('/api/swipe/session/invalid-id')
				.set('Cookie', `jwt=${authToken}`)
				.send({ action: 'like', songId: 'track1' });

			expect(response.status).toBe(404);
			expect(response.body.error).toContain('Session not found');
		});

		test('should return 404 for non-existent session', async () => {
			(SwipeSession.findById as jest.Mock).mockResolvedValue(null);

			const response = await request(app)
				.patch(`/api/swipe/session/${testSessionId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ action: 'like', songId: 'track1' });

			expect(response.status).toBe(404);
			expect(response.body.error).toContain('Session not found');
		});

		test('should return 403 if user is not session owner', async () => {
			const otherUserId = new mongoose.Types.ObjectId().toString();
			const mockSession = {
				_id: testSessionId,
				userId: new mongoose.Types.ObjectId(otherUserId),
				likedSongIds: [],
				dislikedSongIds: [],
				toString: function() { return this._id.toString(); }
			};

			(SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

			const response = await request(app)
				.patch(`/api/swipe/session/${testSessionId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ action: 'like', songId: 'track1' });

			expect(response.status).toBe(403);
			expect(response.body.error).toContain('Not authorized');
		});

		test('should return 400 for invalid action type', async () => {
			const mockSession = {
				_id: testSessionId,
				userId: new mongoose.Types.ObjectId(testUserId),
				likedSongIds: [],
				dislikedSongIds: [],
				toString: function() { return this._id.toString(); }
			};

			(SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

			const response = await request(app)
				.patch(`/api/swipe/session/${testSessionId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ action: 'invalid', songId: 'track1' });

			expect(response.status).toBe(400);
			expect(response.body.error).toContain('like');
			expect(response.body.error).toContain('dislike');
		});

		test('should return 400 for missing action', async () => {
			const mockSession = {
				_id: testSessionId,
				userId: new mongoose.Types.ObjectId(testUserId),
				likedSongIds: [],
				dislikedSongIds: [],
				toString: function() { return this._id.toString(); }
			};

			(SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

			const response = await request(app)
				.patch(`/api/swipe/session/${testSessionId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ songId: 'track1' });

			expect(response.status).toBe(400);
		});

		test('should return 400 for missing songId', async () => {
			const mockSession = {
				_id: testSessionId,
				userId: new mongoose.Types.ObjectId(testUserId),
				likedSongIds: [],
				dislikedSongIds: [],
				toString: function() { return this._id.toString(); }
			};

			(SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

			const response = await request(app)
				.patch(`/api/swipe/session/${testSessionId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ action: 'like' });

			expect(response.status).toBe(400);
			expect(response.body.error).toContain('Song ID required');
		});

		test('should record like action and add to likedSongIds', async () => {
			const mockSession = {
				_id: testSessionId,
				userId: new mongoose.Types.ObjectId(testUserId),
				likedSongIds: [],
				dislikedSongIds: [],
				seedTrackIds: [],
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

			const response = await request(app)
				.patch(`/api/swipe/session/${testSessionId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ action: 'like', songId: 'track1' });

			expect(response.status).toBe(200);
			expect(mockSession.likedSongIds).toContain('track1');
			expect(mockSession.save).toHaveBeenCalled();
		});

		test('should record dislike action and add to dislikedSongIds', async () => {
			const mockSession = {
				_id: testSessionId,
				userId: new mongoose.Types.ObjectId(testUserId),
				likedSongIds: [],
				dislikedSongIds: [],
				seedTrackIds: [],
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

			const response = await request(app)
				.patch(`/api/swipe/session/${testSessionId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ action: 'dislike', songId: 'track1' });

			expect(response.status).toBe(200);
			expect(mockSession.dislikedSongIds).toContain('track1');
			expect(mockSession.save).toHaveBeenCalled();
		});

		test('should prevent duplicate likes - cannot like same song twice', async () => {
			const mockSession = {
				_id: testSessionId,
				userId: new mongoose.Types.ObjectId(testUserId),
				likedSongIds: ['track1'],
				dislikedSongIds: [],
				seedTrackIds: [],
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

			const response = await request(app)
				.patch(`/api/swipe/session/${testSessionId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ action: 'like', songId: 'track1' });

			expect(response.status).toBe(200);
			// Should not have duplicates
			expect(mockSession.likedSongIds.filter((id: string) => id === 'track1')).toHaveLength(1);
		});

		test('should prevent duplicate dislikes - cannot dislike same song twice', async () => {
			const mockSession = {
				_id: testSessionId,
				userId: new mongoose.Types.ObjectId(testUserId),
				likedSongIds: [],
				dislikedSongIds: ['track1'],
				seedTrackIds: [],
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

			const response = await request(app)
				.patch(`/api/swipe/session/${testSessionId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ action: 'dislike', songId: 'track1' });

			expect(response.status).toBe(200);
			// Should not have duplicates
			expect(mockSession.dislikedSongIds.filter((id: string) => id === 'track1')).toHaveLength(1);
		});

		test('should move song from disliked to liked when changing swipe', async () => {
			const mockSession = {
				_id: testSessionId,
				userId: new mongoose.Types.ObjectId(testUserId),
				likedSongIds: [],
				dislikedSongIds: ['track1'],
				seedTrackIds: [],
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

			await request(app)
				.patch(`/api/swipe/session/${testSessionId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ action: 'like', songId: 'track1' });

			expect(mockSession.dislikedSongIds).not.toContain('track1');
			expect(mockSession.likedSongIds).toContain('track1');
		});

		test('should move song from liked to disliked when changing swipe', async () => {
			const mockSession = {
				_id: testSessionId,
				userId: new mongoose.Types.ObjectId(testUserId),
				likedSongIds: ['track1'],
				dislikedSongIds: [],
				seedTrackIds: [],
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

			await request(app)
				.patch(`/api/swipe/session/${testSessionId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ action: 'dislike', songId: 'track1' });

			expect(mockSession.likedSongIds).not.toContain('track1');
			expect(mockSession.dislikedSongIds).toContain('track1');
		});

		test('should return updated session data in response', async () => {
			const mockSession = {
				_id: testSessionId,
				userId: new mongoose.Types.ObjectId(testUserId),
				likedSongIds: [],
				dislikedSongIds: [],
				seedTrackIds: ['seed1'],
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

			const response = await request(app)
				.patch(`/api/swipe/session/${testSessionId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ action: 'like', songId: 'track1' });

			expect(response.body.data.session).toMatchObject({
				id: testSessionId,
				likedSongIds: ['track1'],
				dislikedSongIds: [],
				seedTrackIds: ['seed1']
			});
		});

		test('should handle multiple swipes on different songs', async () => {
			const mockSession = {
				_id: testSessionId,
				userId: new mongoose.Types.ObjectId(testUserId),
				likedSongIds: ['track1', 'track3'],
				dislikedSongIds: ['track2'],
				seedTrackIds: [],
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

			// Like another song
			await request(app)
				.patch(`/api/swipe/session/${testSessionId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ action: 'like', songId: 'track4' });

			expect(mockSession.likedSongIds).toContain('track1');
			expect(mockSession.likedSongIds).toContain('track3');
			expect(mockSession.likedSongIds).toContain('track4');
			expect(mockSession.dislikedSongIds).toContain('track2');
		});
	});

	// ============== GET /api/swipe/session/:id Tests ==============
	describe('GET /api/swipe/session/:id - Get session details', () => {
		test('should return 401 without authentication', async () => {
			const response = await request(app)
				.get(`/api/swipe/session/${testSessionId}`);

			expect(response.status).toBe(401);
		});

		test('should return 404 for invalid ObjectId', async () => {
			const response = await request(app)
				.get('/api/swipe/session/invalid-id')
				.set('Cookie', `jwt=${authToken}`);

			expect(response.status).toBe(404);
		});

		test('should return 404 for non-existent session', async () => {
			(SwipeSession.findById as jest.Mock).mockResolvedValue(null);

			const response = await request(app)
				.get(`/api/swipe/session/${testSessionId}`)
				.set('Cookie', `jwt=${authToken}`);

			expect(response.status).toBe(404);
		});

		test('should return 403 if user is not session owner', async () => {
			const otherUserId = new mongoose.Types.ObjectId().toString();
			const mockSession = {
				_id: testSessionId,
				userId: new mongoose.Types.ObjectId(otherUserId),
				likedSongIds: [],
				dislikedSongIds: [],
				toString: function() { return this._id.toString(); }
			};

			(SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

			const response = await request(app)
				.get(`/api/swipe/session/${testSessionId}`)
				.set('Cookie', `jwt=${authToken}`);

			expect(response.status).toBe(403);
		});

		test('should return session details with all data', async () => {
			const createdAt = new Date('2025-01-01T10:00:00Z');
			const mockSession = {
				_id: testSessionId,
				userId: new mongoose.Types.ObjectId(testUserId),
				likedSongIds: ['track1', 'track2'],
				dislikedSongIds: ['track3'],
				seedTrackIds: ['seed1'],
				createdAt,
				completedAt: null,
				toString: function() { return this._id.toString(); }
			};

			(SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

			const response = await request(app)
				.get(`/api/swipe/session/${testSessionId}`)
				.set('Cookie', `jwt=${authToken}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data.session).toMatchObject({
				id: testSessionId,
				likedSongIds: ['track1', 'track2'],
				dislikedSongIds: ['track3'],
				seedTrackIds: ['seed1'],
				createdAt: createdAt.toISOString(),
				completedAt: null
			});
		});
	});

	// ============== POST /api/swipe/session/:id/complete Tests ==============
	describe('POST /api/swipe/session/:id/complete - Complete session', () => {
		test('should return 401 without authentication', async () => {
			const response = await request(app)
				.post(`/api/swipe/session/${testSessionId}/complete`)
				.send({});

			expect(response.status).toBe(401);
		});

		test('should return 404 for invalid ObjectId', async () => {
			const response = await request(app)
				.post('/api/swipe/session/invalid-id/complete')
				.set('Cookie', `jwt=${authToken}`)
				.send({});

			expect(response.status).toBe(404);
		});

		test('should return 404 for non-existent session', async () => {
			(SwipeSession.findById as jest.Mock).mockResolvedValue(null);

			const response = await request(app)
				.post(`/api/swipe/session/${testSessionId}/complete`)
				.set('Cookie', `jwt=${authToken}`)
				.send({});

			expect(response.status).toBe(404);
		});

		test('should return 403 if user is not session owner', async () => {
			const otherUserId = new mongoose.Types.ObjectId().toString();
			const mockSession = {
				_id: testSessionId,
				userId: new mongoose.Types.ObjectId(otherUserId),
				likedSongIds: [],
				toString: function() { return this._id.toString(); }
			};

			(SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

			const response = await request(app)
				.post(`/api/swipe/session/${testSessionId}/complete`)
				.set('Cookie', `jwt=${authToken}`)
				.send({});

			expect(response.status).toBe(403);
		});

		test('should mark session as completed', async () => {
			const mockSession = {
				_id: testSessionId,
				userId: new mongoose.Types.ObjectId(testUserId),
				likedSongIds: ['track1', 'track2'],
				dislikedSongIds: [],
				completedAt: null,
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

			const response = await request(app)
				.post(`/api/swipe/session/${testSessionId}/complete`)
				.set('Cookie', `jwt=${authToken}`)
				.send({});

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(mockSession.completedAt).not.toBeNull();
			expect(mockSession.save).toHaveBeenCalled();
		});

		test('should set completedAt timestamp', async () => {
			const mockSession = {
				_id: testSessionId,
				userId: new mongoose.Types.ObjectId(testUserId),
				likedSongIds: ['track1'],
				completedAt: null,
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

			const beforeTime = Date.now();
			await request(app)
				.post(`/api/swipe/session/${testSessionId}/complete`)
				.set('Cookie', `jwt=${authToken}`)
				.send({});
			const afterTime = Date.now();

			expect(mockSession.completedAt).not.toBeNull();
			expect(mockSession.completedAt!.getTime()).toBeGreaterThanOrEqual(beforeTime);
			expect(mockSession.completedAt!.getTime()).toBeLessThanOrEqual(afterTime);
		});

		test('should return completed session data in response', async () => {
			const mockSession = {
				_id: testSessionId,
				userId: new mongoose.Types.ObjectId(testUserId),
				likedSongIds: ['track1', 'track2', 'track3'],
				dislikedSongIds: [],
				completedAt: null,
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

			const response = await request(app)
				.post(`/api/swipe/session/${testSessionId}/complete`)
				.set('Cookie', `jwt=${authToken}`)
				.send({});

			expect(response.body.data.session).toMatchObject({
				id: testSessionId,
				likedSongIds: ['track1', 'track2', 'track3']
			});
			expect(response.body.data.session.completedAt).toBeDefined();
		});

		test('should preserve liked songs when completing session', async () => {
			const likedSongs = ['track1', 'track2', 'track3', 'track4'];
			const mockSession = {
				_id: testSessionId,
				userId: new mongoose.Types.ObjectId(testUserId),
				likedSongIds: likedSongs,
				dislikedSongIds: ['track5'],
				completedAt: null,
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

			const response = await request(app)
				.post(`/api/swipe/session/${testSessionId}/complete`)
				.set('Cookie', `jwt=${authToken}`)
				.send({});

			expect(response.body.data.session.likedSongIds).toEqual(likedSongs);
		});

		test('should allow completing session with no liked songs', async () => {
			const mockSession = {
				_id: testSessionId,
				userId: new mongoose.Types.ObjectId(testUserId),
				likedSongIds: [],
				dislikedSongIds: ['track1', 'track2'],
				completedAt: null,
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

			const response = await request(app)
				.post(`/api/swipe/session/${testSessionId}/complete`)
				.set('Cookie', `jwt=${authToken}`)
				.send({});

			expect(response.status).toBe(200);
			expect(response.body.data.session.likedSongIds).toEqual([]);
		});

		test('should allow completing session with no disliked songs', async () => {
			const mockSession = {
				_id: testSessionId,
				userId: new mongoose.Types.ObjectId(testUserId),
				likedSongIds: ['track1', 'track2'],
				dislikedSongIds: [],
				completedAt: null,
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

			const response = await request(app)
				.post(`/api/swipe/session/${testSessionId}/complete`)
				.set('Cookie', `jwt=${authToken}`)
				.send({});

			expect(response.status).toBe(200);
		});

		test('should handle completing an empty session', async () => {
			const mockSession = {
				_id: testSessionId,
				userId: new mongoose.Types.ObjectId(testUserId),
				likedSongIds: [],
				dislikedSongIds: [],
				seedTrackIds: [],
				completedAt: null,
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

			const response = await request(app)
				.post(`/api/swipe/session/${testSessionId}/complete`)
				.set('Cookie', `jwt=${authToken}`)
				.send({});

			expect(response.status).toBe(200);
			expect(mockSession.completedAt).not.toBeNull();
		});
	});

	// ============== Integration Tests ==============
	describe('Swipe Session Integration Tests', () => {
		test('should complete full session lifecycle', async () => {
			// Create session
			const createdSession = {
				_id: testSessionId,
				userId: testUserId,
				likedSongIds: [],
				dislikedSongIds: [],
				seedTrackIds: ['seed1'],
				createdAt: new Date(),
				completedAt: null,
				save: jest.fn().mockResolvedValue(true)
			};

			(SwipeSession as jest.Mock).mockImplementation(() => createdSession);

			const createResponse = await request(app)
				.post('/api/swipe/session')
				.set('Cookie', `jwt=${authToken}`)
				.send({ seedTrackIds: ['seed1'] });

			expect(createResponse.status).toBe(201);

			// Record like
			(SwipeSession.findById as jest.Mock).mockResolvedValue(createdSession);
			const likeResponse = await request(app)
				.patch(`/api/swipe/session/${testSessionId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ action: 'like', songId: 'track1' });

			expect(likeResponse.status).toBe(200);
			expect(createdSession.likedSongIds).toContain('track1');

			// Record dislike
			const dislikeResponse = await request(app)
				.patch(`/api/swipe/session/${testSessionId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ action: 'dislike', songId: 'track2' });

			expect(dislikeResponse.status).toBe(200);
			expect(createdSession.dislikedSongIds).toContain('track2');

			// Complete session
			const completeResponse = await request(app)
				.post(`/api/swipe/session/${testSessionId}/complete`)
				.set('Cookie', `jwt=${authToken}`)
				.send({});

			expect(completeResponse.status).toBe(200);
			expect(createdSession.completedAt).not.toBeNull();
		});

		test('should track multiple swipes before completing', async () => {
			const mockSession = {
				_id: testSessionId,
				userId: new mongoose.Types.ObjectId(testUserId),
				likedSongIds: [],
				dislikedSongIds: [],
				completedAt: null,
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(SwipeSession.findById as jest.Mock).mockResolvedValue(mockSession);

			// Multiple swipes
			const songSequence = [
				{ action: 'like', songId: 'track1' },
				{ action: 'dislike', songId: 'track2' },
				{ action: 'like', songId: 'track3' },
				{ action: 'like', songId: 'track4' },
				{ action: 'dislike', songId: 'track5' }
			];

			for (const swipe of songSequence) {
				const response = await request(app)
					.patch(`/api/swipe/session/${testSessionId}`)
					.set('Cookie', `jwt=${authToken}`)
					.send(swipe);

				expect(response.status).toBe(200);
			}

			expect(mockSession.likedSongIds).toEqual(['track1', 'track3', 'track4']);
			expect(mockSession.dislikedSongIds).toEqual(['track2', 'track5']);

			// Complete session
			const completeResponse = await request(app)
				.post(`/api/swipe/session/${testSessionId}/complete`)
				.set('Cookie', `jwt=${authToken}`)
				.send({});

			expect(completeResponse.status).toBe(200);
			expect(mockSession.completedAt).not.toBeNull();
		});
	});
});
