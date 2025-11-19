/**
 * API Route: /api/swipe/interactions
 * Handle swipe interactions (like, dislike, skip)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  recordSwipeInteraction,
  getUserLikedSongs,
  getUserDislikedSongs,
} from '@/services/swipe-service';

// GET - Get user's liked/disliked songs
export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // 'like' or 'dislike'
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (type === 'like') {
      const { interactions, total } = await getUserLikedSongs(userId, limit, offset);
      return NextResponse.json({ interactions, total });
    } else if (type === 'dislike') {
      const { interactions, total } = await getUserDislikedSongs(userId, limit, offset);
      return NextResponse.json({ interactions, total });
    }

    return NextResponse.json(
      { error: 'Invalid type parameter. Must be "like" or "dislike"' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Get interactions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get interactions' },
      { status: 500 }
    );
  }
}

// POST - Record a swipe interaction
export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { session_id, spotify_track_id, track_data, interaction_type } = body;

    if (!session_id || !spotify_track_id || !track_data || !interaction_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['like', 'dislike', 'skip'].includes(interaction_type)) {
      return NextResponse.json(
        { error: 'Invalid interaction_type. Must be "like", "dislike", or "skip"' },
        { status: 400 }
      );
    }

    const interaction = await recordSwipeInteraction({
      session_id,
      user_id: userId,
      spotify_track_id,
      track_data,
      interaction_type,
    });

    return NextResponse.json(interaction, { status: 201 });
  } catch (error: any) {
    console.error('Record interaction error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record interaction' },
      { status: 500 }
    );
  }
}
