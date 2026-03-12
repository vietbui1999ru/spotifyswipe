import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { assertPlaylistOwnership } from "~/server/api/utils";
import { AppError, ErrorCode, isTRPCError, toTRPCError } from "~/server/errors";
import { createLogger } from "~/server/logger";
import { addTracksToPlaylist, createSpotifyPlaylist } from "~/server/spotify";

export const spotifyRouter = createTRPCRouter({
	syncPlaylistToSpotify: protectedProcedure
		.input(z.object({ playlistId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const log = createLogger("spotify.syncPlaylist");
			try {
				// Demo users cannot sync to Spotify — no valid token
				const user = await ctx.db.user.findUnique({
					where: { id: ctx.session.user.id },
					select: { isDemo: true },
				});
				if (user?.isDemo) {
					return { spotifyPlaylistId: null, syncedTracks: 0, isDemo: true };
				}

				const token = await ctx.getSpotifyToken();

				// Verify ownership first
				await assertPlaylistOwnership(
					ctx.db,
					input.playlistId,
					ctx.session.user.id,
				);

				// Get local playlist with songs
				const playlist = await ctx.db.playlist.findUnique({
					where: { id: input.playlistId },
					include: {
						songs: {
							include: { song: true },
							orderBy: { position: "asc" },
						},
					},
				});

				// playlist is guaranteed to exist after ownership check
				if (!playlist)
					throw toTRPCError(
						new AppError(ErrorCode.NOT_FOUND, "Playlist not found"),
					);

				// Create Spotify playlist if not already linked
				let spotifyPlaylistId = playlist.spotifyPlaylistId;
				if (!spotifyPlaylistId) {
					const created = await createSpotifyPlaylist(
						token,
						playlist.name,
						playlist.description ?? undefined,
						playlist.isPublic,
					);
					spotifyPlaylistId = created.id;

					await ctx.db.playlist.update({
						where: { id: playlist.id },
						data: { spotifyPlaylistId },
					});
				}

				// Collect Spotify URIs from songs that have spotifyId
				const uris = playlist.songs
					.filter((ps) => ps.song.spotifyId)
					.map((ps) => `spotify:track:${ps.song.spotifyId}`);

				if (uris.length > 0) {
					await addTracksToPlaylist(token, spotifyPlaylistId, uris);
				}

				log.info("Playlist synced to Spotify", {
					playlistId: playlist.id,
					spotifyPlaylistId,
					trackCount: uris.length,
				});

				return { spotifyPlaylistId, syncedTracks: uris.length };
			} catch (err) {
				if (err instanceof AppError) throw toTRPCError(err);
				if (isTRPCError(err)) throw err;
				log.error("Failed to sync playlist", { error: err });
				throw toTRPCError(
					new AppError(
						ErrorCode.SPOTIFY_API_ERROR,
						"Failed to sync playlist to Spotify",
					),
				);
			}
		}),
});
