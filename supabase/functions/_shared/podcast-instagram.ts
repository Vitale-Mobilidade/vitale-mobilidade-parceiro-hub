import { PODCAST_ARTWORK_EDGE, podcastCoverPath } from "./podcast-artwork-contract.ts";

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

export function instagramPodcastPost(article: Parameters<typeof podcastCoverPath>[0] & { summary: string; blocks?: unknown }) {
  const coverPath = podcastCoverPath(article);
  const summary = summaryWithoutLinks(article.summary);
  if (!coverPath || !summary) return null;
  const call = "Saiba mais no link da Bio";
  const available = MAX_CAPTION - call.length - 2;
  // Published text only, with its existing evidence; never invent, split or relabel claims.
  const grounded = Array.isArray(article.blocks) ? article.blocks.filter(block =>
    block && typeof block === "object" && ["text", "pros_cons"].includes(block.type) &&
    typeof block.text === "string" && typeof block.sourceExcerpt === "string" && block.sourceExcerpt.trim()
  ).map(block => summaryWithoutLinks(block.text)).filter(Boolean) : [];
  const paragraphs: string[] = [];
  for (const text of grounded) {
    if (!paragraphs.includes(text) && [...[...paragraphs, text].join("\n\n")].length <= available) paragraphs.push(text);
  }
  const characters = [...summary];
  const excerpt = characters.length > available
    ? characters.slice(0, available - 1).join("").replace(/\s+\S*$/, "") + "…"
    : summary;
  return { image_url: new URL(coverPath.replace(".v3.jpg", ".ig4.jpg").replace("layout=3", "layout=4"), "https://vitalemobilidade.com").href, caption: [...(paragraphs.length ? paragraphs : [excerpt]), call].join("\n\n") };
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

export function directInstagramCoverUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const match = /^\/podcast\/capas\/([a-z0-9]+(?:-[a-z0-9]+)*)\.ig4\.jpg$/.exec(url.pathname);
    const version = url.searchParams.get("v");
    if (url.origin !== "https://vitalemobilidade.com" || url.username || url.password || url.hash ||
      !match || match[1].length > 120 || url.searchParams.get("layout") !== "4" ||
      !version || !/^\d{1,14}$/.test(version)) return null;
    const direct = new URL(PODCAST_ARTWORK_EDGE);
    direct.search = new URLSearchParams({ type: "podcast-cover", slug: match[1], layout: "4", v: version }).toString();
    return direct.href;
  } catch {
    return null;
  }
}

export function instagramPublisher(settings: InstagramSettings, fetcher = fetch, resolveImageUrl = directInstagramCoverUrl) {
  const graphHost = settings.accountId ? "graph.facebook.com" : "graph.instagram.com";

  async function request(step: "account" | "access" | "create" | "status" | "publish" | "permalink",
    path: string, payload?: Record<string, string>, fields?: string) {
    const url = new URL(`https://${graphHost}/${settings.version}/${path}`);
    if (fields) url.searchParams.set("fields", fields);
    let response: Response;
    try {
      response = await fetcher(url, {
        method: payload ? "POST" : "GET",
        headers: { Authorization: `Bearer ${settings.token}` },
        body: payload ? new URLSearchParams(payload) : undefined,
        redirect: "error",
        signal: AbortSignal.timeout(step === "create" ? 12_000 : 6_000),
      });
    } catch {
      throw new InstagramRequestError(`meta_${step}_transport`, false);
    }
    if (response.status === 401 || response.status === 403) throw new InstagramRequestError("meta_authorization", true);
    const result: unknown = await response.json()
      .catch(() => { throw new InstagramRequestError(`meta_${step}_response`, false); });
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      throw new InstagramRequestError(`meta_${step}_response`, false);
    }
    const data = result as Record<string, unknown>;
    if (!response.ok || data.error) {
      const code = data.error && typeof data.error === "object" && "code" in data.error ? Number(data.error.code) : 0;
      const permission = [10, 190, 200].includes(code);
      throw new InstagramRequestError(permission ? "meta_authorization" : `meta_${step}_rejected`, permission);
    }
    return data as Record<string, unknown>;
  }

  return {
    async account() {
      const data = settings.accountId
        ? await request("account", settings.accountId, undefined, "id,username")
        : await request("account", "me", undefined, "user_id,username");
      const accountId = settings.accountId ? data.id : data.user_id;
      if (data.username !== accountName || !numericId(accountId) ||
        (settings.accountId && accountId !== settings.accountId)) {
        throw new InstagramRequestError("wrong_instagram_account", true);
      }
      return accountId;
    },
    async checkPublishingAccess(account: string) {
      if (settings.accountId) {
        const result = await request("access", `${account}/content_publishing_limit`, undefined, "quota_usage");
        const quota = Array.isArray(result.data) ? result.data[0]?.quota_usage : undefined;
        if (typeof quota !== "number" || !Number.isFinite(quota) || quota < 0) {
          throw new InstagramRequestError("meta_request", false);
        }
      }
    },
    async create(account: string, post: NonNullable<ReturnType<typeof instagramPodcastPost>>) {
      const image_url = resolveImageUrl(post.image_url);
      if (!image_url) throw new InstagramRequestError("podcast_instagram_draft_missing", true);
      const data = await request("create", `${account}/media`, { ...post, image_url });
      if (!numericId(data.id)) throw new InstagramRequestError("meta_container_missing", false);
      return data.id;
    },
    async status(container: string) {
      const data = await request("status", container, undefined, "status_code");
      return data.status_code;
    },
    async publish(account: string, container: string) {
      const data = await request("publish", `${account}/media_publish`, { creation_id: container });
      if (!numericId(data.id)) throw new InstagramRequestError("meta_publish_unconfirmed", false);
      return data.id;
    },
    async permalink(mediaId: string) {
      const data = await request("permalink", mediaId, undefined, "permalink");
      return validInstagramPermalink(data.permalink) ? data.permalink : null;
    },
  };
}

export function validInstagramPermalink(value: unknown): value is string {
  return typeof value === "string" && /^https:\/\/www\.instagram\.com\/p\/[A-Za-z0-9_-]+\/?$/.test(value);
}
