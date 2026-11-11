export type ReleasedPodcastEpisode = {
  youtube_id: string;
  title: string;
  original_description: string;
  released_at: string;
  size_bytes: number;
};

const base = "https://vitalemobilidade.com";
const xml = (value: string) => value
  .replace(/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/gu, "")
  .replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  }[char]!));

export function buildPodcastRss(episodes: ReleasedPodcastEpisode[], email: string | null) {
  const items = episodes.map((episode) => {
    const id = episode.youtube_id;
    const youtube = `https://www.youtube.com/watch?v=${id}`;
    return `<item>
<title>${xml(episode.title)}</title>
<link>${xml(youtube)}</link>
<guid isPermaLink="false">vitale:youtube:${xml(id)}</guid>
<description>${xml(episode.original_description + "\n\nVídeo original no YouTube: " + youtube)}</description>
<pubDate>${new Date(episode.released_at).toUTCString()}</pubDate>
<enclosure url="${base}/podcast/audio/${encodeURIComponent(id)}" length="${episode.size_bytes}" type="audio/mpeg"/>
</item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>Vitale Mobilidade</title>
<link>${base}/</link>
<description>Testes reais de bikes elétricas e conversas sobre mobilidade urbana.</description>
<language>pt-BR</language>
<itunes:author>Vitale Mobilidade</itunes:author>
<itunes:category text="Technology"/>
<itunes:image href="${base}/podcast-capa.jpg"/>
${email ? `<itunes:owner><itunes:name>Vitale Mobilidade</itunes:name><itunes:email>${xml(email)}</itunes:email></itunes:owner>` : ""}
<atom:link href="${base}/podcast/rss.xml" rel="self" type="application/rss+xml"/>
${items.join("\n")}
</channel>
</rss>`;
}
