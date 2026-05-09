import { describe, expect, it } from "vitest";
import { buildScrobbleParams } from "~/server/api/routers/swipe";

describe("buildScrobbleParams", () => {
	it("returns params for liked action", () => {
		const result = buildScrobbleParams(
			{ artist: "Radiohead", title: "Creep" },
			"liked",
		);
		expect(result).not.toBeNull();
		expect(result?.artist).toBe("Radiohead");
		expect(result?.track).toBe("Creep");
		expect(result?.timestamp).toBeTypeOf("number");
	});

	it("returns params for superliked action", () => {
		const result = buildScrobbleParams(
			{ artist: "Nirvana", title: "Smells Like Teen Spirit" },
			"superliked",
		);
		expect(result).not.toBeNull();
	});

	it("returns null for skipped action", () => {
		const result = buildScrobbleParams(
			{ artist: "Anyone", title: "Anything" },
			"skipped",
		);
		expect(result).toBeNull();
	});

	it("timestamp is within 5 seconds of now", () => {
		const before = Math.floor(Date.now() / 1000);
		const result = buildScrobbleParams({ artist: "A", title: "B" }, "liked");
		const after = Math.floor(Date.now() / 1000);
		expect(result?.timestamp).toBeGreaterThanOrEqual(before);
		expect(result?.timestamp).toBeLessThanOrEqual(after);
	});
});
