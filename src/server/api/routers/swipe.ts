import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type SongData, upsertSong } from "~/server/api/utils";
import { AppError, ErrorCode, isTRPCError, toTRPCError } from "~/server/errors";
import { createLogger, withTiming } from "~/server/logger";

export const swipeRouter = createTRPCRouter({
	/**
	 * Record a swipe action (like, skip, superlike)
	 */
	recordSwipe: protectedProcedure
		.input(
			z.object({
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
				action: z.enum(["liked", "skipped", "superliked"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const log = createLogger("swipe.recordSwipe", {
				userId: ctx.session.user.id,
			});
			log.info("Recording swipe", {
				song: input.songData.title,
				action: input.action,
			});

			try {
				// Upsert the song
				const song = await withTiming(log, "Upsert song", () =>
					upsertSong(ctx.db, input.songData as SongData),
				);

				// Create or update swipe action
				const swipeAction = await withTiming(log, "Upsert swipe action", () =>
					ctx.db.swipeAction.upsert({
						where: {
							userId_songId: {
								userId: ctx.session.user.id,
								songId: song.id,
							},
						},
						update: { action: input.action },
						create: {
							userId: ctx.session.user.id,
							songId: song.id,
							action: input.action,
						},
						include: { song: true },
					}),
				);

				log.info("Swipe recorded", {
					swipeId: swipeAction.id,
					songId: song.id,
				});
				return swipeAction;
			} catch (err) {
				if (err instanceof AppError) throw toTRPCError(err);
				if (isTRPCError(err)) throw err;
				log.error("Failed to record swipe", { error: err });
				throw toTRPCError(
					new AppError(ErrorCode.DB_ERROR, "Failed to record swipe"),
				);
			}
		}),

	/**
	 * Get swipe history with optional filtering and cursor pagination
	 */
	getHistory: protectedProcedure
		.input(
			z.object({
				action: z.enum(["liked", "skipped", "superliked"]).optional(),
				limit: z.number().min(1).max(50).optional().default(20),
				cursor: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const log = createLogger("swipe.getHistory", {
				userId: ctx.session.user.id,
			});
			log.info("Fetching swipe history", {
				action: input.action,
				limit: input.limit,
			});

			try {
				const where: { userId: string; action?: string } = {
					userId: ctx.session.user.id,
				};
				if (input.action) {
					where.action = input.action;
				}

				const swipes = await withTiming(log, "Fetch swipe history", () =>
					ctx.db.swipeAction.findMany({
						where,
						include: { song: true },
						orderBy: { createdAt: "desc" },
						take: input.limit + 1,
						...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
					}),
				);

				let nextCursor: string | undefined;
				if (swipes.length > input.limit) {
					const next = swipes.pop();
					nextCursor = next?.id;
				}

				log.info("Swipe history fetched", {
					count: swipes.length,
					hasMore: !!nextCursor,
				});

				return {
					items: swipes,
					nextCursor,
				};
			} catch (err) {
				if (err instanceof AppError) throw toTRPCError(err);
				if (isTRPCError(err)) throw err;
				log.error("Failed to fetch swipe history", { error: err });
				throw toTRPCError(
					new AppError(ErrorCode.DB_ERROR, "Failed to fetch swipe history"),
				);
			}
		}),
});
