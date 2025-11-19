/**
 * API Route: /api/auth/spotify/authorize
 * Redirects to Spotify authorization URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSpotifyAuthUrl } from '@/lib/spotify-auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Try to get from URL params first (from login route), then fall back to cookies
    const codeVerifier = searchParams.get('code_verifier') || request.cookies.get('spotify_code_verifier')?.value;
    const state = searchParams.get('state') || request.cookies.get('spotify_auth_state')?.value;

    console.log('Code verifier received:', !!codeVerifier);
    console.log('State received:', !!state);

    if (!codeVerifier || !state) {
      console.error('Missing auth data - code_verifier:', !!codeVerifier, 'state:', !!state);
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
    console.log('Redirecting to Spotify auth URL:', authUrl.substring(0, 100) + '...');

    // Create response with cookies set before redirecting to Spotify
    const response = NextResponse.redirect(authUrl);

    // Ensure cookies are set for the callback
    response.cookies.set('spotify_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    response.cookies.set('spotify_auth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Spotify authorization error:', error);
    return NextResponse.redirect(
      new URL('/auth/error?message=Authorization failed', request.url)
    );
  }
}
