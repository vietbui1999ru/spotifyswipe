"use client";

import {
	Button,
	Group,
	Loader,
	Modal,
	Stack,
	Text,
	Textarea,
	TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconEdit, IconShare, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import styles from "../playlist.module.css";

interface PlaylistHeaderProps {
	playlistId: string | null;
	onDeleted?: () => void;
}

const PlaylistHeader = ({ playlistId, onDeleted }: PlaylistHeaderProps) => {
	const [editOpened, { open: openEdit, close: closeEdit }] =
		useDisclosure(false);
	const [deleteOpened, { open: openDelete, close: closeDelete }] =
		useDisclosure(false);
	const [editName, setEditName] = useState("");
	const [editDescription, setEditDescription] = useState("");

	const {
		data: playlist,
		isLoading,
		error,
	} = api.playlist.getById.useQuery(
		{ id: playlistId ?? "" },
		{ enabled: !!playlistId, refetchOnWindowFocus: false },
	);

	const utils = api.useUtils();

	const updatePlaylist = api.playlist.update.useMutation({
		onSuccess: () => {
			console.debug("[SpotiSwipe] Playlist updated");
			utils.playlist.getById.invalidate();
			utils.playlist.getAll.invalidate();
			closeEdit();
		},
		onError: (err) => {
			console.error("[SpotiSwipe] Failed to update playlist:", err.message);
		},
	});

	const deletePlaylist = api.playlist.delete.useMutation({
		onSuccess: () => {
			console.debug("[SpotiSwipe] Playlist deleted");
			utils.playlist.getAll.invalidate();
			closeDelete();
			onDeleted?.();
		},
		onError: (err) => {
			console.error("[SpotiSwipe] Failed to delete playlist:", err.message);
		},
	});

	const sharePlaylist = api.social.sharePlaylist.useMutation({
		onSuccess: () => {
			console.debug("[SpotiSwipe] Playlist shared to shareboard");
		},
		onError: (err) => {
			console.error("[SpotiSwipe] Failed to share playlist:", err.message);
		},
	});

	useEffect(() => {
		if (playlist) {
			setEditName(playlist.name);
			setEditDescription(playlist.description ?? "");
		}
	}, [playlist]);

	if (!playlistId) {
		return (
			<div className={styles.playlistHeaderContainer}>
				<div className={styles.playlistInfo}>
					<Text c="dimmed">Select a playlist to view details</Text>
				</div>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className={styles.playlistHeaderContainer}>
				<Stack align="center" justify="center" p="xl" w="100%">
					<Loader size="md" />
					<Text c="dimmed" size="sm">
						Loading playlist...
					</Text>
				</Stack>
			</div>
		);
	}

	if (error || !playlist) {
		return (
			<div className={styles.playlistHeaderContainer}>
				<Stack align="center" justify="center" p="xl" w="100%">
					<Text c="red" size="sm">
						{error?.message ?? "Playlist not found"}
					</Text>
				</Stack>
			</div>
		);
	}

	const songCount = playlist.songs?.length ?? 0;
	const createdDate = new Date(playlist.createdAt).toLocaleDateString();

	return (
		<>
			<div className={styles.playlistHeaderContainer}>
				{/* Playlist Cover Art Placeholder */}
				<div className={styles.playlistCoverArt}>
					<div
						style={{
							width: "100%",
							height: "100%",
							background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "white",
							fontSize: "3rem",
							fontWeight: 700,
						}}
					>
						{playlist.name.charAt(0).toUpperCase()}
					</div>
				</div>

				{/* Playlist Info */}
				<div className={styles.playlistInfo}>
					<div>
						<Text className={styles.playlistLabel}>
							{playlist.isPublic ? "Public Playlist" : "Private Playlist"}
						</Text>
						<h1 className={styles.playlistName}>{playlist.name}</h1>
					</div>

					<div className={styles.playlistMeta}>
						<span>Created {createdDate}</span>
						<span>-</span>
						<span>{songCount} songs</span>
					</div>

					{playlist.description && (
						<Text className={styles.playlistDescription}>
							{playlist.description}
						</Text>
					)}

					{/* Action Buttons */}
					<Group gap="sm" mt="md">
						<Button
							leftSection={<IconEdit size={16} />}
							onClick={openEdit}
							size="compact-sm"
							variant="light"
						>
							Edit
						</Button>
						<Button
							leftSection={<IconShare size={16} />}
							loading={sharePlaylist.isPending}
							onClick={() => sharePlaylist.mutate({ playlistId: playlist.id })}
							size="compact-sm"
							variant="light"
						>
							Share to Shareboard
						</Button>
						<Button
							color="red"
							leftSection={<IconTrash size={16} />}
							onClick={openDelete}
							size="compact-sm"
							variant="light"
						>
							Delete
						</Button>
					</Group>
				</div>
			</div>

			{/* Edit Modal */}
			<Modal
				centered
				onClose={closeEdit}
				opened={editOpened}
				title="Edit Playlist"
			>
				<Stack gap="md">
					<TextInput
						label="Name"
						onChange={(e) => setEditName(e.currentTarget.value)}
						required
						value={editName}
					/>
					<Textarea
						label="Description"
						onChange={(e) => setEditDescription(e.currentTarget.value)}
						value={editDescription}
					/>
					<Group justify="flex-end">
						<Button onClick={closeEdit} variant="subtle">
							Cancel
						</Button>
						<Button
							loading={updatePlaylist.isPending}
							onClick={() =>
								updatePlaylist.mutate({
									id: playlist.id,
									name: editName.trim(),
									description: editDescription.trim() || undefined,
								})
							}
						>
							Save
						</Button>
					</Group>
				</Stack>
			</Modal>

			{/* Delete Confirmation Modal */}
			<Modal
				centered
				onClose={closeDelete}
				opened={deleteOpened}
				title="Delete Playlist"
			>
				<Stack gap="md">
					<Text>
						Are you sure you want to delete &quot;{playlist.name}&quot;? This
						cannot be undone.
					</Text>
					<Group justify="flex-end">
						<Button onClick={closeDelete} variant="subtle">
							Cancel
						</Button>
						<Button
							color="red"
							loading={deletePlaylist.isPending}
							onClick={() => deletePlaylist.mutate({ id: playlist.id })}
						>
							Delete
						</Button>
					</Group>
				</Stack>
			</Modal>
		</>
	);
};

export default PlaylistHeader;
