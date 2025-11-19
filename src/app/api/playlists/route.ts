/**
 * API Route: /api/playlists
 * Handle playlist CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createPlaylist,
  getPublicPlaylists,
  getUserPlaylists,
} from '@/services/playlist-service';

// GET - Get all public playlists or user's playlists
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const orderBy = (searchParams.get('order_by') || 'created_at') as
      | 'created_at'
      | 'updated_at'
      | 'upvotes';

    if (userId) {
      const playlists = await getUserPlaylists(userId);
      return NextResponse.json({ playlists });
    }

    const { playlists, total } = await getPublicPlaylists(limit, offset, orderBy);
    return NextResponse.json({ playlists, total });
  } catch (error: any) {
    console.error('Get playlists error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get playlists' },
      { status: 500 }
    );
  }
}

// POST - Create a new playlist
export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, image_url, is_public } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 }
      );
    }

    const playlist = await createPlaylist({
      name,
      description,
      image_url: image_url || '',
      owner_id: userId,
      is_public: is_public !== undefined ? is_public : true,
    });

    return NextResponse.json(playlist, { status: 201 });
  } catch (error: any) {
    console.error('Create playlist error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create playlist' },
      { status: 500 }
    );
  }
}
