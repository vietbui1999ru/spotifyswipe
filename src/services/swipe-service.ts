/**
 * Swipe Service
 * CRUD operations for swipe sessions and interactions in Supabase
 */

import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type SwipeSessionRow = Database['public']['Tables']['swipe_sessions']['Row'];
type SwipeSessionInsert = Database['public']['Tables']['swipe_sessions']['Insert'];
type SwipeSessionUpdate = Database['public']['Tables']['swipe_sessions']['Update'];
type SwipeInteractionRow = Database['public']['Tables']['swipe_interactions']['Row'];
type SwipeInteractionInsert = Database['public']['Tables']['swipe_interactions']['Insert'];

/**
 * Create a new swipe session
 */
export async function createSwipeSession(sessionData: SwipeSessionInsert): Promise<SwipeSessionRow> {
  const { data, error } = await supabase
    .from('swipe_sessions')
    .insert(sessionData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create swipe session: ${error.message}`);
  }

  return data;
}

/**
 * Get swipe session by ID
 */
export async function getSwipeSessionById(sessionId: string): Promise<SwipeSessionRow | null> {
  const { data, error } = await supabase
    .from('swipe_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get swipe session: ${error.message}`);
  }

  return data;
}

/**
 * Get user's swipe sessions
 */
export async function getUserSwipeSessions(
  userId: string,
  limit = 50,
  offset = 0
): Promise<{ sessions: SwipeSessionRow[]; total: number }> {
  const { data, error, count } = await supabase
    .from('swipe_sessions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get user swipe sessions: ${error.message}`);
  }

  return { sessions: data || [], total: count || 0 };
}

/**
 * Get most recent swipe session for user
 */
export async function getLatestSwipeSession(userId: string): Promise<SwipeSessionRow | null> {
  const { data, error } = await supabase
    .from('swipe_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get latest swipe session: ${error.message}`);
  }

  return data;
}

/**
 * Update swipe session
 */
export async function updateSwipeSession(
  sessionId: string,
  updates: SwipeSessionUpdate
): Promise<SwipeSessionRow> {
  const { data, error } = await supabase
    .from('swipe_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update swipe session: ${error.message}`);
  }

  return data;
}

/**
 * Delete swipe session
 */
export async function deleteSwipeSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('swipe_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    throw new Error(`Failed to delete swipe session: ${error.message}`);
  }
}

/**
 * Record a swipe interaction (like, dislike, skip)
 */
export async function recordSwipeInteraction(
  interactionData: SwipeInteractionInsert
): Promise<SwipeInteractionRow> {
  const { data, error } = await supabase
    .from('swipe_interactions')
    .insert(interactionData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record swipe interaction: ${error.message}`);
  }

  return data;
}

/**
 * Get swipe interactions for a session
 */
export async function getSessionInteractions(sessionId: string): Promise<SwipeInteractionRow[]> {
  const { data, error } = await supabase
    .from('swipe_interactions')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get session interactions: ${error.message}`);
  }

  return data || [];
}

/**
 * Get user's liked songs (across all sessions)
 */
export async function getUserLikedSongs(
  userId: string,
  limit = 100,
  offset = 0
): Promise<{ interactions: SwipeInteractionRow[]; total: number }> {
  const { data, error, count } = await supabase
    .from('swipe_interactions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('interaction_type', 'like')
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get user liked songs: ${error.message}`);
  }

  return { interactions: data || [], total: count || 0 };
}

/**
 * Get user's disliked songs (across all sessions)
 */
export async function getUserDislikedSongs(
  userId: string,
  limit = 100,
  offset = 0
): Promise<{ interactions: SwipeInteractionRow[]; total: number }> {
  const { data, error, count } = await supabase
    .from('swipe_interactions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('interaction_type', 'dislike')
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get user disliked songs: ${error.message}`);
  }

  return { interactions: data || [], total: count || 0 };
}

/**
 * Check if user has interacted with a track
 */
export async function getUserTrackInteraction(
  userId: string,
  spotifyTrackId: string
): Promise<SwipeInteractionRow | null> {
  const { data, error } = await supabase
    .from('swipe_interactions')
    .select('*')
    .eq('user_id', userId)
    .eq('spotify_track_id', spotifyTrackId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get user track interaction: ${error.message}`);
  }

  return data;
}

/**
 * Get swipe statistics for a user
 */
export async function getUserSwipeStats(userId: string): Promise<{
  totalSessions: number;
  totalSwipes: number;
  likes: number;
  dislikes: number;
  skips: number;
}> {
  // Get total sessions
  const { count: totalSessions, error: sessionsError } = await supabase
    .from('swipe_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (sessionsError) {
    throw new Error(`Failed to get session count: ${sessionsError.message}`);
  }

  // Get interaction counts by type
  const { data: interactions, error: interactionsError } = await supabase
    .from('swipe_interactions')
    .select('interaction_type')
    .eq('user_id', userId);

  if (interactionsError) {
    throw new Error(`Failed to get interactions: ${interactionsError.message}`);
  }

  const stats = {
    totalSessions: totalSessions || 0,
    totalSwipes: interactions?.length || 0,
    likes: interactions?.filter(i => i.interaction_type === 'like').length || 0,
    dislikes: interactions?.filter(i => i.interaction_type === 'dislike').length || 0,
    skips: interactions?.filter(i => i.interaction_type === 'skip').length || 0,
  };

  return stats;
}

/**
 * Get session statistics
 */
export async function getSessionStats(sessionId: string): Promise<{
  totalSwipes: number;
  likes: number;
  dislikes: number;
  skips: number;
}> {
  const { data: interactions, error } = await supabase
    .from('swipe_interactions')
    .select('interaction_type')
    .eq('session_id', sessionId);

  if (error) {
    throw new Error(`Failed to get session interactions: ${error.message}`);
  }

  const stats = {
    totalSwipes: interactions?.length || 0,
    likes: interactions?.filter(i => i.interaction_type === 'like').length || 0,
    dislikes: interactions?.filter(i => i.interaction_type === 'dislike').length || 0,
    skips: interactions?.filter(i => i.interaction_type === 'skip').length || 0,
  };

  return stats;
}

/**
 * Delete old swipe sessions (cleanup utility)
 */
export async function deleteOldSwipeSessions(userId: string, daysToKeep = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const { data, error } = await supabase
    .from('swipe_sessions')
    .delete()
    .eq('user_id', userId)
    .lt('created_at', cutoffDate.toISOString())
    .select();

  if (error) {
    throw new Error(`Failed to delete old sessions: ${error.message}`);
  }

  return data?.length || 0;
}
