import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/lib/services/itunes", () => ({
	fetchAlbumArt: vi.fn().mockResolvedValue(null),
}));

import { getDiscoveryFeed } from "~/lib/services/discovery";
import * as lastfm from "~/lib/services/lastfm";

describe("getDiscoveryFeed — cold start", () => {
	beforeEach(() => vi.clearAllMocks());

	it("calls getChartTopTracks when lastfmUsername is null", async () => {
		vi.spyOn(lastfm, "getChartTopTracks").mockResolvedValueOnce([
			{
				name: "Bohemian Rhapsody",
				artist: { name: "Queen", url: "https://last.fm/Queen" },
				url: "https://last.fm/music/Queen/Bohemian+Rhapsody",
				image: [],
				playcount: "1000",
				listeners: "500",
			},
		]);

		const result = await getDiscoveryFeed({
			lastfmUsername: null,
			swipedExternalIds: new Set(),
			limit: 20,
		});

		expect(lastfm.getChartTopTracks).toHaveBeenCalledOnce();
		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe("Bohemian Rhapsody");
		expect(result[0]?.artist).toBe("Queen");
	});

	it("filters out already-swiped tracks", async () => {
		vi.spyOn(lastfm, "getChartTopTracks").mockResolvedValueOnce([
			{
				name: "Song A",
				artist: { name: "Artist X", url: "" },
				url: "https://last.fm/...",
				image: [],
				playcount: "100",
				listeners: "50",
			},
			{
				name: "Song B",
				artist: { name: "Artist X", url: "" },
				url: "https://last.fm/...",
				image: [],
				playcount: "100",
				listeners: "50",
			},
		]);

		const result = await getDiscoveryFeed({
			lastfmUsername: null,
			swipedExternalIds: new Set(["artist x:song a"]),
			limit: 20,
		});

		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe("Song B");
	});
});
