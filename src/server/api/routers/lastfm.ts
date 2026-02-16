import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	loveTrack,
	scrobbleTrack,
	unloveTrack,
	updateNowPlaying,
} from "~/server/auth/lastfm";
import { AppError, ErrorCode, toTRPCError } from "~/server/errors";
import { createLogger } from "~/server/logger";

/** Get Last.fm session key for the current user. Throws if not connected. */
async function getLastfmSessionKey(
	db: Parameters<
		Parameters<typeof protectedProcedure.mutation>[0]
	>[0]["ctx"]["db"],
	userId: string,
): Promise<string> {
	const account = await db.account.findFirst({
		where: { userId, providerId: "lastfm" },
		select: { accessToken: true },
	});

	if (!account?.accessToken) {
		throw new AppError(
			ErrorCode.AUTH_FAILED,
			"Last.fm account not connected. Please link your Last.fm account first.",
		);
	}

	return account.accessToken;
}

export const lastfmRouter = createTRPCRouter({
	/** Scrobble a track to the user's Last.fm profile */
	scrobble: protectedProcedure
		.input(
			z.object({
				artist: z.string().min(1),
				track: z.string().min(1),
				timestamp: z.number().int().positive(),
				album: z.string().optional(),
				duration: z.number().int().positive().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const log = createLogger("lastfm.scrobble", {
				userId: ctx.session.user.id,
			});
			log.info("Scrobbling track", {
				track: input.track,
				artist: input.artist,
			});

			try {
				const sessionKey = await getLastfmSessionKey(
					ctx.db,
					ctx.session.user.id,
				);
				const result = await scrobbleTrack(sessionKey, {
					artist: input.artist,
					track: input.track,
					timestamp: input.timestamp,
					album: input.album,
					duration: input.duration,
				});
				log.info("Track scrobbled", {
					accepted: result.scrobbles?.["@attr"]?.accepted,
				});
				return result;
			} catch (err) {
				if (err instanceof AppError) throw toTRPCError(err);
				log.error("Failed to scrobble track", { error: err });
				throw toTRPCError(
					new AppError(
						ErrorCode.LASTFM_API_ERROR,
						"Failed to scrobble track to Last.fm",
					),
				);
			}
		}),

	/** Love a track on the user's Last.fm profile */
	love: protectedProcedure
		.input(
			z.object({
				artist: z.string().min(1),
				track: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const log = createLogger("lastfm.love", {
				userId: ctx.session.user.id,
			});
			log.info("Loving track", { track: input.track, artist: input.artist });

			try {
				const sessionKey = await getLastfmSessionKey(
					ctx.db,
					ctx.session.user.id,
				);
				await loveTrack(sessionKey, {
					artist: input.artist,
					track: input.track,
				});
				log.info("Track loved");
				return { success: true };
			} catch (err) {
				if (err instanceof AppError) throw toTRPCError(err);
				log.error("Failed to love track", { error: err });
				throw toTRPCError(
					new AppError(
						ErrorCode.LASTFM_API_ERROR,
						"Failed to love track on Last.fm",
					),
				);
			}
		}),

	/** Remove love from a track on the user's Last.fm profile */
	unlove: protectedProcedure
		.input(
			z.object({
				artist: z.string().min(1),
				track: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const log = createLogger("lastfm.unlove", {
				userId: ctx.session.user.id,
			});
			log.info("Unloving track", { track: input.track, artist: input.artist });

			try {
				const sessionKey = await getLastfmSessionKey(
					ctx.db,
					ctx.session.user.id,
				);
				await unloveTrack(sessionKey, {
					artist: input.artist,
					track: input.track,
				});
				log.info("Track unloved");
				return { success: true };
			} catch (err) {
				if (err instanceof AppError) throw toTRPCError(err);
				log.error("Failed to unlove track", { error: err });
				throw toTRPCError(
					new AppError(
						ErrorCode.LASTFM_API_ERROR,
						"Failed to unlove track on Last.fm",
					),
				);
			}
		}),

	/** Update "now playing" status on the user's Last.fm profile */
	updateNowPlaying: protectedProcedure
		.input(
			z.object({
				artist: z.string().min(1),
				track: z.string().min(1),
				album: z.string().optional(),
				duration: z.number().int().positive().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const log = createLogger("lastfm.updateNowPlaying", {
				userId: ctx.session.user.id,
			});
			log.info("Updating now playing", {
				track: input.track,
				artist: input.artist,
			});

			try {
				const sessionKey = await getLastfmSessionKey(
					ctx.db,
					ctx.session.user.id,
				);
				const result = await updateNowPlaying(sessionKey, {
					artist: input.artist,
					track: input.track,
					album: input.album,
					duration: input.duration,
				});
				log.info("Now playing updated");
				return result;
			} catch (err) {
				if (err instanceof AppError) throw toTRPCError(err);
				log.error("Failed to update now playing", { error: err });
				throw toTRPCError(
					new AppError(
						ErrorCode.LASTFM_API_ERROR,
						"Failed to update now playing on Last.fm",
					),
				);
			}
		}),
});
