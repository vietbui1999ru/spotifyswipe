import { useState, useCallback } from 'react';
import type { Playlist, Song, User } from '@/types/spotify';
import { mockPlaylists, currentUser } from '@/data/mockData';

export function usePlaylist() {
  const [playlists, setPlaylists] = useState<Playlist[]>(mockPlaylists);

  const getUserPlaylists = useCallback((userId: string) => {
    return playlists.filter(p => p.owner.id === userId);
  }, [playlists]);

  const getPlaylistById = useCallback((playlistId: string) => {
    return playlists.find(p => p.id === playlistId);
  }, [playlists]);

  const createPlaylist = useCallback((name: string, description: string, imageUrl: string) => {
    const newPlaylist: Playlist = {
      id: `playlist-${Date.now()}`,
      name,
      description,
      imageUrl,
      owner: currentUser,
      songs: [],
      upvotes: 0,
      isPublic: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      topGenres: [],
    };

    setPlaylists(prev => [...prev, newPlaylist]);
    return newPlaylist;
  }, []);

  const updatePlaylist = useCallback((playlistId: string, updates: Partial<Playlist>) => {
    setPlaylists(prev =>
      prev.map(p =>
        p.id === playlistId
          ? { ...p, ...updates, updatedAt: new Date().toISOString() }
          : p
      )
    );
  }, []);

  const deletePlaylist = useCallback((playlistId: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
  }, []);

  const addSongToPlaylist = useCallback((playlistId: string, song: Song) => {
    setPlaylists(prev =>
      prev.map(p =>
        p.id === playlistId
          ? {
              ...p,
              songs: [...p.songs, song],
              updatedAt: new Date().toISOString(),
            }
          : p
      )
    );
  }, []);

  const removeSongFromPlaylist = useCallback((playlistId: string, songId: string) => {
    setPlaylists(prev =>
      prev.map(p =>
        p.id === playlistId
          ? {
              ...p,
              songs: p.songs.filter(s => s.id !== songId),
              updatedAt: new Date().toISOString(),
            }
          : p
      )
    );
  }, []);

  const upvotePlaylist = useCallback((playlistId: string) => {
    setPlaylists(prev =>
      prev.map(p =>
        p.id === playlistId
          ? { ...p, upvotes: p.upvotes + 1 }
          : p
      )
    );
  }, []);

  const downvotePlaylist = useCallback((playlistId: string) => {
    setPlaylists(prev =>
      prev.map(p =>
        p.id === playlistId
          ? { ...p, upvotes: Math.max(0, p.upvotes - 1) }
          : p
      )
    );
  }, []);

  return {
    playlists,
    getUserPlaylists,
    getPlaylistById,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    upvotePlaylist,
    downvotePlaylist,
  };
}
