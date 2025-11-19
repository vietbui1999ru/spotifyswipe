/**
 * API Route: /api/auth/spotify/login
 * Initiates Spotify OAuth flow with PKCE
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateRandomString, getSpotifyAuthUrl } from '@/lib/spotify-auth';

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return NextResponse.redirect(
        new URL('/auth/error?message=Spotify configuration missing', request.url)
      );
    }

    // Generate code verifier and state
    const codeVerifier = generateRandomString(64);
    const state = generateRandomString(16);

    console.log('[Auth] Initiating login flow');
    console.log('[Auth] Code verifier generated:', codeVerifier.substring(0, 10) + '...');
    console.log('[Auth] State generated:', state);

    // Build Spotify authorization URL
    const authUrl = await getSpotifyAuthUrl(clientId, redirectUri, codeVerifier, state);

    console.log('[Auth] Redirecting to Spotify authorization...');

    // Create response with redirect to Spotify
    const response = NextResponse.redirect(authUrl);

    // Store code verifier and state in cookies for the callback
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

    console.log('[Auth] Cookies set, redirecting...');

    return response;
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return NextResponse.redirect(
      new URL('/auth/error?message=Failed to initiate login', request.url)
    );
  }
}
