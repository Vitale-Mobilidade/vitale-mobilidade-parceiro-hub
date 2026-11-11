export const SPOTIFY_PODCAST = "https://open.spotify.com/show/4RSscwjzEskRAMNwqgA5r9";
export const spotifyEpisodeId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9]{22}$/.test(value);

const namedEntities: Record<string, string> = {
  amp: "&", apos: "'", quot: '"', nbsp: " ", lt: "<", gt: ">",
};
const normalized = (title: string) => title.normalize("NFC").replace(/\s+/g, " ").trim();

type Released = { youtube_id: string; title: string; spotify_episode_id: string | null };

export function matchSpotifyEpisodes(html: string, released: Released[]) {
  const titles = new Map<string, Set<string>>();
  for (const [, id, heading] of html.matchAll(
    /<a\b[^>]*\bhref="\/episode\/([A-Za-z0-9]{22})"[^>]*>\s*<h4\b[^>]*\bdata-testid="episodeTitle"[^>]*>(.*?)<\/h4>/gs,
  )) {
    const title = normalized(heading.replace(/<[^>]*>/g, "").replace(
      /&(#x[0-9a-f]+|#\d+|\w+);/gi,
      (entity, key: string) => {
        if (!key.startsWith("#")) return namedEntities[key] ?? entity;
        const point = key[1].toLowerCase() === "x" ? parseInt(key.slice(2), 16) : Number(key.slice(1));
        return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
      },
    ));
    const ids = titles.get(title) ?? new Set<string>();
    ids.add(id);
    titles.set(title, ids);
  }
  const counts = new Map<string, number>();
  const used = new Set(released.flatMap((row) => row.spotify_episode_id ? [row.spotify_episode_id] : []));
  for (const row of released) {
    const title = normalized(row.title);
    counts.set(title, (counts.get(title) ?? 0) + 1);
  }
  return released.flatMap((row) => {
    if (row.spotify_episode_id) return [];
    const title = normalized(row.title);
    const ids = titles.get(title);
    if (counts.get(title) !== 1 || ids?.size !== 1) return [];
    const id = ids.values().next().value;
    return spotifyEpisodeId(id) && !used.has(id) ? [{ youtube_id: row.youtube_id, spotify_episode_id: id }] : [];
  });
}
