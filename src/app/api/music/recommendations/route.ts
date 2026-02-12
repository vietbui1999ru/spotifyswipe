import { getSimilarArtists, getTrackInfo } from "~/server/auth/lastfm";
import { createLogger } from "~/server/logger";

const log = createLogger("api:music:recommendations");

export const runtime = "nodejs";

/**
 * GET /api/music/recommendations?artistName=The%20Beatles&limit=10
 * Get similar artists based on a given artist
 */
export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const artistName = searchParams.get("artistName");
		const trackName = searchParams.get("trackName");
		const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);

		log.info("Recommendations request", { artistName, trackName, limit });

		if (!artistName && !trackName) {
			log.warn("Missing required parameter");
			return Response.json(
				{
					error: "Missing required parameter: artistName or trackName",
				},
				{ status: 400 },
			);
		}

		if (trackName && artistName) {
			log.debug("Fetching track info", { trackName, artistName });
			const trackInfo = await getTrackInfo(trackName, artistName);
			const track = trackInfo.track;

			log.info("Track info fetched", { track: track.name });

			return Response.json({
				type: "track",
				track: {
					name: track.name,
					artist: track.artist.name,
					album: track.album?.title,
					playcount: parseInt(track.playcount || "0", 10),
					listeners: parseInt(track.listeners || "0", 10),
					userPlaycount: track.userplaycount
						? parseInt(track.userplaycount, 10)
						: 0,
					loved: track.userloved === "1",
					url: track.url,
					image:
						track.image.find((img) => img.size === "large")?.["#text"] ||
						track.image[0]?.["#text"],
					wiki: track.wiki?.content,
				},
			});
		}

		log.debug("Fetching similar artists", { artistName });
		const similarArtists = await getSimilarArtists(artistName || "", limit);

		const artists = (similarArtists.similarartists?.artist || []).map(
			(artist) => ({
				name: artist.name,
				match: parseFloat(artist.match || "0") * 100,
				url: artist.url,
				image:
					artist.image.find((img) => img.size === "large")?.["#text"] ||
					artist.image[0]?.["#text"],
			}),
		);

		log.info("Similar artists fetched", {
			baseArtist: artistName,
			count: artists.length,
		});

		return Response.json({
			type: "artist",
			baseArtist: artistName,
			similarArtists: artists,
		});
	} catch (error) {
		log.error("Failed to fetch recommendations", {
			error: error instanceof Error ? error.message : error,
		});
		return Response.json(
			{ error: "Failed to fetch recommendations" },
			{ status: 500 },
		);
	}
}
