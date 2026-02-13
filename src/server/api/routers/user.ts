import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { AppError, ErrorCode, toTRPCError } from "~/server/errors";
import { createLogger } from "~/server/logger";

export const userRouter = createTRPCRouter({
	getMusicProvider: protectedProcedure.query(async ({ ctx }) => {
		const user = await ctx.db.user.findUnique({
			where: { id: ctx.session.user.id },
			select: { musicProvider: true },
		});
		return (user?.musicProvider ?? "auto") as "auto" | "spotify" | "lastfm";
	}),

	setMusicProvider: protectedProcedure
		.input(z.object({ provider: z.enum(["auto", "spotify", "lastfm"]) }))
		.mutation(async ({ ctx, input }) => {
			const log = createLogger("user.setMusicProvider", {
				userId: ctx.session.user.id,
			});
			log.info("Setting music provider", { provider: input.provider });

			try {
				await ctx.db.user.update({
					where: { id: ctx.session.user.id },
					data: { musicProvider: input.provider },
				});
				return { provider: input.provider };
			} catch (err) {
				log.error("Failed to update music provider", { error: err });
				throw toTRPCError(
					new AppError(ErrorCode.DB_ERROR, "Failed to update music provider"),
				);
			}
		}),

	getConnectedProviders: protectedProcedure.query(async ({ ctx }) => {
		const accounts = await ctx.db.account.findMany({
			where: { userId: ctx.session.user.id },
			select: { providerId: true },
		});
		const providerIds = new Set(accounts.map((a) => a.providerId));
		return {
			spotify: providerIds.has("spotify"),
			lastfm: providerIds.has("lastfm"),
		};
	}),
});
