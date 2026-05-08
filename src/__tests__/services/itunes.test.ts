import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAlbumArt } from "~/lib/services/itunes";

describe("fetchAlbumArt", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns a larger artwork URL when iTunes finds a match", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            artworkUrl100:
              "https://example.mzstatic.com/thumb/Music/100x100bb.jpg",
          },
        ],
      }),
    } as Response);

    const result = await fetchAlbumArt("Radiohead", "Creep");
    expect(result).toBe(
      "https://example.mzstatic.com/thumb/Music/300x300bb.jpg",
    );
  });

  it("returns null when iTunes returns no results", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    } as Response);

    const result = await fetchAlbumArt("Unknown", "Untitled");
    expect(result).toBeNull();
  });

  it("returns null on non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
    } as Response);

    const result = await fetchAlbumArt("Artist", "Track");
    expect(result).toBeNull();
  });

  it("returns null on network error without throwing", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("Network error"),
    );

    const result = await fetchAlbumArt("Artist", "Track");
    expect(result).toBeNull();
  });
});
