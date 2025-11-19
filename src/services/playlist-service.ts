/**
 * Playlist Service
 * CRUD operations for playlist data in Supabase
 */

import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type PlaylistRow = Database['public']['Tables']['playlists']['Row'];
type PlaylistInsert = Database['public']['Tables']['playlists']['Insert'];
type PlaylistUpdate = Database['public']['Tables']['playlists']['Update'];
type PlaylistSongRow = Database['public']['Tables']['playlist_songs']['Row'];
type PlaylistSongInsert = Database['public']['Tables']['playlist_songs']['Insert'];
type CommentRow = Database['public']['Tables']['comments']['Row'];
type CommentInsert = Database['public']['Tables']['comments']['Insert'];

/**
 * Create a new playlist
 */
export async function createPlaylist(playlistData: PlaylistInsert): Promise<PlaylistRow> {
  const { data, error } = await supabase
    .from('playlists')
    .insert(playlistData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create playlist: ${error.message}`);
  }

  return data;
}

/**
 * Get playlist by ID
 */
export async function getPlaylistById(playlistId: string): Promise<PlaylistRow | null> {
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .eq('id', playlistId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get playlist: ${error.message}`);
  }

  return data;
}

/**
 * Get playlist with songs and owner details
 */
export async function getPlaylistWithDetails(playlistId: string): Promise<any> {
  const { data, error } = await supabase
    .from('playlists')
    .select(`
      *,
      owner:users!owner_id(*),
      songs:playlist_songs(*)
    `)
    .eq('id', playlistId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get playlist with details: ${error.message}`);
  }

  return data;
}

/**
 * Get all public playlists
 */
export async function getPublicPlaylists(
  limit = 50,
  offset = 0,
  orderBy: 'created_at' | 'updated_at' | 'upvotes' = 'created_at'
): Promise<{ playlists: any[]; total: number }> {
  const { data, error, count } = await supabase
    .from('playlists')
    .select(`
      *,
      owner:users!owner_id(id, username, display_name, avatar_url)
    `, { count: 'exact' })
    .eq('is_public', true)
    .range(offset, offset + limit - 1)
    .order(orderBy, { ascending: false });

  if (error) {
    throw new Error(`Failed to get public playlists: ${error.message}`);
  }

  return { playlists: data || [], total: count || 0 };
}

/**
 * Get playlists by user
 */
export async function getUserPlaylists(userId: string): Promise<PlaylistRow[]> {
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get user playlists: ${error.message}`);
  }

  return data || [];
}

/**
 * Update playlist
 */
export async function updatePlaylist(
  playlistId: string,
  updates: PlaylistUpdate
): Promise<PlaylistRow> {
  const { data, error } = await supabase
    .from('playlists')
    .update(updates)
    .eq('id', playlistId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update playlist: ${error.message}`);
  }

  return data;
}

/**
 * Delete playlist
 */
export async function deletePlaylist(playlistId: string): Promise<void> {
  const { error } = await supabase
    .from('playlists')
    .delete()
    .eq('id', playlistId);

  if (error) {
    throw new Error(`Failed to delete playlist: ${error.message}`);
  }
}

/**
 * Add song to playlist
 */
export async function addSongToPlaylist(
  playlistId: string,
  spotifyTrackId: string,
  trackData: any,
  position?: number
): Promise<PlaylistSongRow> {
  // Get current max position if not provided
  if (position === undefined) {
    const { data: songs } = await supabase
      .from('playlist_songs')
      .select('position')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: false })
      .limit(1);

    position = songs && songs.length > 0 ? songs[0].position + 1 : 0;
  }

  const songData: PlaylistSongInsert = {
    playlist_id: playlistId,
    spotify_track_id: spotifyTrackId,
    track_data: trackData,
    position,
  };

  const { data, error } = await supabase
    .from('playlist_songs')
    .insert(songData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add song to playlist: ${error.message}`);
  }

  // Update playlist's updated_at
  await supabase
    .from('playlists')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', playlistId);

  return data;
}

/**
 * Remove song from playlist
 */
export async function removeSongFromPlaylist(
  playlistId: string,
  spotifyTrackId: string
): Promise<void> {
  const { error } = await supabase
    .from('playlist_songs')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('spotify_track_id', spotifyTrackId);

  if (error) {
    throw new Error(`Failed to remove song from playlist: ${error.message}`);
  }

  // Update playlist's updated_at
  await supabase
    .from('playlists')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', playlistId);
}

/**
 * Get playlist songs
 */
export async function getPlaylistSongs(playlistId: string): Promise<PlaylistSongRow[]> {
  const { data, error } = await supabase
    .from('playlist_songs')
    .select('*')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true });

  if (error) {
    throw new Error(`Failed to get playlist songs: ${error.message}`);
  }

  return data || [];
}

/**
 * Reorder songs in playlist
 */
export async function reorderPlaylistSongs(
  playlistId: string,
  songId: string,
  newPosition: number
): Promise<void> {
  const { error } = await supabase
    .from('playlist_songs')
    .update({ position: newPosition })
    .eq('playlist_id', playlistId)
    .eq('id', songId);

  if (error) {
    throw new Error(`Failed to reorder playlist songs: ${error.message}`);
  }

  // Update playlist's updated_at
  await supabase
    .from('playlists')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', playlistId);
}

/**
 * Increment playlist upvotes
 */
export async function upvotePlaylist(playlistId: string): Promise<PlaylistRow> {
  const { data, error } = await supabase
    .rpc('increment_upvotes', { playlist_id: playlistId });

  if (error) {
    // Fallback if RPC doesn't exist
    const playlist = await getPlaylistById(playlistId);
    if (!playlist) throw new Error('Playlist not found');

    return updatePlaylist(playlistId, { upvotes: playlist.upvotes + 1 });
  }

  return data;
}

/**
 * Decrement playlist upvotes
 */
export async function downvotePlaylist(playlistId: string): Promise<PlaylistRow> {
  const playlist = await getPlaylistById(playlistId);
  if (!playlist) throw new Error('Playlist not found');

  const newUpvotes = Math.max(0, playlist.upvotes - 1);
  return updatePlaylist(playlistId, { upvotes: newUpvotes });
}

/**
 * Search playlists
 */
export async function searchPlaylists(
  query: string,
  limit = 20
): Promise<any[]> {
  const { data, error } = await supabase
    .from('playlists')
    .select(`
      *,
      owner:users!owner_id(id, username, display_name, avatar_url)
    `)
    .eq('is_public', true)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(limit);

  if (error) {
    throw new Error(`Failed to search playlists: ${error.message}`);
  }

  return data || [];
}

/**
 * Add comment to playlist
 */
export async function addComment(commentData: CommentInsert): Promise<CommentRow> {
  const { data, error } = await supabase
    .from('comments')
    .insert(commentData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add comment: ${error.message}`);
  }

  return data;
}

/**
 * Get playlist comments
 */
export async function getPlaylistComments(playlistId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      user:users!user_id(id, username, display_name, avatar_url)
    `)
    .eq('playlist_id', playlistId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get playlist comments: ${error.message}`);
  }

  return data || [];
}

/**
 * Delete comment
 */
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    throw new Error(`Failed to delete comment: ${error.message}`);
  }
}

/**
 * Update comment likes
 */
export async function updateCommentLikes(commentId: string, likes: number): Promise<CommentRow> {
  const { data, error } = await supabase
    .from('comments')
    .update({ likes })
    .eq('id', commentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update comment likes: ${error.message}`);
  }

  return data;
}
