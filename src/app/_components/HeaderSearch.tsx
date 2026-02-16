"use client";

import { Autocomplete, Burger, Group } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconMusic, IconSearch } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppShellState } from "~/lib/contexts/app-shell-context";
import * as lastfm from "~/lib/services/lastfm";
import * as spotify from "~/lib/services/spotify";
import classes from "~/styles/HeaderSearch.module.css";
import { api } from "~/trpc/react";
import ColorSchemeToggle from "./ColorSchemeToggle";

const HeaderSearch = () => {
	const { opened, toggle } = useAppShellState();
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");
	const [debouncedQuery] = useDebouncedValue(searchQuery, 300);

	const { data: provider } = api.user.getMusicProvider.useQuery(undefined, {
		retry: false,
	});
	const { data: connected } = api.user.getConnectedProviders.useQuery();
	const useSpotify = provider === "spotify" && connected?.spotify;

	const { data: spotifyTokenData } = api.token.getSpotifyToken.useQuery(
		undefined,
		{ enabled: !!useSpotify, retry: false },
	);

	const { data: searchResults } = useQuery({
		queryKey: ["headerSearch", debouncedQuery, useSpotify],
		queryFn: async () => {
			if (useSpotify && spotifyTokenData?.accessToken) {
				const result = await spotify.search(
					spotifyTokenData.accessToken,
					debouncedQuery,
					10,
				);
				return (result.tracks?.items ?? []).map((t) => ({
					name: t.name,
					artist: t.artists.map((a) => a.name).join(", "),
				}));
			}
			const tracks = await lastfm.searchTracks(debouncedQuery, 10);
			return tracks.map((t) => ({ name: t.name, artist: t.artist }));
		},
		enabled: debouncedQuery.length > 2,
		refetchOnWindowFocus: false,
	});

	const autocompleteData =
		searchResults?.map((track) => ({
			value: `${track.name} - ${track.artist}`,
			label: `${track.name} - ${track.artist}`,
		})) ?? [];

	// Deduplicate by value
	const uniqueData = Array.from(
		new Map(autocompleteData.map((item) => [item.value, item])).values(),
	);

	const navigateToSearch = (query: string) => {
		const trimmed = query.trim();
		if (trimmed) {
			router.push(`/dashboard?q=${encodeURIComponent(trimmed)}`);
			setSearchQuery("");
		}
	};

	return (
		<header className={classes.header}>
			<div className={classes.inner}>
				<Group>
					<Burger hiddenFrom="sm" onClick={toggle} opened={opened} size="sm" />
					<IconMusic
						color="var(--mantine-color-white)"
						size={28}
						stroke={1.5}
					/>
				</Group>

				<Autocomplete
					className={classes.search}
					data={uniqueData.map((d) => d.value)}
					leftSection={<IconSearch size={20} stroke={1.5} />}
					onChange={(value) => {
						console.debug("[SpotiSwipe] Search query changed:", value);
						setSearchQuery(value);
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							navigateToSearch(searchQuery);
						}
					}}
					onOptionSubmit={(value) => {
						navigateToSearch(value);
					}}
					placeholder="Search for Songs, Artists, or Genres"
					value={searchQuery}
					visibleFrom="xs"
					w={{ base: "30%", xs: "15%", sm: "20%", md: "30%" }}
				/>

				<ColorSchemeToggle />
			</div>
		</header>
	);
};

export default HeaderSearch;
