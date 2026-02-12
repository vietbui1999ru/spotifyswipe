"use client";

import { AppShell, Box, Loader, Select, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useCallback, useEffect, useState } from "react";
import { api } from "~/trpc/react";
import HeaderSearch from "../_components/HeaderSearch";
import Navbar from "../_components/Navbar";
import PlaylistHeader from "./_components/PlaylistHeader";
import PlaylistSongList from "./_components/PlaylistSongList";
import styles from "./playlist.module.css";

const PlaylistPage = () => {
	const [opened] = useDisclosure();
	const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
		null,
	);

	const { data: playlists, isLoading } = api.playlist.getAll.useQuery(
		undefined,
		{ refetchOnWindowFocus: false },
	);

	// Auto-select first playlist
	useEffect(() => {
		if (!selectedPlaylistId && playlists && playlists.length > 0) {
			console.debug(
				"[SpotiSwipe] PlaylistPage auto-selecting first playlist:",
				playlists[0]?.name,
			);
			setSelectedPlaylistId(playlists[0]?.id ?? null);
		}
	}, [playlists, selectedPlaylistId]);

	const handleDeleted = useCallback(() => {
		console.debug("[SpotiSwipe] Playlist deleted, resetting selection");
		setSelectedPlaylistId(null);
	}, []);

	const playlistOptions =
		playlists?.map((p) => ({
			value: p.id,
			label: `${p.name} (${p.songCount} songs)`,
		})) ?? [];

	return (
		<AppShell
			header={{ height: 60 }}
			navbar={{ width: 260, breakpoint: "sm", collapsed: { mobile: !opened } }}
			padding="md"
		>
			<AppShell.Header>
				<HeaderSearch />
			</AppShell.Header>

			<AppShell.Navbar p="md">
				<Navbar />
			</AppShell.Navbar>

			<AppShell.Main>
				<Box className={styles.container}>
					<div className={styles.playlistContent}>
						{/* Playlist Selector */}
						{isLoading ? (
							<Stack align="center" p="md">
								<Loader size="sm" />
							</Stack>
						) : playlistOptions.length > 0 ? (
							<Select
								data={playlistOptions}
								label="Select Playlist"
								onChange={setSelectedPlaylistId}
								placeholder="Choose a playlist"
								style={{ maxWidth: 400 }}
								value={selectedPlaylistId}
							/>
						) : (
							<Text c="dimmed">
								No playlists yet. Create one from the Dashboard.
							</Text>
						)}

						{/* Playlist Header Section */}
						<PlaylistHeader
							onDeleted={handleDeleted}
							playlistId={selectedPlaylistId}
						/>

						{/* Playlist Songs Section */}
						<PlaylistSongList playlistId={selectedPlaylistId} />
					</div>
				</Box>
			</AppShell.Main>
		</AppShell>
	);
};

export default PlaylistPage;
