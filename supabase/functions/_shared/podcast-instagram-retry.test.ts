import { createClient } from "@supabase/supabase-js";
import { afterEach, expect, it, vi } from "vitest";
import { publishPodcastOnInstagram } from "../editorial-admin/podcast-instagram";
vi.mock("../editorial-admin/podcast-instagram-artwork.ts", () => ({
  preparePodcastInstagramArtwork: vi.fn(async () => ({
    caption: "Resumo.\n\nSaiba mais no link da Bio",
    image_url: "https://vitalemobilidade.com/podcast/capas/laf-street.ig4.jpg?layout=4&v=1794429740218",
  })),
}));

const episodeId = "nHakFdrS8to";
const priorSlot = "2020-11-12T09:15:00Z";
const draft = {
  caption: "Resumo.\n\nSaiba mais no link da Bio",
  image_url: "https://vitalemobilidade.com/podcast/capas/laf-street.v3.jpg?layout=3&v=1794429740218",
};
const claim = { youtube_id: episodeId, claim_token: "lease", container_id: null, slot_at: priorSlot };
const fakeEnv: Record<string, string> = {
  PODCAST_INSTAGRAM_ACCESS_TOKEN: "test-token",
  PODCAST_INSTAGRAM_API_VERSION: "v25.0",
};

afterEach(() => vi.unstubAllGlobals());

it("reenvia a entrega de um horário encerrado uma vez e guarda o link confirmado", async () => {
  const writes: Array<Record<string, unknown>> = [];
  const delivery = vi.fn(async (url: URL, request?: RequestInit) => {
    if (url.pathname.endsWith("podcast_distribution_settings")) {
      return Response.json([{ feed_enabled: true, instagram_enabled: true }]);
    }
    if (url.pathname.endsWith("podcast_episode_queue")) {
      return Response.json([{ prepared_instagram_post: draft }]);
    }
    const write = JSON.parse(String(request?.body));
    writes.push(write);
    if ("slot_at" in Object.fromEntries(url.searchParams)) {
      expect(url.searchParams.get("publish_attempted_at")).toBe("is.null");
      expect(url.searchParams.get("youtube_id")).toBe(`eq.${episodeId}`);
      expect(url.searchParams.get("status")).toBe("eq.pending");
      expect(Date.parse(url.searchParams.get("slot_at")!.slice(4))).toBeGreaterThan(Date.parse(priorSlot));
      return Response.json(writes.some((item) => item.publish_attempted_at) ? [] : [claim]);
    }
    return Response.json([{ youtube_id: episodeId }]);
  });
  const meta = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ username: "vitalemobilidade", user_id: "123" }))
    .mockResolvedValueOnce(Response.json({ id: "456" }))
    .mockResolvedValueOnce(Response.json({ status_code: "FINISHED" }))
    .mockResolvedValueOnce(Response.json({ id: "789" }))
    .mockResolvedValueOnce(Response.json({ permalink: "https://www.instagram.com/p/abc/" }));
  vi.stubGlobal("Deno", { env: { get: (key: string) => fakeEnv[key] } });
  vi.stubGlobal("fetch", meta);
  const db = createClient("https://db.example.com", "service-test", {
    global: { fetch: (url, request) => delivery(new URL(String(url)), request) },
  });
  await expect(publishPodcastOnInstagram(db, { episodeId })).resolves.toEqual({ status: "published" });
  await expect(publishPodcastOnInstagram(db, { episodeId })).resolves.toEqual({ status: "unavailable" });
  expect(meta.mock.calls.filter(([url]) => String(url).endsWith("/media_publish"))).toHaveLength(1);
  expect(writes).toContainEqual({ container_id: "456", error_code: null });
  expect(writes).toContainEqual(expect.objectContaining({ status: "published", permalink: "https://www.instagram.com/p/abc/" }));
});

it("Meta create timeout keeps marker and explicit retry never creates a second container", async () => {
  let deliveryState: Record<string, unknown> = { ...claim };
  const db = createClient("https://db.example.com", "test", { global: { fetch: async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("podcast_distribution_settings")) return Response.json([{feed_enabled:true,instagram_enabled:true}]);
    if (url.searchParams.has("slot_at")) {
      if (deliveryState.error_code === "meta_create_uncertain") return Response.json([]);
      return Response.json([deliveryState]);
    }
    Object.assign(deliveryState, JSON.parse(String(init?.body)));
    return Response.json([{youtube_id:episodeId}]);
  }}});
  const meta = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({username:"vitalemobilidade",user_id:"123"})).mockRejectedValueOnce(new TypeError("timeout"));
  vi.stubGlobal("Deno", {env:{get:(key:string)=>fakeEnv[key]}});vi.stubGlobal("fetch",meta);
  await expect(publishPodcastOnInstagram(db,{episodeId})).resolves.toEqual({status:"pending",code:"meta_create_uncertain"});
  await expect(publishPodcastOnInstagram(db,{episodeId})).resolves.toEqual({status:"unavailable"});
  expect(meta.mock.calls.filter(([url])=>String(url).endsWith("/media"))).toHaveLength(1);
});

it("confirmed publish attempt is reconciliation-only, never repeats Meta", async()=>{
 const db={rpc:()=>({maybeSingle:async()=>({data:{...claim,publish_attempted_at:"2026-11-14T00:00:00Z"}})})} as never;
 const meta=vi.fn();vi.stubGlobal("fetch",meta);
 await expect(publishPodcastOnInstagram(db)).resolves.toEqual({status:"unavailable",code:"reconciliation_required"});
 expect(meta).not.toHaveBeenCalled();
});
