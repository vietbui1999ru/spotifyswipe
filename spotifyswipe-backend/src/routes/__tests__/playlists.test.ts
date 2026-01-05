import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import playlistRoutes from '../playlists';
import { Playlist } from '../../models/Playlist';
import { SpotifyService } from '../../services/SpotifyService';

// Mock modules
jest.mock('../../models/Playlist');
jest.mock('../../services/SpotifyService');

// Setup environment variables
process.env.JWT_SECRET = 'test_jwt_secret_key';
process.env.NODE_ENV = 'development';

describe('Playlist CRUD Endpoints', () => {
	let app: Express;
	let testUserId: string;
	let testPlaylistId: string;
	let authToken: string;

	beforeEach(() => {
		// Clear all mocks
		jest.clearAllMocks();

		// Create fresh Express app for each test
		app = express();
		app.use(express.json());
		app.use(cookieParser());
		app.use('/api/playlists', playlistRoutes);

		// Create test user ID and auth token
		testUserId = new mongoose.Types.ObjectId().toString();
		testPlaylistId = new mongoose.Types.ObjectId().toString();

		// Create JWT token
		authToken = jwt.sign({ userId: testUserId }, process.env.JWT_SECRET!);
	});

	// ============== GET /api/playlists Tests ==============
	describe('GET /api/playlists - List user playlists', () => {
		test('should return 401 without authentication', async () => {
			const response = await request(app)
				.get('/api/playlists');

			expect(response.status).toBe(401);
		});

		test('should return empty array for new user with no playlists', async () => {
			(Playlist.find as jest.Mock).mockResolvedValue([]);

			const response = await request(app)
				.get('/api/playlists')
				.set('Cookie', `jwt=${authToken}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data.playlists).toEqual([]);
			expect(Playlist.find).toHaveBeenCalledWith({ ownerId: testUserId });
		});

		test('should return user playlists with metadata', async () => {
			const mockPlaylists = [
				{
					_id: testPlaylistId,
					name: 'My Favorites',
					description: 'Favorite songs',
					songIds: ['track1', 'track2', 'track3'],
					createdAt: new Date('2025-01-01'),
					updatedAt: new Date('2025-01-02'),
					toObject: function() { return this; }
				},
				{
					_id: new mongoose.Types.ObjectId().toString(),
					name: 'Workout Hits',
					description: 'High energy',
					songIds: ['track4', 'track5'],
					createdAt: new Date('2025-01-03'),
					updatedAt: new Date('2025-01-04'),
					toObject: function() { return this; }
				}
			];

			const selectMock = jest.fn().mockResolvedValue(mockPlaylists);
			(Playlist.find as jest.Mock).mockReturnValue({ select: selectMock });

			const response = await request(app)
				.get('/api/playlists')
				.set('Cookie', `jwt=${authToken}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data.playlists).toHaveLength(2);
			expect(response.body.data.playlists[0]).toMatchObject({
				id: testPlaylistId,
				name: 'My Favorites',
				description: 'Favorite songs',
				songCount: 3
			});
			expect(response.body.data.playlists[1]).toMatchObject({
				id: mockPlaylists[1]._id,
				name: 'Workout Hits',
				songCount: 2
			});
		});

		test('should only return playlists owned by authenticated user', async () => {
			const otherUserId = new mongoose.Types.ObjectId().toString();
			(Playlist.find as jest.Mock).mockReturnValue({
				select: jest.fn().mockResolvedValue([])
			});

			await request(app)
				.get('/api/playlists')
				.set('Cookie', `jwt=${authToken}`);

			expect(Playlist.find).toHaveBeenCalledWith({ ownerId: testUserId });
			expect(Playlist.find).not.toHaveBeenCalledWith({ ownerId: otherUserId });
		});

		test('should handle database errors gracefully', async () => {
			(Playlist.find as jest.Mock).mockReturnValue({
				select: jest.fn().mockRejectedValue(new Error('Database error'))
			});

			const response = await request(app)
				.get('/api/playlists')
				.set('Cookie', `jwt=${authToken}`);

			expect(response.status).toBe(500);
			expect(response.body.success).toBe(false);
			expect(response.body.error).toContain('Failed to fetch playlists');
		});
	});

	// ============== POST /api/playlists Tests ==============
	describe('POST /api/playlists - Create new playlist', () => {
		test('should return 401 without authentication', async () => {
			const response = await request(app)
				.post('/api/playlists')
				.send({ name: 'New Playlist' });

			expect(response.status).toBe(401);
		});

		test('should create playlist with valid name and description', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				name: 'My New Playlist',
				description: 'Test description',
				songIds: [],
				createdAt: new Date('2025-01-01'),
				save: jest.fn().mockResolvedValue(true)
			};

			(Playlist as jest.Mock).mockImplementation(() => mockPlaylist);

			const response = await request(app)
				.post('/api/playlists')
				.set('Cookie', `jwt=${authToken}`)
				.send({
					name: 'My New Playlist',
					description: 'Test description'
				});

			expect(response.status).toBe(201);
			expect(response.body.success).toBe(true);
			expect(response.body.data.playlist).toMatchObject({
				id: testPlaylistId,
				name: 'My New Playlist',
				description: 'Test description',
				songIds: []
			});
		});

		test('should create playlist with only name', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				name: 'Simple Playlist',
				description: '',
				songIds: [],
				createdAt: new Date('2025-01-01'),
				save: jest.fn().mockResolvedValue(true)
			};

			(Playlist as jest.Mock).mockImplementation(() => mockPlaylist);

			const response = await request(app)
				.post('/api/playlists')
				.set('Cookie', `jwt=${authToken}`)
				.send({ name: 'Simple Playlist' });

			expect(response.status).toBe(201);
			expect(response.body.data.playlist.name).toBe('Simple Playlist');
		});

		test('should return 400 for missing name', async () => {
			const response = await request(app)
				.post('/api/playlists')
				.set('Cookie', `jwt=${authToken}`)
				.send({ description: 'No name provided' });

			expect(response.status).toBe(400);
			expect(response.body.success).toBe(false);
			expect(response.body.error).toContain('name is required');
		});

		test('should return 400 for empty name', async () => {
			const response = await request(app)
				.post('/api/playlists')
				.set('Cookie', `jwt=${authToken}`)
				.send({ name: '   ', description: 'Empty name' });

			expect(response.status).toBe(400);
			expect(response.body.error).toContain('name is required');
		});

		test('should return 400 for name exceeding 100 characters', async () => {
			const longName = 'a'.repeat(101);
			const response = await request(app)
				.post('/api/playlists')
				.set('Cookie', `jwt=${authToken}`)
				.send({ name: longName });

			expect(response.status).toBe(400);
			expect(response.body.error).toContain('1-100 characters');
		});

		test('should return 400 for description exceeding 500 characters', async () => {
			const longDescription = 'a'.repeat(501);
			const response = await request(app)
				.post('/api/playlists')
				.set('Cookie', `jwt=${authToken}`)
				.send({
					name: 'Valid Name',
					description: longDescription
				});

			expect(response.status).toBe(400);
			expect(response.body.error).toContain('max 500 characters');
		});

		test('should trim whitespace from name', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				name: 'Trimmed Name',
				description: '',
				songIds: [],
				createdAt: new Date(),
				save: jest.fn().mockResolvedValue(true)
			};

			(Playlist as jest.Mock).mockImplementation((data) => {
				mockPlaylist.name = data.name;
				return mockPlaylist;
			});

			await request(app)
				.post('/api/playlists')
				.set('Cookie', `jwt=${authToken}`)
				.send({ name: '  Trimmed Name  ' });

			expect(mockPlaylist.name).toBe('Trimmed Name');
		});

		test('should create playlist with empty songs array', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				name: 'New Playlist',
				description: '',
				songIds: [],
				createdAt: new Date(),
				save: jest.fn().mockResolvedValue(true)
			};

			(Playlist as jest.Mock).mockImplementation(() => mockPlaylist);

			const response = await request(app)
				.post('/api/playlists')
				.set('Cookie', `jwt=${authToken}`)
				.send({ name: 'New Playlist' });

			expect(response.body.data.playlist.songIds).toEqual([]);
		});

		test('should assign ownerId from authenticated user', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				name: 'New Playlist',
				description: '',
				songIds: [],
				createdAt: new Date(),
				ownerId: testUserId,
				save: jest.fn().mockResolvedValue(true)
			};

			let capturedData: any;
			(Playlist as jest.Mock).mockImplementation((data) => {
				capturedData = data;
				return mockPlaylist;
			});

			await request(app)
				.post('/api/playlists')
				.set('Cookie', `jwt=${authToken}`)
				.send({ name: 'New Playlist' });

			expect(capturedData.ownerId).toBe(testUserId);
		});
	});

	// ============== GET /api/playlists/:id Tests ==============
	describe('GET /api/playlists/:id - Get playlist detail', () => {
		test('should return 401 without authentication', async () => {
			const response = await request(app)
				.get(`/api/playlists/${testPlaylistId}`);

			expect(response.status).toBe(401);
		});

		test('should return 404 for invalid ObjectId', async () => {
			const response = await request(app)
				.get('/api/playlists/invalid-id')
				.set('Cookie', `jwt=${authToken}`);

			expect(response.status).toBe(404);
			expect(response.body.error).toContain('not found');
		});

		test('should return 404 for non-existent playlist', async () => {
			(Playlist.findById as jest.Mock).mockResolvedValue(null);

			const response = await request(app)
				.get(`/api/playlists/${testPlaylistId}`)
				.set('Cookie', `jwt=${authToken}`);

			expect(response.status).toBe(404);
			expect(response.body.error).toContain('not found');
		});

		test('should return 403 if user is not playlist owner', async () => {
			const otherUserId = new mongoose.Types.ObjectId().toString();
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(otherUserId),
				name: 'Other User Playlist',
				description: 'Not yours',
				songIds: [],
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			const response = await request(app)
				.get(`/api/playlists/${testPlaylistId}`)
				.set('Cookie', `jwt=${authToken}`);

			expect(response.status).toBe(403);
			expect(response.body.error).toContain('Not authorized');
		});

		test('should return playlist with song details from Spotify', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'My Playlist',
				description: 'Test',
				songIds: ['track1', 'track2'],
				createdAt: new Date('2025-01-01'),
				updatedAt: new Date('2025-01-02'),
				toString: function() { return this._id.toString(); }
			};

			const mockTracks = [
				{
					id: 'track1',
					name: 'Song 1',
					artists: [{ id: 'artist1', name: 'Artist 1' }],
					album: { id: 'album1', name: 'Album 1' },
					previewUrl: 'https://preview1.url'
				},
				{
					id: 'track2',
					name: 'Song 2',
					artists: [{ id: 'artist2', name: 'Artist 2' }],
					album: { id: 'album2', name: 'Album 2' },
					previewUrl: 'https://preview2.url'
				}
			];

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);
			(SpotifyService.getTracks as jest.Mock).mockResolvedValue(mockTracks);

			const response = await request(app)
				.get(`/api/playlists/${testPlaylistId}`)
				.set('Cookie', `jwt=${authToken}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data.playlist.songs).toHaveLength(2);
			expect(response.body.data.playlist.songs[0]).toMatchObject({
				id: 'track1',
				name: 'Song 1'
			});
			expect(SpotifyService.getTracks).toHaveBeenCalledWith(testUserId, ['track1', 'track2']);
		});

		test('should return empty songs array for new playlist without songs', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'Empty Playlist',
				description: '',
				songIds: [],
				createdAt: new Date(),
				updatedAt: new Date(),
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			const response = await request(app)
				.get(`/api/playlists/${testPlaylistId}`)
				.set('Cookie', `jwt=${authToken}`);

			expect(response.status).toBe(200);
			expect(response.body.data.playlist.songs).toEqual([]);
			expect(SpotifyService.getTracks).not.toHaveBeenCalled();
		});

		test('should handle Spotify API errors gracefully', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'My Playlist',
				description: 'Test',
				songIds: ['track1', 'track2'],
				createdAt: new Date(),
				updatedAt: new Date(),
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);
			(SpotifyService.getTracks as jest.Mock).mockRejectedValue(new Error('Spotify error'));

			const response = await request(app)
				.get(`/api/playlists/${testPlaylistId}`)
				.set('Cookie', `jwt=${authToken}`);

			expect(response.status).toBe(200);
			expect(response.body.data.playlist.songs).toEqual([]);
		});

		test('should include playlist metadata in response', async () => {
			const createdAt = new Date('2025-01-01');
			const updatedAt = new Date('2025-01-02');
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'My Playlist',
				description: 'Description',
				songIds: [],
				createdAt,
				updatedAt,
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			const response = await request(app)
				.get(`/api/playlists/${testPlaylistId}`)
				.set('Cookie', `jwt=${authToken}`);

			expect(response.body.data.playlist).toMatchObject({
				id: testPlaylistId,
				name: 'My Playlist',
				description: 'Description',
				createdAt: createdAt.toISOString(),
				updatedAt: updatedAt.toISOString()
			});
		});
	});

	// ============== PATCH /api/playlists/:id Tests ==============
	describe('PATCH /api/playlists/:id - Update playlist', () => {
		test('should return 401 without authentication', async () => {
			const response = await request(app)
				.patch(`/api/playlists/${testPlaylistId}`)
				.send({ name: 'Updated Name' });

			expect(response.status).toBe(401);
		});

		test('should return 404 for invalid ObjectId', async () => {
			const response = await request(app)
				.patch('/api/playlists/invalid-id')
				.set('Cookie', `jwt=${authToken}`)
				.send({ name: 'Updated Name' });

			expect(response.status).toBe(404);
		});

		test('should return 404 for non-existent playlist', async () => {
			(Playlist.findById as jest.Mock).mockResolvedValue(null);

			const response = await request(app)
				.patch(`/api/playlists/${testPlaylistId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ name: 'Updated Name' });

			expect(response.status).toBe(404);
		});

		test('should return 403 if user is not playlist owner', async () => {
			const otherUserId = new mongoose.Types.ObjectId().toString();
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(otherUserId),
				name: 'Other User Playlist',
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			const response = await request(app)
				.patch(`/api/playlists/${testPlaylistId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ name: 'Updated Name' });

			expect(response.status).toBe(403);
		});

		test('should successfully update playlist name', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'Old Name',
				description: 'Original description',
				songIds: ['track1'],
				createdAt: new Date(),
				updatedAt: new Date(),
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			const response = await request(app)
				.patch(`/api/playlists/${testPlaylistId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ name: 'New Name' });

			expect(response.status).toBe(200);
			expect(mockPlaylist.name).toBe('New Name');
			expect(mockPlaylist.save).toHaveBeenCalled();
		});

		test('should successfully update playlist description', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'Name',
				description: 'Old description',
				songIds: [],
				createdAt: new Date(),
				updatedAt: new Date(),
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			const response = await request(app)
				.patch(`/api/playlists/${testPlaylistId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ description: 'New description' });

			expect(response.status).toBe(200);
			expect(mockPlaylist.description).toBe('New description');
		});

		test('should update both name and description together', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'Old Name',
				description: 'Old description',
				songIds: [],
				createdAt: new Date(),
				updatedAt: new Date(),
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			const response = await request(app)
				.patch(`/api/playlists/${testPlaylistId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ name: 'New Name', description: 'New description' });

			expect(response.status).toBe(200);
			expect(mockPlaylist.name).toBe('New Name');
			expect(mockPlaylist.description).toBe('New description');
		});

		test('should return 400 for empty name', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'Name',
				description: '',
				songIds: [],
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			const response = await request(app)
				.patch(`/api/playlists/${testPlaylistId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ name: '   ' });

			expect(response.status).toBe(400);
			expect(response.body.error).toContain('non-empty string');
		});

		test('should return 400 for name exceeding 100 characters', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'Name',
				description: '',
				songIds: [],
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			const response = await request(app)
				.patch(`/api/playlists/${testPlaylistId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ name: 'a'.repeat(101) });

			expect(response.status).toBe(400);
			expect(response.body.error).toContain('1-100 characters');
		});

		test('should return 400 for description exceeding 500 characters', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'Name',
				description: '',
				songIds: [],
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			const response = await request(app)
				.patch(`/api/playlists/${testPlaylistId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ description: 'a'.repeat(501) });

			expect(response.status).toBe(400);
			expect(response.body.error).toContain('max 500 characters');
		});

		test('should update the updatedAt timestamp', async () => {
			const oldDate = new Date('2025-01-01');
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'Name',
				description: '',
				songIds: [],
				createdAt: oldDate,
				updatedAt: oldDate,
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			await request(app)
				.patch(`/api/playlists/${testPlaylistId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ name: 'Updated' });

			expect(mockPlaylist.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
		});

		test('should include song count in response', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'Old Name',
				description: '',
				songIds: ['track1', 'track2', 'track3'],
				createdAt: new Date(),
				updatedAt: new Date(),
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			const response = await request(app)
				.patch(`/api/playlists/${testPlaylistId}`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ name: 'New Name' });

			expect(response.body.data.playlist.songCount).toBe(3);
		});
	});

	// ============== DELETE /api/playlists/:id Tests ==============
	describe('DELETE /api/playlists/:id - Delete playlist', () => {
		test('should return 401 without authentication', async () => {
			const response = await request(app)
				.delete(`/api/playlists/${testPlaylistId}`);

			expect(response.status).toBe(401);
		});

		test('should return 404 for invalid ObjectId', async () => {
			const response = await request(app)
				.delete('/api/playlists/invalid-id')
				.set('Cookie', `jwt=${authToken}`);

			expect(response.status).toBe(404);
		});

		test('should return 404 for non-existent playlist', async () => {
			(Playlist.findById as jest.Mock).mockResolvedValue(null);

			const response = await request(app)
				.delete(`/api/playlists/${testPlaylistId}`)
				.set('Cookie', `jwt=${authToken}`);

			expect(response.status).toBe(404);
		});

		test('should return 403 if user is not playlist owner', async () => {
			const otherUserId = new mongoose.Types.ObjectId().toString();
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(otherUserId),
				name: 'Other User Playlist',
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			const response = await request(app)
				.delete(`/api/playlists/${testPlaylistId}`)
				.set('Cookie', `jwt=${authToken}`);

			expect(response.status).toBe(403);
		});

		test('should successfully delete playlist', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'To Delete',
				description: '',
				songIds: ['track1'],
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);
			(Playlist.findByIdAndDelete as jest.Mock).mockResolvedValue(mockPlaylist);

			const response = await request(app)
				.delete(`/api/playlists/${testPlaylistId}`)
				.set('Cookie', `jwt=${authToken}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data.message).toContain('deleted');
			expect(Playlist.findByIdAndDelete).toHaveBeenCalledWith(testPlaylistId);
		});

		test('should not be accessible after deletion', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'To Delete',
				toString: function() { return this._id.toString(); }
			};

			// First delete the playlist
			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);
			(Playlist.findByIdAndDelete as jest.Mock).mockResolvedValue(mockPlaylist);

			await request(app)
				.delete(`/api/playlists/${testPlaylistId}`)
				.set('Cookie', `jwt=${authToken}`);

			// Then try to get it
			(Playlist.findById as jest.Mock).mockResolvedValue(null);

			const getResponse = await request(app)
				.get(`/api/playlists/${testPlaylistId}`)
				.set('Cookie', `jwt=${authToken}`);

			expect(getResponse.status).toBe(404);
		});
	});

	// ============== POST /api/playlists/:id/songs Tests ==============
	describe('POST /api/playlists/:id/songs - Add song to playlist', () => {
		test('should return 401 without authentication', async () => {
			const response = await request(app)
				.post(`/api/playlists/${testPlaylistId}/songs`)
				.send({ songId: 'track1' });

			expect(response.status).toBe(401);
		});

		test('should return 404 for invalid ObjectId', async () => {
			const response = await request(app)
				.post('/api/playlists/invalid-id/songs')
				.set('Cookie', `jwt=${authToken}`)
				.send({ songId: 'track1' });

			expect(response.status).toBe(404);
		});

		test('should return 400 for missing songId', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'Playlist',
				songIds: [],
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			const response = await request(app)
				.post(`/api/playlists/${testPlaylistId}/songs`)
				.set('Cookie', `jwt=${authToken}`)
				.send({});

			expect(response.status).toBe(400);
			expect(response.body.error).toContain('Song ID required');
		});

		test('should add single song successfully', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'My Playlist',
				description: '',
				songIds: [],
				createdAt: new Date(),
				updatedAt: new Date(),
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			const response = await request(app)
				.post(`/api/playlists/${testPlaylistId}/songs`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ songId: 'track1' });

			expect(response.status).toBe(200);
			expect(mockPlaylist.songIds).toContain('track1');
			expect(mockPlaylist.songIds.length).toBe(1);
			expect(mockPlaylist.save).toHaveBeenCalled();
		});

		test('should add multiple songs in sequence', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'My Playlist',
				description: '',
				songIds: [],
				createdAt: new Date(),
				updatedAt: new Date(),
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			// Add first song
			await request(app)
				.post(`/api/playlists/${testPlaylistId}/songs`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ songId: 'track1' });

			// Reset mock to allow second call
			mockPlaylist.songIds = ['track1'];
			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			// Add second song
			const response = await request(app)
				.post(`/api/playlists/${testPlaylistId}/songs`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ songId: 'track2' });

			expect(response.status).toBe(200);
			expect(mockPlaylist.songIds).toContain('track1');
			expect(mockPlaylist.songIds).toContain('track2');
			expect(mockPlaylist.songIds.length).toBe(2);
		});

		test('should return 400 for duplicate song', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'My Playlist',
				description: '',
				songIds: ['track1'],
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			const response = await request(app)
				.post(`/api/playlists/${testPlaylistId}/songs`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ songId: 'track1' });

			expect(response.status).toBe(400);
			expect(response.body.error).toContain('already in playlist');
		});

		test('should return 403 if user is not playlist owner', async () => {
			const otherUserId = new mongoose.Types.ObjectId().toString();
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(otherUserId),
				name: 'Other User Playlist',
				songIds: [],
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			const response = await request(app)
				.post(`/api/playlists/${testPlaylistId}/songs`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ songId: 'track1' });

			expect(response.status).toBe(403);
		});

		test('should return 404 for non-existent playlist', async () => {
			(Playlist.findById as jest.Mock).mockResolvedValue(null);

			const response = await request(app)
				.post(`/api/playlists/${testPlaylistId}/songs`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ songId: 'track1' });

			expect(response.status).toBe(404);
		});

		test('should return 400 when playlist at max capacity (500 songs)', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'Full Playlist',
				description: '',
				songIds: Array.from({ length: 500 }, (_, i) => `track${i}`),
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			const response = await request(app)
				.post(`/api/playlists/${testPlaylistId}/songs`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ songId: 'new_track' });

			expect(response.status).toBe(400);
			expect(response.body.error).toContain('maximum capacity');
		});

		test('should return response with updated song count', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'My Playlist',
				description: 'Test',
				songIds: ['track1'],
				createdAt: new Date(),
				updatedAt: new Date(),
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			const response = await request(app)
				.post(`/api/playlists/${testPlaylistId}/songs`)
				.set('Cookie', `jwt=${authToken}`)
				.send({ songId: 'track2' });

			expect(response.body.data.playlist.songCount).toBe(2);
		});
	});

	// ============== DELETE /api/playlists/:id/songs/:songId Tests ==============
	describe('DELETE /api/playlists/:id/songs/:songId - Remove song', () => {
		test('should return 401 without authentication', async () => {
			const response = await request(app)
				.delete(`/api/playlists/${testPlaylistId}/songs/track1`);

			expect(response.status).toBe(401);
		});

		test('should return 404 for invalid playlist ObjectId', async () => {
			const response = await request(app)
				.delete('/api/playlists/invalid-id/songs/track1')
				.set('Cookie', `jwt=${authToken}`);

			expect(response.status).toBe(404);
		});

		test('should return 404 for non-existent playlist', async () => {
			(Playlist.findById as jest.Mock).mockResolvedValue(null);

			const response = await request(app)
				.delete(`/api/playlists/${testPlaylistId}/songs/track1`)
				.set('Cookie', `jwt=${authToken}`);

			expect(response.status).toBe(404);
		});

		test('should return 400 if song not in playlist', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'My Playlist',
				songIds: ['track1', 'track2'],
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			const response = await request(app)
				.delete(`/api/playlists/${testPlaylistId}/songs/track999`)
				.set('Cookie', `jwt=${authToken}`);

			expect(response.status).toBe(400);
			expect(response.body.error).toContain('not in playlist');
		});

		test('should successfully remove song from playlist', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'My Playlist',
				description: '',
				songIds: ['track1', 'track2', 'track3'],
				createdAt: new Date(),
				updatedAt: new Date(),
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			const response = await request(app)
				.delete(`/api/playlists/${testPlaylistId}/songs/track2`)
				.set('Cookie', `jwt=${authToken}`);

			expect(response.status).toBe(200);
			expect(mockPlaylist.songIds).toEqual(['track1', 'track3']);
			expect(mockPlaylist.songIds).not.toContain('track2');
			expect(mockPlaylist.save).toHaveBeenCalled();
		});

		test('should not be able to remove song from other user playlist', async () => {
			const otherUserId = new mongoose.Types.ObjectId().toString();
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(otherUserId),
				name: 'Other User Playlist',
				songIds: ['track1'],
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			const response = await request(app)
				.delete(`/api/playlists/${testPlaylistId}/songs/track1`)
				.set('Cookie', `jwt=${authToken}`);

			expect(response.status).toBe(403);
		});

		test('should return response with updated song count', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'My Playlist',
				description: 'Test',
				songIds: ['track1', 'track2'],
				createdAt: new Date(),
				updatedAt: new Date(),
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			const response = await request(app)
				.delete(`/api/playlists/${testPlaylistId}/songs/track1`)
				.set('Cookie', `jwt=${authToken}`);

			expect(response.body.data.playlist.songCount).toBe(1);
		});

		test('should preserve other songs when removing one', async () => {
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'My Playlist',
				description: '',
				songIds: ['track1', 'track2', 'track3', 'track4'],
				createdAt: new Date(),
				updatedAt: new Date(),
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			await request(app)
				.delete(`/api/playlists/${testPlaylistId}/songs/track2`)
				.set('Cookie', `jwt=${authToken}`);

			expect(mockPlaylist.songIds).toEqual(['track1', 'track3', 'track4']);
		});

		test('should remove song and update timestamp', async () => {
			const oldDate = new Date('2025-01-01');
			const mockPlaylist = {
				_id: testPlaylistId,
				ownerId: new mongoose.Types.ObjectId(testUserId),
				name: 'My Playlist',
				description: '',
				songIds: ['track1', 'track2'],
				createdAt: oldDate,
				updatedAt: oldDate,
				save: jest.fn().mockResolvedValue(true),
				toString: function() { return this._id.toString(); }
			};

			(Playlist.findById as jest.Mock).mockResolvedValue(mockPlaylist);

			await request(app)
				.delete(`/api/playlists/${testPlaylistId}/songs/track1`)
				.set('Cookie', `jwt=${authToken}`);

			expect(mockPlaylist.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
		});
	});
});
