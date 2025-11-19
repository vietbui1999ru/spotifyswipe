/**
 * API Route: /api/spotify/search
 * Search Spotify for tracks, artists, albums, playlists
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/services/user-service';
import { search } from '@/lib/spotify-api';

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
    const query = searchParams.get('q');
    const types = searchParams.get('type')?.split(',') as ('track' | 'artist' | 'album' | 'playlist')[];
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || !types || types.length === 0) {
      return NextResponse.json(
        { error: 'Missing required parameters: q and type' },
        { status: 400 }
      );
    }

    const results = await search(user.spotify_access_token, query, types, limit);

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search' },
      { status: 500 }
    );
  }
}
