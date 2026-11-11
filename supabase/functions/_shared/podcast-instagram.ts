import { podcastCoverPath } from "./podcast-artwork-contract.ts";

const MAX_CAPTION = 2200;
const accountName = "vitalemobilidade";
const numericId = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9]{1,30}$/.test(value);

function tidy(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function instagramPodcastPost(title: string, article: Parameters<typeof podcastCoverPath>[0] & { summary: string }) {
  const coverPath = podcastCoverPath(article);
  const heading = tidy(title);
  const summary = tidy(article.summary);
  if (!coverPath || !heading || !summary) return null;
  const intro = `🎙️ ${heading}`;
  const call = "Ouça o episódio no podcast da Vitale Mobilidade e leia a análise em vitalemobilidade.com.";
  const available = MAX_CAPTION - [...intro + call].length - 4;
  if (available < 80) return null;
  const characters = [...summary];
  const excerpt = characters.length > available
    ? characters.slice(0, available - 1).join("").replace(/\s+\S*$/, "") + "…"
    : summary;
  return { image_url: new URL(coverPath, "https://vitalemobilidade.com").href, caption: [intro, excerpt, call].join("\n\n") };
}

export type InstagramSettings = { token: string; version: string };

export function readInstagramSettings(get: (name: string) => string | undefined): InstagramSettings | null {
  const token = get("PODCAST_INSTAGRAM_ACCESS_TOKEN")?.trim();
  const version = get("PODCAST_INSTAGRAM_API_VERSION")?.trim();
  return token && version && /^v[0-9]{2}\.0$/.test(version) ? { token, version } : null;
}

export class InstagramRequestError extends Error {
  constructor(public readonly code: string, public readonly terminal: boolean) { super(code); }
}

export function instagramPublisher(settings: InstagramSettings, fetcher = fetch) {
  async function request(path: string, payload?: Record<string, string>, fields?: string) {
    const url = new URL(`https://graph.instagram.com/${settings.version}/${path}`);
    if (fields) url.searchParams.set("fields", fields);
    const response = await fetcher(url, {
      method: payload ? "POST" : "GET",
      headers: { Authorization: `Bearer ${settings.token}` },
      body: payload ? new URLSearchParams(payload) : undefined,
      redirect: "error",
      signal: AbortSignal.timeout(6000),
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      const code = Number(data.error?.code);
      const permission = [10, 190, 200].includes(code) || [401, 403].includes(response.status);
      throw new InstagramRequestError(permission ? "meta_authorization" : "meta_request", permission);
    }
    return data as Record<string, unknown>;
  }

  return {
    async account() {
      const data = await request("me", undefined, "user_id,username");
      if (data.username !== accountName || !numericId(data.user_id))
        throw new InstagramRequestError("wrong_instagram_account", true);
      return data.user_id;
    },
    async create(account: string, post: NonNullable<ReturnType<typeof instagramPodcastPost>>) {
      const data = await request(`${account}/media`, post);
      if (!numericId(data.id)) throw new InstagramRequestError("meta_container_missing", false);
      return data.id;
    },
    async status(container: string) {
      const data = await request(container, undefined, "status_code");
      return data.status_code;
    },
    async publish(account: string, container: string) {
      const data = await request(`${account}/media_publish`, { creation_id: container });
      if (!numericId(data.id)) throw new InstagramRequestError("meta_publish_unconfirmed", false);
      return data.id;
    },
    async permalink(mediaId: string) {
      const data = await request(mediaId, undefined, "permalink");
      return validInstagramPermalink(data.permalink) ? data.permalink : null;
    },
  };
}

export function validInstagramPermalink(value: unknown): value is string {
  return typeof value === "string" && /^https:\/\/www\.instagram\.com\/p\/[A-Za-z0-9_-]+\/?$/.test(value);
}
