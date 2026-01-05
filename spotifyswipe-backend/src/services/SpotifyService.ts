import axios from 'axios';
import { User } from '../models/User';
import { decryptToken, encryptToken } from '../utils/encryption';
import qs from 'qs';

export class SpotifyService {
	private static readonly API_BASE = 'https://api.spotify.com/v1';
	private static readonly TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';

	/**
	 * Get valid access token, refreshing if necessary
	 */
	static async getValidAccessToken(userId: string): Promise<string> {
		const user = await User.findById(userId);
		if (!user) throw new Error('User not found');

		// Check if token is expired or expiring within 5 minutes
		const now = new Date();
		const expiresAt = new Date(user.spotifyTokenExpiresAt!);
		const bufferTime = 5 * 60 * 1000; // 5 minutes

		if (now.getTime() + bufferTime >= expiresAt.getTime()) {
			// Token expired or expiring soon, refresh it
			await this.refreshAccessToken(userId);
			const updatedUser = await User.findById(userId);
			if (!updatedUser) throw new Error('User not found');
			return decryptToken(updatedUser.spotifyAccessToken!);
		}

		return decryptToken(user.spotifyAccessToken!);
	}

	/**
	 * Refresh Spotify access token using refresh token
	 */
	static async refreshAccessToken(userId: string): Promise<void> {
		const user = await User.findById(userId);
		if (!user) throw new Error('User not found');

		try {
			const refreshToken = decryptToken(user.spotifyRefreshToken!);

			const response = await axios.post(
				this.TOKEN_ENDPOINT,
				qs.stringify({
					grant_type: 'refresh_token',
					refresh_token: refreshToken,
					client_id: process.env.SPOTIFY_CLIENT_ID,
					client_secret: process.env.SPOTIFY_CLIENT_SECRET
				}),
				{
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
				}
			);

			// Update user with new tokens
			user.spotifyAccessToken = encryptToken(response.data.access_token);
			user.spotifyTokenExpiresAt = new Date(Date.now() + response.data.expires_in * 1000);

			// Refresh token might be returned, use it if provided
			if (response.data.refresh_token) {
				user.spotifyRefreshToken = encryptToken(response.data.refresh_token);
			}

			await user.save();
		} catch (error) {
			console.error('Error refreshing Spotify token:', error);
			throw new Error('Failed to refresh Spotify token');
		}
	}

	/**
	 * Get user's playlists from Spotify
	 */
	static async getUserPlaylists(
		userId: string,
		limit: number = 20,
		offset: number = 0
	): Promise<any> {
		const accessToken = await this.getValidAccessToken(userId);

		try {
			const response = await axios.get(`${this.API_BASE}/me/playlists`, {
				headers: { Authorization: `Bearer ${accessToken}` },
				params: { limit, offset }
			});

			// Transform response to match MASTERPLAN spec
			return {
				playlists: response.data.items.map((playlist: any) => ({
					id: playlist.id,
					name: playlist.name,
					description: playlist.description,
					imageUrl: playlist.images?.[0]?.url || null,
					trackCount: playlist.tracks.total,
					owner: playlist.owner.id
				})),
				total: response.data.total,
				limit,
				offset
			};
		} catch (error) {
			console.error('Error fetching Spotify playlists:', error);
			throw new Error('Failed to fetch playlists');
		}
	}

	/**
	 * Get personalized recommendations from Spotify
	 * Now uses Search API instead of deprecated Recommendations API
	 * Maintains complete backward compatibility with existing callers
	 */
	static async getRecommendations(
		userId: string,
		seedTrackIds: string[] = [],
		seedArtistIds: string[] = [],
		seedGenres: string[] = [],
		limit: number = 20
	): Promise<any> {
		// Validate seed parameters (max 5 total, at least 1)
		const totalSeeds = seedTrackIds.length + seedArtistIds.length + seedGenres.length;
		if (totalSeeds === 0 || totalSeeds > 5) {
			throw new Error('Must provide 1-5 seeds total (tracks + artists + genres)');
		}

		try {
			let searchQuery = '';

			// Step 1: Build search query from genre seeds
			if (seedGenres.length > 0) {
				searchQuery = seedGenres.map(g => `genre:"${g}"`).join(' OR ');
			}

			// Step 2: Build search query from artist seeds
			if (seedArtistIds.length > 0) {
				const artists = await Promise.all(
					seedArtistIds.slice(0, 5).map(id => this.getArtistDetails(userId, id))
				);
				const artistQuery = artists.map(a => `artist:"${a.name}"`).join(' OR ');
				searchQuery = searchQuery ? `${searchQuery} ${artistQuery}` : artistQuery;
			}

			// Step 3: Build search query from track seeds (using artist names)
			if (seedTrackIds.length > 0) {
				const tracks = await Promise.all(
					seedTrackIds.slice(0, 5).map(id => this.getTrackDetails(userId, id))
				);
				const trackArtists = tracks.flatMap(t => t.artists.map((a: any) => a.name));
				const uniqueArtists = [...new Set(trackArtists)];
				const artistQuery = uniqueArtists.map(a => `artist:"${a}"`).join(' OR ');
				searchQuery = searchQuery ? `${searchQuery} ${artistQuery}` : artistQuery;
			}

			// Step 4: Fallback to user's top artists if no seeds provided
			// This shouldn't happen due to validation, but is a safety net
			if (!searchQuery) {
				const topArtists = await this.getTopArtists(userId, 5);
				searchQuery = topArtists.map((a: any) => `artist:"${a.name}"`).join(' OR ');
			}

			// Step 5: Execute search with double the limit to allow filtering
			const results = await this.searchTracks(userId, searchQuery, limit * 2, 0);

			// Step 6: Filter results for quality and availability
			// Remove tracks without preview URLs and low popularity tracks
			const filteredTracks = results.tracks.items
				.filter((track: any) => track.preview_url !== null)
				.filter((track: any) => track.popularity > 30)
				.slice(0, limit);

			// Step 7: Shuffle results for variety
			const shuffled = filteredTracks.sort(() => Math.random() - 0.5);

			// Step 8: Transform response to match MASTERPLAN spec (backward compatible)
			return {
				tracks: shuffled.map((track: any) => ({
					id: track.id,
					name: track.name,
					artists: track.artists.map((artist: any) => ({
						id: artist.id,
						name: artist.name
					})),
					album: {
						id: track.album.id,
						name: track.album.name,
						imageUrl: track.album.images?.[0]?.url || null
					},
					durationMs: track.duration_ms,
					previewUrl: track.preview_url,
					popularity: track.popularity
				}))
			};
		} catch (error) {
			console.error('Error fetching recommendations:', error);
			throw new Error('Failed to fetch recommendations');
		}
	}

	/**
	 * Get details for multiple tracks
	 */
	static async getTracks(userId: string, trackIds: string[]): Promise<any> {
		const accessToken = await this.getValidAccessToken(userId);

		try {
			const response = await axios.get(`${this.API_BASE}/tracks`, {
				headers: { Authorization: `Bearer ${accessToken}` },
				params: {
					ids: trackIds.slice(0, 50).join(',') // API limit is 50
				}
			});

			return response.data.tracks.map((track: any) => ({
				id: track.id,
				name: track.name,
				artists: track.artists.map((artist: any) => ({
					id: artist.id,
					name: artist.name
				})),
				album: {
					id: track.album.id,
					name: track.album.name,
					imageUrl: track.album.images?.[0]?.url || null
				},
				durationMs: track.duration_ms,
				previewUrl: track.preview_url,
				popularity: track.popularity
			}));
		} catch (error) {
			console.error('Error fetching tracks:', error);
			throw new Error('Failed to fetch track details');
		}
	}

	/**
	 * Get top tracks from user's listening history
	 */
	static async getTopTracks(
		userId: string,
		limit: number = 20,
		timeRange: string = 'medium_term'
	): Promise<any> {
		const accessToken = await this.getValidAccessToken(userId);

		try {
			const response = await axios.get(`${this.API_BASE}/me/top/tracks`, {
				headers: { Authorization: `Bearer ${accessToken}` },
				params: { limit, time_range: timeRange }
			});

			return response.data.items.map((track: any) => ({
				id: track.id,
				name: track.name,
				artists: track.artists.map((artist: any) => ({
					id: artist.id,
					name: artist.name
				})),
				album: {
					id: track.album.id,
					name: track.album.name,
					imageUrl: track.album.images?.[0]?.url || null
				},
				durationMs: track.duration_ms,
				previewUrl: track.preview_url,
				popularity: track.popularity
			}));
		} catch (error) {
			console.error('Error fetching top tracks:', error);
			throw new Error('Failed to fetch top tracks');
		}
	}

	/**
	 * Get top artists from user's listening history
	 */
	static async getTopArtists(
		userId: string,
		limit: number = 20,
		timeRange: string = 'medium_term'
	): Promise<any> {
		const accessToken = await this.getValidAccessToken(userId);

		try {
			const response = await axios.get(`${this.API_BASE}/me/top/artists`, {
				headers: { Authorization: `Bearer ${accessToken}` },
				params: { limit, time_range: timeRange }
			});

			return response.data.items.map((artist: any) => ({
				id: artist.id,
				name: artist.name,
				genres: artist.genres,
				imageUrl: artist.images?.[0]?.url || null,
				popularity: artist.popularity
			}));
		} catch (error) {
			console.error('Error fetching top artists:', error);
			throw new Error('Failed to fetch top artists');
		}
	}

	/**
	 * Search for tracks using Spotify Search API
	 * Used for migrating from deprecated Recommendations API
	 */
	static async searchTracks(
		userId: string,
		query: string,
		limit: number = 20,
		offset: number = 0
	): Promise<any> {
		const accessToken = await this.getValidAccessToken(userId);

		console.log("this is the access token", accessToken);
		try {
			const response = await axios.get(`${this.API_BASE}/search`, {
				headers: { Authorization: `Bearer ${accessToken}` },
				params: {
					q: query,
					type: 'track',
					limit: Math.min(limit, 50), // API limit is 50
					offset
				}
			});

			return response.data;
		} catch (error) {
			console.error('Error searching tracks:', error);
			throw new Error('Failed to search tracks');
		}
	}

	/**
	 * Get details for a single track
	 * Used to fetch track metadata when building search queries
	 */
	static async getTrackDetails(userId: string, trackId: string): Promise<any> {
		const accessToken = await this.getValidAccessToken(userId);

		try {
			const response = await axios.get(`${this.API_BASE}/tracks/${trackId}`, {
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			return response.data;
		} catch (error) {
			console.error('Error fetching track details:', error);
			throw new Error('Failed to fetch track details');
		}
	}

	/**
	 * Get details for a single artist
	 * Used to fetch artist names when building search queries
	 */
	static async getArtistDetails(userId: string, artistId: string): Promise<any> {
		const accessToken = await this.getValidAccessToken(userId);

		try {
			const response = await axios.get(`${this.API_BASE}/artists/${artistId}`, {
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			return response.data;
		} catch (error) {
			console.error('Error fetching artist details:', error);
			throw new Error('Failed to fetch artist details');
		}
	}

	/**
	 * Search for playlists by genre/mood keyword
	 * Uses Spotify Search API with type=playlist filter
	 * Returns playlist metadata without full track details
	 */
	static async searchPlaylists(
		userId: string,
		query: string,
		limit: number = 10,
		offset: number = 0
	): Promise<any> {
		const accessToken = await this.getValidAccessToken(userId);

		try {
			// Validate query
			if (!query || query.trim().length === 0) {
				throw new Error('Query parameter cannot be empty');
			}

			const response = await axios.get(`${this.API_BASE}/search`, {
				headers: { Authorization: `Bearer ${accessToken}` },
				params: {
					q: query,
					type: "playlist",
					limit: Math.min(limit, 50), // API limit is 50
					offset
				}
			});

			// Transform response to match specification
			return {
				playlists: response.data.playlists.items.map((playlist: any) => ({
					id: playlist.id,
					name: playlist.name,
					description: playlist.description || '',
					imageUrl: playlist.images?.[0]?.url || null,
					trackCount: playlist.tracks.total,
					followers: playlist.followers?.total || 0,
					owner: playlist.owner.display_name || playlist.owner.id
				})),
				total: response.data.playlists.total,
				limit,
				offset
			};
		} catch (error) {
			console.error('Error searching playlists:', error);
			throw new Error('Failed to search playlists');
		}
	}

	/**
	 * Get all tracks from a Spotify playlist
	 * Handles pagination automatically up to 500 tracks max
	 * Filters out tracks without preview URLs by default
	 */
	static async getPlaylistTracks(
		userId: string,
		playlistId: string,
		filterPreview: boolean = true,
		maxTracks: number = 500
	): Promise<any> {
		const accessToken = await this.getValidAccessToken(userId);

		try {
			// Step 1: Fetch playlist details (name and track count)
			const playlistResponse = await axios.get(
				`${this.API_BASE}/playlists/${playlistId}`,
				{
					headers: { Authorization: `Bearer ${accessToken}` },
					params: { fields: 'name,tracks.total' }
				}
			);

			const playlistName = playlistResponse.data.name;
			const totalTracks = playlistResponse.data.tracks.total;

			// Step 2: Fetch tracks from playlist (with pagination)
			const allTracks: any[] = [];
			const tracksToFetch = Math.min(totalTracks, maxTracks);
			const batchSize = 100; // Spotify API limit is 100 tracks per request

			for (let offset = 0; offset < tracksToFetch; offset += batchSize) {
				const limit = Math.min(batchSize, tracksToFetch - offset);

				const tracksResponse = await axios.get(
					`${this.API_BASE}/playlists/${playlistId}/tracks`,
					{
						headers: { Authorization: `Bearer ${accessToken}` },
						params: {
							limit,
							offset,
							fields: 'items(track(id,name,artists,album,duration_ms,preview_url,popularity))'
						}
					}
				);

				allTracks.push(...tracksResponse.data.items);
			}

			// Step 3: Transform and filter tracks
			let transformedTracks = allTracks.map((item: any) => {
				const track = item.track;
				return {
					id: track.id,
					name: track.name,
					artists: track.artists.map((artist: any) => ({
						id: artist.id,
						name: artist.name
					})),
					album: {
						id: track.album.id,
						name: track.album.name,
						imageUrl: track.album.images?.[0]?.url || null
					},
					durationMs: track.duration_ms,
					previewUrl: track.preview_url,
					popularity: track.popularity
				};
			});

			// Step 4: Filter out tracks without preview URLs if requested
			if (filterPreview) {
				transformedTracks = transformedTracks.filter((track: any) => track.previewUrl !== null);
			}

			// Step 5: Return result with pagination info
			return {
				playlistId,
				playlistName,
				tracks: transformedTracks,
				total: totalTracks,
				hasMore: totalTracks > maxTracks
			};
		} catch (error) {
			console.error('Error fetching playlist tracks:', error);
			throw new Error('Failed to fetch playlist tracks');
		}
	}
}
