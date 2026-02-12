import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
	spotifyId: { type: String, unique: true, required: true },
	displayName: String,
	email: String,
	avatarUrl: String,
	spotifyAccessToken: String, // base64-encoded via utils/encryption
	spotifyRefreshToken: String, // base64-encoded via utils/encryption
	spotifyTokenExpiresAt: Date,
	createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);
