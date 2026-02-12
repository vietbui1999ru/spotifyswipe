import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { SwipeSession } from '../models/SwipeSession';
import mongoose from 'mongoose';

const router = Router();

// All swipe routes require authentication
router.use(authMiddleware);

// POST /api/swipe/session - Create new swipe session
router.post('/session', async (req: AuthRequest, res: Response) => {
	try {
		const { seedTrackIds } = req.body;

		// Validate seedTrackIds if provided
		if (seedTrackIds && !Array.isArray(seedTrackIds)) {
			return res.status(400).json({
				success: false,
				error: 'seedTrackIds must be an array'
			});
		}

		const session = new SwipeSession({
			userId: req.userId,
			likedSongIds: [],
			dislikedSongIds: [],
			seedTrackIds: seedTrackIds || []
		});

		await session.save();

		res.status(201).json({
			success: true,
			data: {
				session: {
					id: session._id,
					likedSongIds: session.likedSongIds,
					dislikedSongIds: session.dislikedSongIds,
					seedTrackIds: session.seedTrackIds,
					createdAt: session.createdAt
				}
			}
		});
	} catch (error) {
		console.error('Error creating swipe session:', error);
		res.status(500).json({ success: false, error: 'Failed to create swipe session' });
	}
});

// PATCH /api/swipe/session/:id - Record a swipe action
router.patch('/session/:id', async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { action, songId } = req.body;

		// Validate inputs
		if (!action || !['like', 'dislike'].includes(action)) {
			return res.status(400).json({
				success: false,
				error: 'Action must be "like" or "dislike"'
			});
		}

		if (!songId) {
			return res.status(400).json({
				success: false,
				error: 'Song ID required'
			});
		}

		// Validate ObjectId
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(404).json({ success: false, error: 'Session not found' });
		}

		const session = await SwipeSession.findById(id);

		if (!session) {
			return res.status(404).json({ success: false, error: 'Session not found' });
		}

		// Check ownership
		if (session.userId.toString() !== req.userId) {
			return res.status(403).json({ success: false, error: 'Not authorized' });
		}

		// Record swipe
		if (action === 'like') {
			// Move from disliked to liked if previously disliked
			if (session.dislikedSongIds.includes(songId)) {
				session.dislikedSongIds = session.dislikedSongIds.filter(id => id !== songId);
			}

			// Add to liked if not already there
			if (!session.likedSongIds.includes(songId)) {
				session.likedSongIds.push(songId);
			}
		} else if (action === 'dislike') {
			// Move from liked to disliked if previously liked
			if (session.likedSongIds.includes(songId)) {
				session.likedSongIds = session.likedSongIds.filter(id => id !== songId);
			}

			// Add to disliked if not already there
			if (!session.dislikedSongIds.includes(songId)) {
				session.dislikedSongIds.push(songId);
			}
		}

		await session.save();

		res.json({
			success: true,
			data: {
				session: {
					id: session._id,
					likedSongIds: session.likedSongIds,
					dislikedSongIds: session.dislikedSongIds,
					seedTrackIds: session.seedTrackIds
				}
			}
		});
	} catch (error) {
		console.error('Error recording swipe:', error);
		res.status(500).json({ success: false, error: 'Failed to record swipe' });
	}
});

// GET /api/swipe/session/:id - Get swipe session details
router.get('/session/:id', async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;

		// Validate ObjectId
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(404).json({ success: false, error: 'Session not found' });
		}

		const session = await SwipeSession.findById(id);

		if (!session) {
			return res.status(404).json({ success: false, error: 'Session not found' });
		}

		// Check ownership
		if (session.userId.toString() !== req.userId) {
			return res.status(403).json({ success: false, error: 'Not authorized' });
		}

		res.json({
			success: true,
			data: {
				session: {
					id: session._id,
					likedSongIds: session.likedSongIds,
					dislikedSongIds: session.dislikedSongIds,
					seedTrackIds: session.seedTrackIds,
					createdAt: session.createdAt,
					completedAt: session.completedAt
				}
			}
		});
	} catch (error) {
		console.error('Error fetching swipe session:', error);
		res.status(500).json({ success: false, error: 'Failed to fetch session' });
	}
});

// POST /api/swipe/session/:id/complete - Mark session as completed
router.post('/session/:id/complete', async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params;

		// Validate ObjectId
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(404).json({ success: false, error: 'Session not found' });
		}

		const session = await SwipeSession.findById(id);

		if (!session) {
			return res.status(404).json({ success: false, error: 'Session not found' });
		}

		// Check ownership
		if (session.userId.toString() !== req.userId) {
			return res.status(403).json({ success: false, error: 'Not authorized' });
		}

		session.completedAt = new Date();
		await session.save();

		res.json({
			success: true,
			data: {
				session: {
					id: session._id,
					likedSongIds: session.likedSongIds,
					completedAt: session.completedAt
				}
			}
		});
	} catch (error) {
		console.error('Error completing session:', error);
		res.status(500).json({ success: false, error: 'Failed to complete session' });
	}
});

export default router;
