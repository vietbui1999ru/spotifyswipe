/**
 * API Route: /api/swipe/sessions
 * Handle swipe session operations
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createSwipeSession,
  getUserSwipeSessions,
  getUserSwipeStats,
} from '@/services/swipe-service';

// GET - Get user's swipe sessions
export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const stats = searchParams.get('stats') === 'true';

    if (stats) {
      const statistics = await getUserSwipeStats(userId);
      return NextResponse.json(statistics);
    }

    const { sessions, total } = await getUserSwipeSessions(userId, limit, offset);
    return NextResponse.json({ sessions, total });
  } catch (error: any) {
    console.error('Get swipe sessions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get swipe sessions' },
      { status: 500 }
    );
  }
}

// POST - Create a new swipe session
export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { seed_pattern, seed_frequency, seed_category, seed_mood } = body;

    const session = await createSwipeSession({
      user_id: userId,
      seed_pattern,
      seed_frequency,
      seed_category,
      seed_mood,
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error: any) {
    console.error('Create swipe session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create swipe session' },
      { status: 500 }
    );
  }
}
