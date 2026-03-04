import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	assertPlaylistOwnership,
	type SongData,
	upsertSong,
} from "~/server/api/utils";
import { AppError, ErrorCode, isTRPCError, toTRPCError } from "~/server/errors";
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
			if (err instanceof AppError) throw toTRPCError(err);
			if (isTRPCError(err)) throw err;
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
				if (err instanceof AppError) throw toTRPCError(err);
				if (isTRPCError(err)) throw err;
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

			try {
				const { id, ...data } = input;
				// Combine ownership check and update into a single atomic query
				const result = await withTiming(log, "Update playlist", () =>
					ctx.db.playlist.updateMany({
						where: { id, userId: ctx.session.user.id },
						data,
					}),
				);

				if (result.count === 0) {
					// Either not found or not owned — check which
					const exists = await ctx.db.playlist.findUnique({
						where: { id },
						select: { id: true },
					});
					if (!exists) {
						throw toTRPCError(
							new AppError(ErrorCode.NOT_FOUND, "Playlist not found"),
						);
					}
					log.warn("Unauthorized update attempt", { playlistId: id });
					throw toTRPCError(
						new AppError(ErrorCode.UNAUTHORIZED, "Not your playlist"),
					);
				}

				const playlist = await ctx.db.playlist.findUniqueOrThrow({
					where: { id },
				});
				log.info("Playlist updated", { playlistId: id });
				return playlist;
			} catch (err) {
				if (err instanceof AppError) throw toTRPCError(err);
				if (isTRPCError(err)) throw err;
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

			try {
				// Combine ownership check and delete into a single atomic query
				const result = await withTiming(log, "Delete playlist", () =>
					ctx.db.playlist.deleteMany({
						where: { id: input.id, userId: ctx.session.user.id },
					}),
				);

				if (result.count === 0) {
					// Either not found or not owned — check which
					const exists = await ctx.db.playlist.findUnique({
						where: { id: input.id },
						select: { id: true },
					});
					if (!exists) {
						throw toTRPCError(
							new AppError(ErrorCode.NOT_FOUND, "Playlist not found"),
						);
					}
					log.warn("Unauthorized delete attempt", { playlistId: input.id });
					throw toTRPCError(
						new AppError(ErrorCode.UNAUTHORIZED, "Not your playlist"),
					);
				}

				log.info("Playlist deleted", { playlistId: input.id });
				return { success: true };
			} catch (err) {
				if (err instanceof AppError) throw toTRPCError(err);
				if (isTRPCError(err)) throw err;
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
					spotifyId: z.string().optional(),
					spotifyUrl: z.string().optional(),
					previewUrl: z.string().optional(),
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
			await assertPlaylistOwnership(
				ctx.db,
				input.playlistId,
				ctx.session.user.id,
			);

			try {
				// Upsert the song and fetch max position in parallel
				const [song, lastSong] = await Promise.all([
					withTiming(log, "Upsert song", () =>
						upsertSong(ctx.db, input.songData as SongData),
					),
					ctx.db.playlistSong.findFirst({
						where: { playlistId: input.playlistId },
						orderBy: { position: "desc" },
						select: { position: true },
					}),
				]);

				const nextPosition = (lastSong?.position ?? -1) + 1;

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
				if (err instanceof AppError) throw toTRPCError(err);
				if (isTRPCError(err)) throw err;
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
			await assertPlaylistOwnership(
				ctx.db,
				input.playlistId,
				ctx.session.user.id,
			);

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
				if (err instanceof AppError) throw toTRPCError(err);
				if (isTRPCError(err)) throw err;
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
			await assertPlaylistOwnership(
				ctx.db,
				input.playlistId,
				ctx.session.user.id,
			);

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
				if (err instanceof AppError) throw toTRPCError(err);
				if (isTRPCError(err)) throw err;
				log.error("Failed to reorder songs", { error: err });
				throw toTRPCError(
					new AppError(ErrorCode.DB_ERROR, "Failed to reorder songs"),
				);
			}
		}),
});
