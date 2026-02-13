"use client";

import { AppShell, Box } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useCallback, useState } from "react";
import HeaderSearch from "../_components/HeaderSearch";
import Navbar from "../_components/Navbar";
import LyricsPanel from "./_components/LyricsPanel";
import PlayerCard from "./_components/PlayerCard";
import PlaylistStack from "./_components/PlaylistStack";
import ProviderSwitcher from "./_components/ProviderSwitcher";
import styles from "./dashboard.module.css";

const Dashboard = () => {
	const [opened] = useDisclosure();
	const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
	const [currentSong, setCurrentSong] = useState<{
		name: string;
		artist: string;
	} | null>(null);

	const handleSongChange = useCallback(
		(song: { name: string; artist: string } | null) => {
			console.debug("[SpotiSwipe] Dashboard currentSong changed:", song);
			setCurrentSong(song);
		},
		[],
	);

	const handleSetActivePlaylist = useCallback((id: string | null) => {
		console.debug("[SpotiSwipe] Dashboard activePlaylistId changed:", id);
		setActivePlaylistId(id);
	}, []);

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
					<div className={styles.dashboardGrid}>
						{/* Left: Playlist Stack */}
						<PlaylistStack
							activePlaylistId={activePlaylistId}
							onSetActivePlaylist={handleSetActivePlaylist}
						/>

						{/* Center: Provider Switcher + Player Card */}
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "var(--mantine-spacing-sm)",
								height: "100%",
								minHeight: 0,
							}}
						>
							<div style={{ display: "flex", justifyContent: "center" }}>
								<ProviderSwitcher />
							</div>
							<PlayerCard
								activePlaylistId={activePlaylistId}
								onSongChange={handleSongChange}
							/>
						</div>

						{/* Right: Info/Liked Panel */}
						<LyricsPanel currentSong={currentSong} />
					</div>
				</Box>
			</AppShell.Main>
		</AppShell>
	);
};

export default Dashboard;
