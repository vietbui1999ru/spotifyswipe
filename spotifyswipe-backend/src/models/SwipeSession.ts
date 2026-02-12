import mongoose from 'mongoose';

const swipeSessionSchema = new mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
		index: true
	},
	likedSongIds: {
		type: [String],
		default: [],
		description: 'Spotify track IDs swiped right'
	},
	dislikedSongIds: {
		type: [String],
		default: [],
		description: 'Spotify track IDs swiped left'
	},
	seedTrackIds: {
		type: [String],
		default: [],
		description: 'Seed tracks used for this recommendation batch'
	},
	createdAt: {
		type: Date,
		default: Date.now
	},
	completedAt: {
		type: Date,
		default: null,
		description: 'When session was converted to playlist or abandoned'
	}
});

// Index for fetching user's recent sessions
swipeSessionSchema.index({ userId: 1, createdAt: -1 });

export const SwipeSession = mongoose.model('SwipeSession', swipeSessionSchema);
