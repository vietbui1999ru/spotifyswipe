/**
 * Spotify Authentication with PKCE Flow
 * This module handles the Spotify OAuth 2.0 authorization code flow with PKCE
 */

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

/**
 * Generate a random string for code verifier
 */
export const generateRandomString = (length: number): string => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
};

/**
 * Generate SHA-256 hash
 */
const sha256 = async (plain: string): Promise<ArrayBuffer> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
};

/**
 * Base64 URL encode
 */
const base64encode = (input: ArrayBuffer): string => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

/**
 * Generate code challenge from verifier
 */
export const generateCodeChallenge = async (codeVerifier: string): Promise<string> => {
  const hashed = await sha256(codeVerifier);
  // console.log('Hashed:', hashed);
  return base64encode(hashed);
};

/**
 * Build Spotify authorization URL
 */
export const getSpotifyAuthUrl = async (
  clientId: string,
  redirectUri: string,
  codeVerifier: string,
  state?: string
): Promise<string> => {
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const scope = [
    'user-read-private',
    'user-read-email',
    'user-top-read',
    'user-read-recently-played',
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-library-read',
    'user-library-modify',
    'streaming',
    'user-read-playback-state',
    'user-modify-playback-state',
  ].join(' ');

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    scope,
    ...(state && { state }),
  });

  console.log('Params:', params.toString());
  return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
};

/**
 * Exchange authorization code for access token
 */
export const exchangeCodeForToken = async (
  code: string,
  codeVerifier: string,
  clientId: string,
  redirectUri: string
): Promise<SpotifyTokenResponse> => {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  });

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to exchange code for token: ${error.error_description || error.error}`);
  }

  return response.json();
};

/**
 * Refresh Spotify access token
 */
export const refreshSpotifyToken = async (
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<SpotifyTokenResponse> => {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to refresh token: ${error.error_description || error.error}`);
  }

  return response.json();
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (expiresAt: string): boolean => {
  const expirationTime = new Date(expiresAt).getTime();
  const currentTime = Date.now();
  // Add 5 minute buffer
  return currentTime >= expirationTime - 5 * 60 * 1000;
};

/**
 * Store tokens securely in localStorage (for client-side)
 */
export const storeTokens = (tokens: SpotifyTokenResponse): void => {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  localStorage.setItem('spotify_access_token', tokens.access_token);
  localStorage.setItem('spotify_refresh_token', tokens.refresh_token);
  localStorage.setItem('spotify_token_expires_at', expiresAt);
};

/**
 * Retrieve tokens from localStorage
 */
export const getStoredTokens = (): SpotifyStoredTokens | null => {
  const accessToken = localStorage.getItem('spotify_access_token');
  const refreshToken = localStorage.getItem('spotify_refresh_token');
  const expiresAt = localStorage.getItem('spotify_token_expires_at');

  if (!accessToken || !refreshToken || !expiresAt) {
    return null;
  }

  return { accessToken, refreshToken, expiresAt };
};

/**
 * Clear stored tokens
 */
export const clearStoredTokens = (): void => {
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_token_expires_at');
  localStorage.removeItem('spotify_code_verifier');
};

// Types
export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
}

export interface SpotifyStoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}
