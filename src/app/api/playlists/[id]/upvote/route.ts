/**
 * API Route: /api/playlists/[id]/upvote
 * Handle playlist upvoting
 */

import { NextRequest, NextResponse } from 'next/server';
import { upvotePlaylist, downvotePlaylist } from '@/services/playlist-service';

// POST - Upvote playlist
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const playlist = await upvotePlaylist(id);
    return NextResponse.json(playlist);
  } catch (error: any) {
    console.error('Upvote playlist error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upvote playlist' },
      { status: 500 }
    );
  }
}

// DELETE - Downvote playlist (remove upvote)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const playlist = await downvotePlaylist(id);
    return NextResponse.json(playlist);
  } catch (error: any) {
    console.error('Downvote playlist error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to downvote playlist' },
      { status: 500 }
    );
  }
}
