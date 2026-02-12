import { auth } from "~/server/auth";
import { getTopTracks } from "~/server/auth/lastfm";
import { db } from "~/server/db";
import { createLogger } from "~/server/logger";

const log = createLogger("api:music:top-tracks");

export const runtime = "nodejs";

type TimePeriod =
	| "overall"
	| "7day"
	| "1month"
	| "3month"
	| "6month"
	| "12month";

/**
 * GET /api/music/top-tracks?period=overall&limit=10
 * Get the user's top tracks
 */
export async function GET(request: Request) {
	try {
		const session = await auth();

		if (!session?.user?.email) {
			log.warn("Unauthorized request - no session or email");
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const period = (searchParams.get("period") || "overall") as TimePeriod;
		const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);

		log.info("Fetching top tracks", {
			email: session.user.email,
			period,
			limit,
		});

		const account = await db.account.findFirst({
			where: {
				user: { email: session.user.email },
				provider: "lastfm",
			},
			select: { access_token: true },
		});

		if (!account?.access_token) {
			log.warn("Last.fm not connected", { email: session.user.email });
			return Response.json({ error: "Last.fm not connected" }, { status: 400 });
		}

		log.debug("Calling Last.fm API for top tracks");
		const topTracks = await getTopTracks(account.access_token, period, limit);

		const tracks = (topTracks.toptracks?.track || []).map((track) => ({
			name: track.name,
			artist: track.artist.name,
			playcount: parseInt(track.playcount || "0", 10),
			image:
				track.image.find((img) => img.size === "large")?.["#text"] ||
				track.image[0]?.["#text"],
			url: track.url,
		}));

		log.info("Top tracks fetched", { count: tracks.length, period });

		return Response.json({
			period,
			limit,
			tracks,
		});
	} catch (error) {
		log.error("Failed to fetch top tracks", {
			error: error instanceof Error ? error.message : error,
		});
		return Response.json(
			{ error: "Failed to fetch top tracks" },
			{ status: 500 },
		);
	}
}
