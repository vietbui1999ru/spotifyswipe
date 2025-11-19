-- SpotifySwipe Database Schema
-- Run this script in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  avatar_url TEXT DEFAULT '',
  is_premium BOOLEAN DEFAULT false,
  bio TEXT,
  spotify_id VARCHAR(255) UNIQUE,
  spotify_access_token TEXT,
  spotify_refresh_token TEXT,
  spotify_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT DEFAULT '',
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  upvotes INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playlist songs junction table
CREATE TABLE IF NOT EXISTS playlist_songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  spotify_track_id VARCHAR(255) NOT NULL,
  track_data JSONB NOT NULL,
  position INTEGER NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(playlist_id, spotify_track_id)
);

-- Swipe sessions table
CREATE TABLE IF NOT EXISTS swipe_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seed_pattern VARCHAR(50),
  seed_frequency VARCHAR(50),
  seed_category VARCHAR(50),
  seed_mood VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Swipe interactions table (tracks likes/dislikes)
CREATE TABLE IF NOT EXISTS swipe_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES swipe_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  spotify_track_id VARCHAR(255) NOT NULL,
  track_data JSONB NOT NULL,
  interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('like', 'dislike', 'skip')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_playlists_owner_id ON playlists(owner_id);
CREATE INDEX IF NOT EXISTS idx_playlists_is_public ON playlists(is_public);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist_id ON playlist_songs(playlist_id);
CREATE INDEX IF NOT EXISTS idx_swipe_sessions_user_id ON swipe_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_swipe_interactions_session_id ON swipe_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_swipe_interactions_user_id ON swipe_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_playlist_id ON comments(playlist_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_users_spotify_id ON users(spotify_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON playlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_swipe_sessions_updated_at BEFORE UPDATE ON swipe_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipe_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipe_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Playlists policies
CREATE POLICY "Anyone can view public playlists" ON playlists FOR SELECT USING (is_public = true OR auth.uid() = owner_id);
CREATE POLICY "Users can create own playlists" ON playlists FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own playlists" ON playlists FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own playlists" ON playlists FOR DELETE USING (auth.uid() = owner_id);

-- Playlist songs policies
CREATE POLICY "Anyone can view songs in public playlists" ON playlist_songs FOR SELECT
  USING (EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_songs.playlist_id AND (playlists.is_public = true OR playlists.owner_id = auth.uid())));
CREATE POLICY "Playlist owners can manage songs" ON playlist_songs FOR ALL
  USING (EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_songs.playlist_id AND playlists.owner_id = auth.uid()));

-- Swipe sessions policies
CREATE POLICY "Users can view own sessions" ON swipe_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sessions" ON swipe_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON swipe_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON swipe_sessions FOR DELETE USING (auth.uid() = user_id);

-- Swipe interactions policies
CREATE POLICY "Users can view own interactions" ON swipe_interactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own interactions" ON swipe_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Anyone can view comments on public playlists" ON comments FOR SELECT
  USING (EXISTS (SELECT 1 FROM playlists WHERE playlists.id = comments.playlist_id AND playlists.is_public = true));
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);
