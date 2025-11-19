/**
 * API Route: /api/spotify/top-tracks
 * Get user's top tracks from Spotify
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/services/user-service';
import { getUserTopTracks } from '@/lib/spotify-api';

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getUserById(userId);
    if (!user || !user.spotify_access_token) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const timeRange = (searchParams.get('time_range') || 'medium_term') as
      | 'short_term'
      | 'medium_term'
      | 'long_term';
    const limit = parseInt(searchParams.get('limit') || '20');

    const topTracks = await getUserTopTracks(user.spotify_access_token, timeRange, limit);

    return NextResponse.json(topTracks);
  } catch (error: any) {
    console.error('Top tracks error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get top tracks' },
      { status: 500 }
    );
  }
}
