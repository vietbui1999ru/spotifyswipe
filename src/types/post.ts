export interface Post {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  music_url: string | null;
  upvotes: number;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
}

export interface CreatePostInput {
  title: string;
  content?: string;
  image_url?: string;
  music_url?: string;
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
  image_url?: string;
  music_url?: string;
}

export type SortOption = 'created_at' | 'upvotes';
