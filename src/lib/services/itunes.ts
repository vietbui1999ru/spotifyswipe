const ITUNES_API = "https://itunes.apple.com/search";

export async function fetchAlbumArt(
  artist: string,
  track: string,
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      term: `${artist} ${track}`,
      entity: "song",
      limit: "1",
    });
    const response = await fetch(`${ITUNES_API}?${params}`);
    if (!response.ok) return null;
    const data = (await response.json()) as {
      results?: Array<{ artworkUrl100?: string }>;
    };
    const art = data.results?.[0]?.artworkUrl100;
    if (!art) return null;
    const large = art.replace("100x100bb", "300x300bb");
    return large !== art ? large : art;
  } catch {
    return null;
  }
}
