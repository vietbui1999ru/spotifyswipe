import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { SpotifyService } from '../services/SpotifyService';

const router = Router();

// All Spotify routes require authentication
router.use(authMiddleware);

// GET /api/spotify/playlists - Get user's Spotify playlists
router.get('/playlists', async (req: AuthRequest, res: Response) => {
	try {
		const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
		const offset = parseInt(req.query.offset as string) || 0;

		const playlists = await SpotifyService.getUserPlaylists(req.userId!, limit, offset);

		res.json({
			success: true,
			data: playlists
		});
	} catch (error) {
		console.error('Error fetching playlists:', error);
		res.status(502).json({
			success: false,
			error: 'Failed to fetch playlists from Spotify'
		});
	}
});

// GET /api/spotify/recommendations - Get personalized recommendations
router.get('/search', async (req: AuthRequest, res: Response) => {
	try {
		const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
		const seedTrackIds = (req.query.seedTrackIds as string || '')
			.split(',')
			.filter(id => id.trim());
		const seedArtistIds = (req.query.seedArtistIds as string || '')
			.split(',')
			.filter(id => id.trim());
		const seedGenres = (req.query.seedGenres as string || '')
			.split(',')
			.filter(id => id.trim());

		// Validate seeds
		const totalSeeds = seedTrackIds.length + seedArtistIds.length + seedGenres.length;
		if (totalSeeds === 0 || totalSeeds > 5) {
			return res.status(400).json({
				success: false,
				error: 'Must provide 1-5 seeds total (tracks + artists + genres)'
			});
		}

		const recommendations = await SpotifyService.getRecommendations(
			req.userId!,
			seedTrackIds,
			seedArtistIds,
			seedGenres,
			limit
		);

		res.json({
			success: true,
			data: recommendations
		});
	} catch (error) {
		console.error('Error fetching recommendations:', error);
		res.status(502).json({
			success: false,
			error: 'Failed to fetch recommendations from Spotify'
		});
	}
});

// GET /api/spotify/top-tracks - Get user's top tracks
router.get('/top-tracks', async (req: AuthRequest, res: Response) => {
	try {
		const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
		const timeRange = (req.query.timeRange as string) || 'medium_term';

		if (!['short_term', 'medium_term', 'long_term'].includes(timeRange)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid timeRange. Must be: short_term, medium_term, or long_term'
			});
		}

		const topTracks = await SpotifyService.getTopTracks(req.userId!, limit, timeRange);

		res.json({
			success: true,
			data: {
				tracks: topTracks
			}
		});
	} catch (error) {
		console.error('Error fetching top tracks:', error);
		res.status(502).json({
			success: false,
			error: 'Failed to fetch top tracks from Spotify'
		});
	}
});

// GET /api/spotify/top-artists - Get user's top artists
router.get('/top-artists', async (req: AuthRequest, res: Response) => {
	try {
		const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
		const timeRange = (req.query.timeRange as string) || 'medium_term';

		if (!['short_term', 'medium_term', 'long_term'].includes(timeRange)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid timeRange. Must be: short_term, medium_term, or long_term'
			});
		}

		const topArtists = await SpotifyService.getTopArtists(req.userId!, limit, timeRange);

		res.json({
			success: true,
			data: {
				artists: topArtists
			}
		});
	} catch (error) {
		console.error('Error fetching top artists:', error);
		res.status(502).json({
			success: false,
			error: 'Failed to fetch top artists from Spotify'
		});
	}
});

// GET /api/spotify/playlists/search - Search for playlists by genre/mood
router.get('/playlists/search', async (req: AuthRequest, res: Response) => {
	try {
		const { query } = req.query;

		// Validate query parameter
		if (!query || typeof query !== 'string') {
			return res.status(400).json({
				success: false,
				error: 'Query parameter is required'
			});
		}

		const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
		const offset = parseInt(req.query.offset as string) || 0;

		const result = await SpotifyService.searchPlaylists(
			req.userId!,
			query,
			limit,
			offset
		);

		res.json({
			success: true,
			data: result
		});
	} catch (error) {
		console.error('Error searching playlists:', error);
		res.status(502).json({
			success: false,
			error: 'Failed to search playlists'
		});
	}
});

// GET /api/spotify/playlists/:playlistId/tracks - Get all tracks from a playlist
router.get('/playlists/:playlistId/tracks', async (req: AuthRequest, res: Response) => {
	try {
		const { playlistId } = req.params;
		const filterPreview = (req.query.filterPreview as string || 'true').toLowerCase() === 'true';
		const limit = parseInt(req.query.limit as string) || 50;
		const offset = parseInt(req.query.offset as string) || 0;

		// Validate playlistId parameter
		if (!playlistId || typeof playlistId !== 'string') {
			return res.status(400).json({
				success: false,
				error: 'Playlist ID is required'
			});
		}

		const result = await SpotifyService.getPlaylistTracks(
			req.userId!,
			playlistId,
			filterPreview
		);

		// Handle pagination in response if offset/limit provided
		let paginatedTracks = result.tracks;
		if (offset > 0 || limit < result.tracks.length) {
			paginatedTracks = result.tracks.slice(offset, offset + limit);
		}

		res.json({
			success: true,
			data: {
				playlistId: result.playlistId,
				playlistName: result.playlistName,
				tracks: paginatedTracks,
				total: result.total,
				hasMore: result.hasMore,
				limit,
				offset
			}
		});
	} catch (error) {
		console.error('Error fetching playlist tracks:', error);
		res.status(502).json({
			success: false,
			error: 'Failed to fetch playlist tracks'
		});
	}
});

export default router;
