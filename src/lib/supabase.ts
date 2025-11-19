import { createClient } from '@supabase/supabase-js';

// Supabase client for client-side operations
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Supabase client for server-side operations with service role
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          email: string;
          avatar_url: string;
          is_premium: boolean;
          bio: string | null;
          spotify_id: string | null;
          spotify_access_token: string | null;
          spotify_refresh_token: string | null;
          spotify_token_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          display_name: string;
          email: string;
          avatar_url?: string;
          is_premium?: boolean;
          bio?: string | null;
          spotify_id?: string | null;
          spotify_access_token?: string | null;
          spotify_refresh_token?: string | null;
          spotify_token_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string;
          email?: string;
          avatar_url?: string;
          is_premium?: boolean;
          bio?: string | null;
          spotify_id?: string | null;
          spotify_access_token?: string | null;
          spotify_refresh_token?: string | null;
          spotify_token_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      playlists: {
        Row: {
          id: string;
          name: string;
          description: string;
          image_url: string;
          owner_id: string;
          upvotes: number;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          image_url?: string;
          owner_id: string;
          upvotes?: number;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          image_url?: string;
          owner_id?: string;
          upvotes?: number;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      playlist_songs: {
        Row: {
          id: string;
          playlist_id: string;
          spotify_track_id: string;
          track_data: any; // JSON data
          position: number;
          added_at: string;
        };
        Insert: {
          id?: string;
          playlist_id: string;
          spotify_track_id: string;
          track_data: any;
          position: number;
          added_at?: string;
        };
        Update: {
          id?: string;
          playlist_id?: string;
          spotify_track_id?: string;
          track_data?: any;
          position?: number;
          added_at?: string;
        };
      };
      swipe_sessions: {
        Row: {
          id: string;
          user_id: string;
          seed_pattern: string | null;
          seed_frequency: string | null;
          seed_category: string | null;
          seed_mood: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          seed_pattern?: string | null;
          seed_frequency?: string | null;
          seed_category?: string | null;
          seed_mood?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          seed_pattern?: string | null;
          seed_frequency?: string | null;
          seed_category?: string | null;
          seed_mood?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      swipe_interactions: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          spotify_track_id: string;
          track_data: any; // JSON data
          interaction_type: 'like' | 'dislike' | 'skip';
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          spotify_track_id: string;
          track_data: any;
          interaction_type: 'like' | 'dislike' | 'skip';
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          spotify_track_id?: string;
          track_data?: any;
          interaction_type?: 'like' | 'dislike' | 'skip';
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          user_id: string;
          playlist_id: string;
          content: string;
          likes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          playlist_id: string;
          content: string;
          likes?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          playlist_id?: string;
          content?: string;
          likes?: number;
          created_at?: string;
        };
      };
    };
  };
}
