import { z } from "zod";
import type { DiscoveryTrack } from "~/lib/services/discovery";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import { createLogger } from "~/server/logger";

/** Map a Song DB record to the DiscoveryTrack interface used by the client. */
function songToDiscoveryTrack(song: {
	title: string;
	artist: string;
	albumArt: string | null;
	lastfmUrl: string | null;
	externalId: string;
	spotifyId: string | null;
	spotifyUrl: string | null;
}): DiscoveryTrack {
	return {
		name: song.title,
		artist: song.artist,
		image: song.albumArt,
		url: song.lastfmUrl ?? "",
		externalId: song.externalId,
		spotifyId: song.spotifyId ?? undefined,
		spotifyUrl: song.spotifyUrl ?? undefined,
	};
}

export const demoRouter = createTRPCRouter({
	/**
	 * Get discovery feed for demo users.
	 * Returns pre-seeded songs from DB, excluding already-swiped ones.
	 */
	getDiscoveryFeed: protectedProcedure
		.input(
			z
				.object({
					limit: z.number().min(1).max(50).default(20),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const log = createLogger("demo.getDiscoveryFeed");
			const limit = input?.limit ?? 20;

			// Get IDs of songs this user already swiped
			const swipedSongs = await ctx.db.swipeAction.findMany({
				where: { userId: ctx.session.user.id },
				select: { songId: true },
			});
			const swipedIds = swipedSongs.map((s) => s.songId);

			// Fetch random songs from DB that haven't been swiped
			const songs = await ctx.db.song.findMany({
				where: swipedIds.length > 0 ? { id: { notIn: swipedIds } } : {},
				take: limit,
			});

			// Shuffle for randomness
			for (let i = songs.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[songs[i], songs[j]] = [songs[j]!, songs[i]!];
			}

			log.info("Demo discovery feed served", { count: songs.length });
			return songs.map(songToDiscoveryTrack);
		}),

	/**
	 * Search seeded songs for demo users.
	 * Simple case-insensitive contains query on title and artist.
	 */
	searchSongs: protectedProcedure
		.input(z.object({ query: z.string().min(1).max(200) }))
		.query(async ({ ctx, input }) => {
			const songs = await ctx.db.song.findMany({
				where: {
					OR: [
						{ title: { contains: input.query, mode: "insensitive" } },
						{ artist: { contains: input.query, mode: "insensitive" } },
					],
				},
				take: 20,
			});
			return songs.map(songToDiscoveryTrack);
		}),

	/**
	 * Get time remaining on demo session.
	 * Returns null if user is not a demo user.
	 */
	getTimeRemaining: protectedProcedure.query(async ({ ctx }) => {
		const user = await ctx.db.user.findUnique({
			where: { id: ctx.session.user.id },
			select: { isDemo: true, demoExpiresAt: true },
		});
		if (!user?.isDemo) return null;
		return {
			isDemo: true,
			expiresAt: user.demoExpiresAt,
		};
	}),
});
