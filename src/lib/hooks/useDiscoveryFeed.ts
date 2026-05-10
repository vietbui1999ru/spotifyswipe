"use client";

import { notifications } from "@mantine/notifications";
import { useEffect } from "react";
import { api } from "~/trpc/react";

export function useDiscoveryFeed(limit = 20, searchQuery?: string) {
	const { data: demoStatus } = api.demo.getTimeRemaining.useQuery(undefined, {
		staleTime: 5 * 60 * 1000,
	});
	const isDemo = demoStatus?.isDemo ?? false;

	const demoFeedQuery = api.demo.getDiscoveryFeed.useQuery(
		{ limit },
		{ enabled: isDemo && !searchQuery, staleTime: 10 * 60 * 1000 },
	);
	const demoSearchQuery = api.demo.searchSongs.useQuery(
		{ query: searchQuery ?? "" },
		{ enabled: isDemo && !!searchQuery, staleTime: 5 * 60 * 1000 },
	);

	const { data: lastfmSessionData } = api.token.getLastfmSession.useQuery(
		undefined,
		{
			enabled: demoStatus !== undefined && !isDemo,
			retry: false,
			staleTime: 5 * 60 * 1000,
		},
	);

	const lastfmUsername = lastfmSessionData?.username ?? null;

	const regularQuery = api.lastfm.getDiscoveryFeed.useQuery(
		{ limit, searchQuery, lastfmUsername },
		{
			enabled: demoStatus !== undefined && !isDemo,
			refetchOnWindowFocus: false,
			staleTime: searchQuery ? 5 * 60 * 1000 : 10 * 60 * 1000,
		},
	);

	useEffect(() => {
		if (!regularQuery.data?.rateLimited) return;
		try {
			if (sessionStorage.getItem("spotiswipe:rate-limit-toasted")) return;
			notifications.show({
				title: "Discovery limited",
				message:
					"Showing popular tracks — personalized discovery is temporarily limited.",
				color: "yellow",
				autoClose: 6000,
			});
			sessionStorage.setItem("spotiswipe:rate-limit-toasted", "1");
		} catch {
			// sessionStorage unavailable
		}
	}, [regularQuery.data?.rateLimited]);

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
		data: regularQuery.data?.tracks,
		isLoading: regularQuery.isLoading,
		error: regularQuery.error,
		refetch: regularQuery.refetch,
		isDemo: false,
	};
}
