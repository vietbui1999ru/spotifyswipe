import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDb, createTestCaller } from "./router-helpers";

const SONG_INPUT = {
  title: "Creep",
  artist: "Radiohead",
  album: "Pablo Honey",
  externalId: "lastfm:radiohead-creep",
};

const MOCK_SONG = {
  id: "song-1",
  title: "Creep",
  artist: "Radiohead",
  album: "Pablo Honey",
  externalId: "lastfm:radiohead-creep",
};

const MOCK_SWIPE = {
  id: "swipe-1",
  userId: "user-1",
  songId: "song-1",
  action: "liked",
  song: MOCK_SONG,
  createdAt: new Date(),
};

describe("swipe.recordSwipe", () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let caller: ReturnType<typeof createTestCaller>;

  beforeEach(() => {
    mockDb = createMockDb();
    caller = createTestCaller(mockDb);
  });

  it("upserts song then creates swipe action, returns correct action", async () => {
    mockDb.song.upsert.mockResolvedValue(MOCK_SONG);
    mockDb.swipeAction.upsert.mockResolvedValue(MOCK_SWIPE);
    mockDb.account.findFirst.mockResolvedValue(null);

    const result = await caller.swipe.recordSwipe({
      songData: SONG_INPUT,
      action: "liked",
    });

    expect(mockDb.song.upsert).toHaveBeenCalledOnce();
    expect(mockDb.swipeAction.upsert).toHaveBeenCalledOnce();
    // song upsert must be called before swipe upsert
    const songOrder = mockDb.song.upsert.mock.invocationCallOrder[0]!;
    const swipeOrder = mockDb.swipeAction.upsert.mock.invocationCallOrder[0]!;
    expect(songOrder).toBeLessThan(swipeOrder);
    expect(result.action).toBe("liked");
  });

  it("calls account.findFirst for a liked action (scrobble path)", async () => {
    mockDb.song.upsert.mockResolvedValue(MOCK_SONG);
    mockDb.swipeAction.upsert.mockResolvedValue(MOCK_SWIPE);
    mockDb.account.findFirst.mockResolvedValue(null);

    await caller.swipe.recordSwipe({ songData: SONG_INPUT, action: "liked" });

    // flush the fire-and-forget promise chain
    await Promise.resolve();
    await Promise.resolve();

    expect(mockDb.account.findFirst).toHaveBeenCalledOnce();
  });

  it("does NOT call account.findFirst for a skipped action", async () => {
    mockDb.song.upsert.mockResolvedValue(MOCK_SONG);
    mockDb.swipeAction.upsert.mockResolvedValue({
      ...MOCK_SWIPE,
      action: "skipped",
    });

    await caller.swipe.recordSwipe({ songData: SONG_INPUT, action: "skipped" });

    await Promise.resolve();
    await Promise.resolve();

    expect(mockDb.account.findFirst).not.toHaveBeenCalled();
  });
});

describe("swipe.getHistory", () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let caller: ReturnType<typeof createTestCaller>;

  beforeEach(() => {
    mockDb = createMockDb();
    caller = createTestCaller(mockDb);
  });

  it("returns items and no nextCursor when results fit within limit", async () => {
    const items = [
      { ...MOCK_SWIPE, id: "swipe-1" },
      { ...MOCK_SWIPE, id: "swipe-2" },
    ];
    mockDb.swipeAction.findMany.mockResolvedValue(items);

    const result = await caller.swipe.getHistory({ limit: 20 });

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBeUndefined();
  });

  it("sets nextCursor and trims items when findMany returns limit+1 results", async () => {
    const limit = 5;
    const extraItems = Array.from({ length: limit + 1 }, (_, i) => ({
      ...MOCK_SWIPE,
      id: `swipe-${i}`,
    }));
    mockDb.swipeAction.findMany.mockResolvedValue(extraItems);

    const result = await caller.swipe.getHistory({ limit });

    expect(result.items).toHaveLength(limit);
    // nextCursor is the id of the extra (last) item that was popped
    expect(result.nextCursor).toBe(`swipe-${limit}`);
  });
});
