import { z } from "zod";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import { getTrackInfo, searchTracks } from "~/server/auth/lastfm";
import { AppError, ErrorCode, toTRPCError } from "~/server/errors";
import { createLogger, withTiming } from "~/server/logger";

export const songRouter = createTRPCRouter({
	/**
	 * Search songs via Last.fm track.search API
	 */
	search: publicProcedure
		.input(
			z.object({
				query: z.string().min(1),
				limit: z.number().min(1).max(50).optional().default(10),
			}),
		)
		.query(async ({ input }) => {
			const log = createLogger("song.search");
			log.info("Searching tracks", { query: input.query, limit: input.limit });

			try {
				const results = await withTiming(log, "Last.fm track search", () =>
					searchTracks(input.query, input.limit),
				);

				const tracks = results.results?.trackmatches?.track ?? [];
				log.info("Search completed", { resultCount: tracks.length });

				return tracks.map((t) => ({
					name: t.name,
					artist: t.artist,
					url: t.url,
					listeners: parseInt(t.listeners || "0", 10),
					image:
						t.image?.find((img) => img.size === "large")?.["#text"] ||
						t.image?.[0]?.["#text"] ||
						null,
				}));
			} catch (err) {
				log.error("Search failed", { error: err });
				throw toTRPCError(
					new AppError(ErrorCode.LASTFM_API_ERROR, "Failed to search tracks"),
				);
			}
		}),

	/**
	 * Get detailed track info from Last.fm
	 */
	getInfo: publicProcedure
		.input(
			z.object({
				track: z.string().min(1),
				artist: z.string().min(1),
			}),
		)
		.query(async ({ input }) => {
			const log = createLogger("song.getInfo");
			log.info("Fetching track info", {
				track: input.track,
				artist: input.artist,
			});

			try {
				const result = await withTiming(log, "Last.fm track.getInfo", () =>
					getTrackInfo(input.track, input.artist),
				);

				const track = result.track;
				log.info("Track info fetched", { name: track.name });

				return {
					name: track.name,
					artist: track.artist.name,
					url: track.url,
					playcount: parseInt(track.playcount || "0", 10),
					listeners: parseInt(track.listeners || "0", 10),
					loved: track.userloved === "1",
					album: track.album
						? {
								title: track.album.title,
								artist: track.album.artist,
								url: track.album.url,
								image:
									track.album.image?.find((img) => img.size === "large")?.[
										"#text"
									] ||
									track.album.image?.[0]?.["#text"] ||
									null,
							}
						: null,
					image:
						track.image?.find((img) => img.size === "large")?.["#text"] ||
						track.image?.[0]?.["#text"] ||
						null,
					wiki: track.wiki?.content ?? null,
				};
			} catch (err) {
				log.error("Failed to fetch track info", { error: err });
				throw toTRPCError(
					new AppError(ErrorCode.LASTFM_API_ERROR, "Failed to get track info"),
				);
			}
		}),

	/**
	 * Find song in DB or create it
	 */
	findOrCreate: protectedProcedure
		.input(
			z.object({
				title: z.string().min(1),
				artist: z.string().min(1),
				album: z.string().optional(),
				albumArt: z.string().optional(),
				lastfmUrl: z.string().optional(),
				duration: z.number().optional(),
				externalId: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const log = createLogger("song.findOrCreate", {
				userId: ctx.session.user.id,
			});
			log.info("Finding or creating song", {
				title: input.title,
				artist: input.artist,
				externalId: input.externalId,
			});

			try {
				const song = await withTiming(log, "Upsert song", () =>
					ctx.db.song.upsert({
						where: { externalId: input.externalId },
						update: {
							title: input.title,
							artist: input.artist,
							album: input.album,
							albumArt: input.albumArt,
							lastfmUrl: input.lastfmUrl,
							duration: input.duration,
						},
						create: {
							title: input.title,
							artist: input.artist,
							album: input.album,
							albumArt: input.albumArt,
							lastfmUrl: input.lastfmUrl,
							duration: input.duration,
							externalId: input.externalId,
						},
					}),
				);

				log.info("Song upserted", { songId: song.id });
				return song;
			} catch (err) {
				log.error("Failed to upsert song", { error: err });
				throw toTRPCError(
					new AppError(ErrorCode.DB_ERROR, "Failed to create or find song"),
				);
			}
		}),
});
