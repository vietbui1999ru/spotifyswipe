// Type definitions for SpotifySwipe application

export interface Artist {
  id: string;
  name: string;
  imageUrl: string;
  followers: number;
}

export interface Album {
  id: string;
  name: string;
  imageUrl: string;
  releaseDate: string;
  artists: Artist[];
}

export interface Song {
  id: string;
  name: string;
  artists: Artist[];
  album: Album;
  duration: number; // in seconds
  previewUrl: string | null; // 30s preview URL
  fullUrl: string | null; // full song URL (premium only)
  imageUrl: string;
  lyrics?: string;
  genres: Genre[];
  popularity: number; // 0-100
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  isPremium: boolean;
  bio?: string;
  createdAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  owner: User;
  songs: Song[];
  upvotes: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  topGenres: Genre[]; // auto-calculated from songs
}

export interface Comment {
  id: string;
  user: User;
  playlistId: string;
  content: string;
  createdAt: string;
  likes: number;
}

export enum Genre {
  POP = 'Pop',
  ROCK = 'Rock',
  HIPHOP = 'Hip-Hop',
  JAZZ = 'Jazz',
  ELECTRONIC = 'Electronic',
  CLASSICAL = 'Classical',
  RNB = 'R&B',
  COUNTRY = 'Country',
  INDIE = 'Indie',
  ALTERNATIVE = 'Alternative',
  KPOP = 'K-Pop',
  LATIN = 'Latin',
  METAL = 'Metal',
  FOLK = 'Folk',
  BLUES = 'Blues',
  REGGAE = 'Reggae',
  SOUL = 'Soul',
  FUNK = 'Funk',
}

export enum SeedPattern {
  ENERGETIC = 'Energetic',
  CHILL = 'Chill',
  DANCEABLE = 'Danceable',
  MELANCHOLIC = 'Melancholic',
  UPBEAT = 'Upbeat',
}

export enum SeedFrequency {
  DAILY = 'Daily',
  WEEKLY = 'Weekly',
  MONTHLY = 'Monthly',
  OCCASIONAL = 'Occasional',
}

export enum SeedCategory {
  WORKOUT = 'Workout',
  STUDY = 'Study',
  PARTY = 'Party',
  RELAX = 'Relax',
  FOCUS = 'Focus',
  SLEEP = 'Sleep',
  COMMUTE = 'Commute',
}

export enum SeedMood {
  HAPPY = 'Happy',
  SAD = 'Sad',
  CALM = 'Calm',
  ENERGIZED = 'Energized',
  ROMANTIC = 'Romantic',
  ANGRY = 'Angry',
  NOSTALGIC = 'Nostalgic',
  CONFIDENT = 'Confident',
}

export interface SwipeSession {
  songs: Song[];
  currentIndex: number;
  likedSongs: Song[];
  dislikedSongs: Song[];
  seedPattern?: SeedPattern;
  seedFrequency?: SeedFrequency;
  seedCategory?: SeedCategory;
  seedMood?: SeedMood;
}

export interface PlaylistFilters {
  searchQuery: string;
  genres: Genre[];
  sortBy: 'upvotes' | 'date' | 'name';
  sortOrder: 'asc' | 'desc';
}
