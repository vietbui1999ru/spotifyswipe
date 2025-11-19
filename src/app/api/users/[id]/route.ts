/**
 * API Route: /api/users/[id]
 * Handle user operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUser } from '@/services/user-service';

// GET - Get user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserById(id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Remove sensitive data
    const { spotify_access_token, spotify_refresh_token, ...safeUser } = user;

    return NextResponse.json(safeUser);
  } catch (error: any) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get user' },
      { status: 500 }
    );
  }
}

// PATCH - Update user profile
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.cookies.get('user_id')?.value;

    if (!userId || userId !== id) {
      return NextResponse.json(
        { error: 'Not authorized to update this user' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, display_name, bio, avatar_url } = body;

    const updates: any = {};
    if (username !== undefined) updates.username = username;
    if (display_name !== undefined) updates.display_name = display_name;
    if (bio !== undefined) updates.bio = bio;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    const user = await updateUser(id, updates);

    // Remove sensitive data
    const { spotify_access_token, spotify_refresh_token, ...safeUser } = user;

    return NextResponse.json(safeUser);
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}
