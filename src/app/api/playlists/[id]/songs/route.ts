/**
 * API Route: /api/playlists/[id]/songs
 * Handle playlist songs operations
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getPlaylistSongs,
  addSongToPlaylist,
  removeSongFromPlaylist,
} from '@/services/playlist-service';

// GET - Get playlist songs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const songs = await getPlaylistSongs(id);
    return NextResponse.json({ songs });
  } catch (error: any) {
    console.error('Get playlist songs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get playlist songs' },
      { status: 500 }
    );
  }
}

// POST - Add song to playlist
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { spotify_track_id, track_data, position } = body;

    if (!spotify_track_id || !track_data) {
      return NextResponse.json(
        { error: 'spotify_track_id and track_data are required' },
        { status: 400 }
      );
    }

    const song = await addSongToPlaylist(
      id,
      spotify_track_id,
      track_data,
      position
    );

    return NextResponse.json(song, { status: 201 });
  } catch (error: any) {
    console.error('Add song to playlist error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add song to playlist' },
      { status: 500 }
    );
  }
}

// DELETE - Remove song from playlist
export async function DELETE(
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
    const spotifyTrackId = searchParams.get('spotify_track_id');

    if (!spotifyTrackId) {
      return NextResponse.json(
        { error: 'spotify_track_id is required' },
        { status: 400 }
      );
    }

    await removeSongFromPlaylist(id, spotifyTrackId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Remove song from playlist error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove song from playlist' },
      { status: 500 }
    );
  }
}
