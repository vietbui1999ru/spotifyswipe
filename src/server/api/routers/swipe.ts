import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	getArtistTopTracks,
	getSimilarArtists,
	getTopArtists,
} from "~/server/auth/lastfm";
import { db } from "~/server/db";
import { AppError, ErrorCode, toTRPCError } from "~/server/errors";
import { createLogger, withTiming } from "~/server/logger";

/**
 * Helper: get the Last.fm session key for a user from their Account record
 */
async function getLastfmSessionKey(userId: string): Promise<string> {
	const account = await db.account.findFirst({
		where: { userId, provider: "lastfm" },
		select: { access_token: true },
	});

	if (!account?.access_token) {
		throw new AppError(ErrorCode.AUTH_FAILED, "Last.fm account not connected");
	}

	return account.access_token;
}

export const swipeRouter = createTRPCRouter({
	/**
	 * Get discovery feed: recommendations based on user's top artists
	 * - Gets user's top artists from Last.fm
	 * - Finds similar artists
	 * - Gets top tracks from those similar artists
	 * - Filters out already-swiped songs
	 */
	getDiscoveryFeed: protectedProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(50).optional().default(20),
			}),
		)
		.query(async ({ ctx, input }) => {
			const log = createLogger("swipe.getDiscoveryFeed", {
				userId: ctx.session.user.id,
			});
			log.info("Generating discovery feed", { limit: input.limit });

			try {
				const sessionKey = await getLastfmSessionKey(ctx.session.user.id);

				// Get user's top artists
				const topArtistsResult = await withTiming(
					log,
					"Fetch top artists",
					() => getTopArtists(sessionKey, "3month", 5),
				);

				const topArtists = topArtistsResult.topartists?.artist ?? [];
				log.debug("Top artists fetched", {
					count: topArtists.length,
					artists: topArtists.map((a) => a.name),
				});

				if (topArtists.length === 0) {
					log.info("No top artists found, returning empty feed");
					return [];
				}

				// Get similar artists for each top artist (in parallel)
				const similarResults = await withTiming(
					log,
					"Fetch similar artists",
					() =>
						Promise.all(
							topArtists.slice(0, 3).map((artist) =>
								getSimilarArtists(artist.name, 3).catch(() => ({
									similarartists: { artist: [] },
								})),
							),
						),
				);

				const similarArtistNames = new Set<string>();
				for (const result of similarResults) {
					for (const artist of result.similarartists?.artist ?? []) {
						similarArtistNames.add(artist.name);
					}
				}
				log.debug("Similar artists collected", {
					count: similarArtistNames.size,
				});

				// Get top tracks from similar artists (in parallel, limit to 5 artists)
				const artistsToFetch = Array.from(similarArtistNames).slice(0, 5);
				const trackResults = await withTiming(
					log,
					"Fetch artist top tracks",
					() =>
						Promise.all(
							artistsToFetch.map((artist) =>
								getArtistTopTracks(artist, 5).catch(() => ({
									toptracks: { track: [] },
								})),
							),
						),
				);

				// Collect all candidate tracks
				interface CandidateTrack {
					name: string;
					artist: string;
					url: string;
					image: string | null;
					externalId: string;
				}
				const candidates: CandidateTrack[] = [];
				const seenIds = new Set<string>();

				for (const result of trackResults) {
					for (const track of result.toptracks?.track ?? []) {
						const artistName =
							typeof track.artist === "object"
								? track.artist.name
								: String(track.artist);
						const externalId = `${artistName}:${track.name}`.toLowerCase();
						if (!seenIds.has(externalId)) {
							seenIds.add(externalId);
							candidates.push({
								name: track.name,
								artist: artistName,
								url: track.url,
								image:
									track.image?.find((img) => img.size === "large")?.["#text"] ||
									track.image?.[0]?.["#text"] ||
									null,
								externalId,
							});
						}
					}
				}

				log.debug("Candidate tracks collected", {
					count: candidates.length,
				});

				// Filter out already-swiped songs
				const swipedSongs = await withTiming(log, "Fetch swiped songs", () =>
					ctx.db.swipeAction.findMany({
						where: { userId: ctx.session.user.id },
						select: { song: { select: { externalId: true } } },
					}),
				);

				const swipedIds = new Set(swipedSongs.map((s) => s.song.externalId));

				const filtered = candidates.filter((c) => !swipedIds.has(c.externalId));

				// Shuffle and limit
				const shuffled = filtered.sort(() => Math.random() - 0.5);
				const feed = shuffled.slice(0, input.limit);

				log.info("Discovery feed generated", {
					total: candidates.length,
					afterFilter: filtered.length,
					returned: feed.length,
				});

				return feed;
			} catch (err) {
				if (err instanceof AppError) throw toTRPCError(err);
				log.error("Failed to generate discovery feed", { error: err });
				throw toTRPCError(
					new AppError(
						ErrorCode.LASTFM_API_ERROR,
						"Failed to generate discovery feed",
					),
				);
			}
		}),

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
				log.error("Failed to fetch swipe history", { error: err });
				throw toTRPCError(
					new AppError(ErrorCode.DB_ERROR, "Failed to fetch swipe history"),
				);
			}
		}),
});
