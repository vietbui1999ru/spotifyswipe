import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { AppError, ErrorCode, toTRPCError } from "~/server/errors";
import { createLogger } from "~/server/logger";

export const tokenRouter = createTRPCRouter({
	/**
	 * Get a valid Spotify access token for the current user.
	 * Auto-refreshes via server-side getSpotifyToken (uses AUTH_SPOTIFY_SECRET).
	 */
	getSpotifyToken: protectedProcedure.query(async ({ ctx }) => {
		const log = createLogger("token.getSpotifyToken", {
			userId: ctx.session.user.id,
		});

		try {
			const token = await ctx.getSpotifyToken();
			log.debug("Spotify token served to client");
			return { accessToken: token };
		} catch (err) {
			log.warn("Failed to get Spotify token", {
				error: err instanceof Error ? err.message : String(err),
			});
			throw toTRPCError(
				new AppError(
					ErrorCode.AUTH_FAILED,
					"Spotify account not connected or token refresh failed",
				),
			);
		}
	}),

	/**
	 * Get the Last.fm session key and username for the current user.
	 */
	getLastfmSession: protectedProcedure.query(async ({ ctx }) => {
		const log = createLogger("token.getLastfmSession", {
			userId: ctx.session.user.id,
		});

		try {
			const account = await ctx.db.account.findFirst({
				where: { userId: ctx.session.user.id, providerId: "lastfm" },
				select: { accessToken: true, accountId: true },
			});

			if (!account?.accessToken) {
				throw new AppError(
					ErrorCode.AUTH_FAILED,
					"Last.fm account not connected",
				);
			}

			log.debug("Last.fm session served to client");
			return {
				sessionKey: account.accessToken,
				username: account.accountId,
			};
		} catch (err) {
			if (err instanceof AppError) throw toTRPCError(err);
			log.warn("Failed to get Last.fm session", {
				error: err instanceof Error ? err.message : String(err),
			});
			throw toTRPCError(
				new AppError(ErrorCode.AUTH_FAILED, "Last.fm account not connected"),
			);
		}
	}),
});
