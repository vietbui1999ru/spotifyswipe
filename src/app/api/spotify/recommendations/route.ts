/**
 * API Route: /api/spotify/recommendations
 * Get Spotify recommendations based on seeds
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/services/user-service';
import { getRecommendations } from '@/lib/spotify-api';

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
    const seedTracks = searchParams.get('seed_tracks')?.split(',').filter(Boolean);
    const seedArtists = searchParams.get('seed_artists')?.split(',').filter(Boolean);
    const seedGenres = searchParams.get('seed_genres')?.split(',').filter(Boolean);
    const limit = parseInt(searchParams.get('limit') || '20');
    const targetEnergy = searchParams.get('target_energy')
      ? parseFloat(searchParams.get('target_energy')!)
      : undefined;
    const targetValence = searchParams.get('target_valence')
      ? parseFloat(searchParams.get('target_valence')!)
      : undefined;
    const targetDanceability = searchParams.get('target_danceability')
      ? parseFloat(searchParams.get('target_danceability')!)
      : undefined;

    const recommendations = await getRecommendations(user.spotify_access_token, {
      seedTracks,
      seedArtists,
      seedGenres,
      limit,
      targetEnergy,
      targetValence,
      targetDanceability,
    });

    return NextResponse.json(recommendations);
  } catch (error: any) {
    console.error('Recommendations error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}
