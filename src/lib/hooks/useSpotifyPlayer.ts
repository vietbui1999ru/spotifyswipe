"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as spotify from "~/lib/services/spotify";
import type {
	SpotifyPlayer,
	SpotifyWebPlaybackTrack,
} from "~/types/spotify-sdk";

// ─── Script Loading (module-level singleton) ─────────────────────────────────

let sdkScriptInjected = false;

function loadSpotifySDK(): Promise<void> {
	return new Promise((resolve) => {
		if (window.Spotify) {
			resolve();
			return;
		}

		if (!sdkScriptInjected) {
			sdkScriptInjected = true;
			const script = document.createElement("script");
			script.src = "https://sdk.scdn.co/spotify-player.js";
			script.async = true;
			document.body.appendChild(script);
		}

		window.onSpotifyWebPlaybackSDKReady = () => resolve();
	});
}

// ─── Hook ────────────────────────────────────────────────────────────────────

interface UseSpotifyPlayerOptions {
	getToken: () => Promise<string>;
	playerName?: string;
	volume?: number;
}

interface UseSpotifyPlayerReturn {
	isReady: boolean;
	isPremium: boolean;
	deviceId: string | null;
	currentTrack: SpotifyWebPlaybackTrack | null;
	paused: boolean;
	position: number;
	duration: number;
	error: string | null;
	playTrack: (spotifyUri: string) => Promise<void>;
	togglePlay: () => Promise<void>;
	seek: (positionMs: number) => Promise<void>;
	setVolume: (volume: number) => Promise<void>;
}

export function useSpotifyPlayer({
	getToken,
	playerName = "SpotiSwipe",
	volume = 0.5,
}: UseSpotifyPlayerOptions): UseSpotifyPlayerReturn {
	const [isReady, setIsReady] = useState(false);
	const [isPremium, setIsPremium] = useState(true);
	const [deviceId, setDeviceId] = useState<string | null>(null);
	const [currentTrack, setCurrentTrack] =
		useState<SpotifyWebPlaybackTrack | null>(null);
	const [paused, setPaused] = useState(true);
	const [position, setPosition] = useState(0);
	const [duration, setDuration] = useState(0);
	const [error, setError] = useState<string | null>(null);

	const playerRef = useRef<SpotifyPlayer | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const tokenRef = useRef<string | null>(null);
	const hasTrackLoadedRef = useRef(false);

	// Keep getToken stable via ref
	const getTokenRef = useRef(getToken);
	getTokenRef.current = getToken;

	// ─── Progress Polling ──────────────────────────────────────────────

	const startPolling = useCallback(() => {
		if (intervalRef.current) clearInterval(intervalRef.current);
		intervalRef.current = setInterval(() => {
			setPosition((prev) => prev + 100);
		}, 100);
	}, []);

	const stopPolling = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}, []);

	// ─── Player Lifecycle ──────────────────────────────────────────────

	useEffect(() => {
		let cancelled = false;

		async function init() {
			await loadSpotifySDK();
			if (cancelled || !window.Spotify) return;

			const player = new window.Spotify.Player({
				name: playerName,
				getOAuthToken: (cb) => {
					getTokenRef.current().then((token) => {
						tokenRef.current = token;
						cb(token);
					});
				},
				volume,
			});

			player.addListener("ready", ({ device_id }) => {
				if (cancelled) return;
				console.debug("[SpotiSwipe] Spotify Player ready, device:", device_id);
				setDeviceId(device_id);
				setIsReady(true);
				setError(null);
			});

			player.addListener("not_ready", ({ device_id }) => {
				console.debug("[SpotiSwipe] Spotify Player not ready:", device_id);
				setIsReady(false);
			});

			player.addListener("player_state_changed", (state) => {
				if (cancelled || !state) return;
				const track = state.track_window.current_track;
				hasTrackLoadedRef.current = !!track;
				setCurrentTrack(track);
				setPaused(state.paused);
				setPosition(state.position);
				setDuration(state.duration);

				if (state.paused) {
					stopPolling();
				} else {
					startPolling();
				}
			});

			player.addListener("initialization_error", ({ message }) => {
				console.error("[SpotiSwipe] SDK init error:", message);
				setError(message);
			});

			player.addListener("authentication_error", ({ message }) => {
				console.error("[SpotiSwipe] SDK auth error:", message);
				setError(message);
			});

			player.addListener("account_error", ({ message }) => {
				console.warn("[SpotiSwipe] Account error (Premium required):", message);
				setIsPremium(false);
				setError(message);
			});

			player.addListener("playback_error", ({ message }) => {
				// "Cannot perform operation; no list was loaded" is an informational
				// SDK message that fires when togglePlay/resume is called before any
				// track URI has been sent to the player. This is expected during
				// initial connection and is not a user-facing error.
				if (message.includes("no list was loaded")) {
					console.debug(
						"[SpotiSwipe] Playback info: no track loaded yet, ignoring",
					);
					return;
				}
				console.error("[SpotiSwipe] Playback error:", message);
				setError(message);
			});

			player.connect();
			playerRef.current = player;
		}

		init();

		return () => {
			cancelled = true;
			stopPolling();
			playerRef.current?.disconnect();
			playerRef.current = null;
			hasTrackLoadedRef.current = false;
			setIsReady(false);
			setDeviceId(null);
		};
	}, [playerName, volume, startPolling, stopPolling]);

	// ─── Controls ──────────────────────────────────────────────────────

	const playTrack = useCallback(
		async (spotifyUri: string) => {
			if (!deviceId) {
				console.debug("[SpotiSwipe] playTrack skipped: no deviceId");
				return;
			}
			if (!spotifyUri) {
				console.debug("[SpotiSwipe] playTrack skipped: empty URI");
				return;
			}
			try {
				const token = tokenRef.current ?? (await getTokenRef.current());
				tokenRef.current = token;
				await spotify.play(token, { uris: [spotifyUri] }, deviceId);
				// Mark that a track has been loaded so togglePlay won't error
				hasTrackLoadedRef.current = true;
			} catch (err) {
				console.error("[SpotiSwipe] playTrack failed:", err);
			}
		},
		[deviceId],
	);

	const togglePlay = useCallback(async () => {
		const player = playerRef.current;
		if (!player) return;

		// Guard: don't call togglePlay if no track has been loaded into the
		// player yet — the SDK would fire "no list was loaded" playback_error.
		if (!hasTrackLoadedRef.current) {
			console.debug(
				"[SpotiSwipe] togglePlay skipped: no track loaded in player",
			);
			return;
		}

		await player.togglePlay();
	}, []);

	const seek = useCallback(async (positionMs: number) => {
		const player = playerRef.current;
		if (!player) return;
		await player.seek(positionMs);
	}, []);

	const setVolumeControl = useCallback(async (vol: number) => {
		const player = playerRef.current;
		if (!player) return;
		await player.setVolume(vol);
	}, []);

	return {
		isReady,
		isPremium,
		deviceId,
		currentTrack,
		paused,
		position,
		duration,
		error,
		playTrack,
		togglePlay,
		seek,
		setVolume: setVolumeControl,
	};
}
