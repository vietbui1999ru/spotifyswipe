"use client";

import { Box } from "@mantine/core";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { useSessionState } from "~/lib/hooks/useSessionState";
import LyricsPanel from "./_components/LyricsPanel";
import PlayerCard from "./_components/PlayerCard";
import PlaylistStack from "./_components/PlaylistStack";
import styles from "./dashboard.module.css";

const Dashboard = () => {
	const searchParams = useSearchParams();
	const searchQuery = searchParams.get("q") ?? undefined;

	const [activePlaylistId, setActivePlaylistId] = useSessionState<
		string | null
	>("spotiswipe:active-playlist", null);
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

	const handleSetActivePlaylist = useCallback(
		(id: string | null) => {
			console.debug("[SpotiSwipe] Dashboard activePlaylistId changed:", id);
			setActivePlaylistId(id);
		},
		[setActivePlaylistId],
	);

	return (
		<Box className={styles.container}>
			<div className={styles.dashboardGrid}>
				{/* Left: Playlist Stack */}
				<PlaylistStack
					activePlaylistId={activePlaylistId}
					onSetActivePlaylist={handleSetActivePlaylist}
				/>

				{/* Center: Player Card */}
				<PlayerCard
					activePlaylistId={activePlaylistId}
					onSongChange={handleSongChange}
					searchQuery={searchQuery}
				/>

				{/* Right: Info/Liked Panel */}
				<LyricsPanel currentSong={currentSong} />
			</div>
		</Box>
	);
};

export default Dashboard;
