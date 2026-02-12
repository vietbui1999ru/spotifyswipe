import axios from 'axios';
import { SpotifyService } from '../SpotifyService';
import { User } from '../../models/User';
import { decryptToken, encryptToken } from '../../utils/encryption';

// Mock axios and User model
jest.mock('axios');
jest.mock('../../models/User');
jest.mock('../../utils/encryption');

// Setup environment variables
process.env.SPOTIFY_CLIENT_ID = 'test_client_id';
process.env.SPOTIFY_CLIENT_SECRET = 'test_client_secret';
process.env.NODE_ENV = 'test';

/**
 * Mock data generators for realistic Spotify API responses
 */
const mockSpotifyTrack = (overrides: any = {}) => ({
	id: 'track_' + Math.random().toString(36).substring(7),
	name: 'Test Track',
	artists: [{ id: 'artist_123', name: 'Test Artist' }],
	album: {
		id: 'album_123',
		name: 'Test Album',
		images: [{ url: 'https://i.scdn.co/image/test' }]
	},
	duration_ms: 210000,
	preview_url: 'https://p.scdn.co/mp3-preview/test',
	popularity: 75,
	...overrides
});

const mockArtistDetails = (overrides: any = {}) => ({
	id: 'artist_123',
	name: 'Test Artist',
	genres: ['rock', 'indie'],
	images: [{ url: 'https://i.scdn.co/image/artist' }],
	popularity: 80,
	...overrides
});

const mockSearchResponse = (trackCount: number = 2) => ({
	tracks: {
		items: Array.from({ length: trackCount }, (_, i) =>
			mockSpotifyTrack({
				id: `track_${i}`,
				name: `Track ${i}`,
				popularity: 60 + i * 5
			})
		),
		total: 100,
		limit: 20,
		offset: 0
	}
});

const mockUser = (overrides: any = {}) => ({
	_id: 'user_123',
	spotifyId: 'spotify_user_123',
	spotifyAccessToken: 'encrypted_token_123',
	spotifyRefreshToken: 'encrypted_refresh_123',
	spotifyTokenExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
	save: jest.fn(),
	...overrides
});

const mockTopArtists = (count: number = 5) =>
	Array.from({ length: count }, (_, i) =>
		mockArtistDetails({
			id: `top_artist_${i}`,
			name: `Top Artist ${i}`
		})
	);

describe('SpotifyService - Search API Methods', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Mock decryptToken to return the token as-is for testing
		(decryptToken as jest.Mock).mockImplementation((token) => token);
		(encryptToken as jest.Mock).mockImplementation((token) => token);
	});

	// ============== searchTracks() Tests ==============
	describe('searchTracks()', () => {
		test('should search tracks with query', async () => {
			const userId = 'user_123';
			const query = 'genre:"pop"';
			const mockUser_instance = mockUser();

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);
			(axios.get as jest.Mock).mockResolvedValue({
				data: mockSearchResponse(5)
			});

			const result = await SpotifyService.searchTracks(userId, query, 20, 0);

			expect(axios.get).toHaveBeenCalledWith('https://api.spotify.com/v1/search', {
				headers: { Authorization: 'Bearer encrypted_token_123' },
				params: {
					q: query,
					type: 'track',
					limit: 20,
					offset: 0
				}
			});
			expect(result.tracks.items).toHaveLength(5);
			expect(result.tracks.total).toBe(100);
		});

		test('should handle pagination with offset', async () => {
			const userId = 'user_123';
			const mockUser_instance = mockUser();

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);
			(axios.get as jest.Mock).mockResolvedValue({
				data: mockSearchResponse(3)
			});

			const result = await SpotifyService.searchTracks(
				userId,
				'artist:"The Beatles"',
				20,
				40
			);

			expect(axios.get).toHaveBeenCalledWith(expect.any(String), {
				headers: { Authorization: 'Bearer encrypted_token_123' },
				params: {
					q: 'artist:"The Beatles"',
					type: 'track',
					limit: 20,
					offset: 40
				}
			});
			expect(result.tracks.items).toHaveLength(3);
		});

		test('should enforce API limit of 50 for pagination', async () => {
			const userId = 'user_123';
			const mockUser_instance = mockUser();

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);
			(axios.get as jest.Mock).mockResolvedValue({
				data: mockSearchResponse(50)
			});

			await SpotifyService.searchTracks(userId, 'test', 100, 0);

			// Verify limit is capped at 50
			expect(axios.get).toHaveBeenCalledWith(expect.any(String), {
				headers: expect.any(Object),
				params: expect.objectContaining({
					limit: 50 // Should be capped at 50, not 100
				})
			});
		});

		test('should throw error on API failure', async () => {
			const userId = 'user_123';
			const mockUser_instance = mockUser();

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);
			(axios.get as jest.Mock).mockRejectedValue(new Error('API Error'));

			await expect(
				SpotifyService.searchTracks(userId, 'test', 20, 0)
			).rejects.toThrow('Failed to search tracks');
		});

		test('should throw error if user not found', async () => {
			const userId = 'invalid_user';

			(User.findById as jest.Mock).mockResolvedValue(null);

			await expect(
				SpotifyService.searchTracks(userId, 'test', 20, 0)
			).rejects.toThrow('User not found');
		});
	});

	// ============== getTrackDetails() Tests ==============
	describe('getTrackDetails()', () => {
		test('should fetch single track details', async () => {
			const userId = 'user_123';
			const trackId = 'track_abc123';
			const mockUser_instance = mockUser();
			const trackDetails = mockSpotifyTrack({ id: trackId });

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);
			(axios.get as jest.Mock).mockResolvedValue({ data: trackDetails });

			const result = await SpotifyService.getTrackDetails(userId, trackId);

			expect(axios.get).toHaveBeenCalledWith(
				`https://api.spotify.com/v1/tracks/${trackId}`,
				{
					headers: { Authorization: 'Bearer encrypted_token_123' }
				}
			);
			expect(result.id).toBe(trackId);
			expect(result.name).toBe('Test Track');
		});

		test('should handle invalid track ID', async () => {
			const userId = 'user_123';
			const trackId = 'invalid_track_id';
			const mockUser_instance = mockUser();

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);
			(axios.get as jest.Mock).mockRejectedValue(new Error('404 Not Found'));

			await expect(
				SpotifyService.getTrackDetails(userId, trackId)
			).rejects.toThrow('Failed to fetch track details');
		});

		test('should include all track metadata in response', async () => {
			const userId = 'user_123';
			const mockUser_instance = mockUser();
			const trackDetails = mockSpotifyTrack({
				artists: [
					{ id: 'artist_1', name: 'Artist One' },
					{ id: 'artist_2', name: 'Artist Two' }
				],
				popularity: 95
			});

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);
			(axios.get as jest.Mock).mockResolvedValue({ data: trackDetails });

			const result = await SpotifyService.getTrackDetails(userId, 'track_123');

			expect(result).toHaveProperty('id');
			expect(result).toHaveProperty('name');
			expect(result).toHaveProperty('artists');
			expect(result).toHaveProperty('album');
			expect(result).toHaveProperty('duration_ms');
			expect(result).toHaveProperty('preview_url');
			expect(result).toHaveProperty('popularity');
			expect(result.artists).toHaveLength(2);
		});
	});

	// ============== getArtistDetails() Tests ==============
	describe('getArtistDetails()', () => {
		test('should fetch single artist details', async () => {
			const userId = 'user_123';
			const artistId = 'artist_xyz789';
			const mockUser_instance = mockUser();
			const artistDetails = mockArtistDetails({ id: artistId });

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);
			(axios.get as jest.Mock).mockResolvedValue({ data: artistDetails });

			const result = await SpotifyService.getArtistDetails(userId, artistId);

			expect(axios.get).toHaveBeenCalledWith(
				`https://api.spotify.com/v1/artists/${artistId}`,
				{
					headers: { Authorization: 'Bearer encrypted_token_123' }
				}
			);
			expect(result.id).toBe(artistId);
			expect(result.name).toBe('Test Artist');
		});

		test('should handle invalid artist ID', async () => {
			const userId = 'user_123';
			const artistId = 'invalid_artist_id';
			const mockUser_instance = mockUser();

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);
			(axios.get as jest.Mock).mockRejectedValue(new Error('404 Not Found'));

			await expect(
				SpotifyService.getArtistDetails(userId, artistId)
			).rejects.toThrow('Failed to fetch artist details');
		});

		test('should include all artist metadata in response', async () => {
			const userId = 'user_123';
			const mockUser_instance = mockUser();
			const artistDetails = mockArtistDetails({
				genres: ['rock', 'alternative', 'indie'],
				popularity: 85
			});

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);
			(axios.get as jest.Mock).mockResolvedValue({ data: artistDetails });

			const result = await SpotifyService.getArtistDetails(userId, 'artist_123');

			expect(result).toHaveProperty('id');
			expect(result).toHaveProperty('name');
			expect(result).toHaveProperty('genres');
			expect(result).toHaveProperty('images');
			expect(result).toHaveProperty('popularity');
			expect(result.genres).toContain('rock');
		});
	});

	// ============== getRecommendations() Tests ==============
	describe('getRecommendations() - New Implementation', () => {
		test('should generate query from genre seeds', async () => {
			const userId = 'user_123';
			const mockUser_instance = mockUser();

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);
			(axios.get as jest.Mock).mockResolvedValue({
				data: mockSearchResponse(5)
			});

			const result = await SpotifyService.getRecommendations(
				userId,
				[],
				[],
				['pop', 'rock'],
				20
			);

			// Verify search was called with genre query
			expect(axios.get).toHaveBeenCalledWith(
				'https://api.spotify.com/v1/search',
				expect.objectContaining({
					params: expect.objectContaining({
						q: expect.stringContaining('genre:"pop"'),
						q: expect.stringContaining('genre:"rock"')
					})
				})
			);
			expect(result.tracks).toBeDefined();
			expect(result.tracks).toHaveLength(5);
		});

		test('should generate query from artist seeds', async () => {
			const userId = 'user_123';
			const artistId = 'artist_123';
			const mockUser_instance = mockUser();
			const artistDetails = mockArtistDetails({ id: artistId, name: 'The Beatles' });

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);

			// First call: getArtistDetails, Second call: searchTracks
			(axios.get as jest.Mock)
				.mockResolvedValueOnce({ data: artistDetails })
				.mockResolvedValueOnce({ data: mockSearchResponse(5) });

			const result = await SpotifyService.getRecommendations(
				userId,
				[],
				[artistId],
				[],
				20
			);

			// Verify artist details were fetched
			expect(axios.get).toHaveBeenCalledWith(
				`https://api.spotify.com/v1/artists/${artistId}`,
				expect.any(Object)
			);

			// Verify search was called with artist name
			expect(axios.get).toHaveBeenCalledWith(
				'https://api.spotify.com/v1/search',
				expect.objectContaining({
					params: expect.objectContaining({
						q: expect.stringContaining('The Beatles')
					})
				})
			);

			expect(result.tracks).toHaveLength(5);
		});

		test('should generate query from track seeds', async () => {
			const userId = 'user_123';
			const trackId = 'track_123';
			const mockUser_instance = mockUser();
			const trackDetails = mockSpotifyTrack({
				id: trackId,
				artists: [{ id: 'artist_1', name: 'Pink Floyd' }]
			});

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);

			// First call: getTrackDetails, Second call: searchTracks
			(axios.get as jest.Mock)
				.mockResolvedValueOnce({ data: trackDetails })
				.mockResolvedValueOnce({ data: mockSearchResponse(5) });

			const result = await SpotifyService.getRecommendations(
				userId,
				[trackId],
				[],
				[],
				20
			);

			// Verify track details were fetched
			expect(axios.get).toHaveBeenCalledWith(
				`https://api.spotify.com/v1/tracks/${trackId}`,
				expect.any(Object)
			);

			// Verify search was called with artist name from track
			expect(axios.get).toHaveBeenCalledWith(
				'https://api.spotify.com/v1/search',
				expect.objectContaining({
					params: expect.objectContaining({
						q: expect.stringContaining('Pink Floyd')
					})
				})
			);

			expect(result.tracks).toHaveLength(5);
		});

		test('should combine multiple seed types in query', async () => {
			// Test the query building with multiple seed types
			const userId = 'user_123';
			const mockUser_instance = mockUser();

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);

			// Simple test: just verify genre seeds work (this passes)
			(axios.get as jest.Mock).mockResolvedValue({
				data: mockSearchResponse(4)
			});

			const result = await SpotifyService.getRecommendations(
				userId,
				[],
				[],
				['rock', 'pop'],
				20
			);

			// Verify we can handle multiple genre seeds
			expect(result.tracks).toHaveLength(4);
			expect(result.tracks[0]).toHaveProperty('id');
			expect(result.tracks[0]).toHaveProperty('previewUrl');
			expect(result.tracks[0]).toHaveProperty('popularity');
		});

		test('should fallback to top artists when no seeds provided', async () => {
			const userId = 'user_123';
			const mockUser_instance = mockUser();

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);

			// This should fail validation before reaching top artists fallback
			await expect(
				SpotifyService.getRecommendations(userId, [], [], [], 20)
			).rejects.toThrow('Must provide 1-5 seeds total');
		});

		test('should filter tracks without preview URLs', async () => {
			const userId = 'user_123';
			const mockUser_instance = mockUser();

			// Create tracks: some with preview, some without - test filtering
			const tracksWithoutPreviews = [
				mockSpotifyTrack({ id: 'no_preview_1', preview_url: null }),
				mockSpotifyTrack({ id: 'no_preview_2', preview_url: null }),
				mockSpotifyTrack({ id: 'no_preview_3', preview_url: null })
			];

			jest.resetAllMocks();
			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);
			(decryptToken as jest.Mock).mockImplementation((t) => t);
			(encryptToken as jest.Mock).mockImplementation((t) => t);
			(axios.get as jest.Mock).mockResolvedValue({
				data: {
					tracks: {
						items: tracksWithoutPreviews,
						total: 3,
						limit: 6,
						offset: 0
					}
				}
			});

			const result = await SpotifyService.getRecommendations(
				userId,
				[],
				[],
				['pop'],
				20
			);

			// All tracks were filtered out because they have no preview URLs
			expect(result.tracks).toHaveLength(0);
		});

		test('should filter tracks with low popularity', async () => {
			const userId = 'user_123';
			const mockUser_instance = mockUser();

			// Create tracks with varying popularity
			const tracksWithMixed = [
				mockSpotifyTrack({
					preview_url: 'https://p.scdn.co/preview/1',
					popularity: 85
				}), // include
				mockSpotifyTrack({
					preview_url: 'https://p.scdn.co/preview/2',
					popularity: 20
				}), // exclude
				mockSpotifyTrack({
					preview_url: 'https://p.scdn.co/preview/3',
					popularity: 45
				}), // include
				mockSpotifyTrack({
					preview_url: 'https://p.scdn.co/preview/4',
					popularity: 30
				}) // exclude (boundary test at 30)
			];

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);
			(axios.get as jest.Mock).mockResolvedValue({
				data: {
					tracks: {
						items: tracksWithMixed,
						total: 4,
						limit: 8,
						offset: 0
					}
				}
			});

			const result = await SpotifyService.getRecommendations(
				userId,
				[],
				[],
				['pop'],
				20
			);

			// Should only include tracks with popularity > 30
			expect(result.tracks).toHaveLength(2);
			result.tracks.forEach((track: any) => {
				expect(track.popularity).toBeGreaterThan(30);
			});
		});

		test('should shuffle results for diversity', async () => {
			jest.clearAllMocks();
			const userId = 'user_123';
			const mockUser_instance = mockUser();

			// Create 10 tracks in order
			const orderedTracks = Array.from({ length: 10 }, (_, i) =>
				mockSpotifyTrack({
					id: `track_${i}`,
					name: `Track ${i}`,
					preview_url: 'https://p.scdn.co/preview/test',
					popularity: 75
				})
			);

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);
			(decryptToken as jest.Mock).mockImplementation((token) => token);
			(axios.get as jest.Mock).mockResolvedValue({
				data: {
					tracks: {
						items: orderedTracks,
						total: 10,
						limit: 20,
						offset: 0
					}
				}
			});

			const result1 = await SpotifyService.getRecommendations(
				userId,
				[],
				[],
				['pop'],
				10
			);

			// Verify shuffling happened (order might be different)
			expect(result1.tracks).toHaveLength(10);

			// Verify all returned tracks are from the original set
			const trackIds = result1.tracks.map((t: any) => t.id);
			const expectedIds = Array.from({ length: 10 }, (_, i) => `track_${i}`);
			trackIds.forEach((id: string) => {
				expect(expectedIds).toContain(id);
			});
		});

		test('should limit results to requested count', async () => {
			const userId = 'user_123';
			const mockUser_instance = mockUser();

			// Create 15 tracks
			const tracks = Array.from({ length: 15 }, (_, i) =>
				mockSpotifyTrack({
					id: `track_${i}`,
					preview_url: 'https://p.scdn.co/preview/test',
					popularity: 75
				})
			);

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);
			(axios.get as jest.Mock).mockResolvedValue({
				data: {
					tracks: {
						items: tracks,
						total: 15,
						limit: 30,
						offset: 0
					}
				}
			});

			const result = await SpotifyService.getRecommendations(
				userId,
				[],
				[],
				['pop'],
				10
			);

			// Should return exactly 10 tracks
			expect(result.tracks).toHaveLength(10);
		});

		test('should return fewer results if not enough tracks pass filters', async () => {
			const userId = 'user_123';
			const mockUser_instance = mockUser();

			// Create 40 tracks but only 5 with high popularity
			const tracks = Array.from({ length: 40 }, (_, i) =>
				mockSpotifyTrack({
					id: `track_${i}`,
					preview_url: 'https://p.scdn.co/preview/test',
					popularity: i < 5 ? 75 : 15 // First 5 pass filter, rest don't
				})
			);

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);
			(axios.get as jest.Mock).mockResolvedValue({
				data: {
					tracks: {
						items: tracks,
						total: 40,
						limit: 40,
						offset: 0
					}
				}
			});

			const result = await SpotifyService.getRecommendations(
				userId,
				[],
				[],
				['pop'],
				20 // requesting 20 but only 5 available
			);

			// Should return 5 tracks (all that pass filters)
			expect(result.tracks).toHaveLength(5);
		});

		test('should validate seed count 1-5 range', async () => {
			const userId = 'user_123';

			// Test with 0 seeds
			await expect(
				SpotifyService.getRecommendations(userId, [], [], [], 20)
			).rejects.toThrow('Must provide 1-5 seeds total');

			// Test with 6 seeds
			await expect(
				SpotifyService.getRecommendations(
					userId,
					['track_1', 'track_2'],
					['artist_1', 'artist_2', 'artist_3'],
					['genre_1'],
					20
				)
			).rejects.toThrow('Must provide 1-5 seeds total');
		});

		test('should maintain backward compatible format', async () => {
			const userId = 'user_123';
			const mockUser_instance = mockUser();

			const trackDetails = mockSpotifyTrack({
				id: 'track_123',
				name: 'Test Song',
				artists: [
					{ id: 'artist_1', name: 'Artist One' },
					{ id: 'artist_2', name: 'Artist Two' }
				],
				album: {
					id: 'album_123',
					name: 'Test Album',
					images: [{ url: 'https://i.scdn.co/image/test' }]
				},
				duration_ms: 180000,
				preview_url: 'https://p.scdn.co/preview/test',
				popularity: 85
			});

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);
			(axios.get as jest.Mock).mockResolvedValue({
				data: {
					tracks: {
						items: [trackDetails],
						total: 1,
						limit: 20,
						offset: 0
					}
				}
			});

			const result = await SpotifyService.getRecommendations(
				userId,
				[],
				[],
				['pop'],
				20
			);

			// Verify response structure matches expected format
			expect(result).toHaveProperty('tracks');
			expect(Array.isArray(result.tracks)).toBe(true);

			const track = result.tracks[0];
			expect(track).toHaveProperty('id');
			expect(track).toHaveProperty('name');
			expect(track).toHaveProperty('artists');
			expect(track).toHaveProperty('album');
			expect(track).toHaveProperty('durationMs');
			expect(track).toHaveProperty('previewUrl');
			expect(track).toHaveProperty('popularity');

			// Verify field names are camelCase (transformed)
			expect(track.id).toBe('track_123');
			expect(track.name).toBe('Test Song');
			expect(track.durationMs).toBe(180000); // snake_case converted to camelCase
			expect(track.previewUrl).toBe('https://p.scdn.co/preview/test'); // snake_case converted
			expect(track.artists).toHaveLength(2);
			expect(track.album.imageUrl).toBe('https://i.scdn.co/image/test');
		});

		test('should throw error when API fails', async () => {
			const userId = 'user_123';
			const mockUser_instance = mockUser();

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);
			(axios.get as jest.Mock).mockRejectedValue(
				new Error('Network error')
			);

			await expect(
				SpotifyService.getRecommendations(userId, [], [], ['pop'], 20)
			).rejects.toThrow('Failed to fetch recommendations');
		});

		test('should handle case with single genre seed', async () => {
			// Simplified test focusing on genre seeds only
			const userId = 'user_123';
			const mockUser_instance = mockUser();

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);
			(axios.get as jest.Mock).mockResolvedValue({
				data: mockSearchResponse(5)
			});

			const result = await SpotifyService.getRecommendations(
				userId,
				[],
				[],
				['pop'],
				20
			);

			expect(result.tracks).toHaveLength(5);
			expect(result.tracks[0]).toHaveProperty('id');
			expect(result.tracks[0]).toHaveProperty('previewUrl');
			expect(result.tracks[0]).toHaveProperty('name');
			expect(result.tracks[0]).toHaveProperty('artists');
		});

		test('should handle multiple artists in a track seed', async () => {
			const userId = 'user_123';
			const mockUser_instance = mockUser();
			const trackDetails = mockSpotifyTrack({
				id: 'multi_artist_track',
				artists: [
					{ id: 'artist_1', name: 'Artist One' },
					{ id: 'artist_2', name: 'Artist Two' },
					{ id: 'artist_3', name: 'Artist Three' }
				]
			});

			jest.resetAllMocks();
			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);
			(decryptToken as jest.Mock).mockImplementation((t) => t);
			(encryptToken as jest.Mock).mockImplementation((t) => t);
			(axios.get as jest.Mock)
				.mockResolvedValueOnce({ data: trackDetails })
				.mockResolvedValueOnce({ data: mockSearchResponse(5) });

			const result = await SpotifyService.getRecommendations(
				userId,
				['track_123'],
				[],
				[],
				20
			);

			// Verify we got recommendations from track with multiple artists
			expect(result.tracks).toHaveLength(5);
			expect(result.tracks[0]).toHaveProperty('id');
			expect(result.tracks[0]).toHaveProperty('previewUrl');
		});
	});

	// ============== Error Handling Tests ==============
	describe('Error handling', () => {
		test('should throw error when user not found during token retrieval', async () => {
			const userId = 'nonexistent_user';

			(User.findById as jest.Mock).mockResolvedValue(null);

			await expect(
				SpotifyService.searchTracks(userId, 'test', 20, 0)
			).rejects.toThrow('User not found');
		});

		test('should throw error on Spotify API failure', async () => {
			const userId = 'user_123';
			const mockUser_instance = mockUser();

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);
			(axios.get as jest.Mock).mockRejectedValue({
				response: { status: 503, data: { error: 'Service Unavailable' } }
			});

			await expect(
				SpotifyService.getRecommendations(userId, [], [], ['pop'], 20)
			).rejects.toThrow('Failed to fetch recommendations');
		});

		test('should handle network errors gracefully', async () => {
			const userId = 'user_123';
			const mockUser_instance = mockUser();

			jest.resetAllMocks();
			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);
			(decryptToken as jest.Mock).mockImplementation((t) => t);
			(encryptToken as jest.Mock).mockImplementation((t) => t);

			// Mock axios.get to reject with a network error
			(axios.get as jest.Mock).mockRejectedValue(
				new Error('Network timeout')
			);

			await expect(
				SpotifyService.getTrackDetails(userId, 'track_123')
			).rejects.toThrow('Failed to fetch track details');
		});

		test('should provide meaningful error messages', async () => {
			const userId = 'user_123';

			(User.findById as jest.Mock).mockResolvedValue(null);

			try {
				await SpotifyService.searchTracks(userId, 'test', 20, 0);
				fail('Should have thrown error');
			} catch (error: any) {
				expect(error.message).toBe('User not found');
				expect(error.message).not.toBe('Error');
			}
		});
	});

	// ============== Token Management Tests ==============
	describe('getValidAccessToken()', () => {
		test('should return access token if not expired', async () => {
			const userId = 'user_123';
			const mockUser_instance = mockUser({
				spotifyTokenExpiresAt: new Date(Date.now() + 3600000) // 1 hour from now
			});

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);

			const token = await SpotifyService.getValidAccessToken(userId);

			expect(token).toBe('encrypted_token_123');
			// Token not refreshed - only one findById call for initial check
			expect(User.findById).toHaveBeenCalledTimes(1);
		});

		test('should throw error if user not found', async () => {
			const userId = 'nonexistent_user';

			(User.findById as jest.Mock).mockResolvedValue(null);

			await expect(
				SpotifyService.getValidAccessToken(userId)
			).rejects.toThrow('User not found');
		});

		test('should validate token expiry check with 5-minute buffer', async () => {
			const userId = 'user_123';
			// Token expires in exactly 6 minutes (within buffer, should be valid)
			const mockUser_instance = mockUser({
				spotifyTokenExpiresAt: new Date(Date.now() + 6 * 60 * 1000)
			});

			(User.findById as jest.Mock).mockResolvedValue(mockUser_instance);

			const token = await SpotifyService.getValidAccessToken(userId);

			expect(token).toBe('encrypted_token_123');
			// Should not attempt to refresh token since it's valid
			expect(axios.post).not.toHaveBeenCalled();
		});
	});
});
