export interface SpotifyImage {
	url: string;
	height: number | null;
	width: number | null;
}

export interface SpotifyArtist {
	id: string;
	name: string;
	uri: string;
	external_urls: { spotify: string };
	images?: SpotifyImage[];
}

export interface SpotifyAlbum {
	id: string;
	name: string;
	uri: string;
	external_urls: { spotify: string };
	images: SpotifyImage[];
	release_date: string;
	artists: SpotifyArtist[];
}

export interface SpotifyTrack {
	id: string;
	name: string;
	uri: string;
	duration_ms: number;
	preview_url: string | null;
	external_urls: { spotify: string };
	artists: SpotifyArtist[];
	album: SpotifyAlbum;
	is_playable?: boolean;
}

export interface SpotifyPaginated<T> {
	items: T[];
	total: number;
	limit: number;
	offset: number;
	next: string | null;
	previous: string | null;
}

export interface SpotifySearchResult {
	tracks?: SpotifyPaginated<SpotifyTrack>;
}

export interface SpotifyPlaybackState {
	is_playing: boolean;
	progress_ms: number | null;
	item: SpotifyTrack | null;
	device: {
		id: string;
		name: string;
		type: string;
		volume_percent: number;
	};
	shuffle_state: boolean;
	repeat_state: string;
}

export interface SpotifyRecentlyPlayed {
	items: Array<{
		track: SpotifyTrack;
		played_at: string;
	}>;
	next: string | null;
}

export interface SpotifyUser {
	id: string;
	display_name: string | null;
	images: SpotifyImage[];
	uri: string;
	external_urls: { spotify: string };
}

export interface SpotifyPlaylist {
	id: string;
	name: string;
	description: string | null;
	public: boolean;
	external_urls: { spotify: string };
	images: SpotifyImage[];
	owner: { id: string; display_name: string | null };
	items: { total: number };
}

export interface SpotifyAlbumSimplified {
	id: string;
	name: string;
	uri: string;
	external_urls: { spotify: string };
	images: SpotifyImage[];
	release_date: string;
	album_type: string;
	total_tracks: number;
}
