/**
 * API Route: /api/swipe/sessions/[id]
 * Handle individual swipe session operations
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getSwipeSessionById,
  getSessionInteractions,
  getSessionStats,
} from '@/services/swipe-service';

// GET - Get swipe session by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const includeInteractions = searchParams.get('include_interactions') === 'true';
    const includeStats = searchParams.get('include_stats') === 'true';

    const session = await getSwipeSessionById(id);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.user_id !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const response: any = { session };

    if (includeInteractions) {
      response.interactions = await getSessionInteractions(id);
    }

    if (includeStats) {
      response.stats = await getSessionStats(id);
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Get swipe session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get swipe session' },
      { status: 500 }
    );
  }
}
