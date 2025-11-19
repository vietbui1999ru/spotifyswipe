/**
 * API Route: /api/auth/spotify/callback
 * Handles Spotify OAuth callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/spotify-auth';
import { getCurrentUserProfile } from '@/lib/spotify-api';
import { getOrCreateUserFromSpotify } from '@/services/user-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for errors from Spotify
    if (error) {
      return NextResponse.redirect(
        new URL(`/auth/error?message=${encodeURIComponent(error)}`, request.url)
      );
    }

    // Verify we have the authorization code
    if (!code) {
      return NextResponse.redirect(
        new URL('/auth/error?message=No authorization code received', request.url)
      );
    }

    // Get stored state and code verifier from cookies
    const storedState = request.cookies.get('spotify_auth_state')?.value;
    const codeVerifier = request.cookies.get('spotify_code_verifier')?.value;

    console.log('Auth callback:', {
      hasCode: !!code,
      hasState: !!state,
      hasStoredState: !!storedState,
      stateMatch: state === storedState,
      hasCodeVerifier: !!codeVerifier,
    });

    // Verify state matches (CSRF protection)
    if (!storedState || !state || storedState !== state) {
      console.error('State mismatch:', { state, storedState });
      return NextResponse.redirect(
        new URL('/auth/error?message=State verification failed. Please try logging in again.', request.url)
      );
    }

    // Verify we have the code verifier
    if (!codeVerifier) {
      console.error('Code verifier missing');
      return NextResponse.redirect(
        new URL('/auth/error?message=Authentication session expired. Please try again.', request.url)
      );
    }

    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return NextResponse.redirect(
        new URL('/auth/error?message=Server configuration error', request.url)
      );
    }

    // Exchange code for tokens
    const tokenResponse = await exchangeCodeForToken(
      code,
      codeVerifier,
      clientId,
      redirectUri
    );

    // Get user profile from Spotify
    const spotifyProfile = await getCurrentUserProfile(tokenResponse.access_token);

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString();

    // Create or update user in database
    const user = await getOrCreateUserFromSpotify(
      spotifyProfile,
      tokenResponse.access_token,
      tokenResponse.refresh_token,
      expiresAt
    );

    console.log('User authenticated:', { userId: user.id, username: user.username });

    // Create response with redirect to dashboard
    const response = NextResponse.redirect(new URL('/dashboard', request.url));

    // Set session cookie with user ID
    response.cookies.set('user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Clear temporary cookies
    response.cookies.set('spotify_code_verifier', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    response.cookies.set('spotify_auth_state', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Spotify callback error:', error);
    const errorMessage = error?.message || 'Authentication failed';
    return NextResponse.redirect(
      new URL(`/auth/error?message=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}
