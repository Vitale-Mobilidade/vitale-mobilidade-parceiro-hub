import { createClient } from "@supabase/supabase-js";
import { expect, it, vi } from "vitest";
import { readPodcastDashboard, readPodcastInstagramDrafts } from "../editorial-admin/podcast-dashboard";
import { PODCAST_HISTORY_PAGE_SIZE, podcastHistoryPage } from "./podcast-dashboard-contract";

it("lê totais e links do catálogo sem consultar o armazenamento nem dados privados", async () => {
  const fetchMock = vi.fn(async (request: string | URL | Request, init?: RequestInit) => {
    const url = new URL(request instanceof Request ? request.url : request.toString());
    expect(url.searchParams.get("select") ?? "").not.toMatch(/object_path|credential|token|attached_by/);
    const table = url.pathname.split("/").at(-1);
    const json = (body: unknown, count = 1) => Response.json(body, { headers: { "Content-Range": `0-0/${count}` } });
    if (table === "podcast_distribution_settings") return json({ feed_enabled: true, scheduler_enabled: true });
    if (table === "podcast_video_audio" && init?.method === "HEAD")
      return new Response(null, { headers: { "Content-Range": "*/12" } });
    if (table === "podcast_queue_candidates") return json([{ youtube_id: "ready", title: "Elegível" }], 9);
    if (table === "podcast_pending_preparation") return json([], 0);
    if (table === "podcast_upcoming_windows") return json(["2026-11-12T09:15:00Z", "2026-11-12T14:45:00Z"]);
    if (table === "podcast_prepared_episodes")
      return json([{ youtube_id: "prepared", title: "Preparado" }, { youtube_id: "prepared-two", title: "Segundo" }], 2);
    if (table === "podcast_episode_queue") {
      expect(url.searchParams.get("offset")).toBe(String(PODCAST_HISTORY_PAGE_SIZE));
      return json([{ youtube_id: "released", title: "Publicado", released_at: "2026-11-11T20:45:02Z" }], 21);
    }
    if (table === "editorial_articles") return json([{ video_id: "ready", slug: "artigo" }, { video_id: "prepared", slug: "../draft" }]);
    if (table === "podcast_instagram_deliveries") return json([]);
    if (table === "podcast_spotify_episodes") return json([{ youtube_id: "released", spotify_episode_id: "324BQ31Y26a5askghi34ax" }]);
    throw new Error(`Unexpected table ${table}`);
  });
  const db = createClient("https://example.invalid", "test", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchMock as typeof fetch },
  });
  const data = await readPodcastDashboard(db as never, 1);
  expect(data.audioCount).toBe(12);
  expect(data.ready).toMatchObject({ total: 9, items: [{ articleSlug: "artigo" }] });
  expect(data.prepared).toMatchObject({ total: 2, items: [
    { articleSlug: null, spotifyId: null, slotAt: "2026-11-12T09:15:00Z" },
    { id: "prepared-two", slotAt: "2026-11-12T14:45:00Z" },
  ] });
  expect(data.released).toMatchObject({ total: 21, items: [{ spotifyId: "324BQ31Y26a5askghi34ax" }] });
  expect(podcastHistoryPage(-1)).toBe(0);
  expect(podcastHistoryPage(99_999)).toBe(999);
});

it("mostra apenas a OUXI futura preparada sem alterar a entrega normal V9", async () => {
  const requests: string[] = [];
  const db = createClient("https://example.invalid", "test", {
    auth: { persistSession: false }, global: { fetch: async (input, init) => {
      expect(init?.method ?? "GET").toBe("GET");
      const url = new URL(String(input));
      requests.push(url.pathname);
      if (url.pathname.endsWith("podcast_instagram_deliveries")) {
        expect(url.searchParams.get("status")).toBe("eq.pending");
        expect(url.searchParams.get("publish_attempted_at")).toBe("is.null");
        expect(url.searchParams.get("or")).toContain("meta_create_uncertain");
        return Response.json([{ youtube_id: "oMk_aatN9pI", scheduled_at: null,
          podcast_episode_queue: { title: "V9 Max vs V20 Ultra", prepared_instagram_post: { image_url: "https://example.invalid/v9.jpg", caption: "V9 original" } } }]);
      }
      expect(url.searchParams.get("youtube_id")).toBe("eq.hvtzaWLnM14");
      if (url.pathname.endsWith("podcast_prepared_episodes")) return Response.json({ youtube_id: "hvtzaWLnM14" });
      expect(url.searchParams.get("released_at")).toBe("is.null");
      expect(url.searchParams.get("release_at")).toBe("is.null");
      expect(url.searchParams.get("select")).toBe("youtube_id,title,prepared_instagram_post");
      return Response.json({ youtube_id: "hvtzaWLnM14", title: "OUXI V20 Ultra Max",
        prepared_instagram_post: { image_url: "https://example.invalid/ouxi.jpg", caption: "Legenda já preparada, sem reescrita." } });
    } },
  });
  const result = await readPodcastInstagramDrafts(db as never, 0);
  expect(result.items.map((item) => item.id)).toEqual(["oMk_aatN9pI"]);
  expect(result.futurePreview).toEqual({ id: "hvtzaWLnM14", title: "OUXI V20 Ultra Max", scheduledAt: null,
    imageUrl: "https://example.invalid/ouxi.jpg", caption: "Legenda já preparada, sem reescrita." });
  expect(requests).toHaveLength(3);
});

it("não consulta nem prepara a OUXI ausente da fila elegível", async () => {
  const db = createClient("https://example.invalid", "test", {
    auth: { persistSession: false }, global: { fetch: async (input, init) => {
      expect(init?.method ?? "GET").toBe("GET");
      const url = new URL(String(input));
      expect(url.pathname).not.toContain("podcast_episode_queue");
      return Response.json(url.pathname.endsWith("podcast_prepared_episodes") ? null : []);
    } },
  });
  expect((await readPodcastInstagramDrafts(db as never, 0)).futurePreview).toBeNull();
});
