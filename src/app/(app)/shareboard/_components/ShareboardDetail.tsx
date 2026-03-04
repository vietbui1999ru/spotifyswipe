"use client";

import {
	ActionIcon,
	Avatar,
	Button,
	Group,
	Loader,
	Stack,
	Text,
	TextInput,
} from "@mantine/core";
import { IconHeart, IconSend, IconUserPlus, IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useSession } from "~/lib/auth-client";
import styles from "~/styles/shareboard.module.css";
import { api } from "~/trpc/react";

interface ShareboardDetailProps {
	shareboardId: string;
	onClose: () => void;
}

const ShareboardDetail = ({ shareboardId, onClose }: ShareboardDetailProps) => {
	const [commentText, setCommentText] = useState("");
	const { data: session } = useSession();

	const {
		data: post,
		isLoading,
		error,
	} = api.social.getPost.useQuery(
		{ id: shareboardId },
		{ refetchOnWindowFocus: false },
	);

	const utils = api.useUtils();

	const likePost = api.social.likePost.useMutation({
		onSuccess: () => {
			console.debug("[SpotiSwipe] Post liked from detail");
			utils.social.getPost.invalidate();
			utils.social.getFeed.invalidate();
		},
		onError: (err) => {
			console.error("[SpotiSwipe] Failed to like post:", err.message);
		},
	});

	const addComment = api.social.addComment.useMutation({
		onSuccess: () => {
			console.debug("[SpotiSwipe] Comment added");
			setCommentText("");
			utils.social.getPost.invalidate();
		},
		onError: (err) => {
			console.error("[SpotiSwipe] Failed to add comment:", err.message);
		},
	});

	const deleteComment = api.social.deleteComment.useMutation({
		onSuccess: () => {
			console.debug("[SpotiSwipe] Comment deleted");
			utils.social.getPost.invalidate();
		},
		onError: (err) => {
			console.error("[SpotiSwipe] Failed to delete comment:", err.message);
		},
	});

	const followUser = api.social.followUser.useMutation({
		onSuccess: () => {
			console.debug("[SpotiSwipe] User followed");
		},
		onError: (err) => {
			console.error("[SpotiSwipe] Failed to follow user:", err.message);
		},
	});

	const addPlaylist = api.social.addPlaylistFromPost.useMutation({
		onSuccess: () => {
			console.debug("[SpotiSwipe] Playlist copied from post detail");
			utils.playlist.getAll.invalidate();
		},
		onError: (err) => {
			console.error("[SpotiSwipe] Failed to copy playlist:", err.message);
		},
	});

	useEffect(() => {
		console.debug(
			"[SpotiSwipe] ShareboardDetail mounted, postId:",
			shareboardId,
		);
		return () => console.debug("[SpotiSwipe] ShareboardDetail unmounted");
	}, [shareboardId]);

	if (isLoading) {
		return (
			<Stack align="center" justify="center" p="xl">
				<Loader size="lg" />
				<Text c="dimmed">Loading post...</Text>
			</Stack>
		);
	}

	if (error || !post) {
		return (
			<Stack align="center" justify="center" p="xl">
				<Text c="red">{error?.message ?? "Post not found"}</Text>
			</Stack>
		);
	}

	const handleSubmitComment = () => {
		if (!commentText.trim()) return;
		addComment.mutate({ postId: post.id, content: commentText.trim() });
	};

	return (
		<div className={styles.modalInner}>
			{/* Close Button */}
			<ActionIcon
				onClick={onClose}
				radius="xl"
				size="lg"
				style={{ position: "absolute", top: 0, right: 0 }}
				variant="subtle"
			>
				<IconX size={20} />
			</ActionIcon>

			{/* Header */}
			<div className={styles.detailHeader}>
				<Avatar
					color="violet"
					radius="xl"
					size={56}
					src={post.user.profileImage ?? post.user.image}
				>
					{post.user.name?.charAt(0)?.toUpperCase() ?? "?"}
				</Avatar>
				<div className={styles.detailMeta}>
					<h2 className={styles.detailTitle}>{post.playlist.name}</h2>
					<p className={styles.detailCreator}>
						by {post.user.name ?? "Unknown"}
					</p>
				</div>
			</div>

			{/* Caption */}
			{post.caption && (
				<p className={styles.detailDescription}>{post.caption}</p>
			)}

			{/* Follow Button */}
			<Button
				leftSection={<IconUserPlus size={16} />}
				loading={followUser.isPending}
				onClick={() => followUser.mutate({ userId: post.user.id })}
				size="compact-sm"
				variant="light"
			>
				Follow {post.user.name}
			</Button>

			{/* Song List */}
			<div className={styles.detailSongList}>
				{post.playlist.songs.map((ps, idx) => (
					<div className={styles.detailSongItem} key={ps.song.id}>
						{idx + 1}. {ps.song.title} - {ps.song.artist}
					</div>
				))}
			</div>

			{/* Add to Playlists */}
			<Button
				fullWidth
				loading={addPlaylist.isPending}
				onClick={() => addPlaylist.mutate({ postId: post.id })}
				variant="light"
			>
				Add to My Playlists
			</Button>

			{/* Comments Section */}
			<div>
				<Text fw={600} mb="sm" size="sm">
					Comments ({post.commentCount})
				</Text>
				{post.comments.map((comment) => (
					<div
						key={comment.id}
						style={{
							padding: "0.5rem",
							marginBottom: "0.5rem",
							background: "rgba(39, 39, 42, 0.5)",
							borderRadius: "0.5rem",
						}}
					>
						<Group justify="space-between">
							<Group gap="xs">
								<Avatar
									color="cyan"
									radius="xl"
									size={24}
									src={comment.user.profileImage ?? comment.user.image}
								>
									{(comment.user.name ?? "A").charAt(0).toUpperCase()}
								</Avatar>
								<Text fw={500} size="xs">
									{comment.user.name ?? "Anonymous"}
								</Text>
							</Group>
							{session?.user?.id === comment.user.id && (
								<Button
									color="red"
									onClick={() =>
										deleteComment.mutate({ commentId: comment.id })
									}
									size="compact-xs"
									variant="subtle"
								>
									Delete
								</Button>
							)}
						</Group>
						<Text c="dimmed" ml={32} size="sm">
							{comment.content}
						</Text>
					</div>
				))}

				{/* Comment Form */}
				<Group gap="xs" mt="sm">
					<TextInput
						onChange={(e) => setCommentText(e.currentTarget.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleSubmitComment();
						}}
						placeholder="Add a comment..."
						style={{ flex: 1 }}
						value={commentText}
					/>
					<Button
						loading={addComment.isPending}
						onClick={handleSubmitComment}
						size="compact-sm"
					>
						<IconSend size={16} />
					</Button>
				</Group>
			</div>

			{/* Footer */}
			<div className={styles.detailFooter}>
				<div className={styles.likeCountLarge}>
					<IconHeart size={18} />
					<span>{post.likeCount}</span>
				</div>
				<button
					className={styles.thumbsUpButtonLarge}
					onClick={() => likePost.mutate({ postId: post.id })}
					type="button"
				>
					Like
				</button>
			</div>
		</div>
	);
};

export default ShareboardDetail;
