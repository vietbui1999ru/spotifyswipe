"use client";

import {
	Button,
	Group,
	Loader,
	Modal,
	ScrollArea,
	Stack,
	Text,
	Textarea,
	TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import styles from "../dashboard.module.css";

interface PlaylistStackProps {
	activePlaylistId: string | null;
	onSetActivePlaylist: (id: string | null) => void;
}

const PlaylistStack = ({
	activePlaylistId,
	onSetActivePlaylist,
}: PlaylistStackProps) => {
	const [
		createModalOpened,
		{ open: openCreateModal, close: closeCreateModal },
	] = useDisclosure(false);
	const [newPlaylistName, setNewPlaylistName] = useState("");
	const [newPlaylistDescription, setNewPlaylistDescription] = useState("");

	const {
		data: playlists,
		isLoading,
		error,
	} = api.playlist.getAll.useQuery(undefined, {
		refetchOnWindowFocus: false,
	});

	const utils = api.useUtils();

	const createPlaylist = api.playlist.create.useMutation({
		onSuccess: (newPlaylist) => {
			console.debug("[SpotiSwipe] Playlist created:", newPlaylist.name);
			utils.playlist.getAll.invalidate();
			closeCreateModal();
			setNewPlaylistName("");
			setNewPlaylistDescription("");
			onSetActivePlaylist(newPlaylist.id);
		},
		onError: (err) => {
			console.error("[SpotiSwipe] Failed to create playlist:", err.message);
		},
	});

	useEffect(() => {
		console.debug("[SpotiSwipe] PlaylistStack mounted");
		return () => console.debug("[SpotiSwipe] PlaylistStack unmounted");
	}, []);

	// Auto-select first playlist if none is active
	useEffect(() => {
		if (!activePlaylistId && playlists && playlists.length > 0) {
			console.debug(
				"[SpotiSwipe] Auto-selecting first playlist:",
				playlists[0]?.name,
			);
			onSetActivePlaylist(playlists[0]?.id ?? null);
		}
	}, [playlists, activePlaylistId, onSetActivePlaylist]);

	const handleCreatePlaylist = () => {
		if (!newPlaylistName.trim()) return;
		console.debug("[SpotiSwipe] Creating playlist:", newPlaylistName);
		createPlaylist.mutate({
			name: newPlaylistName.trim(),
			description: newPlaylistDescription.trim() || undefined,
		});
	};

	return (
		<>
			<div className={styles.playlistContainer}>
				{/* Playlist Header */}
				<div className={styles.playlistHeader}>
					<Group justify="space-between" w="100%">
						<Text className={styles.playlistTitle}>My Playlists</Text>
						<Button
							leftSection={<IconPlus size={14} />}
							onClick={openCreateModal}
							size="compact-xs"
							variant="subtle"
						>
							New
						</Button>
					</Group>
				</div>

				{/* Playlists List */}
				<ScrollArea className={styles.playlistScrollArea}>
					{isLoading ? (
						<Stack align="center" gap="sm" justify="center" p="md">
							<Loader size="sm" />
							<Text c="dimmed" size="sm">
								Loading playlists...
							</Text>
						</Stack>
					) : error ? (
						<Stack align="center" gap="sm" justify="center" p="md">
							<Text c="red" size="sm">
								{error.message}
							</Text>
							<Text c="dimmed" size="xs">
								Make sure you are signed in
							</Text>
						</Stack>
					) : !playlists || playlists.length === 0 ? (
						<Stack align="center" gap="sm" justify="center" p="md">
							<Text c="dimmed" size="sm">
								No playlists yet
							</Text>
							<Button
								onClick={openCreateModal}
								size="compact-sm"
								variant="light"
							>
								Create your first playlist
							</Button>
						</Stack>
					) : (
						<Stack className={styles.songsList} gap="sm">
							{playlists.map((playlist) => (
								<button
									className={styles.songItem}
									key={playlist.id}
									onClick={() => {
										console.debug(
											"[SpotiSwipe] Active playlist changed:",
											playlist.name,
										);
										onSetActivePlaylist(
											activePlaylistId === playlist.id ? null : playlist.id,
										);
									}}
									style={{
										borderColor:
											activePlaylistId === playlist.id
												? "rgba(34, 197, 94, 0.6)"
												: undefined,
										background:
											activePlaylistId === playlist.id
												? "rgba(34, 197, 94, 0.1)"
												: undefined,
									}}
									title={`${playlist.name} (${playlist.songCount} songs)`}
									type="button"
								>
									<div className={styles.songItemContent}>
										<Group gap={0} justify="space-between" w="100%">
											<div style={{ flex: 1, minWidth: 0 }}>
												<Text className={styles.songTitle} truncate>
													{playlist.name}
												</Text>
												<Text className={styles.songArtist} truncate>
													{playlist.songCount} songs
												</Text>
											</div>
											{activePlaylistId === playlist.id && (
												<Text
													c="green"
													size="xs"
													style={{
														whiteSpace: "nowrap",
														marginLeft: "8px",
													}}
												>
													Active
												</Text>
											)}
										</Group>
									</div>
								</button>
							))}
						</Stack>
					)}
				</ScrollArea>
			</div>

			{/* Create Playlist Modal */}
			<Modal
				centered
				onClose={closeCreateModal}
				opened={createModalOpened}
				title="Create New Playlist"
			>
				<Stack gap="md">
					<TextInput
						label="Playlist Name"
						onChange={(e) => setNewPlaylistName(e.currentTarget.value)}
						placeholder="My awesome playlist"
						required
						value={newPlaylistName}
					/>
					<Textarea
						label="Description"
						onChange={(e) => setNewPlaylistDescription(e.currentTarget.value)}
						placeholder="What is this playlist about?"
						value={newPlaylistDescription}
					/>
					<Group justify="flex-end">
						<Button onClick={closeCreateModal} variant="subtle">
							Cancel
						</Button>
						<Button
							disabled={!newPlaylistName.trim()}
							loading={createPlaylist.isPending}
							onClick={handleCreatePlaylist}
						>
							Create
						</Button>
					</Group>
				</Stack>
			</Modal>
		</>
	);
};

export default PlaylistStack;
