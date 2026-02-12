"use client";

import { Button, Loader, Stack, Text } from "@mantine/core";
import { IconHeart } from "@tabler/icons-react";
import { useEffect } from "react";
import styles from "~/styles/shareboard.module.css";
import { api } from "~/trpc/react";

interface ShareboardGridProps {
	onSelectShareboard: (id: string) => void;
}

const ShareboardGrid = ({ onSelectShareboard }: ShareboardGridProps) => {
	const {
		data: feedData,
		isLoading,
		error,
	} = api.social.getFeed.useQuery(
		{ limit: 20 },
		{ refetchOnWindowFocus: false },
	);

	const utils = api.useUtils();

	const addPlaylist = api.social.addPlaylistFromPost.useMutation({
		onSuccess: () => {
			console.debug("[SpotiSwipe] Playlist copied from post");
			utils.playlist.getAll.invalidate();
		},
		onError: (err) => {
			console.error("[SpotiSwipe] Failed to copy playlist:", err.message);
		},
	});

	useEffect(() => {
		console.debug("[SpotiSwipe] ShareboardGrid mounted");
		return () => console.debug("[SpotiSwipe] ShareboardGrid unmounted");
	}, []);

	if (isLoading) {
		return (
			<div className={styles.gridContainer}>
				<Stack align="center" justify="center" p="xl">
					<Loader size="lg" />
					<Text c="dimmed">Loading shareboard...</Text>
				</Stack>
			</div>
		);
	}

	if (error) {
		return (
			<div className={styles.gridContainer}>
				<Stack align="center" justify="center" p="xl">
					<Text c="red">{error.message}</Text>
				</Stack>
			</div>
		);
	}

	const posts = feedData?.items ?? [];

	if (posts.length === 0) {
		return (
			<div className={styles.gridContainer}>
				<div className={styles.sectionHeader}>
					<h1 className={styles.sectionTitle}>Shareboard</h1>
					<p className={styles.sectionSubtitle}>
						Share your playlists with the community.
					</p>
				</div>
				<Stack align="center" justify="center" p="xl">
					<Text c="dimmed">
						No shared playlists yet. Be the first to share!
					</Text>
				</Stack>
			</div>
		);
	}

	return (
		<div className={styles.gridContainer}>
			<div className={styles.sectionHeader}>
				<h1 className={styles.sectionTitle}>Shareboard</h1>
				<p className={styles.sectionSubtitle}>
					Discover playlists shared by the community.
				</p>
			</div>

			<div className={styles.shareboardsGrid}>
				{posts.map((post) => (
					<button
						className={styles.shareboardCard}
						key={post.id}
						onClick={() => onSelectShareboard(post.id)}
						type="button"
					>
						{/* Card Header */}
						<div className={styles.cardHeader}>
							<div className={styles.userAvatar}>
								{post.user.name?.charAt(0)?.toUpperCase() ?? "?"}
							</div>
							<div className={styles.cardMeta}>
								<h3 className={styles.cardTitle}>{post.playlist.name}</h3>
								<p className={styles.cardCreator}>
									by {post.user.name ?? "Unknown"}
								</p>
							</div>
						</div>

						{/* Caption */}
						{post.caption && (
							<p className={styles.cardDescription}>{post.caption}</p>
						)}

						{/* Song Preview */}
						<div className={styles.nowPlaying}>
							<p className={styles.nowPlayingLabel}>Songs</p>
							<div className={styles.songListPreview}>
								{post.playlist.songs.slice(0, 5).map((ps, idx) => (
									<div className={styles.songPreviewItem} key={ps.song.id}>
										{idx + 1}. {ps.song.title} - {ps.song.artist}
									</div>
								))}
								{post.songCount > 5 && (
									<div className={styles.songPreviewItem}>
										... and {post.songCount - 5} more
									</div>
								)}
							</div>
						</div>

						{/* Footer */}
						<div className={styles.cardFooter}>
							<div className={styles.likeCount}>
								<IconHeart size={16} />
								<span>{post.likeCount}</span>
								<span style={{ marginLeft: "0.5rem" }}>
									{post.commentCount} comments
								</span>
							</div>
							<Button
								loading={addPlaylist.isPending}
								onClick={(e) => {
									e.stopPropagation();
									addPlaylist.mutate({ postId: post.id });
								}}
								size="compact-xs"
								variant="light"
							>
								Add to My Playlists
							</Button>
						</div>
					</button>
				))}
			</div>
		</div>
	);
};

export default ShareboardGrid;
