import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { AppError, ErrorCode, toTRPCError } from "~/server/errors";
import { createLogger, withTiming } from "~/server/logger";

export const adminRouter = createTRPCRouter({
	/** Promote or demote a user's role. Only admins can call this. */
	setUserRole: adminProcedure
		.input(
			z.object({
				userId: z.string(),
				role: z.enum(["user", "admin"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const log = createLogger("admin.setUserRole", {
				userId: ctx.session.user.id,
			});

			if (input.userId === ctx.session.user.id && input.role !== "admin") {
				log.warn("Admin attempted to demote themselves");
				throw toTRPCError(
					new AppError(
						ErrorCode.INVALID_INPUT,
						"Cannot remove your own admin role",
					),
				);
			}

			log.info("Changing user role", {
				targetUserId: input.userId,
				newRole: input.role,
			});

			try {
				const user = await withTiming(log, "Update user role", () =>
					ctx.db.user.update({
						where: { id: input.userId },
						data: { role: input.role },
						select: { id: true, name: true, email: true, role: true },
					}),
				);

				log.info("Role updated", { userId: user.id, role: user.role });
				return user;
			} catch (err) {
				log.error("Failed to update user role", { error: err });
				throw toTRPCError(
					new AppError(ErrorCode.DB_ERROR, "Failed to update user role"),
				);
			}
		}),

	/** List all users with their roles. Only admins can call this. */
	listUsers: adminProcedure
		.input(
			z
				.object({
					limit: z.number().min(1).max(100).default(50),
					cursor: z.string().optional(),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const log = createLogger("admin.listUsers", {
				userId: ctx.session.user.id,
			});
			const limit = input?.limit ?? 50;

			try {
				const users = await withTiming(log, "Fetch user list", () =>
					ctx.db.user.findMany({
						take: limit + 1,
						...(input?.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
						orderBy: { createdAt: "desc" },
						select: {
							id: true,
							name: true,
							email: true,
							role: true,
							image: true,
							createdAt: true,
							_count: {
								select: { playlists: true, swipeActions: true },
							},
						},
					}),
				);

				let nextCursor: string | undefined;
				if (users.length > limit) {
					const next = users.pop();
					nextCursor = next?.id;
				}

				return { users, nextCursor };
			} catch (err) {
				log.error("Failed to list users", { error: err });
				throw toTRPCError(
					new AppError(ErrorCode.DB_ERROR, "Failed to list users"),
				);
			}
		}),

	/**
	 * Aggregate overview counts for the admin dashboard.
	 * Returns total users, songs, playlists, swipe actions, social posts,
	 * and active (non-expired) sessions.
	 */
	getOverview: adminProcedure.query(async ({ ctx }) => {
		const log = createLogger("admin.getOverview", {
			userId: ctx.session.user.id,
		});
		log.info("Fetching admin overview");

		try {
			const [
				users,
				songs,
				playlists,
				swipeActions,
				socialPosts,
				activeSessions,
			] = await withTiming(log, "Aggregate overview counts", () =>
				Promise.all([
					ctx.db.user.count(),
					ctx.db.song.count(),
					ctx.db.playlist.count(),
					ctx.db.swipeAction.count(),
					ctx.db.socialPost.count(),
					ctx.db.session.count({
						where: { expiresAt: { gt: new Date() } },
					}),
				]),
			);

			log.info("Overview fetched", {
				users,
				songs,
				playlists,
				swipeActions,
				socialPosts,
				activeSessions,
			});

			return {
				users,
				songs,
				playlists,
				swipeActions,
				socialPosts,
				activeSessions,
			};
		} catch (err) {
			log.error("Failed to fetch overview", { error: err });
			throw toTRPCError(
				new AppError(ErrorCode.DB_ERROR, "Failed to fetch admin overview"),
			);
		}
	}),

	/**
	 * User signups grouped by day for the last 30 days.
	 */
	getUserGrowth: adminProcedure.query(async ({ ctx }) => {
		const log = createLogger("admin.getUserGrowth", {
			userId: ctx.session.user.id,
		});
		log.info("Fetching user growth data");

		try {
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

			const rows = await withTiming(
				log,
				"Query user growth",
				() =>
					ctx.db.$queryRaw<Array<{ date: string; count: bigint }>>`
					SELECT DATE("createdAt") as date, COUNT(*)::bigint as count
					FROM "User"
					WHERE "createdAt" >= ${thirtyDaysAgo}
					GROUP BY DATE("createdAt")
					ORDER BY date ASC
				`,
			);

			const data = rows.map((row) => ({
				date: String(row.date),
				count: Number(row.count),
			}));

			log.info("User growth fetched", { days: data.length });
			return data;
		} catch (err) {
			log.error("Failed to fetch user growth", { error: err });
			throw toTRPCError(
				new AppError(ErrorCode.DB_ERROR, "Failed to fetch user growth"),
			);
		}
	}),

	/**
	 * Swipe action counts grouped by action type and by day for the last 30 days.
	 */
	getSwipeStats: adminProcedure.query(async ({ ctx }) => {
		const log = createLogger("admin.getSwipeStats", {
			userId: ctx.session.user.id,
		});
		log.info("Fetching swipe stats");

		try {
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

			const [byAction, byDay] = await withTiming(log, "Query swipe stats", () =>
				Promise.all([
					ctx.db.swipeAction.groupBy({
						by: ["action"],
						_count: { action: true },
					}),
					ctx.db.$queryRaw<
						Array<{ date: string; action: string; count: bigint }>
					>`
						SELECT DATE("createdAt") as date, action, COUNT(*)::bigint as count
						FROM "SwipeAction"
						WHERE "createdAt" >= ${thirtyDaysAgo}
						GROUP BY DATE("createdAt"), action
						ORDER BY date ASC, action ASC
					`,
				]),
			);

			const totals = byAction.map((row) => ({
				action: row.action,
				count: row._count.action,
			}));

			const daily = byDay.map((row) => ({
				date: String(row.date),
				action: row.action,
				count: Number(row.count),
			}));

			log.info("Swipe stats fetched", {
				totalActions: totals.length,
				dailyEntries: daily.length,
			});

			return { totals, daily };
		} catch (err) {
			log.error("Failed to fetch swipe stats", { error: err });
			throw toTRPCError(
				new AppError(ErrorCode.DB_ERROR, "Failed to fetch swipe stats"),
			);
		}
	}),

	/**
	 * API health metrics: active sessions, accounts by provider,
	 * users by musicProvider preference.
	 */
	getApiHealth: adminProcedure.query(async ({ ctx }) => {
		const log = createLogger("admin.getApiHealth", {
			userId: ctx.session.user.id,
		});
		log.info("Fetching API health metrics");

		try {
			const [activeSessions, accountsByProvider, usersByMusicProvider] =
				await withTiming(log, "Query API health", () =>
					Promise.all([
						ctx.db.session.count({
							where: { expiresAt: { gt: new Date() } },
						}),
						ctx.db.account.groupBy({
							by: ["providerId"],
							_count: { providerId: true },
						}),
						ctx.db.user.groupBy({
							by: ["musicProvider"],
							_count: { musicProvider: true },
						}),
					]),
				);

			const providers = accountsByProvider.map((row) => ({
				provider: row.providerId,
				count: row._count.providerId,
			}));

			const musicProviders = usersByMusicProvider.map((row) => ({
				provider: row.musicProvider,
				count: row._count.musicProvider,
			}));

			log.info("API health fetched", {
				activeSessions,
				providers: providers.length,
			});

			return {
				activeSessions,
				accountsByProvider: providers,
				usersByMusicProvider: musicProviders,
			};
		} catch (err) {
			log.error("Failed to fetch API health", { error: err });
			throw toTRPCError(
				new AppError(ErrorCode.DB_ERROR, "Failed to fetch API health"),
			);
		}
	}),

	/**
	 * Top content: top 10 most-liked songs, top 10 most-active users (by swipe count),
	 * top 10 most-followed users.
	 */
	getTopContent: adminProcedure.query(async ({ ctx }) => {
		const log = createLogger("admin.getTopContent", {
			userId: ctx.session.user.id,
		});
		log.info("Fetching top content");

		try {
			const [topSongs, topActiveUsers, topFollowedUsers] = await withTiming(
				log,
				"Query top content",
				() =>
					Promise.all([
						ctx.db.song.findMany({
							where: {
								swipeActions: { some: { action: "liked" } },
							},
							select: {
								id: true,
								title: true,
								artist: true,
								album: true,
								albumArt: true,
								spotifyUrl: true,
								_count: {
									select: { swipeActions: { where: { action: "liked" } } },
								},
							},
							orderBy: {
								swipeActions: { _count: "desc" },
							},
							take: 10,
						}),
						ctx.db.user.findMany({
							select: {
								id: true,
								name: true,
								email: true,
								image: true,
								_count: { select: { swipeActions: true } },
							},
							orderBy: {
								swipeActions: { _count: "desc" },
							},
							take: 10,
						}),
						ctx.db.user.findMany({
							select: {
								id: true,
								name: true,
								email: true,
								image: true,
								_count: { select: { followers: true } },
							},
							orderBy: {
								followers: { _count: "desc" },
							},
							take: 10,
						}),
					]),
			);

			const songs = topSongs.map((song) => ({
				id: song.id,
				title: song.title,
				artist: song.artist,
				album: song.album,
				albumArt: song.albumArt,
				spotifyUrl: song.spotifyUrl,
				likeCount: song._count.swipeActions,
			}));

			const activeUsers = topActiveUsers.map((user) => ({
				id: user.id,
				name: user.name,
				email: user.email,
				image: user.image,
				swipeCount: user._count.swipeActions,
			}));

			const followedUsers = topFollowedUsers.map((user) => ({
				id: user.id,
				name: user.name,
				email: user.email,
				image: user.image,
				followerCount: user._count.followers,
			}));

			log.info("Top content fetched", {
				songs: songs.length,
				activeUsers: activeUsers.length,
				followedUsers: followedUsers.length,
			});

			return {
				topSongs: songs,
				topActiveUsers: activeUsers,
				topFollowedUsers: followedUsers,
			};
		} catch (err) {
			log.error("Failed to fetch top content", { error: err });
			throw toTRPCError(
				new AppError(ErrorCode.DB_ERROR, "Failed to fetch top content"),
			);
		}
	}),

	/**
	 * Recent activity: last 50 swipe actions with user+song info,
	 * last 20 social posts with user+playlist info.
	 */
	getRecentActivity: adminProcedure.query(async ({ ctx }) => {
		const log = createLogger("admin.getRecentActivity", {
			userId: ctx.session.user.id,
		});
		log.info("Fetching recent activity");

		try {
			const [recentSwipes, recentPosts] = await withTiming(
				log,
				"Query recent activity",
				() =>
					Promise.all([
						ctx.db.swipeAction.findMany({
							take: 50,
							orderBy: { createdAt: "desc" },
							include: {
								user: {
									select: { id: true, name: true, image: true },
								},
								song: {
									select: {
										id: true,
										title: true,
										artist: true,
										albumArt: true,
									},
								},
							},
						}),
						ctx.db.socialPost.findMany({
							take: 20,
							orderBy: { createdAt: "desc" },
							include: {
								user: {
									select: { id: true, name: true, image: true },
								},
								playlist: {
									select: {
										id: true,
										name: true,
										coverImage: true,
										_count: { select: { songs: true } },
									},
								},
								_count: { select: { likes: true, comments: true } },
							},
						}),
					]),
			);

			const swipes = recentSwipes.map((s) => ({
				id: s.id,
				action: s.action,
				createdAt: s.createdAt,
				user: s.user,
				song: s.song,
			}));

			const posts = recentPosts.map((p) => ({
				id: p.id,
				caption: p.caption,
				createdAt: p.createdAt,
				user: p.user,
				playlist: {
					id: p.playlist.id,
					name: p.playlist.name,
					coverImage: p.playlist.coverImage,
					songCount: p.playlist._count.songs,
				},
				likeCount: p._count.likes,
				commentCount: p._count.comments,
			}));

			log.info("Recent activity fetched", {
				swipes: swipes.length,
				posts: posts.length,
			});

			return { recentSwipes: swipes, recentPosts: posts };
		} catch (err) {
			log.error("Failed to fetch recent activity", { error: err });
			throw toTRPCError(
				new AppError(ErrorCode.DB_ERROR, "Failed to fetch recent activity"),
			);
		}
	}),
});
