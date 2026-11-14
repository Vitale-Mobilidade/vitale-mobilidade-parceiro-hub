import { createClient } from "@supabase/supabase-js";
import { expect, it, vi } from "vitest";
import { readPodcastDashboard, readPodcastInstagramDrafts, readPodcastInstagramPosts } from "../editorial-admin/podcast-dashboard";
import { PODCAST_HISTORY_PAGE_SIZE, podcastHistoryPage, podcastInstagramPostState } from "./podcast-dashboard-contract";

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

it("RSS alone is never published on Instagram; hold never becomes scheduled",()=>{
 expect(podcastInstagramPostState(null,false)).toBe("draft");
 expect(podcastInstagramPostState({status:"pending",scheduled_at:"2026-11-14T14:45:00Z"},true)).toBe("draft");
 expect(podcastInstagramPostState({status:"pending",scheduled_at:"2026-11-14T14:45:00Z"},false)).toBe("scheduled");
 expect(podcastInstagramPostState({status:"failed",scheduled_at:"2026-11-14T14:45:00Z"},false)).toBe("draft");
 expect(podcastInstagramPostState({status:"published"},false)).toBe("published");
});

it("reads held post after RSS, V9 prediction and all six confirmed historical posts with bounded metadata",async()=>{
 const db=createClient("https://example.invalid","test",{global:{fetch:async(input,init)=>{
  const url=new URL(String(input)),table=url.pathname.split('/').at(-1);
  if(table==="podcast_upcoming_windows") {expect(init?.method).toBe("POST");return Response.json(["2026-11-14T09:15:00Z"]);}
  expect(init?.method??"GET").toBe("GET");
  if(table==="podcast_distribution_settings") return Response.json({feed_enabled:true,instagram_enabled:true,scheduler_enabled:true});
  if(table==="podcast_prepared_episodes") return Response.json([{youtube_id:"oMk_aatN9pI",position:1}]);
  expect(url.searchParams.get("limit")).toBe("20");expect(url.searchParams.get("offset")).toBe("0");
  expect(url.searchParams.get("select")).not.toMatch(/transcript|blocks|credential|token/);
  return Response.json([
   {youtube_id:"hvtzaWLnM14",title:"OUXI",released_at:"2026-11-14T14:45:00Z",prepared_instagram_post:{reviewHold:true,caption:"OUXI caption",image_url:"https://example.invalid/ouxi.jpg"},podcast_instagram_deliveries:[{status:"pending",slot_at:"2026-11-14T14:45:00Z"}]},
   {youtube_id:"oMk_aatN9pI",title:"V9",prepared_instagram_post:{caption:"V9 caption"},podcast_instagram_deliveries:[]},
   ...Array.from({length:6},(_,i)=>({youtube_id:`history${i}`,title:`Historical ${i}`,prepared_instagram_post:{caption:`Original ${i}`,image_url:`https://example.invalid/old${i}.jpg`},podcast_instagram_deliveries:[{status:"published",published_at:"2026-11-12T20:45:00Z",permalink:"https://www.instagram.com/p/abc/"}]})),
  ],{headers:{"Content-Range":"0-7/8"}});
 }}});
 const data=await readPodcastInstagramPosts(db as never,0);
 expect(data.total).toBe(8);expect(data.items[0]).toMatchObject({reviewHold:true,state:"draft",caption:"OUXI caption",recoverable:false});
 expect(data.items[1]).toMatchObject({state:"draft",predictedAt:"2026-11-14T09:15:00Z",scheduledAt:null});
 expect(data.items.filter(item=>item.state==="published")).toHaveLength(6);
 expect(data.items[2]).toMatchObject({caption:"Original 0",imageUrl:"https://example.invalid/old0.jpg",permalink:"https://www.instagram.com/p/abc/",recoverable:false});
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
      expect(url.searchParams.has("released_at")).toBe(false);
      expect(url.searchParams.has("release_at")).toBe(false);
      expect(url.searchParams.get("select")).toBe("youtube_id,title,prepared_instagram_post");
      return Response.json({ youtube_id: "hvtzaWLnM14", title: "OUXI V20 Ultra Max",
        prepared_instagram_post: { image_url: "https://example.invalid/ouxi.jpg", caption: "Legenda já preparada, sem reescrita." } });
    } },
  });
  const result = await readPodcastInstagramDrafts(db as never, 0);
  expect(result.items.map((item) => item.id)).toEqual(["oMk_aatN9pI"]);
  expect(result.futurePreview).toEqual({ id: "hvtzaWLnM14", title: "OUXI V20 Ultra Max", scheduledAt: null,
    imageUrl: "https://example.invalid/ouxi.jpg", caption: "Legenda já preparada, sem reescrita.", reviewHold: false });
  expect(requests).toHaveLength(3);
});

it("mantém OUXI em revisão visível após RSS mesmo fora da view preparada", async () => {
  const db = createClient("https://example.invalid", "test", {
    auth: { persistSession: false }, global: { fetch: async (input, init) => {
      expect(init?.method ?? "GET").toBe("GET");
      const url = new URL(String(input));
      if (url.pathname.endsWith("podcast_episode_queue")) return Response.json({youtube_id:"hvtzaWLnM14",title:"OUXI",prepared_instagram_post:{image_url:"https://example.invalid/ouxi.jpg",caption:"Legenda",reviewHold:true}});
      return Response.json(url.pathname.endsWith("podcast_prepared_episodes") ? null : []);
    } },
  });
  expect((await readPodcastInstagramDrafts(db as never, 0)).futurePreview).toMatchObject({id:"hvtzaWLnM14",reviewHold:true});
});
