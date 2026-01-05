import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { encryptToken } from '../utils/encryption';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import qs from 'qs';
import axios from 'axios';
import crypto from 'crypto';

const router = Router();

// In-memory cache for PKCE code challenges with 10-minute TTL
interface CodeChallengeEntry {
	codeChallenge: string;
	expiresAt: number;
}

const codeChallengeCache = new Map<string, CodeChallengeEntry>();

// Helper function to validate PKCE code_verifier
function validatePKCE(codeVerifier: string, codeChallenge: string): boolean {
	// Generate SHA256 hash of code_verifier
	const hash = crypto.createHash('sha256').update(codeVerifier).digest();
	// Convert to base64url (standard PKCE format)
	const computedChallenge = hash.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
	return computedChallenge === codeChallenge;
}

// Cleanup expired code challenges every minute
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of codeChallengeCache.entries()) {
		if (entry.expiresAt < now) {
			codeChallengeCache.delete(key);
		}
	}
}, 60000);

// GET /api/auth/login - Returns Spotify OAuth URL with PKCE support
router.get('/login', (req: AuthRequest, res: Response) => {
	try {
		const codeChallenge = req.query.code_challenge as string;

		if (!codeChallenge) {
			return res.status(400).json({ success: false, error: 'code_challenge query parameter required' });
		}

		const scopes = [
			'user-read-email',
			'user-read-private',
			'playlist-read-private',
			'playlist-read-collaborative',
			'user-library-read',
			'user-top-read' // Required for recommendations fallback (top artists/tracks)
		];

		const state = crypto.randomBytes(16).toString('hex');

		// Store code_challenge in cache with 10-minute TTL
		const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
		codeChallengeCache.set(state, { codeChallenge, expiresAt });

		const authUrl = new URL('https://accounts.spotify.com/authorize');
		authUrl.searchParams.append('client_id', process.env.SPOTIFY_CLIENT_ID!);
		authUrl.searchParams.append('response_type', 'code');
		authUrl.searchParams.append('redirect_uri', process.env.SPOTIFY_REDIRECT_URI!);
		authUrl.searchParams.append('scope', scopes.join(' '));
		authUrl.searchParams.append('state', state);
		authUrl.searchParams.append('code_challenge', codeChallenge);
		authUrl.searchParams.append('code_challenge_method', 'S256');

		res.json({
			success: true,
			data: {
				url: authUrl.toString()
			}
		});
		console.log('Auth login success:', authUrl.toString());
	} catch (error) {
		console.error('Auth login error:', error);
		res.status(500).json({ success: false, error: 'Failed to generate login URL' });
	}
});

// POST /api/auth/callback - Exchange authorization code for tokens with PKCE validation
router.post('/callback', async (req: AuthRequest, res: Response) => {
	try {
		const { code, state, code_verifier } = req.body;

		if (!code) {
			return res.status(400).json({ success: false, error: 'Code required' });
		}

		if (!state) {
			return res.status(400).json({ success: false, error: 'State required' });
		}

		if (!code_verifier) {
			return res.status(400).json({ success: false, error: 'code_verifier required' });
		}

		// Retrieve stored code_challenge from cache
		const cacheEntry = codeChallengeCache.get(state);
		if (!cacheEntry) {
			return res.status(401).json({ success: false, error: 'Invalid or expired state' });
		}

		// Validate PKCE: SHA256(code_verifier) must equal stored code_challenge
		if (!validatePKCE(code_verifier, cacheEntry.codeChallenge)) {
			return res.status(401).json({ success: false, error: 'Invalid code_verifier' });
		}

		// Clear the code_challenge from cache after validation
		codeChallengeCache.delete(state);

		// Exchange code with Spotify
		const tokenResponse = await axios.post(
			'https://accounts.spotify.com/api/token',
			qs.stringify({
				grant_type: 'authorization_code',
				code,
				redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
				client_id: process.env.SPOTIFY_CLIENT_ID,
				client_secret: process.env.SPOTIFY_CLIENT_SECRET
			}),
			{
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
			}
		);

		// Get user profile
		const profileResponse = await axios.get('https://api.spotify.com/v1/me', {
			headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }
		});
		console.log('Auth callback success:', profileResponse.data);

		// Save user
		const updateData: any = {
			spotifyId: profileResponse.data.id,
			displayName: profileResponse.data.display_name,
			email: profileResponse.data.email,
			avatarUrl: profileResponse.data.images?.[0]?.url || null,
			spotifyAccessToken: encryptToken(tokenResponse.data.access_token),
			spotifyTokenExpiresAt: new Date(Date.now() + tokenResponse.data.expires_in * 1000)
		};

		if (tokenResponse.data.refresh_token) {
			updateData.spotifyRefreshToken = encryptToken(tokenResponse.data.refresh_token);
		}

		const user = await User.findOneAndUpdate(
			{ spotifyId: profileResponse.data.id },
			updateData,
			{ upsert: true, new: true }
		);

		// Create JWT (7-day expiry to match MASTERPLAN)
		const jwtToken = jwt.sign(
			{ userId: user._id },
			process.env.JWT_SECRET!,
			{ expiresIn: '7d' }
		);

		// Set httpOnly cookie (7-day expiry)
		res.cookie('jwt', jwtToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			path: '/',
			maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
		});

		res.json({
			success: true,
			data: {
				user: {
					id: user._id,
					spotifyId: user.spotifyId,
					displayName: user.displayName,
					email: user.email,
					avatarUrl: user.avatarUrl
				}
			}
		});
	} catch (error) {
		console.error('Auth callback error:', error);
		res.status(500).json({ success: false, error: 'Auth failed' });
	}
});

// GET /api/auth/me (protected) - Returns current authenticated user
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
	try {
		const user = await User.findById(req.userId).select('-spotifyAccessToken -spotifyRefreshToken');
		if (!user) {
			return res.status(404).json({ success: false, error: 'User not found' });
		}

		res.json({
			success: true,
			data: {
				user: {
					id: user._id,
					spotifyId: user.spotifyId,
					displayName: user.displayName,
					email: user.email,
					avatarUrl: user.avatarUrl
				}
			}
		});
	} catch (error) {
		console.error('Failed to fetch user:', error);
		res.status(500).json({ success: false, error: 'Failed to fetch user' });
	}
});

// POST /api/auth/logout (protected) - Clears JWT cookie
router.post('/logout', authMiddleware, (req: AuthRequest, res: Response) => {
	res.clearCookie('jwt', { path: '/' });
	res.json({
		success: true,
		data: {
			message: 'Logged out successfully'
		}
	});
});

export default router;
