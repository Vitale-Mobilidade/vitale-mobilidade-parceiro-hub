import { podcastCoverPath } from "./podcast-artwork-contract.ts";

const MAX_CAPTION = 2200;
const accountName = "vitalemobilidade";
const numericId = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9]{1,30}$/.test(value);

function summaryWithoutLinks(text: string) {
  return text
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|www\.)[^)\s]+\)/gi, "$1")
    .replace(/\b(?:(?:https?:\/\/|www\.)[^\s<>]+|(?:[a-z0-9-]+\.)+[a-z]{2,24}\b(?:\/[^\s<>]*)?)/gi,
      (url) => url.match(/[.,!?;:]+$/)?.[0] ?? "")
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function instagramPodcastPost(article: Parameters<typeof podcastCoverPath>[0] & { summary: string }) {
  const coverPath = podcastCoverPath(article);
  const summary = summaryWithoutLinks(article.summary);
  if (!coverPath || !summary) return null;
  const call = "Saiba mais no link da Bio";
  const available = MAX_CAPTION - call.length - 2;
  const characters = [...summary];
  const excerpt = characters.length > available
    ? characters.slice(0, available - 1).join("").replace(/\s+\S*$/, "") + "…"
    : summary;
  return { image_url: new URL(coverPath, "https://vitalemobilidade.com").href, caption: [excerpt, call].join("\n\n") };
}

export type InstagramSettings = { token: string; version: string; accountId?: string };

export function readInstagramSettings(get: (name: string) => string | undefined): InstagramSettings | null {
  const token = get("PODCAST_INSTAGRAM_ACCESS_TOKEN")?.trim();
  const version = get("PODCAST_INSTAGRAM_API_VERSION")?.trim();
  const accountId = get("PODCAST_INSTAGRAM_ACCOUNT_ID")?.trim();
  if (!token || !version || !/^v[0-9]{2}\.0$/.test(version)) return null;
  if (accountId !== undefined) {
    if (!numericId(accountId)) return null;
    return { token, version, accountId };
  }
  return { token, version };
}

export class InstagramRequestError extends Error {
  constructor(public readonly code: string, public readonly terminal: boolean) { super(code); }
}

export function instagramPublisher(settings: InstagramSettings, fetcher = fetch) {
  const graphHost = settings.accountId ? "graph.facebook.com" : "graph.instagram.com";

  async function request(path: string, payload?: Record<string, string>, fields?: string) {
    const url = new URL(`https://${graphHost}/${settings.version}/${path}`);
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
      const data = settings.accountId
        ? await request(settings.accountId, undefined, "id,username")
        : await request("me", undefined, "user_id,username");
      const accountId = settings.accountId ? data.id : data.user_id;
      if (data.username !== accountName || !numericId(accountId) ||
        (settings.accountId && accountId !== settings.accountId)) {
        throw new InstagramRequestError("wrong_instagram_account", true);
      }
      return accountId;
    },
    async checkPublishingAccess(account: string) {
      if (settings.accountId) {
        const result = await request(`${account}/content_publishing_limit`, undefined, "quota_usage");
        const quota = Array.isArray(result.data) ? result.data[0]?.quota_usage : undefined;
        if (typeof quota !== "number" || !Number.isFinite(quota) || quota < 0) {
          throw new InstagramRequestError("meta_request", false);
        }
      }
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
