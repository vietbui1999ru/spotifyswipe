import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { AppError, ErrorCode, toTRPCError } from "~/server/errors";
import { createLogger, withTiming } from "~/server/logger";

export const playlistRouter = createTRPCRouter({
	/**
	 * Get all playlists for the current user with song count
	 */
	getAll: protectedProcedure.query(async ({ ctx }) => {
		const log = createLogger("playlist.getAll", {
			userId: ctx.session.user.id,
		});
		log.info("Fetching all playlists");

		try {
			const playlists = await withTiming(log, "Fetch playlists", () =>
				ctx.db.playlist.findMany({
					where: { userId: ctx.session.user.id },
					include: {
						_count: { select: { songs: true } },
					},
					orderBy: { updatedAt: "desc" },
				}),
			);

			log.info("Playlists fetched", { count: playlists.length });
			return playlists.map((p) => ({
				...p,
				songCount: p._count.songs,
				_count: undefined,
			}));
		} catch (err) {
			log.error("Failed to fetch playlists", { error: err });
			throw toTRPCError(
				new AppError(ErrorCode.DB_ERROR, "Failed to fetch playlists"),
			);
		}
	}),

	/**
	 * Get a playlist by ID with its songs (verify ownership)
	 */
	getById: protectedProcedure
		.input(z.object({ id: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			const log = createLogger("playlist.getById", {
				userId: ctx.session.user.id,
			});
			log.info("Fetching playlist", { playlistId: input.id });

			const playlist = await withTiming(log, "Fetch playlist", () =>
				ctx.db.playlist.findUnique({
					where: { id: input.id },
					include: {
						songs: {
							include: { song: true },
							orderBy: { position: "asc" },
						},
					},
				}),
			);

			if (!playlist) {
				log.warn("Playlist not found", { playlistId: input.id });
				throw toTRPCError(
					new AppError(ErrorCode.NOT_FOUND, "Playlist not found"),
				);
			}

			if (playlist.userId !== ctx.session.user.id) {
				log.warn("Unauthorized playlist access", {
					playlistId: input.id,
					ownerId: playlist.userId,
				});
				throw toTRPCError(
					new AppError(ErrorCode.UNAUTHORIZED, "Not your playlist"),
				);
			}

			log.info("Playlist fetched", { songCount: playlist.songs.length });
			return playlist;
		}),

	/**
	 * Create a new playlist
	 */
	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(100),
				description: z.string().max(500).optional(),
				isPublic: z.boolean().optional().default(true),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const log = createLogger("playlist.create", {
				userId: ctx.session.user.id,
			});
			log.info("Creating playlist", { name: input.name });

			try {
				const playlist = await withTiming(log, "Create playlist", () =>
					ctx.db.playlist.create({
						data: {
							name: input.name,
							description: input.description,
							isPublic: input.isPublic,
							userId: ctx.session.user.id,
						},
					}),
				);

				log.info("Playlist created", { playlistId: playlist.id });
				return playlist;
			} catch (err) {
				log.error("Failed to create playlist", { error: err });
				throw toTRPCError(
					new AppError(ErrorCode.DB_ERROR, "Failed to create playlist"),
				);
			}
		}),

	/**
	 * Update a playlist (verify ownership)
	 */
	update: protectedProcedure
		.input(
			z.object({
				id: z.string().min(1),
				name: z.string().min(1).max(100).optional(),
				description: z.string().max(500).optional(),
				coverImage: z.string().optional(),
				isPublic: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const log = createLogger("playlist.update", {
				userId: ctx.session.user.id,
			});
			log.info("Updating playlist", { playlistId: input.id });

			const existing = await ctx.db.playlist.findUnique({
				where: { id: input.id },
				select: { userId: true },
			});

			if (!existing) {
				throw toTRPCError(
					new AppError(ErrorCode.NOT_FOUND, "Playlist not found"),
				);
			}

			if (existing.userId !== ctx.session.user.id) {
				log.warn("Unauthorized update attempt", { playlistId: input.id });
				throw toTRPCError(
					new AppError(ErrorCode.UNAUTHORIZED, "Not your playlist"),
				);
			}

			try {
				const { id, ...data } = input;
				const playlist = await withTiming(log, "Update playlist", () =>
					ctx.db.playlist.update({
						where: { id },
						data,
					}),
				);

				log.info("Playlist updated", { playlistId: playlist.id });
				return playlist;
			} catch (err) {
				log.error("Failed to update playlist", { error: err });
				throw toTRPCError(
					new AppError(ErrorCode.DB_ERROR, "Failed to update playlist"),
				);
			}
		}),

	/**
	 * Delete a playlist (verify ownership)
	 */
	delete: protectedProcedure
		.input(z.object({ id: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const log = createLogger("playlist.delete", {
				userId: ctx.session.user.id,
			});
			log.info("Deleting playlist", { playlistId: input.id });

			const existing = await ctx.db.playlist.findUnique({
				where: { id: input.id },
				select: { userId: true },
			});

			if (!existing) {
				throw toTRPCError(
					new AppError(ErrorCode.NOT_FOUND, "Playlist not found"),
				);
			}

			if (existing.userId !== ctx.session.user.id) {
				log.warn("Unauthorized delete attempt", { playlistId: input.id });
				throw toTRPCError(
					new AppError(ErrorCode.UNAUTHORIZED, "Not your playlist"),
				);
			}

			try {
				await withTiming(log, "Delete playlist", () =>
					ctx.db.playlist.delete({ where: { id: input.id } }),
				);

				log.info("Playlist deleted", { playlistId: input.id });
				return { success: true };
			} catch (err) {
				log.error("Failed to delete playlist", { error: err });
				throw toTRPCError(
					new AppError(ErrorCode.DB_ERROR, "Failed to delete playlist"),
				);
			}
		}),

	/**
	 * Add a song to a playlist (upserts the song first, then adds PlaylistSong)
	 */
	addSong: protectedProcedure
		.input(
			z.object({
				playlistId: z.string().min(1),
				songData: z.object({
					title: z.string().min(1),
					artist: z.string().min(1),
					album: z.string().optional(),
					albumArt: z.string().optional(),
					lastfmUrl: z.string().optional(),
					externalId: z.string().min(1),
				}),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const log = createLogger("playlist.addSong", {
				userId: ctx.session.user.id,
			});
			log.info("Adding song to playlist", {
				playlistId: input.playlistId,
				song: input.songData.title,
			});

			// Verify playlist ownership
			const playlist = await ctx.db.playlist.findUnique({
				where: { id: input.playlistId },
				select: { userId: true },
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

			try {
				// Upsert the song
				const song = await withTiming(log, "Upsert song", () =>
					ctx.db.song.upsert({
						where: { externalId: input.songData.externalId },
						update: {
							title: input.songData.title,
							artist: input.songData.artist,
							album: input.songData.album,
							albumArt: input.songData.albumArt,
							lastfmUrl: input.songData.lastfmUrl,
						},
						create: {
							title: input.songData.title,
							artist: input.songData.artist,
							album: input.songData.album,
							albumArt: input.songData.albumArt,
							lastfmUrl: input.songData.lastfmUrl,
							externalId: input.songData.externalId,
						},
					}),
				);

				// Get current max position in playlist
				const maxPosition = await ctx.db.playlistSong.aggregate({
					where: { playlistId: input.playlistId },
					_max: { position: true },
				});
				const nextPosition = (maxPosition._max.position ?? -1) + 1;

				// Add to playlist (ignore if already exists)
				const playlistSong = await withTiming(log, "Add PlaylistSong", () =>
					ctx.db.playlistSong.upsert({
						where: {
							playlistId_songId: {
								playlistId: input.playlistId,
								songId: song.id,
							},
						},
						update: {},
						create: {
							playlistId: input.playlistId,
							songId: song.id,
							position: nextPosition,
						},
						include: { song: true },
					}),
				);

				log.info("Song added to playlist", {
					songId: song.id,
					position: nextPosition,
				});
				return playlistSong;
			} catch (err) {
				log.error("Failed to add song to playlist", { error: err });
				throw toTRPCError(
					new AppError(ErrorCode.DB_ERROR, "Failed to add song to playlist"),
				);
			}
		}),

	/**
	 * Remove a song from a playlist (verify ownership)
	 */
	removeSong: protectedProcedure
		.input(
			z.object({
				playlistId: z.string().min(1),
				songId: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const log = createLogger("playlist.removeSong", {
				userId: ctx.session.user.id,
			});
			log.info("Removing song from playlist", {
				playlistId: input.playlistId,
				songId: input.songId,
			});

			// Verify playlist ownership
			const playlist = await ctx.db.playlist.findUnique({
				where: { id: input.playlistId },
				select: { userId: true },
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

			try {
				await withTiming(log, "Delete PlaylistSong", () =>
					ctx.db.playlistSong.delete({
						where: {
							playlistId_songId: {
								playlistId: input.playlistId,
								songId: input.songId,
							},
						},
					}),
				);

				log.info("Song removed from playlist");
				return { success: true };
			} catch (err) {
				log.error("Failed to remove song from playlist", { error: err });
				throw toTRPCError(
					new AppError(
						ErrorCode.DB_ERROR,
						"Failed to remove song from playlist",
					),
				);
			}
		}),

	/**
	 * Reorder songs in a playlist (update positions)
	 */
	reorderSongs: protectedProcedure
		.input(
			z.object({
				playlistId: z.string().min(1),
				songIds: z.array(z.string().min(1)),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const log = createLogger("playlist.reorderSongs", {
				userId: ctx.session.user.id,
			});
			log.info("Reordering songs in playlist", {
				playlistId: input.playlistId,
				count: input.songIds.length,
			});

			// Verify playlist ownership
			const playlist = await ctx.db.playlist.findUnique({
				where: { id: input.playlistId },
				select: { userId: true },
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

			try {
				await withTiming(log, "Reorder songs", () =>
					ctx.db.$transaction(
						input.songIds.map((songId, index) =>
							ctx.db.playlistSong.update({
								where: {
									playlistId_songId: {
										playlistId: input.playlistId,
										songId,
									},
								},
								data: { position: index },
							}),
						),
					),
				);

				log.info("Songs reordered successfully");
				return { success: true };
			} catch (err) {
				log.error("Failed to reorder songs", { error: err });
				throw toTRPCError(
					new AppError(ErrorCode.DB_ERROR, "Failed to reorder songs"),
				);
			}
		}),
});
