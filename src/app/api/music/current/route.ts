import { auth } from "~/server/auth";
import { getRecentTracks } from "~/server/auth/lastfm";
import { db } from "~/server/db";
import { createLogger } from "~/server/logger";

const log = createLogger("api:music:current");

export const runtime = "nodejs";

/**
 * GET /api/music/current
 * Get the user's most recently played track
 */
export async function GET(_request: Request) {
	try {
		const session = await auth();

		if (!session?.user?.email) {
			log.warn("Unauthorized request - no session or email");
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		log.info("Fetching current track", { email: session.user.email });

		const account = await db.account.findFirst({
			where: {
				user: { email: session.user.email },
				provider: "lastfm",
			},
			select: { access_token: true, userId: true },
		});

		if (!account?.access_token) {
			log.warn("Last.fm not connected", { email: session.user.email });
			return Response.json({ error: "Last.fm not connected" }, { status: 400 });
		}

		const recentTracks = await getRecentTracks(account.access_token, 1);

		const currentTrack = recentTracks.recenttracks?.track?.[0];

		if (!currentTrack) {
			log.info("No recent tracks found", { userId: account.userId });
			return Response.json({
				track: null,
				message: "No recent tracks found",
			});
		}

		log.info("Current track fetched", {
			track: currentTrack.name,
			artist: currentTrack.artist.name,
		});

		return Response.json({
			track: {
				name: currentTrack.name,
				artist: currentTrack.artist.name,
				album: currentTrack.album.name,
				image:
					currentTrack.image.find((img) => img.size === "large")?.["#text"] ||
					currentTrack.image[0]?.["#text"],
				url: currentTrack.url,
				loved: currentTrack.loved === "1",
				playedAt: currentTrack.date?.["#text"],
			},
		});
	} catch (error) {
		log.error("Failed to fetch current track", {
			error: error instanceof Error ? error.message : error,
		});
		return Response.json(
			{ error: "Failed to fetch current track" },
			{ status: 500 },
		);
	}
}
