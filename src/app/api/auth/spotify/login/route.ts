/**
 * API Route: /api/auth/spotify/login
 * Initiates Spotify OAuth flow with PKCE
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateRandomString } from '@/lib/spotify-auth';

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: 'Spotify configuration missing' },
        { status: 500 }
      );
    }

    // Generate code verifier and state
    const codeVerifier = generateRandomString(64);
    const state = generateRandomString(16);
    console.log('Code verifier:', codeVerifier);
    console.log('State:', state);

    // Store code verifier and state in a cookie for the callback
    // Pass them as URL params to authorize route to avoid cookie timing issues
    const authorizeUrl = new URL('/api/auth/spotify/authorize', request.url);
    authorizeUrl.searchParams.set('code_verifier', codeVerifier);
    authorizeUrl.searchParams.set('state', state);

    const response = NextResponse.redirect(authorizeUrl);
    console.log('Redirecting to authorize route...');

    // Also set cookies as backup and for the callback
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
    console.error('Spotify login error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Spotify login' },
      { status: 500 }
    );
  }
}
