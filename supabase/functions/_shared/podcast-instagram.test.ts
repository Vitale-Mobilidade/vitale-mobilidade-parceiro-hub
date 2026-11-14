import { expect, it, vi } from "vitest";
import { instagramPodcastPost, instagramPublisher, readInstagramSettings } from "./podcast-instagram";

const article = {
  slug: "teste-ft07", summary: "Resumo do artigo.", updated_at: "2026-11-11T20:00:00Z",
  og_image_url: "https://i.ytimg.com/vi/qzaQ3G7PRl8/hqdefault.jpg",
};

it("reuses the RSS cover and episode summary, respecting the caption limit", () => {
  const post = instagramPodcastPost({ ...article, summary: "Resumo ".repeat(1000) });
  expect(post?.image_url).toContain("https://vitalemobilidade.com/podcast/capas/teste-ft07.ig4.jpg?layout=4&v=");
  expect(post?.caption).toMatch(/^Resumo(?: Resumo)*…\n\nSaiba mais no link da Bio$/);
  expect([...post!.caption].length).toBeLessThanOrEqual(2200);
  expect(instagramPodcastPost({ ...article, og_image_url: null })).toBeNull();
});

it("uses only the article summary and bio call, without URLs", () => {
  const post = instagramPodcastPost({
    ...article,
    summary: "A FT07 foi testada. [Leia a análise](https://example.com/artigo). https://example.com/quiz?ref=ig www.example.com vitalemobilidade.com",
  });
  expect(post?.caption).toBe("A FT07 foi testada. Leia a análise.\n\nSaiba mais no link da Bio");
});

it("uses the authorized account and publishes a single image container", async () => {
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ username: "vitalemobilidade", user_id: "123" }))
    .mockResolvedValueOnce(Response.json({ id: "456" }))
    .mockResolvedValueOnce(Response.json({ status_code: "FINISHED" }))
    .mockResolvedValueOnce(Response.json({ id: "789" }));
  const instagram = instagramPublisher({ token: "test", version: "v25.0" }, fetcher);
  const account = await instagram.account();
  const post = instagramPodcastPost(article)!;
  const container = await instagram.create(account, post);
  expect(await instagram.status(container)).toBe("FINISHED");
  expect(await instagram.publish(account, container)).toBe("789");
  expect(String(fetcher.mock.calls[1][0])).toBe("https://graph.instagram.com/v25.0/123/media");
  const imageRequest = new URLSearchParams(fetcher.mock.calls[1][1]?.body as URLSearchParams);
  expect(imageRequest.get("image_url")).toBe(
    "https://ipectfejftfcikvozoyu.supabase.co/functions/v1/bike-image?type=podcast-cover&slug=teste-ft07&layout=4&v=1794427200000",
  );
  expect(imageRequest.get("caption")).toBe(post.caption);
  expect(String(fetcher.mock.calls[3][0])).toBe("https://graph.instagram.com/v25.0/123/media_publish");
  expect(fetcher.mock.calls[3][1]?.body?.toString()).toBe("creation_id=456");
});

it("refuses to send media with a cover URL outside the episode artwork route", async () => {
  const fetcher = vi.fn<typeof fetch>();
  const publisher = instagramPublisher({ token: "test", version: "v25.0" }, fetcher);
  const post = instagramPodcastPost(article)!;
  for (const image_url of [
    post.image_url.replace("vitalemobilidade.com", "example.com"),
    post.image_url.replace("/podcast/capas/", "/outro/"),
    post.image_url.replace(/v=\d+/, "v=abc"),
  ]) {
    await expect(publisher.create("123", { ...post, image_url })).rejects.toMatchObject({
      code: "podcast_instagram_draft_missing", terminal: true,
    });
  }
  expect(fetcher).not.toHaveBeenCalled();
});

it("distinguishes delivery transport, malformed responses, and Meta rejection without exposing the response", async () => {
  const fetcher = vi.fn<typeof fetch>()
    .mockRejectedValueOnce(new TypeError("private provider detail"))
    .mockResolvedValueOnce(new Response("private HTML", { status: 502 }))
    .mockResolvedValueOnce(Response.json({ error: { code: 100, message: "private provider detail" } }, { status: 400 }));
  const publisher = instagramPublisher({ token: "test", version: "v25.0" }, fetcher);
  for (const code of ["meta_create_transport", "meta_create_response", "meta_create_rejected"]) {
    await expect(publisher.create("123", instagramPodcastPost(article)!)).rejects.toMatchObject({ code, terminal: false });
  }
});

it("blocks a token for a different account and requires an explicit API version", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ username: "outra", user_id: "123" }));
  await expect(instagramPublisher({ token: "test", version: "v25.0" }, fetcher).account()).rejects.toMatchObject({
    code: "wrong_instagram_account", terminal: true,
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(readInstagramSettings(() => "token-without-version")).toBeNull();
});

it("verifies publication access and sends photos through the Meta Graph for Unified Login", async () => {
  const env: Record<string, string> = {
    PODCAST_INSTAGRAM_ACCESS_TOKEN: "test-token",
    PODCAST_INSTAGRAM_API_VERSION: "v25.0",
    PODCAST_INSTAGRAM_ACCOUNT_ID: "123",
  };
  const settings = readInstagramSettings((name) => env[name]);
  expect(settings).toEqual({ token: "test-token", version: "v25.0", accountId: "123" });
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ username: "vitalemobilidade", id: "123" }))
    .mockResolvedValueOnce(Response.json({ data: [{ quota_usage: 0 }] }))
    .mockResolvedValueOnce(Response.json({ id: "456" }))
    .mockResolvedValueOnce(Response.json({ id: "789" }));
  const instagram = instagramPublisher(settings!, fetcher);
  const account = await instagram.account();
  await instagram.checkPublishingAccess(account);
  const container = await instagram.create(account, instagramPodcastPost(article)!);
  await expect(instagram.publish(account, container)).resolves.toBe("789");
  expect(fetcher.mock.calls.map(([url, init]) => [String(url), init?.method])).toEqual([
    ["https://graph.facebook.com/v25.0/123?fields=id%2Cusername", "GET"],
    ["https://graph.facebook.com/v25.0/123/content_publishing_limit?fields=quota_usage", "GET"],
    ["https://graph.facebook.com/v25.0/123/media", "POST"],
    ["https://graph.facebook.com/v25.0/123/media_publish", "POST"],
  ]);
  expect(fetcher.mock.calls[0][1]?.headers).toEqual({ Authorization: "Bearer test-token" });
  env.PODCAST_INSTAGRAM_ACCOUNT_ID = "123/media";
  expect(readInstagramSettings((name) => env[name])).toBeNull();
});

it("rejects a different Meta Graph account or missing publishing permission", async () => {
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ username: "vitalemobilidade", id: "999" }))
    .mockResolvedValueOnce(Response.json({ username: "vitalemobilidade", id: "123" }))
    .mockResolvedValueOnce(Response.json({ error: { code: 10 } }, { status: 403 }));
  const instagram = instagramPublisher({ token: "test", version: "v25.0", accountId: "123" }, fetcher);
  await expect(instagram.account()).rejects.toMatchObject({ code: "wrong_instagram_account" });
  const account = await instagram.account();
  await expect(instagram.checkPublishingAccess(account)).rejects.toMatchObject({ code: "meta_authorization" });
  expect(fetcher.mock.calls.every(([, init]) => init?.method === "GET")).toBe(true);
});
