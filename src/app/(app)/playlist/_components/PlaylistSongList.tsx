"use client";

import { Loader, Stack, Text } from "@mantine/core";
import { IconHeart, IconHeartFilled, IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import styles from "../playlist.module.css";

interface PlaylistSongListProps {
	playlistId: string | null;
}

const PlaylistSongList = ({ playlistId }: PlaylistSongListProps) => {
	const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set());

	const {
		data: playlist,
		isLoading,
		error,
	} = api.playlist.getById.useQuery(
		{ id: playlistId ?? "" },
		{ enabled: !!playlistId, refetchOnWindowFocus: false },
	);

	const utils = api.useUtils();

	const removeSong = api.playlist.removeSong.useMutation({
		onSuccess: () => {
			console.debug("[SpotiSwipe] Song removed from playlist");
			utils.playlist.getById.invalidate();
			utils.playlist.getAll.invalidate();
		},
		onError: (err) => {
			console.error(
				"[SpotiSwipe] Failed to remove song from playlist:",
				err.message,
			);
		},
	});

	useEffect(() => {
		console.debug("[SpotiSwipe] PlaylistSongList mounted");
		return () => console.debug("[SpotiSwipe] PlaylistSongList unmounted");
	}, []);

	const toggleLike = (songId: string) => {
		setLikedSongs((prev) => {
			const next = new Set(prev);
			if (next.has(songId)) {
				next.delete(songId);
			} else {
				next.add(songId);
			}
			return next;
		});
	};

	const handleRemoveSong = (songId: string) => {
		if (!playlistId) return;
		console.debug("[SpotiSwipe] Removing song:", songId);
		removeSong.mutate({ playlistId, songId });
	};

	if (!playlistId) {
		return (
			<div className={styles.songListContainer}>
				<Stack align="center" justify="center" p="xl">
					<Text c="dimmed" size="sm">
						Select a playlist to see its songs
					</Text>
				</Stack>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className={styles.songListContainer}>
				<Stack align="center" justify="center" p="xl">
					<Loader size="md" />
					<Text c="dimmed" size="sm">
						Loading songs...
					</Text>
				</Stack>
			</div>
		);
	}

	if (error) {
		return (
			<div className={styles.songListContainer}>
				<Stack align="center" justify="center" p="xl">
					<Text c="red" size="sm">
						{error.message}
					</Text>
				</Stack>
			</div>
		);
	}

	const songs = playlist?.songs ?? [];

	if (songs.length === 0) {
		return (
			<div className={styles.songListContainer}>
				<Stack align="center" justify="center" p="xl">
					<Text c="dimmed" size="sm">
						This playlist is empty. Swipe some songs to add them!
					</Text>
				</Stack>
			</div>
		);
	}

	return (
		<div className={styles.songListContainer}>
			{/* List Header */}
			<div className={styles.songListHeader}>
				<div>#</div>
				<div>Title</div>
				<div>Artist</div>
				<div>Album</div>
				<div>Actions</div>
			</div>

			{/* Song List */}
			<div className={styles.songList}>
				{songs.map((playlistSong, index) => (
					<div className={styles.songItem} key={playlistSong.song.id}>
						{/* Song Number */}
						<div className={styles.songNumber}>{index + 1}</div>

						{/* Song Title */}
						<div>
							<div className={styles.songTitle}>{playlistSong.song.title}</div>
						</div>

						{/* Artist */}
						<div className={styles.songArtist}>{playlistSong.song.artist}</div>

						{/* Album */}
						<div className={styles.songArtist}>
							{playlistSong.song.album ?? "--"}
						</div>

						{/* Actions */}
						<div className={styles.songActions}>
							<button
								className={`${styles.actionButton} ${
									likedSongs.has(playlistSong.song.id)
										? styles.favoriteButton
										: ""
								}`}
								onClick={() => toggleLike(playlistSong.song.id)}
								title={
									likedSongs.has(playlistSong.song.id)
										? "Remove from favorites"
										: "Add to favorites"
								}
								type="button"
							>
								{likedSongs.has(playlistSong.song.id) ? (
									<IconHeartFilled size={18} />
								) : (
									<IconHeart size={18} />
								)}
							</button>
							<button
								className={`${styles.actionButton} ${styles.removeButton}`}
								onClick={() => handleRemoveSong(playlistSong.song.id)}
								title="Remove from playlist"
								type="button"
							>
								<IconX size={18} />
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default PlaylistSongList;
