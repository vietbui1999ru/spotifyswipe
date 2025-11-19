/**
 * API Route: /api/spotify/top-artists
 * Get user's top artists from Spotify
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/services/user-service';
import { getUserTopArtists } from '@/lib/spotify-api';

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

    const topArtists = await getUserTopArtists(user.spotify_access_token, timeRange, limit);

    return NextResponse.json(topArtists);
  } catch (error: any) {
    console.error('Top artists error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get top artists' },
      { status: 500 }
    );
  }
}
