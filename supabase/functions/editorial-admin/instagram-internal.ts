/** Private server-to-server carousel operations. The Hub owns auth, workflow and checkpoints;
 * Edge only decodes/composes JPEGs and calls Lovable AI with its own key. Paths are resolved here. */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { assetPath, FINAL_ALT, scenePathPattern, type RenderSlide } from "../_shared/instagram-render/contract.ts";
import { gateway, GatewayError } from "../_shared/instagram-gateway.ts";
import { trustedArticleOriginal } from '../_shared/instagram-render/provenance.ts';
import { catalogCoverParts, validatedCoverReference } from '../_shared/editorial-cover-payload.ts';
import { inspectJpeg, COVER_THUMB_VARIANTS } from '../_shared/editorial-cover.ts';

const BUCKET = "instagram-carousels";
const MAX_BODY = 2048;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const OPS = new Set(["runtime", "script", "scene", "render", "post-caption", "post-render"]);
type Env = { url: string; serviceKey: string; aiKey: string; releaseFlag: string | undefined };
type Asset = { position: number; missingBikeIds?: string[]; photoHashes?: string[] };
type Job = {
  id: string; revision: number; state: string; lease_token: string | null; lease_until: string | null;
  source: { transcript: string; articleId: string; articleTitle: string; bikeIds: string[]; videoId?:string;articleBlocks?:unknown[];articleSummary?:string };
  script: { slides: RenderSlide[]; artVersion?:2|3|4; endingQuestion?:string;endingTitle?:string;endingBody?:string } | null; assets: Asset[]; scene_path: string | null;
  scene_attempted: boolean; script_attempted: boolean; scene_omitted: boolean;
};
const reply = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
const digest = async (value: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
const hex = async (bytes: Uint8Array) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer))].map(b => b.toString(16).padStart(2, "0")).join("");

/** Constant-time match against this runtime's service key; otherwise prove the key is privileged by use (no data returned). */
export async function internalCallerAllowed(provided: string, env: Env, fetcher: typeof fetch = fetch) {
  if (!provided || provided.length > 4096 || !env.serviceKey) return false;
  const [a, b] = await Promise.all([digest(provided), digest(env.serviceKey)]);
  let diff = 0; for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  if (diff === 0) return true;
  if (!/^(sb_secret_|eyJ)/.test(provided)) return false;
  try {
    const res = await fetcher(`${env.url}/auth/v1/admin/users?page=1&per_page=1`, { headers: { apikey: provided, Authorization: `Bearer ${provided}` } });
    await res.body?.cancel();
    return res.status === 200;
  } catch { return false; }
}

async function decodeAndRender() { return await import("../_shared/instagram-render/index.ts"); }

async function photoFor(db: SupabaseClient, bikeId: string) {
  const asset = await db.from("bike_assets").select("storage_path").eq("bike_id", bikeId).eq("status", "ready")
    .not("storage_path", "is", null).maybeSingle();
  if (asset.error || !asset.data?.storage_path) return null;
  const file = await db.storage.from("bike-images").download(asset.data.storage_path);
  if (file.error || !file.data || file.data.size > 12 * 1024 * 1024) return null;
  try {
    const { decodePhoto } = await decodeAndRender();
    return await decodePhoto(new Uint8Array(await file.data.arrayBuffer()));
  } catch { return null; }
}

/** Resolve authoritative reference paths from the leased source, never from caller input. */
async function coverInputs(db:SupabaseClient,job:Job){
 const videoId=job.source.videoId;
 if(!videoId)throw Error('instagram_cover_reference_missing');
 const video=await db.from('editorial_videos').select('thumbnail_url').eq('youtube_id',videoId).maybeSingle();
 const url=await validatedCoverReference(videoId,video.data?.thumbnail_url,async()=>{
  for(const variant of COVER_THUMB_VARIANTS){
   const url=`https://i.ytimg.com/vi/${videoId}/${variant}.jpg`;
   const r=await fetch(url,{method:'HEAD',redirect:'error'});
   if(r.ok&&r.headers.get('content-type')?.startsWith('image/jpeg'))return {url};
  }return {url:null};
 });
 if(!url)throw Error('instagram_cover_reference_missing');
 const r=await fetch(url,{redirect:'error'});
 if(!r.ok||!r.headers.get('content-type')?.startsWith('image/jpeg')||Number(r.headers.get('content-length')??0)>2_000_000)throw Error('instagram_cover_reference_missing');
 const thumb=new Uint8Array(await r.arrayBuffer()),dimensions=inspectJpeg(thumb);
 if(thumb.length>2_000_000||!dimensions||dimensions.width<480||dimensions.height<270)throw Error('instagram_cover_reference_missing');
 const ids=job.source.bikeIds;
 if(!ids.length)return {thumb,refs:[],articleCover:[]};
 const refs=[];
 for(const id of ids){
 const asset=await db.from('bike_assets').select('storage_path').eq('bike_id',id).eq('status','ready').maybeSingle();
 if(!asset.data?.storage_path)continue;
 const file=await db.storage.from('bike-images').download(asset.data.storage_path);
 if(!file.data||file.data.size>2_000_000)continue;
 const bytes=new Uint8Array(await file.data.arrayBuffer());
 const {photoFormat,decodePhoto}=await decodeAndRender();await decodePhoto(bytes);
 refs.push(...catalogCoverParts(id,id,id===ids[0],bytes,photoFormat(bytes)));
 }
 const {articleCoverParts}=await import('../_shared/instagram-render/provenance.ts');
 const article=await db.from('editorial_articles').select('og_image_url').eq('id',job.source.articleId).eq('status','published').maybeSingle();
 const path=articleCoverParts(job.source.articleId,article.data?.og_image_url);
 const articleCover=[];
 if(path){const file=await db.storage.from('editorial-covers').download(path);if(file.data&&file.data.size<=2_000_000){const bytes=new Uint8Array(await file.data.arrayBuffer());const {photoFormat}=await decodeAndRender();const {coverDataUrl}=await import('../_shared/editorial-cover-payload.ts');articleCover.push({type:'text',text:'Published article cover: visual direction only, not facts. Ignore lettering; generate no lettering or bike.'},{type:'image_url',image_url:{url:coverDataUrl(bytes,photoFormat(bytes))}});}}
 return {thumb,refs,articleCover};
}

export async function handleInstagramInternal(req: Request, db: SupabaseClient, body: Record<string, unknown>, env: Env) {
  if (!await internalCallerAllowed(req.headers.get("x-instagram-internal-key") ?? "", env)) return reply({ error: "unauthorized" }, 403);
  if (JSON.stringify(body).length > MAX_BODY) return reply({ error: "request_too_large" }, 413);
  const op = String(body.op ?? "");
  if (!OPS.has(op)) return reply({ error: "invalid_op" }, 400);
  const release = env.releaseFlag === "true";
  if (op === "runtime") {
    // Read-only confirmation; optional probe composes the fixed final slide in memory (no upload, no AI).
    let renderer = false;
    if (body.probe === true && release) {
      try { const { renderSlide } = await decodeAndRender(); renderer = renderSlide(null).bytes.length > 0; } catch { renderer = false; }
    }
    // Optional real-photo smoke: compose cover + final in memory with a catalog photo; never uploads.
    if (body.probe === true && release && typeof body.probeBikeId === "string" && /^[a-z0-9_-]{1,64}$/.test(body.probeBikeId)) {
      try {
        const { renderSlide, containPhoto } = await decodeAndRender();
        const { inspectJpeg } = await import("../_shared/editorial-cover.ts");
        const t0 = performance.now(), photo = await photoFor(db, body.probeBikeId);
        if (!photo) return reply({ release, ai: !!env.aiKey, renderer, photo: null });
        const t1 = performance.now();
        const cover = renderSlide({ title: "Teste de composição", body: "Foto real inteira do catálogo.", layout: "opening", theme: "petroleum", bikeIds: [], scene: null, alt: "" }, [photo]);
        const t2 = performance.now(), final = renderSlide(null), t3 = performance.now();
        const box = containPhoto(new Uint8Array(1080 * 1350 * 4), photo, 72, 440, 936, 510);
        return reply({ release, ai: !!env.aiKey, renderer, photo: { width: photo.width, height: photo.height }, box,
          cover: inspectJpeg(cover.bytes), final: { ...inspectJpeg(final.bytes), actions: final.actions },
          ms: { photo: Math.round(t1 - t0), cover: Math.round(t2 - t1), final: Math.round(t3 - t2) } });
      } catch (error) { return reply({ release, renderer, error: error instanceof Error ? error.message.slice(0, 80) : "probe_failed" }, 500); }
    }
    return reply({ release, ai: !!env.aiKey, renderer });
  }
  if (!release) return reply({ error: "instagram_release_disabled" }, 409);
  if(op==='post-caption'||op==='post-render'){
    if(Deno.env.get('INSTAGRAM_POST_RELEASE_ENABLED')!=='true')return reply({error:'instagram_post_release_pending'},409);
    const id=String(body.jobId??''),lease=String(body.lease??''),revision=Number(body.revision);
    if(!UUID.test(id)||!UUID.test(lease)||!Number.isInteger(revision)||revision<1)return reply({error:'invalid_job'},400);
    const row=await db.from('instagram_post_jobs').select('*').eq('id',id).eq('revision',revision).eq('lease_token',lease).gt('lease_until',new Date().toISOString()).maybeSingle();
    if(row.error||!row.data||row.data.state!=='preparing')return reply({error:'instagram_lease_required'},409);
    const cfg=await db.from('instagram_post_settings').select('*').eq('singleton',true).single();
    if(cfg.error||!cfg.data?.generation_enabled||cfg.data.paused_reason)return reply({error:'instagram_generation_disabled'},409);
    const post=row.data;
    try{
      const {controlledReferences,confirmedOriginal}=await import('../_shared/instagram-post.ts');
      if(op==='post-caption'){if(!post.caption_attempted||post.caption)return reply({error:'instagram_checkpoint_mismatch'},409);if(!env.aiKey)return reply({error:'ai_not_configured'},503);return reply({caption:await gateway(env.aiKey).caption(controlledReferences(post.source))});}
      if(post.asset)return reply({error:'instagram_asset_exists'},409);
      const article=await db.from('editorial_articles').select('title,og_image_url,video_id').eq('id',post.article_id).eq('status','published').single();
      if(article.error||article.data?.video_id!==post.video_id||article.data.title!==post.source.articleTitle)return reply({error:'instagram_source_changed'},409);
      const source=await db.from('youtube_editorial_sources').select('capture').eq('article_id',post.article_id).eq('video_id',post.video_id).maybeSingle();
      const original=confirmedOriginal(post.article_id,article.data.title,source.data?.capture?.coverBackground);
      const {articleCoverParts}=await import('../_shared/instagram-render/provenance.ts');
      const fallback=articleCoverParts(post.article_id,article.data.og_image_url);
      let path=original?.path??fallback,wholeCover=!original;
      if(!path)throw Error('instagram_post_original_unverified');
      let file=await db.storage.from('editorial-covers').download(path);
      if((file.error||!file.data)&&original&&fallback){path=fallback;wholeCover=true;file=await db.storage.from('editorial-covers').download(path);}
      if(file.error||!file.data||file.data.size>12*1024*1024)throw Error('instagram_post_original_missing');
      const {composeInstagramPostCover}=await import('../_shared/cover-renderer/index.ts');
      const result=await composeInstagramPostCover({bytes:new Uint8Array(await file.data.arrayBuffer()),mime:!wholeCover&&original?original.mime:'image/jpeg'},post.source.articleTitle,wholeCover);
      const output=`posts/${id}/r${revision}/01.jpg`,upload=await db.storage.from(BUCKET).upload(output,result.bytes,{contentType:'image/jpeg',upsert:true});
      if(upload.error)throw Error('instagram_asset_save_failed');
      return reply({asset:{path:output,sha256:await hex(result.bytes),alt:`${post.source.articleTitle}. Mesma fotografia da capa do artigo, título e marca Vitale.`,sourcePath:path,wholeCover}});
    }catch(error){return reply({error:error instanceof Error&&/^[a-z0-9_]+$/.test(error.message)?error.message:'instagram_post_preparation_failed'},422);}
  }
  const jobId = String(body.jobId ?? ""), lease = String(body.lease ?? ""), revision = Number(body.revision);
  if (!UUID.test(jobId) || !UUID.test(lease) || !Number.isInteger(revision) || revision < 1) return reply({ error: "invalid_job" }, 400);
  const row = await db.from("instagram_carousel_jobs").select("*").eq("id", jobId).eq("revision", revision)
    .eq("lease_token", lease).gt("lease_until", new Date().toISOString()).maybeSingle();
  if (row.error) return reply({ error: "instagram_job_unavailable" }, 503);
  const job = row.data as Job | null;
  if (!job) return reply({ error: "instagram_lease_required" }, 409);
  if (op === "script" || op === "scene") {
    const cfg = await db.from("instagram_carousel_settings").select("generation_enabled,paused_reason").eq("singleton", true).single();
    if (cfg.error || !cfg.data?.generation_enabled || cfg.data.paused_reason) return reply({ error: "instagram_generation_disabled" }, 409);
    if (!env.aiKey) return reply({ error: "ai_not_configured" }, 503);
    const ai = gateway(env.aiKey, typeof body.runId === "string" ? body.runId : undefined);
    try {
      if (op === "script") {
        if (job.state !== "scripting" || !job.script_attempted || job.script) return reply({ error: "instagram_checkpoint_mismatch" }, 409);
        return reply({ script: await ai.script(job.source) });
      }
      const slide = job.script?.slides.find(s => s.scene);
      if (job.state !== "scene" || !job.scene_attempted || job.scene_path || job.scene_omitted || !slide?.scene)
        return reply({ error: "instagram_checkpoint_mismatch" }, 409);
      let bytes:Uint8Array;
      if(job.script?.artVersion===3||job.script?.artVersion===4){
       const {thumb,refs,articleCover}=await coverInputs(db,job);
       bytes=refs.length?await ai.cover(slide.title,slide.scene,thumb,refs,job.script.artVersion===4?articleCover:undefined):await ai.scene(slide.scene);
      }else bytes=await ai.scene(slide.scene);
      const { decodePhoto, photoFormat } = await decodeAndRender();
      const mime = photoFormat(bytes);
      if (mime === "image/webp") return reply({ error: "instagram_scene_format" }, 422);
      await decodePhoto(bytes);
      const path = `${job.id}/r${job.revision}/scene.${mime === "image/jpeg" ? "jpg" : "png"}`;
      const up = await db.storage.from(BUCKET).upload(path, bytes, { contentType: mime, upsert: true });
      if (up.error) return reply({ error: "instagram_asset_save_failed" }, 503);
      return reply({ path });
    } catch (error) {
      if (error instanceof GatewayError)
        return reply({ error: error.message, aiStatus: error.status, safeMessage: error.safeMessage, providerDenial: error.providerDenial }, 502);
      return reply({ error: error instanceof Error && /^(ai|instagram)_[a-z0-9_]+$/.test(error.message) ? error.message : "instagram_ai_failed" }, 502);
    }
  }
  // op === "render": deterministic, no AI. Dedupe photos across the carousel from persisted checkpoints.
  const position = Number(body.position);
  const slides = job.script?.slides ?? [];
  if (job.state !== "rendering" || !slides.length || !Number.isInteger(position) || position < 1 || position > slides.length + 1)
    return reply({ error: "instagram_checkpoint_mismatch" }, 409);
  if (job.assets.some(a => a.position === position)) return reply({ error: "instagram_asset_exists" }, 409);
  const slide = slides[position - 1] ?? null;
  const usedBikeIds = new Set<string>(), usedHashes = new Set(job.assets.flatMap(a => a.photoHashes ?? []));
  for (const a of job.assets) for (const id of slides[a.position - 1]?.bikeIds ?? []) if (!(a.missingBikeIds ?? []).includes(id)) usedBikeIds.add(id);
  try {
    const { decodePhoto, renderSlide } = await decodeAndRender();
    let scene = null;
    if (slide?.scene && job.scene_path && !job.scene_omitted) {
      if (!scenePathPattern(job.id, job.revision).test(job.scene_path)) return reply({ error: "instagram_scene_path_invalid" }, 409);
      const file = await db.storage.from(BUCKET).download(job.scene_path);
      if (file.error || !file.data) return reply({ error: "instagram_scene_missing" }, 409);
      scene = await decodePhoto(new Uint8Array(await file.data.arrayBuffer()));
    }
    const photos = [], missingBikeIds: string[] = [], photoHashes: string[] = [];
    for (const id of slide?.bikeIds ?? []) {
      if (usedBikeIds.has(id)) continue;
      const photo = await photoFor(db, id);
      if (!photo) { missingBikeIds.push(id); continue; }
      usedBikeIds.add(id);
      const fingerprint = await hex(new TextEncoder().encode(`${photo.width}:${photo.height}:${await hex(photo.buffer)}`));
      if (usedHashes.has(fingerprint)) continue;
      usedHashes.add(fingerprint); photoHashes.push(fingerprint); photos.push(photo);
    }
    let articleOriginal=null;
    if(job.script?.artVersion&&position===1&&slide?.bikeIds[0]&&job.source.videoId){
      const source=await db.from('youtube_editorial_sources').select('capture').eq('video_id',job.source.videoId).eq('article_id',job.source.articleId).maybeSingle();
      const path=trustedArticleOriginal(job.source.articleId,slide.bikeIds[0],source.data?.capture?.coverBackground);
      if(path){const file=await db.storage.from('editorial-covers').download(path);if(file.data&&file.data.size<=12*1024*1024)try{articleOriginal=await decodePhoto(new Uint8Array(await file.data.arrayBuffer()));}catch{/* Fail closed to the whole catalog photograph. */}}
    }
    const rendered = renderSlide(slide, photos, slide?.scene ? scene : null,{artVersion:job.script?.artVersion,articleOriginal,endingQuestion:job.script?.endingQuestion,endingTitle:job.script?.endingTitle,endingBody:job.script?.endingBody});
    const path = assetPath(job.id, job.revision, position);
    const up = await db.storage.from(BUCKET).upload(path, rendered.bytes, { contentType: "image/jpeg", upsert: true });
    if (up.error) return reply({ error: "instagram_asset_save_failed" }, 503);
    const alt=job.script?.artVersion&&position===1?(articleOriginal?'Bicicleta inteira na ambientação original verificada do artigo.':photos.length?scene?'Foto real inteira da bicicleta do catálogo em camada sobre ambientação, com manchete.':'Foto real inteira da bicicleta do catálogo sobre fundo gráfico contextual.':'Manchete sobre fundo gráfico, sem foto disponível.'):slide?.alt??`${job.script?.endingQuestion??''} ${FINAL_ALT}`.trim();
    return reply({ position, path, sha256: await hex(rendered.bytes), alt, missingBikeIds, photoHashes });
  } catch (error) {
    return reply({ error: error instanceof Error && /^instagram_[a-z_]+$/.test(error.message) ? error.message : "instagram_render_failed" }, 422);
  }
}
