"use client";

import { Badge, Group, Loader, Stack, Text } from "@mantine/core";
import { IconHeart, IconMusic } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import styles from "../dashboard.module.css";
import { GradientSegmentedControl } from "./GradientSegmentedControl";

interface LyricsPanelProps {
	currentSong: { name: string; artist: string } | null;
}

const LyricsPanel = ({ currentSong }: LyricsPanelProps) => {
	const [activeTab, setActiveTab] = useState<string>("info");

	const {
		data: trackInfo,
		isLoading: trackInfoLoading,
		error: trackInfoError,
	} = api.song.getInfo.useQuery(
		{ track: currentSong?.name ?? "", artist: currentSong?.artist ?? "" },
		{
			enabled: !!currentSong && activeTab === "info",
			refetchOnWindowFocus: false,
		},
	);

	const { data: likedHistory, isLoading: historyLoading } =
		api.swipe.getHistory.useQuery(
			{ action: "liked", limit: 10 },
			{
				enabled: activeTab === "liked",
				refetchOnWindowFocus: false,
			},
		);

	useEffect(() => {
		console.debug("[SpotiSwipe] LyricsPanel mounted");
		return () => console.debug("[SpotiSwipe] LyricsPanel unmounted");
	}, []);

	useEffect(() => {
		console.debug("[SpotiSwipe] LyricsPanel tab changed:", activeTab);
	}, [activeTab]);

	return (
		<div className={styles.lyricsPanelContainer}>
			{/* Header with Segmented Control */}
			<div className={styles.lyricsPanelHeader}>
				<GradientSegmentedControl
					classNames={{
						root: styles.gradientControlRoot,
						indicator: styles.gradientControlIndicator,
						control: styles.gradientControlControl,
						label: styles.gradientControlLabel,
					}}
					data={[
						{ value: "info", label: "Artist Info" },
						{ value: "liked", label: "Liked Songs" },
					]}
					onChange={setActiveTab}
					radius="lg"
					size="xs"
					value={activeTab}
				/>
			</div>

			{/* Content Area */}
			{activeTab === "info" ? (
				<div className={styles.lyricContent}>
					{!currentSong ? (
						<Stack align="center" gap="lg" h="100%" justify="center" p="md">
							<Text c="dimmed" size="sm">
								No track selected -- start swiping to see track info
							</Text>
						</Stack>
					) : trackInfoLoading ? (
						<Stack align="center" gap="lg" h="100%" justify="center" p="md">
							<Loader size="lg" />
							<Text c="dimmed" size="sm">
								Loading track info...
							</Text>
						</Stack>
					) : trackInfoError ? (
						<Stack align="center" gap="lg" h="100%" justify="center" p="md">
							<Text c="red" size="sm">
								{trackInfoError.message}
							</Text>
						</Stack>
					) : trackInfo ? (
						<Stack className={styles.lyricsText} gap="md">
							<div>
								<Group gap="xs" mb="xs">
									<IconMusic size={18} />
									<Text fw={600}>Currently Viewing</Text>
								</Group>
								<Text className={styles.lyricLineHighlight}>
									{trackInfo.name}
								</Text>
								<Text c="dimmed" size="sm">
									by {trackInfo.artist}
								</Text>
							</div>

							{/* Track Stats */}
							<div
								style={{
									borderTop: "1px solid var(--mantine-color-gray-7)",
									paddingTop: "12px",
								}}
							>
								<Group gap="sm" mb="sm">
									<Badge variant="light">
										{trackInfo.listeners.toLocaleString()} listeners
									</Badge>
									<Badge variant="light">
										{trackInfo.playcount.toLocaleString()} plays
									</Badge>
									{trackInfo.loved && (
										<Badge color="red" variant="light">
											Loved
										</Badge>
									)}
								</Group>

								{trackInfo.album && (
									<Text c="dimmed" size="sm">
										Album: {trackInfo.album.title}
									</Text>
								)}

								{trackInfo.wiki && (
									<Text
										c="dimmed"
										lineClamp={4}
										mt="sm"
										size="xs"
										style={{ lineHeight: 1.6 }}
									>
										{trackInfo.wiki.replace(/<[^>]+>/g, "")}
									</Text>
								)}
							</div>

							{trackInfo.url && (
								<a
									href={trackInfo.url}
									rel="noopener noreferrer"
									style={{ textDecoration: "none" }}
									target="_blank"
								>
									<button
										className={styles.generateButton}
										style={{ width: "100%", marginTop: "8px" }}
										type="button"
									>
										View on Last.fm
									</button>
								</a>
							)}
						</Stack>
					) : (
						<Stack align="center" gap="lg" h="100%" justify="center" p="md">
							<Text c="dimmed" size="sm">
								No track data available
							</Text>
						</Stack>
					)}
				</div>
			) : (
				// Liked Songs View
				<div className={styles.lyricContent}>
					{historyLoading ? (
						<Stack align="center" gap="lg" h="100%" justify="center" p="md">
							<Loader size="lg" />
							<Text c="dimmed" size="sm">
								Loading liked songs...
							</Text>
						</Stack>
					) : !likedHistory || likedHistory.items.length === 0 ? (
						<Stack align="center" gap="lg" h="100%" justify="center" p="md">
							<Text c="dimmed" size="sm">
								No liked songs yet -- start swiping!
							</Text>
						</Stack>
					) : (
						<Stack gap="sm">
							<Group gap="xs" mb="xs">
								<IconHeart color="rgb(34, 197, 94)" size={18} />
								<Text fw={600} size="sm">
									{likedHistory.items.length} recently liked
								</Text>
							</Group>
							{likedHistory.items.map((item) => (
								<div
									key={item.id}
									style={{
										padding: "0.5rem 0.75rem",
										background: "rgba(39, 39, 42, 0.6)",
										border: "1px solid rgba(63, 63, 70, 0.5)",
										borderRadius: "0.5rem",
									}}
								>
									<Text
										fw={500}
										size="sm"
										style={{ color: "rgba(255,255,255,0.9)" }}
										truncate
									>
										{item.song.title}
									</Text>
									<Text
										size="xs"
										style={{ color: "rgba(255,255,255,0.5)" }}
										truncate
									>
										{item.song.artist}
									</Text>
								</div>
							))}
						</Stack>
					)}
				</div>
			)}
		</div>
	);
};

export default LyricsPanel;
