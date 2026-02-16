/** TypeScript declarations for the Spotify Web Playback SDK */

interface SpotifyWebPlaybackTrack {
	uri: string;
	id: string | null;
	type: "track" | "episode" | "ad";
	media_type: "audio" | "video";
	name: string;
	is_playable: boolean;
	album: {
		uri: string;
		name: string;
		images: Array<{ url: string; height: number; width: number }>;
	};
	artists: Array<{ uri: string; name: string }>;
}

interface SpotifyPlayerState {
	context: {
		uri: string | null;
		metadata: Record<string, string> | null;
	};
	disallows: Record<string, boolean>;
	paused: boolean;
	position: number;
	duration: number;
	repeat_mode: number;
	shuffle: boolean;
	track_window: {
		current_track: SpotifyWebPlaybackTrack;
		previous_tracks: SpotifyWebPlaybackTrack[];
		next_tracks: SpotifyWebPlaybackTrack[];
	};
}

interface SpotifyWebPlaybackError {
	message: string;
}

interface SpotifyPlayer {
	connect(): Promise<boolean>;
	disconnect(): void;
	addListener(
		event: "ready",
		callback: (data: { device_id: string }) => void,
	): void;
	addListener(
		event: "not_ready",
		callback: (data: { device_id: string }) => void,
	): void;
	addListener(
		event: "player_state_changed",
		callback: (state: SpotifyPlayerState | null) => void,
	): void;
	addListener(
		event: "initialization_error",
		callback: (error: SpotifyWebPlaybackError) => void,
	): void;
	addListener(
		event: "authentication_error",
		callback: (error: SpotifyWebPlaybackError) => void,
	): void;
	addListener(
		event: "account_error",
		callback: (error: SpotifyWebPlaybackError) => void,
	): void;
	addListener(
		event: "playback_error",
		callback: (error: SpotifyWebPlaybackError) => void,
	): void;
	removeListener(event: string): void;
	getCurrentState(): Promise<SpotifyPlayerState | null>;
	setName(name: string): Promise<void>;
	getVolume(): Promise<number>;
	setVolume(volume: number): Promise<void>;
	pause(): Promise<void>;
	resume(): Promise<void>;
	togglePlay(): Promise<void>;
	seek(position_ms: number): Promise<void>;
	previousTrack(): Promise<void>;
	nextTrack(): Promise<void>;
}

interface SpotifyPlayerConstructorOptions {
	name: string;
	getOAuthToken: (callback: (token: string) => void) => void;
	volume?: number;
}

declare global {
	interface Window {
		Spotify?: {
			Player: new (options: SpotifyPlayerConstructorOptions) => SpotifyPlayer;
		};
		onSpotifyWebPlaybackSDKReady?: () => void;
	}
}

export type {
	SpotifyPlayer,
	SpotifyPlayerState,
	SpotifyWebPlaybackTrack,
	SpotifyWebPlaybackError,
};
