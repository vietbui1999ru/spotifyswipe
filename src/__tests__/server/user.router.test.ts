import { beforeEach, describe, expect, it } from "vitest";
import { createMockDb, createTestCaller } from "./router-helpers";

describe("user.getConnectedProviders", () => {
	let mockDb: ReturnType<typeof createMockDb>;
	let caller: ReturnType<typeof createTestCaller>;

	beforeEach(() => {
		mockDb = createMockDb();
		caller = createTestCaller(mockDb);
	});

	it("returns { lastfm: true, demo: false } when lastfm account is present", async () => {
		mockDb.account.findMany.mockResolvedValue([{ providerId: "lastfm" }]);

		const result = await caller.user.getConnectedProviders();

		expect(result).toEqual({ lastfm: true, demo: false });
	});

	it("returns { lastfm: false, demo: false } when no accounts exist", async () => {
		mockDb.account.findMany.mockResolvedValue([]);

		const result = await caller.user.getConnectedProviders();

		expect(result).toEqual({ lastfm: false, demo: false });
	});
});
