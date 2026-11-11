import { PODCAST_SITE as base, podcastArticleSlug, podcastCoverPath, type PodcastArticle } from "./podcast-editorial";

export type ReleasedPodcastEpisode = {
  youtube_id: string;
  title: string;
  original_description: string;
  released_at: string;
  size_bytes: number;
};

const programDescription = "Testes de bikes elétricas nas ruas, comparativos e guias para quem quer pedalar no dia a dia. A Vitale Mobilidade mostra como cada modelo se sai na prática, da autonomia ao conforto, e o que vale conferir antes de comprar. Os episódios trazem links para os artigos completos em vitalemobilidade.com.";
export function podcastAudioPath(youtubeId: string, size: number): string {
  if (youtubeId === "byk0-p8NedQ" && size === 15701351)
    return "/podcast/episodios/v20-ultra-farol.mp3";
  return `/podcast/audio/${encodeURIComponent(youtubeId)}`;
}

const xml = (value: string) => value
  .replace(/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/gu, "")
  .replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  }[char]!));

function linkNotes(line: string) {
  return line.split(/(https:\/\/[^\s<>"']+)/g).map((part, index) => {
    if (index % 2 === 0) return xml(part);
    const link = part.replace(/[).,;!?]+$/, "");
    return `<a href="${xml(link)}">Abrir link</a>${xml(part.slice(link.length))}`;
  }).join("");
}

function formatOriginalNotes(notes: string) {
  const paragraphs: string[] = [];
  let specs: string[] = [];
  const finishSpecs = () => {
    if (specs.length > 1) paragraphs.push(`<ul>${specs.map((item) => `<li>${item}</li>`).join("")}</ul>`);
    else if (specs.length) paragraphs.push(`<p>${specs[0]}</p>`);
    specs = [];
  };
  for (const line of notes.split(/\r\n|\n|\r/).map((item) => item.trim())) {
    if (!line || /^[_—–=-]{3,}$/.test(line)) {
      finishSpecs();
    } else if (/^[\p{L}][\p{L}\p{N}\s+()/.-]{0,35}:\s+(?!https?:)/u.test(line)) {
      specs.push(linkNotes(line));
    } else {
      finishSpecs();
      if (/^https:\/\/[^\s]+$/.test(line) && paragraphs.at(-1)?.endsWith("</p>")) {
        paragraphs[paragraphs.length - 1] = paragraphs.at(-1)!.slice(0, -4) + `<br>${linkNotes(line)}</p>`;
      } else {
        paragraphs.push(`<p>${linkNotes(line)}</p>`);
      }
    }
  }
  finishSpecs();
  return paragraphs.join("\n");
}

export function buildPodcastRss(
  episodes: ReleasedPodcastEpisode[], email: string | null,
  articles: ReadonlyMap<string, PodcastArticle> = new Map(),
) {
  const items = episodes.map((episode) => {
    const id = episode.youtube_id;
    const original = `https://www.youtube.com/watch?v=${id}`;
    const match = articles.get(id);
    const article = match && podcastArticleSlug.test(match.slug) && match.slug.length <= 120 ? match : undefined;
    const articleUrl = article ? `${base}/conteudos/${article.slug}` : null;
    const art = article ? podcastCoverPath(article) : null;
    const notes = [
      article?.summary?.trim() ? `<p>${xml(article.summary.trim())}</p>` : "",
      articleUrl && article ? `<p><strong>Leia o artigo completo</strong><br><a href="${xml(articleUrl)}">${xml(article.title)}</a></p>` : "",
      formatOriginalNotes(episode.original_description),
      `<p><a href="${xml(original)}">Assista ao vídeo original</a></p>`,
    ].filter(Boolean).join("\n");
    return `<item>
<title>${xml(episode.title)}</title>
<link>${xml(articleUrl ?? original)}</link>
<guid isPermaLink="false">vitale:youtube:${xml(id)}</guid>
<description>${xml(notes)}</description>
${art ? `<itunes:image href="${xml(base + art)}"/>\n` : ""}<pubDate>${new Date(episode.released_at).toUTCString()}</pubDate>
<enclosure url="${base}${podcastAudioPath(id, episode.size_bytes)}" length="${episode.size_bytes}" type="audio/mpeg"/>
</item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>Vitale Mobilidade</title>
<link>${base}/</link>
<description>${xml(programDescription)}</description>
<language>pt-BR</language>
<itunes:author>Vitale Mobilidade</itunes:author>
<itunes:explicit>false</itunes:explicit>
<itunes:category text="Technology"/>
<itunes:image href="${base}/podcast-capa.jpg"/>
${email ? `<itunes:owner><itunes:name>Vitale Mobilidade</itunes:name><itunes:email>${xml(email)}</itunes:email></itunes:owner>` : ""}
<atom:link href="${base}/podcast/rss.xml" rel="self" type="application/rss+xml"/>
${items.join("\n")}
</channel>
</rss>`;
}
