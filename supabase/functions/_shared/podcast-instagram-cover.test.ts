import { createClient } from "@supabase/supabase-js";
import { expect, it } from "vitest";
import jpeg from "jpeg-js";
import { servePodcastCover } from "../bike-image/podcast-artwork";
import { composeInstagramPostCover, containPublishedInstagramCover } from "./cover-renderer/index";
import { coverPublicUrl, inspectJpeg } from "./editorial-cover";

const origin = "https://db.example.com";
const articleId = "11223344-1234-1234-1234-123456789abc";
const fileId = "22334455-1234-1234-1234-123456789abc";
const version = "2026-11-12T02:00:00.000Z";
const title = "Mobylette: análise publicada";
const pixels = new Uint8Array(40 * 20 * 4);
for (let i = 0; i < 40 * 20; i++) pixels.set(i % 40 < 20 ? [240,10,20,255] : [10,20,240,255], i * 4);
const source = new Uint8Array(jpeg.encode({data:pixels,width:40,height:20},100).data);

function fixture(original = false, og = coverPublicUrl(origin,articleId,fileId), square = false) {
  const reads: string[] = [];
  const db = createClient(origin, "mock", {global:{fetch: async (input) => {
    const url = new URL(String(input)); reads.push(url.pathname);
    if (url.pathname.endsWith("editorial_articles")) return Response.json([{id:articleId,video_id:"abcdefghijk",title,updated_at:version,og_image_url:og}]);
    if (url.pathname.endsWith("podcast_episode_queue")) return Response.json([]);
    if (url.pathname.includes("/podcast-covers/v3-")) return new Response("legacy brand placeholder");
    if (square && url.pathname.endsWith("/podcast-covers/independent.jpg")) return new Response(source);
    if (url.pathname.endsWith("youtube_editorial_sources")) return Response.json([{cover_background:original ? {path:`${articleId}/backgrounds/${fileId}.jpg`,mime:"image/jpeg",title}:null}]);
    if (url.pathname.includes("/backgrounds/") || url.pathname.endsWith(`/${articleId}/${fileId}.jpg`)) return new Response(source,{headers:{"Content-Type":"image/jpeg"}});
    return Response.json({message:"missing"},{status:404});
  }}});
  const params = new URLSearchParams({slug:"mobylette",layout:"4",v:String(Date.parse(version))});
  return {db:db as never,reads,params,request:new Request(`${origin}/functions/v1/bike-image?${params}`)};
}

it("original first: exact linked Storage photograph and legacy separate typography", async () => {
  const f = fixture(true); const response = await servePodcastCover(f.request,f.params,f.db);
  const bytes = new Uint8Array(await response.arrayBuffer());
  expect(response.status).toBe(200);
  expect(bytes).toEqual((await composeInstagramPostCover({bytes:source,mime:"image/jpeg"},title)).bytes);
  expect(f.reads.some(path => path.includes("/backgrounds/"))).toBe(true);
  expect(f.reads.some(path => path.endsWith(`/${articleId}/${fileId}.jpg`))).toBe(false);
});

it("fallback uses only exact published JPEG, complete inside safe grid, without overlaying title or brand", async () => {
  const f = fixture(); const response = await servePodcastCover(f.request,f.params,f.db);
  const bytes = new Uint8Array(await response.arrayBuffer());
  expect(response.status).toBe(200); expect(inspectJpeg(bytes)).toEqual({width:1080,height:1350});
  expect(bytes).toEqual((await containPublishedInstagramCover(source)).bytes);
  const image = jpeg.decode(bytes);
  const at = (x:number,y:number,c=0) => image.data[(y*1080+x)*4+c];
  expect(at(121,500)).toBeGreaterThan(180); expect(at(958,500,2)).toBeGreaterThan(180);
  for (const x of [0,90,990,1079]) expect(at(x,500)).toBeLessThan(30);
  expect(at(500,121)).toBeLessThan(30); expect(at(500,1228)).toBeLessThan(30);
});

it("unverified URL never fetches arbitrary media or substitutes a thumbnail", async () => {
  const f = fixture(false,"https://example.com/cover.jpg");
  const response = await servePodcastCover(f.request,f.params,f.db);
  expect(response.status).toBe(422); expect(response.headers.get("X-Media-Error")).toBe("podcast_instagram_original_missing");
  expect(f.reads.some(path=>path.endsWith(`/${articleId}/${fileId}.jpg`))).toBe(false);
});

it("wrong article revision cannot serve or compose any media", async () => {
  const f = fixture(); f.params.set("v","123");
  const response = await servePodcastCover(f.request,f.params,f.db);
  expect(response.status).toBe(409); expect(f.reads).toHaveLength(1);
});

it("serves a stored independent square without looking up the article background", async () => {
  const f = fixture(true, undefined, true);
  f.params.set("layout", "3");
  const response = await servePodcastCover(f.request, f.params, f.db);
  expect(response.status).toBe(200);
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(source);
  expect(f.reads.some(path => path.endsWith("youtube_editorial_sources"))).toBe(false);
});

it("v5 bypasses the cached v3 and includes the original photograph at both edges", async () => {
  const f = fixture(true);
  f.params.set("layout", "5");
  const response = await servePodcastCover(f.request, f.params, f.db);
  expect(response.status).toBe(200);
  expect(response.headers.get("X-Podcast-Artwork")).toBe("photo");
  const bytes = new Uint8Array(await response.arrayBuffer());
  expect(inspectJpeg(bytes)).toEqual({ width: 1400, height: 1400 });
  const image = jpeg.decode(bytes);
  expect(image.data[(300 * 1400 + 30) * 4]).toBeGreaterThan(180);
  expect(image.data[(300 * 1400 + 1369) * 4 + 2]).toBeGreaterThan(180);
  expect(f.reads.some(path => path.includes("/podcast-covers/v3-"))).toBe(false);
});

it("uses the complete published JPEG if no original exists", async () => {
  const f = fixture(false);
  f.params.set("layout", "5");
  const response = await servePodcastCover(f.request, f.params, f.db);
  const image = jpeg.decode(new Uint8Array(await response.arrayBuffer()));
  expect(image.data[(600 * 1400 + 70) * 4]).toBeGreaterThan(180);
  expect(image.data[(600 * 1400 + 1329) * 4 + 2]).toBeGreaterThan(180);
});

it("uses the brand only when there is no verified photo", async () => {
  const f = fixture(false, "https://example.com/cover.jpg");
  f.params.set("layout", "5");
  const response = await servePodcastCover(f.request, f.params, f.db);
  expect(response.headers.get("X-Podcast-Artwork")).toBe("brand");
  expect(inspectJpeg(new Uint8Array(await response.arrayBuffer()))).toEqual({ width: 1400, height: 1400 });
});
