"use client";

import {
	Badge,
	Box,
	Button,
	Group,
	Loader,
	Stack,
	Text,
	Title,
	Tooltip,
} from "@mantine/core";
import { IconCheck, IconHeart, IconRefresh, IconX } from "@tabler/icons-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { api } from "~/trpc/react";
import styles from "../dashboard.module.css";

interface PlayerCardProps {
	activePlaylistId: string | null;
	onSongChange?: (song: { name: string; artist: string } | null) => void;
}

const PlayerCard = ({ activePlaylistId, onSongChange }: PlayerCardProps) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [swipeDirection, setSwipeDirection] = useState<
		"left" | "right" | "up" | null
	>(null);

	const {
		data: feed,
		isLoading,
		error,
		refetch,
	} = api.swipe.getDiscoveryFeed.useQuery(
		{ limit: 20 },
		{
			refetchOnWindowFocus: false,
		},
	);

	const utils = api.useUtils();

	const recordSwipe = api.swipe.recordSwipe.useMutation({
		onSuccess: () => {
			console.debug("[SpotiSwipe] Swipe recorded successfully");
		},
		onError: (err) => {
			console.error("[SpotiSwipe] Failed to record swipe:", err.message);
		},
	});

	const addSong = api.playlist.addSong.useMutation({
		onSuccess: () => {
			console.debug("[SpotiSwipe] Song added to playlist");
			utils.playlist.getAll.invalidate();
			utils.playlist.getById.invalidate();
		},
		onError: (err) => {
			console.error(
				"[SpotiSwipe] Failed to add song to playlist:",
				err.message,
			);
		},
	});

	const currentTrack = feed?.[currentIndex] ?? null;

	useEffect(() => {
		console.debug("[SpotiSwipe] PlayerCard mounted");
		return () => console.debug("[SpotiSwipe] PlayerCard unmounted");
	}, []);

	useEffect(() => {
		console.debug("[SpotiSwipe] Current song index changed:", currentIndex);
		onSongChange?.(
			currentTrack
				? { name: currentTrack.name, artist: currentTrack.artist }
				: null,
		);
	}, [currentIndex, currentTrack, onSongChange]);

	const advanceCard = useCallback(() => {
		setTimeout(() => {
			setCurrentIndex((prev) => prev + 1);
			setSwipeDirection(null);
		}, 300);
	}, []);

	const handleSwipe = useCallback(
		(action: "liked" | "skipped" | "superliked") => {
			if (!currentTrack) return;

			console.debug("[SpotiSwipe] Swipe action:", action, currentTrack.name);

			setSwipeDirection(
				action === "skipped"
					? "left"
					: action === "superliked"
						? "up"
						: "right",
			);

			recordSwipe.mutate({
				songData: {
					title: currentTrack.name,
					artist: currentTrack.artist,
					albumArt: currentTrack.image ?? undefined,
					lastfmUrl: currentTrack.url,
					externalId: currentTrack.externalId,
				},
				action,
			});

			if ((action === "liked" || action === "superliked") && activePlaylistId) {
				addSong.mutate({
					playlistId: activePlaylistId,
					songData: {
						title: currentTrack.name,
						artist: currentTrack.artist,
						albumArt: currentTrack.image ?? undefined,
						lastfmUrl: currentTrack.url,
						externalId: currentTrack.externalId,
					},
				});
			}

			advanceCard();
		},
		[currentTrack, activePlaylistId, recordSwipe, addSong, advanceCard],
	);

	const handleRefresh = useCallback(() => {
		console.debug("[SpotiSwipe] Refreshing discovery feed");
		setCurrentIndex(0);
		refetch();
	}, [refetch]);

	if (isLoading) {
		return (
			<Box className={styles.glassCard} style={{ maxWidth: "420px" }}>
				<Stack align="center" gap="lg" h={500} justify="center">
					<Loader size="lg" />
					<Text c="dimmed">Loading discovery feed...</Text>
				</Stack>
			</Box>
		);
	}

	if (error) {
		return (
			<Box className={styles.glassCard} style={{ maxWidth: "420px" }}>
				<Stack align="center" gap="lg" h={500} justify="center">
					<Text c="red">{error.message}</Text>
					<Text c="dimmed" size="sm">
						Make sure your Last.fm account is connected and has scrobbles
					</Text>
					<Button onClick={handleRefresh} variant="light">
						Try Again
					</Button>
				</Stack>
			</Box>
		);
	}

	if (!feed || feed.length === 0 || !currentTrack) {
		return (
			<Box className={styles.glassCard} style={{ maxWidth: "420px" }}>
				<Stack align="center" gap="lg" h={500} justify="center">
					<Text c="dimmed" size="lg">
						No more songs to discover
					</Text>
					<Text c="dimmed" size="sm">
						Check back later or refresh for new recommendations
					</Text>
					<Button
						leftSection={<IconRefresh size={16} />}
						onClick={handleRefresh}
						variant="light"
					>
						Refresh Feed
					</Button>
				</Stack>
			</Box>
		);
	}

	const swipeTransform =
		swipeDirection === "left"
			? "translateX(-150%) rotate(-20deg)"
			: swipeDirection === "right"
				? "translateX(150%) rotate(20deg)"
				: swipeDirection === "up"
					? "translateY(-150%) scale(1.1)"
					: "translateX(0)";

	return (
		<Box
			className={styles.glassCard}
			style={{
				maxWidth: "420px",
				transform: swipeTransform,
				transition: "transform 0.3s ease-out",
			}}
		>
			{/* Album Art */}
			<div className={styles.albumArt}>
				{currentTrack.image ? (
					<Image
						alt={`${currentTrack.name} by ${currentTrack.artist}`}
						height={400}
						priority
						src={currentTrack.image}
						width={400}
					/>
				) : (
					<div
						style={{
							width: "100%",
							height: "400px",
							background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "white",
						}}
					>
						<Text>No album art</Text>
					</div>
				)}
			</div>

			{/* Track Info */}
			<Stack align="center" gap="xs">
				<div style={{ width: "100%", overflow: "hidden", textAlign: "center" }}>
					<Title
						order={2}
						size="h3"
						style={{
							marginBottom: "4px",
							whiteSpace: "nowrap",
							overflow: "hidden",
							textOverflow: "ellipsis",
						}}
					>
						{currentTrack.name}
					</Title>
				</div>
				<Text c="dimmed" size="sm" style={{ width: "100%" }} truncate>
					{currentTrack.artist}
				</Text>
			</Stack>

			{/* Card Counter */}
			<Group gap="xs" justify="center" mt="md">
				<Badge variant="light">
					{currentIndex + 1} / {feed.length}
				</Badge>
				{activePlaylistId && (
					<Tooltip label="Liked songs will be added to your active playlist">
						<Badge color="green" variant="light">
							Auto-add ON
						</Badge>
					</Tooltip>
				)}
			</Group>

			{/* Track Link */}
			{currentTrack.url && (
				<Group justify="center" mt="sm">
					<a
						href={currentTrack.url}
						rel="noopener noreferrer"
						style={{ textDecoration: "none" }}
						target="_blank"
					>
						<Text c="blue" component="span" size="sm">
							View on Last.fm
						</Text>
					</a>
				</Group>
			)}

			{/* Swipe Controls */}
			<div className={styles.swipeControls} style={{ marginTop: "auto" }}>
				<button
					className={`${styles.swipeButton} ${styles.rejectButton}`}
					onClick={() => handleSwipe("skipped")}
					title="Skip"
					type="button"
				>
					<IconX size={24} />
				</button>
				<button
					className={`${styles.swipeButton}`}
					onClick={() => handleSwipe("superliked")}
					style={{
						borderColor: "rgba(236, 72, 153, 0.5)",
						color: "rgb(236, 72, 153)",
						background: "rgba(236, 72, 153, 0.05)",
					}}
					title="Super Like"
					type="button"
				>
					<IconHeart size={24} />
				</button>
				<button
					className={`${styles.swipeButton} ${styles.acceptButton}`}
					onClick={() => handleSwipe("liked")}
					title="Like"
					type="button"
				>
					<IconCheck size={24} />
				</button>
			</div>
		</Box>
	);
};

export default PlayerCard;
