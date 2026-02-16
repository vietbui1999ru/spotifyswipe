"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
	type DiscoveryTrack,
	getDiscoveryFeed,
} from "~/lib/services/discovery";
import { api } from "~/trpc/react";

const FEED_STORAGE_KEY = "spotiswipe:discovery-feed";

/** Save feed to sessionStorage for persistence across reloads. */
function saveFeedToSession(feed: DiscoveryTrack[]): void {
	try {
		sessionStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(feed));
	} catch {
		// sessionStorage unavailable or full
	}
}

/** Restore feed from sessionStorage. */
function loadFeedFromSession(): DiscoveryTrack[] | undefined {
	try {
		const stored = sessionStorage.getItem(FEED_STORAGE_KEY);
		if (stored) return JSON.parse(stored) as DiscoveryTrack[];
	} catch {
		// corrupt or unavailable
	}
	return undefined;
}

/**
 * Client-side discovery feed hook.
 * Resolves provider, fetches tokens, runs discovery pipeline,
 * and filters already-swiped tracks.
 * Persists feed to sessionStorage so it survives page reloads and tab switches.
 */
export function useDiscoveryFeed(limit = 20, searchQuery?: string) {
	// Fetch provider preference and connected accounts
	const { data: provider } = api.user.getMusicProvider.useQuery();
	const { data: connected } = api.user.getConnectedProviders.useQuery();

	// Fetch tokens (will fail gracefully if not connected)
	const { data: spotifyTokenData } = api.token.getSpotifyToken.useQuery(
		undefined,
		{ enabled: !!connected?.spotify, retry: false },
	);
	const { data: lastfmSessionData } = api.token.getLastfmSession.useQuery(
		undefined,
		{ enabled: !!connected?.lastfm, retry: false },
	);

	// Fetch swiped song IDs to filter
	const { data: swipeHistory } = api.swipe.getHistory.useQuery(
		{ limit: 50 },
		{ refetchOnWindowFocus: false },
	);

	// Resolve effective provider
	const effectiveProvider = (() => {
		const pref = provider ?? "auto";
		if (pref === "spotify" && connected?.spotify) return "spotify";
		if (pref === "lastfm" && connected?.lastfm) return "lastfm";
		if (pref === "auto") {
			if (connected?.spotify) return "spotify";
			if (connected?.lastfm) return "lastfm";
		}
		return null;
	})();

	const spotifyToken = spotifyTokenData?.accessToken ?? null;
	const lastfmUsername = lastfmSessionData?.username ?? null;

	// Build set of already-swiped external IDs
	const swipedExternalIds = new Set(
		swipeHistory?.items.map((s) => s.song.externalId) ?? [],
	);

	const isReady =
		effectiveProvider !== null &&
		(effectiveProvider === "spotify" ? !!spotifyToken : !!lastfmUsername);

	// Clear sessionStorage when switching to search-based feed
	// so old algorithmic results don't flash
	useEffect(() => {
		if (searchQuery) {
			try {
				sessionStorage.removeItem(FEED_STORAGE_KEY);
			} catch {
				// sessionStorage unavailable
			}
		}
	}, [searchQuery]);

	const query = useQuery<DiscoveryTrack[]>({
		queryKey: ["discoveryFeed", effectiveProvider, limit, searchQuery ?? null],
		queryFn: () =>
			getDiscoveryFeed({
				provider: effectiveProvider as "spotify" | "lastfm",
				spotifyToken,
				lastfmUsername,
				swipedExternalIds,
				limit,
				searchQuery,
			}),
		enabled: isReady,
		refetchOnWindowFocus: false,
		staleTime: searchQuery ? 5 * 60 * 1000 : 10 * 60 * 1000,
		gcTime: Number.POSITIVE_INFINITY,
		initialData: searchQuery ? undefined : loadFeedFromSession,
	});

	// Persist feed to sessionStorage whenever it updates
	useEffect(() => {
		if (query.data && query.data.length > 0) {
			saveFeedToSession(query.data);
		}
	}, [query.data]);

	return query;
}
