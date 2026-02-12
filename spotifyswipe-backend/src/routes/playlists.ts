import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { Playlist } from '../models/Playlist';
import { SpotifyService } from '../services/SpotifyService';
import mongoose from 'mongoose';

const router = Router();

// All playlist routes require authentication
router.use(authMiddleware);

// GET /api/playlists - List user's custom playlists
router.get('/', async (req: AuthRequest, res: Response) => {
	try {
		const playlists = await Playlist.find({ ownerId: req.userId }).select('-songIds');

		res.json({
			success: true,
			data: {
				playlists: playlists.map(p => ({
					id: p._id,
					name: p.name,
					description: p.description,
					songCount: p.songIds.length,
					createdAt: p.createdAt,
					updatedAt: p.updatedAt
				}))
			}
		});
	} catch (error) {
		console.error('Error fetching playlists:', error);
		res.status(500).json({ success: false, error: 'Failed to fetch playlists' });
	}
});

// POST /api/playlists - Create new custom playlist
router.post('/', async (req: AuthRequest, res: Response) => {
	try {
		const { name, description } = req.body;

		// Validation
		if (!name || name.trim().length === 0) {
			return res.status(400).json({
				success: false,
				error: 'Playlist name is required'
			});
		}

		if (name.length > 100) {
			return res.status(400).json({
				success: false,
				error: 'Playlist name must be 1-100 characters'
			});
		}

		if (description && description.length > 500) {
			return res.status(400).json({
				success: false,
				error: 'Description must be max 500 characters'
			});
		}

		const playlist = new Playlist({
			ownerId: req.userId,
			name: name.trim(),
			description: description?.trim() || '',
			songIds: []
		});

		await playlist.save();

		res.status(201).json({
			success: true,
			data: {
				playlist: {
					id: playlist._id,
					name: playlist.name,
					description: playlist.description,
					songIds: playlist.songIds,
					createdAt: playlist.createdAt
				}
			}
		});
	} catch (error) {
		console.error('Error creating playlist:', error);
		res.status(500).json({ success: false, error: 'Failed to create playlist' });
	}
});

// GET /api/playlists/:id - Get single playlist with full song details
router.get('/:id', async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;

		// Validate ObjectId
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(404).json({ success: false, error: 'Playlist not found' });
		}

		const playlist = await Playlist.findById(id);

		if (!playlist) {
			return res.status(404).json({ success: false, error: 'Playlist not found' });
		}

		// Check ownership
		if (playlist.ownerId.toString() !== req.userId) {
			return res.status(403).json({ success: false, error: 'Not authorized' });
		}

		// Fetch song details from Spotify if playlist has songs
		let songs: any[] = [];
		if (playlist.songIds.length > 0) {
			try {
				songs = await SpotifyService.getTracks(req.userId!, playlist.songIds);
			} catch (error) {
				console.error('Error fetching song details:', error);
				// Don't fail the request, just return empty songs
				songs = [];
			}
		}

		res.json({
			success: true,
			data: {
				playlist: {
					id: playlist._id,
					name: playlist.name,
					description: playlist.description,
					songs,
					createdAt: playlist.createdAt,
					updatedAt: playlist.updatedAt
				}
			}
		});
	} catch (error) {
		console.error('Error fetching playlist:', error);
		res.status(500).json({ success: false, error: 'Failed to fetch playlist' });
	}
});

// PATCH /api/playlists/:id - Update playlist metadata
router.patch('/:id', async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { name, description } = req.body;

		// Validate ObjectId
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(404).json({ success: false, error: 'Playlist not found' });
		}

		const playlist = await Playlist.findById(id);

		if (!playlist) {
			return res.status(404).json({ success: false, error: 'Playlist not found' });
		}

		// Check ownership
		if (playlist.ownerId.toString() !== req.userId) {
			return res.status(403).json({ success: false, error: 'Not authorized' });
		}

		// Validate input
		if (name !== undefined) {
			if (typeof name !== 'string' || name.trim().length === 0) {
				return res.status(400).json({
					success: false,
					error: 'Playlist name must be non-empty string'
				});
			}

			if (name.length > 100) {
				return res.status(400).json({
					success: false,
					error: 'Playlist name must be 1-100 characters'
				});
			}

			playlist.name = name.trim();
		}

		if (description !== undefined) {
			if (typeof description === 'string' && description.length > 500) {
				return res.status(400).json({
					success: false,
					error: 'Description must be max 500 characters'
				});
			}

			playlist.description = description || '';
		}

		playlist.updatedAt = new Date();
		await playlist.save();

		res.json({
			success: true,
			data: {
				playlist: {
					id: playlist._id,
					name: playlist.name,
					description: playlist.description,
					songCount: playlist.songIds.length,
					createdAt: playlist.createdAt,
					updatedAt: playlist.updatedAt
				}
			}
		});
	} catch (error) {
		console.error('Error updating playlist:', error);
		res.status(500).json({ success: false, error: 'Failed to update playlist' });
	}
});

// DELETE /api/playlists/:id - Delete playlist
router.delete('/:id', async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;

		// Validate ObjectId
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(404).json({ success: false, error: 'Playlist not found' });
		}

		const playlist = await Playlist.findById(id);

		if (!playlist) {
			return res.status(404).json({ success: false, error: 'Playlist not found' });
		}

		// Check ownership
		if (playlist.ownerId.toString() !== req.userId) {
			return res.status(403).json({ success: false, error: 'Not authorized' });
		}

		await Playlist.findByIdAndDelete(id);

		res.json({
			success: true,
			data: {
				message: 'Playlist deleted'
			}
		});
	} catch (error) {
		console.error('Error deleting playlist:', error);
		res.status(500).json({ success: false, error: 'Failed to delete playlist' });
	}
});

// POST /api/playlists/:id/songs - Add song to playlist
router.post('/:id/songs', async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { songId } = req.body;

		// Validate inputs
		if (!songId) {
			return res.status(400).json({ success: false, error: 'Song ID required' });
		}

		// Validate ObjectId
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(404).json({ success: false, error: 'Playlist not found' });
		}

		const playlist = await Playlist.findById(id);

		if (!playlist) {
			return res.status(404).json({ success: false, error: 'Playlist not found' });
		}

		// Check ownership
		if (playlist.ownerId.toString() !== req.userId) {
			return res.status(403).json({ success: false, error: 'Not authorized' });
		}

		// Check if song already in playlist
		if (playlist.songIds.includes(songId)) {
			return res.status(400).json({
				success: false,
				error: 'Song already in playlist'
			});
		}

		// Check max songs limit (500 from MASTERPLAN)
		if (playlist.songIds.length >= 500) {
			return res.status(400).json({
				success: false,
				error: 'Playlist is at maximum capacity (500 songs)'
			});
		}

		playlist.songIds.push(songId);
		playlist.updatedAt = new Date();
		await playlist.save();

		res.json({
			success: true,
			data: {
				playlist: {
					id: playlist._id,
					name: playlist.name,
					description: playlist.description,
					songCount: playlist.songIds.length,
					updatedAt: playlist.updatedAt
				}
			}
		});
	} catch (error) {
		console.error('Error adding song:', error);
		res.status(500).json({ success: false, error: 'Failed to add song' });
	}
});

// DELETE /api/playlists/:id/songs/:songId - Remove song from playlist
router.delete('/:id/songs/:songId', async (req: AuthRequest, res: Response) => {
	try {
		const { id, songId } = req.params;

		// Validate ObjectId
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(404).json({ success: false, error: 'Playlist not found' });
		}

		const playlist = await Playlist.findById(id);

		if (!playlist) {
			return res.status(404).json({ success: false, error: 'Playlist not found' });
		}

		// Check ownership
		if (playlist.ownerId.toString() !== req.userId) {
			return res.status(403).json({ success: false, error: 'Not authorized' });
		}

		// Check if song is in playlist
		if (!playlist.songIds.includes(songId)) {
			return res.status(400).json({
				success: false,
				error: 'Song not in playlist'
			});
		}

		playlist.songIds = playlist.songIds.filter(id => id !== songId);
		playlist.updatedAt = new Date();
		await playlist.save();

		res.json({
			success: true,
			data: {
				playlist: {
					id: playlist._id,
					name: playlist.name,
					description: playlist.description,
					songCount: playlist.songIds.length,
					updatedAt: playlist.updatedAt
				}
			}
		});
	} catch (error) {
		console.error('Error removing song:', error);
		res.status(500).json({ success: false, error: 'Failed to remove song' });
	}
});

export default router;
