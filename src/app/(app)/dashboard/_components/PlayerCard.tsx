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
import {
	IconBrandLastfm,
	IconBrandSpotify,
	IconCheck,
	IconHeart,
	IconPlayerPause,
	IconPlayerPlay,
	IconRefresh,
	IconX,
} from "@tabler/icons-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDiscoveryFeed } from "~/lib/hooks/useDiscoveryFeed";
import { useSessionState } from "~/lib/hooks/useSessionState";
import { useSpotifyPlayer } from "~/lib/hooks/useSpotifyPlayer";
import { api } from "~/trpc/react";
import styles from "../dashboard.module.css";

interface PlayerCardProps {
	activePlaylistId: string | null;
	onSongChange?: (song: { name: string; artist: string } | null) => void;
	searchQuery?: string;
}

const formatTime = (seconds: number) => {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
};

const PlayerCard = ({
	activePlaylistId,
	onSongChange,
	searchQuery,
}: PlayerCardProps) => {
	const [currentIndex, setCurrentIndex] = useSessionState(
		"spotiswipe:card-index",
		0,
	);
	const [swipeDirection, setSwipeDirection] = useState<
		"left" | "right" | "up" | null
	>(null);

	const {
		data: feed,
		isLoading,
		error,
		refetch,
		isDemo,
	} = useDiscoveryFeed(20, searchQuery);

	// Reset card index when search query changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally only reset on searchQuery change
	useEffect(() => {
		setCurrentIndex(0);
		try {
			sessionStorage.removeItem("spotiswipe:discovery-feed");
		} catch {
			// sessionStorage unavailable
		}
	}, [searchQuery]);

	const utils = api.useUtils();

	// --- Spotify Web Playback SDK ---
	const getToken = useCallback(async () => {
		const result = await utils.token.getSpotifyToken.fetch();
		return result.accessToken;
	}, [utils]);

	const player = useSpotifyPlayer({
		getToken,
		playerName: "SpotiSwipe",
		enabled: !isDemo,
	});

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

	// --- Lifecycle effects ---

	useEffect(() => {
		console.debug("[SpotiSwipe] PlayerCard mounted");
		return () => console.debug("[SpotiSwipe] PlayerCard unmounted");
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally only fires on card index change to avoid re-playing on unrelated state updates
	useEffect(() => {
		console.debug("[SpotiSwipe] Current song index changed:", currentIndex);
		onSongChange?.(
			currentTrack
				? { name: currentTrack.name, artist: currentTrack.artist }
				: null,
		);

		// Auto-play the new track via Spotify SDK
		if (currentTrack?.spotifyId && player.isReady && player.isPremium) {
			player.playTrack(`spotify:track:${currentTrack.spotifyId}`);
		}
	}, [currentIndex]);

	// --- Swipe action handlers (defined before gesture handlers that reference them) ---

	const advanceCard = useCallback(() => {
		setTimeout(() => {
			setCurrentIndex((prev) => prev + 1);
			setSwipeDirection(null);
		}, 300);
	}, [setCurrentIndex]);

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

			const songData = {
				title: currentTrack.name,
				artist: currentTrack.artist,
				albumArt: currentTrack.image ?? undefined,
				lastfmUrl: currentTrack.url,
				spotifyId: currentTrack.spotifyId,
				spotifyUrl: currentTrack.spotifyUrl,
				externalId: currentTrack.externalId,
			};

			recordSwipe.mutate({ songData, action });

			if ((action === "liked" || action === "superliked") && activePlaylistId) {
				addSong.mutate({
					playlistId: activePlaylistId,
					songData,
				});
			}

			advanceCard();
		},
		[currentTrack, activePlaylistId, recordSwipe, addSong, advanceCard],
	);

	const handleRefresh = useCallback(() => {
		console.debug("[SpotiSwipe] Refreshing discovery feed");
		setCurrentIndex(0);
		try {
			sessionStorage.removeItem("spotiswipe:discovery-feed");
		} catch {
			// sessionStorage unavailable
		}
		refetch();
	}, [refetch, setCurrentIndex]);

	// --- Drag / gesture state ---
	const SWIPE_THRESHOLD_X = 100;
	const SWIPE_THRESHOLD_Y = 80;
	const MAX_ROTATION_DEG = 15;

	const dragRef = useRef({
		isDragging: false,
		startX: 0,
		startY: 0,
		currentX: 0,
		currentY: 0,
		pointerId: -1,
	});
	const cardRef = useRef<HTMLDivElement>(null);

	const [dragDelta, setDragDelta] = useState<{
		x: number;
		y: number;
	} | null>(null);

	const isDragging = dragDelta !== null;

	/** Determine which direction the user is leaning toward during a drag */
	const getDragDirection = (
		dx: number,
		dy: number,
	): "left" | "right" | "up" | null => {
		const absDx = Math.abs(dx);
		const absDy = Math.abs(dy);

		// Upward drag takes priority when dy is negative and large enough
		if (dy < -SWIPE_THRESHOLD_Y / 2 && absDy > absDx) return "up";
		if (dx > SWIPE_THRESHOLD_X / 2) return "right";
		if (dx < -SWIPE_THRESHOLD_X / 2) return "left";
		return null;
	};

	const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		// Ignore if clicking a button or link inside the card
		const target = e.target as HTMLElement;
		if (target.closest("button") || target.closest("a")) return;

		dragRef.current = {
			isDragging: true,
			startX: e.clientX,
			startY: e.clientY,
			currentX: e.clientX,
			currentY: e.clientY,
			pointerId: e.pointerId,
		};

		// Capture pointer so we get events even if finger/mouse leaves the element
		cardRef.current?.setPointerCapture(e.pointerId);
		setDragDelta({ x: 0, y: 0 });
	}, []);

	const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		if (!dragRef.current.isDragging) return;

		const dx = e.clientX - dragRef.current.startX;
		const dy = e.clientY - dragRef.current.startY;
		dragRef.current.currentX = e.clientX;
		dragRef.current.currentY = e.clientY;

		setDragDelta({ x: dx, y: dy });
	}, []);

	const onPointerUp = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (!dragRef.current.isDragging) return;

			const dx = e.clientX - dragRef.current.startX;
			const dy = e.clientY - dragRef.current.startY;

			dragRef.current.isDragging = false;
			dragRef.current.pointerId = -1;

			cardRef.current?.releasePointerCapture(e.pointerId);

			// Determine if the drag passed a threshold
			const absDx = Math.abs(dx);
			const absDy = Math.abs(dy);

			if (dy < -SWIPE_THRESHOLD_Y && absDy > absDx) {
				// Swiped up -> superlike
				setDragDelta(null);
				handleSwipe("superliked");
			} else if (dx > SWIPE_THRESHOLD_X) {
				// Swiped right -> like
				setDragDelta(null);
				handleSwipe("liked");
			} else if (dx < -SWIPE_THRESHOLD_X) {
				// Swiped left -> skip
				setDragDelta(null);
				handleSwipe("skipped");
			} else {
				// Below threshold -> snap back
				setDragDelta(null);
			}
		},
		[handleSwipe],
	);

	const onPointerCancel = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (!dragRef.current.isDragging) return;
			dragRef.current.isDragging = false;
			dragRef.current.pointerId = -1;
			cardRef.current?.releasePointerCapture(e.pointerId);
			setDragDelta(null);
		},
		[],
	);

	// --- End drag / gesture state ---

	if (isLoading) {
		return (
			<Box className={styles.glassCard}>
				<Stack align="center" gap="lg" h={500} justify="center">
					<Loader size="lg" />
					<Text c="dimmed">Loading discovery feed...</Text>
				</Stack>
			</Box>
		);
	}

	if (error) {
		return (
			<Box className={styles.glassCard}>
				<Stack align="center" gap="lg" h={500} justify="center">
					<Text c="red">{error.message}</Text>
					<Text c="dimmed" size="sm">
						Make sure your music account is connected and has listening history
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
			<Box className={styles.glassCard}>
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

	// --- Compute transform and visual feedback ---

	// During a drag, use the live delta; otherwise use the exit animation transform
	let cardTransform: string;
	let cardTransition: string;

	if (isDragging && dragDelta) {
		// Rotation proportional to horizontal drag, capped at MAX_ROTATION_DEG
		const rotation = (dragDelta.x / SWIPE_THRESHOLD_X) * (MAX_ROTATION_DEG / 2);
		const clampedRotation = Math.max(
			-MAX_ROTATION_DEG,
			Math.min(MAX_ROTATION_DEG, rotation),
		);
		cardTransform = `translate(${dragDelta.x}px, ${Math.min(0, dragDelta.y)}px) rotate(${clampedRotation}deg)`;
		cardTransition = "none"; // No transition during drag for instant feedback
	} else if (swipeDirection) {
		// Exit animation after a completed swipe
		cardTransform =
			swipeDirection === "left"
				? "translateX(-150%) rotate(-20deg)"
				: swipeDirection === "right"
					? "translateX(150%) rotate(20deg)"
					: "translateY(-150%) scale(1.1)";
		cardTransition = "transform 0.3s ease-out";
	} else {
		// Idle or snap-back
		cardTransform = "translate(0, 0) rotate(0deg)";
		cardTransition = "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)";
	}

	// Direction hint during drag (for overlay glow)
	const activeDragDirection =
		isDragging && dragDelta ? getDragDirection(dragDelta.x, dragDelta.y) : null;

	// Overlay opacity scales with how close the drag is to the threshold
	const overlayOpacity = (() => {
		if (!isDragging || !dragDelta) return 0;
		if (activeDragDirection === "right") {
			return Math.min(1, Math.abs(dragDelta.x) / SWIPE_THRESHOLD_X);
		}
		if (activeDragDirection === "left") {
			return Math.min(1, Math.abs(dragDelta.x) / SWIPE_THRESHOLD_X);
		}
		if (activeDragDirection === "up") {
			return Math.min(1, Math.abs(dragDelta.y) / SWIPE_THRESHOLD_Y);
		}
		return 0;
	})();

	return (
		<Box
			className={styles.glassCard}
			onPointerCancel={onPointerCancel}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			ref={cardRef}
			style={{
				transform: cardTransform,
				transition: cardTransition,
				touchAction: "none", // Prevent browser scroll/pan during swipe
				cursor: isDragging ? "grabbing" : "grab",
				userSelect: "none",
			}}
		>
			{/* Directional swipe overlay */}
			{isDragging && activeDragDirection && (
				<div
					className={
						activeDragDirection === "right"
							? styles.swipeOverlayLike
							: activeDragDirection === "left"
								? styles.swipeOverlaySkip
								: styles.swipeOverlaySuperlike
					}
					style={{ opacity: overlayOpacity * 0.6 }}
				/>
			)}

			{/* Album Art */}
			<div className={styles.albumArt}>
				{currentTrack.image ? (
					<Image
						alt={`${currentTrack.name} by ${currentTrack.artist}`}
						draggable={false}
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

			{/* Swipe direction label (visible when close to threshold) */}
			{isDragging && activeDragDirection && overlayOpacity > 0.4 && (
				<div className={styles.swipeLabel}>
					<Text
						fw={700}
						size="xl"
						style={{
							color:
								activeDragDirection === "right"
									? "rgb(34, 197, 94)"
									: activeDragDirection === "left"
										? "rgb(239, 68, 68)"
										: "rgb(236, 72, 153)",
							textTransform: "uppercase",
							letterSpacing: "0.1em",
							textShadow: "0 2px 8px rgba(0,0,0,0.5)",
						}}
					>
						{activeDragDirection === "right"
							? "LIKE"
							: activeDragDirection === "left"
								? "SKIP"
								: "SUPERLIKE"}
					</Text>
				</div>
			)}

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

			{/* Card Counter + Spotify/Last.fm link */}
			<Group gap="xs" justify="center" mt="xs">
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
				{currentTrack.spotifyUrl && (
					<Badge
						color="#1DB954"
						component="a"
						href={currentTrack.spotifyUrl}
						leftSection={<IconBrandSpotify size={12} />}
						rel="noopener noreferrer"
						style={{ cursor: "pointer" }}
						target="_blank"
						variant="filled"
					>
						Spotify
					</Badge>
				)}
				{!currentTrack.spotifyUrl && currentTrack.url && (
					<Badge
						color="blue"
						component="a"
						href={currentTrack.url}
						rel="noopener noreferrer"
						style={{ cursor: "pointer" }}
						target="_blank"
						variant="light"
					>
						Last.fm
					</Badge>
				)}
			</Group>

			{/* Non-premium banner */}
			{!player.isPremium && currentTrack.spotifyId && (
				<Text c="dimmed" mt="xs" size="xs" ta="center">
					Spotify Premium required for in-app playback
				</Text>
			)}

			{/* Swipe + Playback Controls */}
			<div style={{ marginTop: "auto" }}>
				{/* Progress bar (Spotify SDK playback) */}
				{currentTrack.spotifyId && player.isPremium && player.isReady && (
					<>
						<div className={styles.progressBar}>
							<div
								className={styles.progressFill}
								style={{
									width: `${player.duration > 0 ? (player.position / player.duration) * 100 : 0}%`,
								}}
							/>
						</div>
						<div className={styles.timeDisplay}>
							<span>{formatTime(player.position / 1000)}</span>
							<span>
								{player.duration > 0
									? formatTime(player.duration / 1000)
									: "0:00"}
							</span>
						</div>
					</>
				)}

				{/* Swipe buttons with play/pause integrated in center */}
				<div className={styles.swipeControls}>
					<button
						className={`${styles.swipeButton} ${styles.rejectButton}`}
						onClick={() => handleSwipe("skipped")}
						title="Skip"
						type="button"
					>
						<IconX size={24} />
					</button>

					{isDemo && currentTrack.url ? (
						<Button
							color="red"
							component="a"
							href={currentTrack.url}
							leftSection={<IconBrandLastfm size={18} />}
							rel="noopener noreferrer"
							size="sm"
							target="_blank"
							variant="light"
						>
							Listen on Last.fm
						</Button>
					) : currentTrack.spotifyId && player.isPremium && player.isReady ? (
						<button
							className={styles.playButton}
							onClick={() => player.togglePlay()}
							title={player.paused ? "Play" : "Pause"}
							type="button"
						>
							{player.paused ? (
								<IconPlayerPlay color="#18181b" size={22} />
							) : (
								<IconPlayerPause color="#18181b" size={22} />
							)}
						</button>
					) : (
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
					)}

					<button
						className={`${styles.swipeButton} ${styles.acceptButton}`}
						onClick={() => handleSwipe("liked")}
						title="Like"
						type="button"
					>
						<IconCheck size={24} />
					</button>
				</div>

				{/* Super Like below when play button takes center spot */}
				{currentTrack.spotifyId && player.isPremium && player.isReady && (
					<Group justify="center" mt="xs">
						<button
							className={`${styles.swipeButton}`}
							onClick={() => handleSwipe("superliked")}
							style={{
								borderColor: "rgba(236, 72, 153, 0.5)",
								color: "rgb(236, 72, 153)",
								background: "rgba(236, 72, 153, 0.05)",
								width: "3rem",
								height: "3rem",
							}}
							title="Super Like"
							type="button"
						>
							<IconHeart size={18} />
						</button>
					</Group>
				)}
			</div>
		</Box>
	);
};

export default PlayerCard;
