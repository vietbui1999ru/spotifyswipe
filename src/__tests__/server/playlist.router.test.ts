import { beforeEach, describe, expect, it } from "vitest";
import { createMockDb, createTestCaller } from "./router-helpers";

const SONG_INPUT = {
  title: "Karma Police",
  artist: "Radiohead",
  externalId: "lastfm:radiohead-karma-police",
};

const MOCK_SONG = {
  id: "song-42",
  title: "Karma Police",
  artist: "Radiohead",
  externalId: "lastfm:radiohead-karma-police",
};

describe("playlist.addSong", () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let caller: ReturnType<typeof createTestCaller>;

  beforeEach(() => {
    mockDb = createMockDb();
    caller = createTestCaller(mockDb, "user-1");
  });

  it("throws NOT_FOUND when playlist does not exist", async () => {
    mockDb.playlist.findUnique.mockResolvedValue(null);

    await expect(
      caller.playlist.addSong({ playlistId: "pl-missing", songData: SONG_INPUT }),
    ).rejects.toThrow(/not found/i);
  });

  it("throws UNAUTHORIZED when playlist belongs to a different user", async () => {
    mockDb.playlist.findUnique.mockResolvedValue({
      id: "pl-1",
      userId: "other-user",
    });

    await expect(
      caller.playlist.addSong({ playlistId: "pl-1", songData: SONG_INPUT }),
    ).rejects.toThrow(/unauthorized|not your playlist/i);
  });

  it("adds song at position 0 when playlist is empty and ownership is valid", async () => {
    mockDb.playlist.findUnique.mockResolvedValue({ id: "pl-1", userId: "user-1" });
    mockDb.song.upsert.mockResolvedValue(MOCK_SONG);
    mockDb.playlistSong.findFirst.mockResolvedValue(null);
    const mockPlaylistSong = {
      playlistId: "pl-1",
      songId: MOCK_SONG.id,
      position: 0,
      song: MOCK_SONG,
    };
    mockDb.playlistSong.upsert.mockResolvedValue(mockPlaylistSong);

    await caller.playlist.addSong({ playlistId: "pl-1", songData: SONG_INPUT });

    expect(mockDb.playlistSong.upsert).toHaveBeenCalledOnce();
    const upsertCall = mockDb.playlistSong.upsert.mock.calls[0]![0] as {
      create: { position: number };
    };
    expect(upsertCall.create.position).toBe(0);
  });
});
