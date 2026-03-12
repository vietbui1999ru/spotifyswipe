"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
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
 * Demo users bypass provider resolution and fetch pre-seeded songs from DB.
 */
export function useDiscoveryFeed(limit = 20, searchQuery?: string) {
	// Check if current user is a demo user — this MUST be first
	const { data: demoStatus } = api.demo.getTimeRemaining.useQuery(undefined, {
		staleTime: 5 * 60 * 1000,
	});
	const isDemo = demoStatus?.isDemo ?? false;

	// Demo path: fetch from DB via demo router
	const demoFeedQuery = api.demo.getDiscoveryFeed.useQuery(
		{ limit },
		{ enabled: isDemo && !searchQuery, staleTime: 10 * 60 * 1000 },
	);
	const demoSearchQuery = api.demo.searchSongs.useQuery(
		{ query: searchQuery ?? "" },
		{ enabled: isDemo && !!searchQuery, staleTime: 5 * 60 * 1000 },
	);

	// Regular path: provider-based discovery
	const { data: provider } = api.user.getMusicProvider.useQuery(undefined, {
		staleTime: 5 * 60 * 1000,
		enabled: !isDemo,
	});
	const { data: connected } = api.user.getConnectedProviders.useQuery(
		undefined,
		{ staleTime: 5 * 60 * 1000, enabled: !isDemo },
	);

	const { data: spotifyTokenData } = api.token.getSpotifyToken.useQuery(
		undefined,
		{
			enabled: !isDemo && !!connected?.spotify,
			retry: false,
			staleTime: 5 * 60 * 1000,
		},
	);
	const { data: lastfmSessionData } = api.token.getLastfmSession.useQuery(
		undefined,
		{
			enabled: !isDemo && !!connected?.lastfm,
			retry: false,
			staleTime: 5 * 60 * 1000,
		},
	);

	const { data: swipeHistory } = api.swipe.getHistory.useQuery(
		{ limit: 50 },
		{ refetchOnWindowFocus: false, enabled: !isDemo },
	);

	const effectiveProvider = (() => {
		if (isDemo) return null;
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

	const swipedExternalIds = useMemo(
		() => new Set(swipeHistory?.items.map((s) => s.song.externalId) ?? []),
		[swipeHistory],
	);

	const isReady =
		!isDemo &&
		effectiveProvider !== null &&
		(effectiveProvider === "spotify" ? !!spotifyToken : !!lastfmUsername);

	useEffect(() => {
		if (searchQuery) {
			try {
				sessionStorage.removeItem(FEED_STORAGE_KEY);
			} catch {
				// sessionStorage unavailable
			}
		}
	}, [searchQuery]);

	const regularQuery = useQuery<DiscoveryTrack[]>({
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

	// Persist regular feed to sessionStorage
	useEffect(() => {
		if (regularQuery.data && regularQuery.data.length > 0) {
			saveFeedToSession(regularQuery.data);
		}
	}, [regularQuery.data]);

	// Return the appropriate query based on demo status
	if (isDemo) {
		const activeQuery = searchQuery ? demoSearchQuery : demoFeedQuery;
		return {
			data: activeQuery.data,
			isLoading: activeQuery.isLoading,
			error: activeQuery.error,
			refetch: activeQuery.refetch,
			isDemo: true,
		};
	}

	return {
		data: regularQuery.data,
		isLoading: regularQuery.isLoading,
		error: regularQuery.error,
		refetch: regularQuery.refetch,
		isDemo: false,
	};
}
