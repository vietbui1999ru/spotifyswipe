"use client";

import { notifications } from "@mantine/notifications";
import { useEffect } from "react";
import { api } from "~/trpc/react";

export function useDemoNotifications() {
	const { data: demoStatus } = api.demo.getTimeRemaining.useQuery(undefined, {
		staleTime: 5 * 60 * 1000,
	});
	const isDemo = demoStatus?.isDemo ?? false;

	const lastfmQuery = api.token.getLastfmSession.useQuery(undefined, {
		enabled: demoStatus !== undefined && !isDemo,
		retry: false,
		staleTime: 5 * 60 * 1000,
	});

	useEffect(() => {
		if (demoStatus === undefined || !isDemo) return;
		try {
			if (sessionStorage.getItem("spotiswipe:demo-welcomed")) return;
			notifications.show({
				title: "Demo mode",
				message: "You're in demo mode — sign up to save your playlists.",
				color: "blue",
				autoClose: 6000,
			});
			sessionStorage.setItem("spotiswipe:demo-welcomed", "1");
		} catch {
			// sessionStorage unavailable
		}
	}, [isDemo, demoStatus]);

	useEffect(() => {
		if (isDemo) return;
		if (lastfmQuery.isLoading || lastfmQuery.data !== undefined) return;
		if (!lastfmQuery.error) return;
		try {
			if (sessionStorage.getItem("spotiswipe:lastfm-nudged")) return;
			notifications.show({
				title: "Connect Last.fm",
				message:
					"Connect Last.fm in your profile for personalized recommendations.",
				color: "grape",
				autoClose: 6000,
			});
			sessionStorage.setItem("spotiswipe:lastfm-nudged", "1");
		} catch {
			// sessionStorage unavailable
		}
	}, [isDemo, lastfmQuery.isLoading, lastfmQuery.data, lastfmQuery.error]);
}
