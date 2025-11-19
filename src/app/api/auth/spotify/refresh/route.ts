/**
 * API Route: /api/auth/spotify/refresh
 * Refreshes Spotify access token
 */

import { NextRequest, NextResponse } from 'next/server';
import { refreshSpotifyToken } from '@/lib/spotify-auth';
import { getUserById, updateUserSpotifyTokens } from '@/services/user-service';

export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await getUserById(userId);

    if (!user || !user.spotify_refresh_token) {
      return NextResponse.json(
        { error: 'User not found or no refresh token' },
        { status: 401 }
      );
    }

    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Spotify configuration missing' },
        { status: 500 }
      );
    }

    // Refresh the token
    const tokenResponse = await refreshSpotifyToken(
      user.spotify_refresh_token,
      clientId,
      clientSecret
    );

    // Calculate new expiration
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString();

    // Update user in database
    await updateUserSpotifyTokens(
      userId,
      tokenResponse.access_token,
      tokenResponse.refresh_token,
      expiresAt
    );

    return NextResponse.json({
      access_token: tokenResponse.access_token,
      expires_in: tokenResponse.expires_in,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
}
