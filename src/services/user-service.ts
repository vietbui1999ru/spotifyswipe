/**
 * User Service
 * CRUD operations for user data in Supabase
 */

import { supabase, supabaseAdmin } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type UserRow = Database['public']['Tables']['users']['Row'];
type UserInsert = Database['public']['Tables']['users']['Insert'];
type UserUpdate = Database['public']['Tables']['users']['Update'];

/**
 * Create a new user
 */
export async function createUser(userData: UserInsert): Promise<UserRow> {
  const { data, error } = await supabase
    .from('users')
    .insert(userData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return data;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to get user: ${error.message}`);
  }

  return data;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get user by email: ${error.message}`);
  }

  return data;
}

/**
 * Get user by Spotify ID
 */
export async function getUserBySpotifyId(spotifyId: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('spotify_id', spotifyId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get user by Spotify ID: ${error.message}`);
  }

  return data;
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get user by username: ${error.message}`);
  }

  return data;
}

/**
 * Update user
 */
export async function updateUser(userId: string, updates: UserUpdate): Promise<UserRow> {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }

  return data;
}

/**
 * Update user's Spotify tokens
 */
export async function updateUserSpotifyTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: string
): Promise<UserRow> {
  return updateUser(userId, {
    spotify_access_token: accessToken,
    spotify_refresh_token: refreshToken,
    spotify_token_expires_at: expiresAt,
  });
}

/**
 * Delete user (admin only)
 */
export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }
}

/**
 * Get all users (with pagination)
 */
export async function getAllUsers(
  limit = 50,
  offset = 0
): Promise<{ users: UserRow[]; total: number }> {
  const { data, error, count } = await supabase
    .from('users')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get users: ${error.message}`);
  }

  return { users: data || [], total: count || 0 };
}

/**
 * Search users by username or display name
 */
export async function searchUsers(query: string, limit = 20): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(limit);

  if (error) {
    throw new Error(`Failed to search users: ${error.message}`);
  }

  return data || [];
}

/**
 * Check if username is available
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const user = await getUserByUsername(username);
  return user === null;
}

/**
 * Check if email is available
 */
export async function isEmailAvailable(email: string): Promise<boolean> {
  const user = await getUserByEmail(email);
  return user === null;
}

/**
 * Get or create user from Spotify profile
 */
export async function getOrCreateUserFromSpotify(
  spotifyProfile: any,
  accessToken: string,
  refreshToken: string,
  expiresAt: string
): Promise<UserRow> {
  // Try to find existing user by Spotify ID
  let user = await getUserBySpotifyId(spotifyProfile.id);

  if (user) {
    // Update tokens
    return updateUserSpotifyTokens(user.id, accessToken, refreshToken, expiresAt);
  }

  // Try to find by email
  if (spotifyProfile.email) {
    user = await getUserByEmail(spotifyProfile.email);
    if (user) {
      // Link Spotify account to existing user
      return updateUser(user.id, {
        spotify_id: spotifyProfile.id,
        spotify_access_token: accessToken,
        spotify_refresh_token: refreshToken,
        spotify_token_expires_at: expiresAt,
        avatar_url: spotifyProfile.images?.[0]?.url || user.avatar_url,
      });
    }
  }

  // Create new user
  const newUser: UserInsert = {
    username: spotifyProfile.id, // Use Spotify ID as initial username
    display_name: spotifyProfile.display_name || spotifyProfile.id,
    email: spotifyProfile.email || `${spotifyProfile.id}@spotify.local`,
    avatar_url: spotifyProfile.images?.[0]?.url || '',
    is_premium: spotifyProfile.product === 'premium',
    spotify_id: spotifyProfile.id,
    spotify_access_token: accessToken,
    spotify_refresh_token: refreshToken,
    spotify_token_expires_at: expiresAt,
  };

  return createUser(newUser);
}
