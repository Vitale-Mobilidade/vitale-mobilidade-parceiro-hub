import { expect, it, vi } from "vitest";
import { instagramPodcastPost, instagramPublisher, readInstagramSettings } from "./podcast-instagram";

const article = {
  slug: "teste-ft07", summary: "Resumo do artigo.", updated_at: "2026-11-11T20:00:00Z",
  og_image_url: "https://i.ytimg.com/vi/qzaQ3G7PRl8/hqdefault.jpg",
};

it("reuses the RSS cover and episode summary, respecting the caption limit", () => {
  const post = instagramPodcastPost("Teste da FT07", { ...article, summary: "Resumo ".repeat(1000) });
  expect(post?.image_url).toContain("https://vitalemobilidade.com/podcast/capas/teste-ft07.v3.jpg?layout=3&v=");
  expect(post?.caption).toMatch(/Teste da FT07\n\nResumo/);
  expect([...post!.caption].length).toBeLessThanOrEqual(2200);
  expect(instagramPodcastPost("Teste", { ...article, og_image_url: null })).toBeNull();
});

it("uses the authorized account and publishes a single image container", async () => {
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ username: "vitalemobilidade", user_id: "123" }))
    .mockResolvedValueOnce(Response.json({ id: "456" }))
    .mockResolvedValueOnce(Response.json({ status_code: "FINISHED" }))
    .mockResolvedValueOnce(Response.json({ id: "789" }));
  const instagram = instagramPublisher({ token: "test", version: "v25.0" }, fetcher);
  const account = await instagram.account();
  const post = instagramPodcastPost("Teste da FT07", article)!;
  const container = await instagram.create(account, post);
  expect(await instagram.status(container)).toBe("FINISHED");
  expect(await instagram.publish(account, container)).toBe("789");
  expect(String(fetcher.mock.calls[1][0])).toBe("https://graph.instagram.com/v25.0/123/media");
  expect(fetcher.mock.calls[1][1]?.body?.toString()).toBe(new URLSearchParams(post).toString());
  expect(String(fetcher.mock.calls[3][0])).toBe("https://graph.instagram.com/v25.0/123/media_publish");
  expect(fetcher.mock.calls[3][1]?.body?.toString()).toBe("creation_id=456");
});

it("blocks a token for a different account and requires an explicit API version", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ username: "outra", user_id: "123" }));
  await expect(instagramPublisher({ token: "test", version: "v25.0" }, fetcher).account()).rejects.toMatchObject({
    code: "wrong_instagram_account", terminal: true,
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(readInstagramSettings(() => "token-without-version")).toBeNull();
});
