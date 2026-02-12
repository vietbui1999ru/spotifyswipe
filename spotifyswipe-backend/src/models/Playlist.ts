import mongoose from 'mongoose';

const playlistSchema = new mongoose.Schema({
	name: { type: String, required: true },
	description: String,
	ownerId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	songIds: [String], // Spotify song IDs
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now }
});

export const Playlist = mongoose.model('Playlist', playlistSchema);
