import { z } from "zod";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import { AppError, ErrorCode, toTRPCError } from "~/server/errors";
import { createLogger, withTiming } from "~/server/logger";

export const socialRouter = createTRPCRouter({
	/**
	 * Share a playlist as a social post
	 */
	sharePlaylist: protectedProcedure
		.input(
			z.object({
				playlistId: z.string().min(1),
				caption: z.string().max(500).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const log = createLogger("social.sharePlaylist", {
				userId: ctx.session.user.id,
			});
			log.info("Sharing playlist", { playlistId: input.playlistId });

			// Verify playlist ownership
			const playlist = await ctx.db.playlist.findUnique({
				where: { id: input.playlistId },
				select: { userId: true, sharedPost: { select: { id: true } } },
			});

			if (!playlist) {
				throw toTRPCError(
					new AppError(ErrorCode.NOT_FOUND, "Playlist not found"),
				);
			}

			if (playlist.userId !== ctx.session.user.id) {
				throw toTRPCError(
					new AppError(ErrorCode.UNAUTHORIZED, "Not your playlist"),
				);
			}

			if (playlist.sharedPost) {
				throw toTRPCError(
					new AppError(ErrorCode.CONFLICT, "Playlist already shared"),
				);
			}

			try {
				const post = await withTiming(log, "Create social post", () =>
					ctx.db.socialPost.create({
						data: {
							caption: input.caption,
							userId: ctx.session.user.id,
							playlistId: input.playlistId,
						},
						include: {
							playlist: {
								include: {
									songs: {
										include: { song: true },
										orderBy: { position: "asc" },
									},
								},
							},
							user: { select: { id: true, name: true, image: true } },
						},
					}),
				);

				log.info("Playlist shared", { postId: post.id });
				return post;
			} catch (err) {
				log.error("Failed to share playlist", { error: err });
				throw toTRPCError(
					new AppError(ErrorCode.DB_ERROR, "Failed to share playlist"),
				);
			}
		}),

	/**
	 * Get paginated social feed
	 */
	getFeed: publicProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(50).optional().default(20),
				cursor: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const log = createLogger("social.getFeed");
			log.info("Fetching social feed", { limit: input.limit });

			try {
				const posts = await withTiming(log, "Fetch feed", () =>
					ctx.db.socialPost.findMany({
						include: {
							user: { select: { id: true, name: true, image: true } },
							playlist: {
								include: {
									songs: {
										include: { song: true },
										orderBy: { position: "asc" },
										take: 5,
									},
									_count: { select: { songs: true } },
								},
							},
							_count: { select: { likes: true, comments: true } },
						},
						orderBy: { createdAt: "desc" },
						take: input.limit + 1,
						...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
					}),
				);

				let nextCursor: string | undefined;
				if (posts.length > input.limit) {
					const next = posts.pop();
					nextCursor = next?.id;
				}

				log.info("Feed fetched", {
					count: posts.length,
					hasMore: !!nextCursor,
				});

				return {
					items: posts.map((post) => ({
						...post,
						likeCount: post._count.likes,
						commentCount: post._count.comments,
						songCount: post.playlist._count.songs,
					})),
					nextCursor,
				};
			} catch (err) {
				log.error("Failed to fetch feed", { error: err });
				throw toTRPCError(
					new AppError(ErrorCode.DB_ERROR, "Failed to fetch social feed"),
				);
			}
		}),

	/**
	 * Get a single social post by ID with full details
	 */
	getPost: publicProcedure
		.input(z.object({ id: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			const log = createLogger("social.getPost");
			log.info("Fetching post", { postId: input.id });

			const post = await withTiming(log, "Fetch post", () =>
				ctx.db.socialPost.findUnique({
					where: { id: input.id },
					include: {
						user: { select: { id: true, name: true, image: true } },
						playlist: {
							include: {
								songs: {
									include: { song: true },
									orderBy: { position: "asc" },
								},
							},
						},
						likes: {
							select: {
								userId: true,
								user: { select: { id: true, name: true, image: true } },
							},
						},
						comments: {
							include: {
								user: { select: { id: true, name: true, image: true } },
							},
							orderBy: { createdAt: "asc" },
						},
						_count: { select: { likes: true, comments: true } },
					},
				}),
			);

			if (!post) {
				throw toTRPCError(new AppError(ErrorCode.NOT_FOUND, "Post not found"));
			}

			log.info("Post fetched", { postId: post.id });
			return {
				...post,
				likeCount: post._count.likes,
				commentCount: post._count.comments,
			};
		}),

	/**
	 * Like a social post
	 */
	likePost: protectedProcedure
		.input(z.object({ postId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const log = createLogger("social.likePost", {
				userId: ctx.session.user.id,
			});
			log.info("Liking post", { postId: input.postId });

			// Verify post exists
			const post = await ctx.db.socialPost.findUnique({
				where: { id: input.postId },
				select: { id: true },
			});

			if (!post) {
				throw toTRPCError(new AppError(ErrorCode.NOT_FOUND, "Post not found"));
			}

			try {
				const like = await withTiming(log, "Create like", () =>
					ctx.db.like.upsert({
						where: {
							userId_socialPostId: {
								userId: ctx.session.user.id,
								socialPostId: input.postId,
							},
						},
						update: {},
						create: {
							userId: ctx.session.user.id,
							socialPostId: input.postId,
						},
					}),
				);

				log.info("Post liked", { likeId: like.id });
				return { success: true };
			} catch (err) {
				log.error("Failed to like post", { error: err });
				throw toTRPCError(
					new AppError(ErrorCode.DB_ERROR, "Failed to like post"),
				);
			}
		}),

	/**
	 * Unlike a social post
	 */
	unlikePost: protectedProcedure
		.input(z.object({ postId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const log = createLogger("social.unlikePost", {
				userId: ctx.session.user.id,
			});
			log.info("Unliking post", { postId: input.postId });

			try {
				await withTiming(log, "Delete like", () =>
					ctx.db.like.delete({
						where: {
							userId_socialPostId: {
								userId: ctx.session.user.id,
								socialPostId: input.postId,
							},
						},
					}),
				);

				log.info("Post unliked");
				return { success: true };
			} catch (err) {
				log.error("Failed to unlike post", { error: err });
				throw toTRPCError(
					new AppError(ErrorCode.DB_ERROR, "Failed to unlike post"),
				);
			}
		}),

	/**
	 * Add a comment to a social post
	 */
	addComment: protectedProcedure
		.input(
			z.object({
				postId: z.string().min(1),
				content: z.string().min(1).max(1000),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const log = createLogger("social.addComment", {
				userId: ctx.session.user.id,
			});
			log.info("Adding comment", { postId: input.postId });

			// Verify post exists
			const post = await ctx.db.socialPost.findUnique({
				where: { id: input.postId },
				select: { id: true },
			});

			if (!post) {
				throw toTRPCError(new AppError(ErrorCode.NOT_FOUND, "Post not found"));
			}

			try {
				const comment = await withTiming(log, "Create comment", () =>
					ctx.db.comment.create({
						data: {
							content: input.content,
							userId: ctx.session.user.id,
							socialPostId: input.postId,
						},
						include: {
							user: { select: { id: true, name: true, image: true } },
						},
					}),
				);

				log.info("Comment added", { commentId: comment.id });
				return comment;
			} catch (err) {
				log.error("Failed to add comment", { error: err });
				throw toTRPCError(
					new AppError(ErrorCode.DB_ERROR, "Failed to add comment"),
				);
			}
		}),

	/**
	 * Delete own comment
	 */
	deleteComment: protectedProcedure
		.input(z.object({ commentId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const log = createLogger("social.deleteComment", {
				userId: ctx.session.user.id,
			});
			log.info("Deleting comment", { commentId: input.commentId });

			const comment = await ctx.db.comment.findUnique({
				where: { id: input.commentId },
				select: { userId: true },
			});

			if (!comment) {
				throw toTRPCError(
					new AppError(ErrorCode.NOT_FOUND, "Comment not found"),
				);
			}

			if (comment.userId !== ctx.session.user.id) {
				log.warn("Unauthorized comment delete attempt");
				throw toTRPCError(
					new AppError(ErrorCode.UNAUTHORIZED, "Not your comment"),
				);
			}

			try {
				await withTiming(log, "Delete comment", () =>
					ctx.db.comment.delete({ where: { id: input.commentId } }),
				);

				log.info("Comment deleted");
				return { success: true };
			} catch (err) {
				log.error("Failed to delete comment", { error: err });
				throw toTRPCError(
					new AppError(ErrorCode.DB_ERROR, "Failed to delete comment"),
				);
			}
		}),

	/**
	 * Follow a user
	 */
	followUser: protectedProcedure
		.input(z.object({ userId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const log = createLogger("social.followUser", {
				userId: ctx.session.user.id,
			});
			log.info("Following user", { targetUserId: input.userId });

			if (input.userId === ctx.session.user.id) {
				throw toTRPCError(
					new AppError(ErrorCode.INVALID_INPUT, "Cannot follow yourself"),
				);
			}

			// Verify target user exists
			const targetUser = await ctx.db.user.findUnique({
				where: { id: input.userId },
				select: { id: true },
			});

			if (!targetUser) {
				throw toTRPCError(new AppError(ErrorCode.NOT_FOUND, "User not found"));
			}

			try {
				const follow = await withTiming(log, "Create follow", () =>
					ctx.db.follow.upsert({
						where: {
							followerId_followingId: {
								followerId: ctx.session.user.id,
								followingId: input.userId,
							},
						},
						update: {},
						create: {
							followerId: ctx.session.user.id,
							followingId: input.userId,
						},
					}),
				);

				log.info("User followed", { followId: follow.id });
				return { success: true };
			} catch (err) {
				log.error("Failed to follow user", { error: err });
				throw toTRPCError(
					new AppError(ErrorCode.DB_ERROR, "Failed to follow user"),
				);
			}
		}),

	/**
	 * Unfollow a user
	 */
	unfollowUser: protectedProcedure
		.input(z.object({ userId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const log = createLogger("social.unfollowUser", {
				userId: ctx.session.user.id,
			});
			log.info("Unfollowing user", { targetUserId: input.userId });

			try {
				await withTiming(log, "Delete follow", () =>
					ctx.db.follow.delete({
						where: {
							followerId_followingId: {
								followerId: ctx.session.user.id,
								followingId: input.userId,
							},
						},
					}),
				);

				log.info("User unfollowed");
				return { success: true };
			} catch (err) {
				log.error("Failed to unfollow user", { error: err });
				throw toTRPCError(
					new AppError(ErrorCode.DB_ERROR, "Failed to unfollow user"),
				);
			}
		}),

	/**
	 * Get a user's public profile with stats
	 */
	getUserProfile: publicProcedure
		.input(z.object({ userId: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			const log = createLogger("social.getUserProfile");
			log.info("Fetching user profile", { userId: input.userId });

			const user = await withTiming(log, "Fetch user profile", () =>
				ctx.db.user.findUnique({
					where: { id: input.userId },
					select: {
						id: true,
						name: true,
						image: true,
						_count: {
							select: {
								playlists: true,
								socialPosts: true,
								followers: true,
								following: true,
							},
						},
					},
				}),
			);

			if (!user) {
				throw toTRPCError(new AppError(ErrorCode.NOT_FOUND, "User not found"));
			}

			log.info("User profile fetched");
			return {
				id: user.id,
				name: user.name,
				image: user.image,
				playlistCount: user._count.playlists,
				postCount: user._count.socialPosts,
				followerCount: user._count.followers,
				followingCount: user._count.following,
			};
		}),

	/**
	 * Copy a shared playlist from a social post to own collection
	 */
	addPlaylistFromPost: protectedProcedure
		.input(z.object({ postId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const log = createLogger("social.addPlaylistFromPost", {
				userId: ctx.session.user.id,
			});
			log.info("Copying playlist from post", { postId: input.postId });

			// Fetch the post with full playlist data
			const post = await ctx.db.socialPost.findUnique({
				where: { id: input.postId },
				include: {
					playlist: {
						include: {
							songs: {
								include: { song: true },
								orderBy: { position: "asc" },
							},
						},
					},
				},
			});

			if (!post) {
				throw toTRPCError(new AppError(ErrorCode.NOT_FOUND, "Post not found"));
			}

			try {
				// Create new playlist as a copy
				const newPlaylist = await withTiming(log, "Create playlist copy", () =>
					ctx.db.playlist.create({
						data: {
							name: `${post.playlist.name} (copy)`,
							description: post.playlist.description,
							coverImage: post.playlist.coverImage,
							isPublic: false,
							userId: ctx.session.user.id,
							songs: {
								create: post.playlist.songs.map((ps) => ({
									position: ps.position,
									songId: ps.songId,
								})),
							},
						},
						include: {
							songs: {
								include: { song: true },
								orderBy: { position: "asc" },
							},
						},
					}),
				);

				log.info("Playlist copied", {
					newPlaylistId: newPlaylist.id,
					songCount: newPlaylist.songs.length,
				});
				return newPlaylist;
			} catch (err) {
				log.error("Failed to copy playlist", { error: err });
				throw toTRPCError(
					new AppError(ErrorCode.DB_ERROR, "Failed to copy playlist"),
				);
			}
		}),
});
