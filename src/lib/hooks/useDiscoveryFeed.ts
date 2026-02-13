"use client";

import { useQuery } from "@tanstack/react-query";
import {
	type DiscoveryTrack,
	getDiscoveryFeed,
} from "~/lib/services/discovery";
import { api } from "~/trpc/react";

/**
 * Client-side discovery feed hook.
 * Resolves provider, fetches tokens, runs discovery pipeline,
 * filters already-swiped tracks, enriches with Deezer previews.
 */
export function useDiscoveryFeed(limit = 20) {
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

	return useQuery<DiscoveryTrack[]>({
		queryKey: ["discoveryFeed", effectiveProvider, limit],
		queryFn: () =>
			getDiscoveryFeed({
				provider: effectiveProvider as "spotify" | "lastfm",
				spotifyToken,
				lastfmUsername,
				swipedExternalIds,
				limit,
			}),
		enabled: isReady,
		refetchOnWindowFocus: false,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}
