/**
 * API Route: /api/playlists/[id]
 * Handle individual playlist operations
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getPlaylistWithDetails,
  updatePlaylist,
  deletePlaylist,
} from '@/services/playlist-service';

// GET - Get playlist by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const playlist = await getPlaylistWithDetails(id);

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    return NextResponse.json(playlist);
  } catch (error: any) {
    console.error('Get playlist error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get playlist' },
      { status: 500 }
    );
  }
}

// PATCH - Update playlist
export async function PATCH(
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
    const { name, description, image_url, is_public } = body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (image_url !== undefined) updates.image_url = image_url;
    if (is_public !== undefined) updates.is_public = is_public;

    const playlist = await updatePlaylist(id, updates);

    return NextResponse.json(playlist);
  } catch (error: any) {
    console.error('Update playlist error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update playlist' },
      { status: 500 }
    );
  }
}

// DELETE - Delete playlist
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

    await deletePlaylist(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete playlist error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete playlist' },
      { status: 500 }
    );
  }
}
