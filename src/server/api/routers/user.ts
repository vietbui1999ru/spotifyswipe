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

	getRole: protectedProcedure.query(async ({ ctx }) => {
		const user = await ctx.db.user.findUnique({
			where: { id: ctx.session.user.id },
			select: { role: true },
		});
		return { role: (user?.role ?? "user") as "user" | "admin" };
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

	/** Get full profile data including resolved display name/image with provider fallbacks. */
	getProfile: protectedProcedure.query(async ({ ctx }) => {
		const user = await ctx.db.user.findUnique({
			where: { id: ctx.session.user.id },
			select: {
				id: true,
				name: true,
				email: true,
				image: true,
				displayName: true,
				profileImage: true,
				role: true,
				createdAt: true,
				accounts: {
					select: { providerId: true, accountId: true },
				},
			},
		});

		if (!user) {
			throw toTRPCError(new AppError(ErrorCode.NOT_FOUND, "User not found"));
		}

		const providerIds = new Set(user.accounts.map((a) => a.providerId));
		const hasSpotify = providerIds.has("spotify");
		const hasLastfm = providerIds.has("lastfm");

		// Resolve display name: custom > Spotify name > Last.fm name > auth name
		const resolvedName = user.displayName || user.name || "SpotiSwipe User";
		// Resolve profile image: custom > provider image (already set by OAuth)
		const resolvedImage = user.profileImage || user.image || null;

		return {
			id: user.id,
			name: resolvedName,
			email: user.email,
			image: resolvedImage,
			displayName: user.displayName,
			profileImage: user.profileImage,
			providerName: user.name,
			providerImage: user.image,
			role: user.role as "user" | "admin",
			createdAt: user.createdAt,
			connectedProviders: { spotify: hasSpotify, lastfm: hasLastfm },
		};
	}),

	/** Update custom display name and/or profile image. */
	updateProfile: protectedProcedure
		.input(
			z
				.object({
					displayName: z.string().min(1).max(50).optional(),
					profileImage: z
						.string()
						.url()
						.refine(
							(url) => {
								try {
									const parsed = new URL(url);
									return (
										parsed.protocol === "https:" || parsed.protocol === "http:"
									);
								} catch {
									return false;
								}
							},
							{ message: "Profile image must be an HTTP(S) URL" },
						)
						.optional(),
					clearDisplayName: z.boolean().optional(),
					clearProfileImage: z.boolean().optional(),
				})
				.refine((input) => !(input.displayName && input.clearDisplayName), {
					message: "Cannot set and clear displayName simultaneously",
				})
				.refine((input) => !(input.profileImage && input.clearProfileImage), {
					message: "Cannot set and clear profileImage simultaneously",
				}),
		)
		.mutation(async ({ ctx, input }) => {
			const log = createLogger("user.updateProfile", {
				userId: ctx.session.user.id,
			});
			log.info("Updating profile", {
				fields: Object.keys(input).filter(
					(k) => input[k as keyof typeof input] !== undefined,
				),
			});

			const data: Record<string, string | null> = {};
			if (input.displayName !== undefined) data.displayName = input.displayName;
			if (input.clearDisplayName) data.displayName = null;
			if (input.profileImage !== undefined)
				data.profileImage = input.profileImage;
			if (input.clearProfileImage) data.profileImage = null;

			await ctx.db.user.update({
				where: { id: ctx.session.user.id },
				data,
			});

			return { success: true };
		}),
});
