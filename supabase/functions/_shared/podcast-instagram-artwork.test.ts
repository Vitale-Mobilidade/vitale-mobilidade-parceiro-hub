import { createClient } from "@supabase/supabase-js";
import { afterEach, expect, it, vi } from "vitest";
import { preparePodcastInstagramArtwork } from "../editorial-admin/podcast-instagram-artwork";
const id = "11223344-1234-1234-1234-123456789abc";
const version = "2026-11-12T02:00:00.000Z";
afterEach(() => vi.unstubAllGlobals());

function fixture(width = 1080, saveFails = false, reviewHold = false) {
  const writes: Array<{path:string;body:unknown;filter?:string|null}> = [];
  const db = createClient("https://db.example.com", "mock", {global:{fetch:async(input,init)=>{
    const path = new URL(String(input)).pathname;
    if(path.endsWith("podcast_episode_queue")) {
      if(init?.method === "PATCH") { writes.push({path,body:JSON.parse(String(init.body)),filter:new URL(String(input)).searchParams.get("prepared_instagram_post")});return saveFails ? Response.json({message:"save failed"},{status:500}) : Response.json([{youtube_id:"abcdefghijk"}]); }
      return Response.json([{prepared_article_version:version,prepared_instagram_post:{image_url:"legacy.v3.jpg",caption:"Legenda original fundamentada.", ...(reviewHold ? {reviewHold:true} : {})}}]);
    }
    if(path.endsWith("editorial_articles")) return Response.json([{id,slug:"mobylette",summary:"Resumo",updated_at:version,og_image_url:"https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg"}]);
    if(init?.method === "POST") {writes.push({path,body:init.body});return Response.json({Key:path});}
    return Response.json({message:"not found"},{status:404});
  }}});
  const bytes = Uint8Array.of(255,216,255,192,0,7,8,5,70,width>>8,width&255,255,217);
  const render=vi.fn(async()=>new Response(bytes,{headers:{"Content-Type":"image/jpeg","Content-Length":String(bytes.length)}}));
  vi.stubGlobal("fetch",render);
  return {db:db as never,writes,render};
}
it("adapts only versioned IG media, keeps legacy caption and never writes square/history",async()=>{
 const f=fixture();const post=await preparePodcastInstagramArtwork(f.db,"abcdefghijk");
 expect(post.caption).toBe("Legenda original fundamentada.");expect(post.image_url).toContain("mobylette.ig4.jpg?layout=4");
 expect(f.writes[0].path).toContain(`${id}/podcast-instagram/v4-${Date.parse(version)}.jpg`);
 expect(f.writes[1].body).toEqual({prepared_instagram_post:post});
 expect(f.writes[1].filter).toBe('eq.'+JSON.stringify({image_url:"legacy.v3.jpg",caption:"Legenda original fundamentada."}));
 expect(f.writes).toHaveLength(2);
});
it("preserves explicit reviewHold true when adapting the exact prepared revision",async()=>{
 const f=fixture(1080,false,true);const post=await preparePodcastInstagramArtwork(f.db,"hvtzaWLnM14");
 expect(post.reviewHold).toBe(true);
 expect(f.writes[1].body).toEqual({prepared_instagram_post:post});
 expect(f.writes[1].filter).toContain('"reviewHold":true');
});
it("wrong image dimensions never save media or change the prepared post",async()=>{
 const f=fixture(1400);await expect(preparePodcastInstagramArtwork(f.db,"abcdefghijk")).rejects.toThrow("podcast_instagram_cover_invalid");expect(f.writes).toHaveLength(0);
});
it("post persistence failure is reported before any Meta call",async()=>{
 const f=fixture(1080,true);await expect(preparePodcastInstagramArtwork(f.db,"abcdefghijk")).rejects.toThrow("podcast_instagram_cover_record_failed");expect(f.render).toHaveBeenCalledTimes(1);
});