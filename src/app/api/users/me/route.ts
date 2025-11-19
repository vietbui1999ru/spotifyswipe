/**
 * API Route: /api/users/me
 * Get current authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/services/user-service';

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Remove sensitive data but keep tokens for client use
    const { spotify_access_token, spotify_refresh_token, ...safeUser } = user;

    return NextResponse.json({
      ...safeUser,
      hasSpotifyToken: !!spotify_access_token,
    });
  } catch (error: any) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get current user' },
      { status: 500 }
    );
  }
}
