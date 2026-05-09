"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import {
  type DiscoveryTrack,
  getDiscoveryFeed,
} from "~/lib/services/discovery";
import { api } from "~/trpc/react";

const FEED_STORAGE_KEY = "spotiswipe:discovery-feed";

function saveFeedToSession(feed: DiscoveryTrack[]): void {
  try {
    sessionStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(feed));
  } catch {
    // sessionStorage unavailable or full
  }
}

function loadFeedFromSession(): DiscoveryTrack[] | undefined {
  try {
    const stored = sessionStorage.getItem(FEED_STORAGE_KEY);
    if (stored) return JSON.parse(stored) as DiscoveryTrack[];
  } catch {
    // corrupt or unavailable
  }
  return undefined;
}

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
    { enabled: !isDemo, retry: false, staleTime: 5 * 60 * 1000 },
  );

  const { data: swipeHistory } = api.swipe.getHistory.useQuery(
    { limit: 50 },
    { refetchOnWindowFocus: false, enabled: !isDemo },
  );

  const lastfmUsername = lastfmSessionData?.username ?? null;

  const swipedExternalIds = useMemo(
    () => new Set(swipeHistory?.items.map((s) => s.song.externalId) ?? []),
    [swipeHistory],
  );

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
    queryKey: ["discoveryFeed", lastfmUsername, limit, searchQuery ?? null],
    queryFn: () =>
      getDiscoveryFeed({ lastfmUsername, swipedExternalIds, limit, searchQuery }),
    enabled: !isDemo,
    refetchOnWindowFocus: false,
    staleTime: searchQuery ? 5 * 60 * 1000 : 10 * 60 * 1000,
    gcTime: Number.POSITIVE_INFINITY,
    initialData: searchQuery ? undefined : loadFeedFromSession,
  });

  useEffect(() => {
    if (regularQuery.data && regularQuery.data.length > 0) {
      saveFeedToSession(regularQuery.data);
    }
  }, [regularQuery.data]);

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
