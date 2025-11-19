/**
 * API Route: /api/auth/spotify/authorize
 * Redirects to Spotify authorization URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSpotifyAuthUrl } from '@/lib/spotify-auth';

export async function GET(request: NextRequest) {
  try {
    const codeVerifier = request.cookies.get('spotify_code_verifier')?.value;
    const state = request.cookies.get('spotify_auth_state')?.value;

    if (!codeVerifier || !state) {
      return NextResponse.redirect(
        new URL('/auth/error?message=Missing authentication data', request.url)
      );
    }

    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: 'Spotify configuration missing' },
        { status: 500 }
      );
    }

    const authUrl = await getSpotifyAuthUrl(clientId, redirectUri, codeVerifier, state);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Spotify authorization error:', error);
    return NextResponse.redirect(
      new URL('/auth/error?message=Authorization failed', request.url)
    );
  }
}
