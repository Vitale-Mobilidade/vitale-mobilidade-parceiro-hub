// End-to-end mock (no AI, no network, no database): Hub workflow → Hub Edge client → Edge private
// action → real Deno compositor. Run: deno test -A --sloppy-imports supabase/functions/editorial-admin/instagram-internal_test.ts
import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import { handleInstagramInternal, internalCallerAllowed } from "./instagram-internal.ts";
import { prepare, approvable } from "../../../src/lib/instagram/workflow.server.ts";
import { edge } from "../../../src/lib/instagram/edge.server.ts";
import { jobFixture, scriptFixture } from "../../../src/lib/instagram/fixtures.test-support.ts";
import { inspectJpeg } from "../_shared/editorial-cover.ts";
import type { Job } from "../../../src/lib/instagram/contract.ts";
import { previewScript,previewSource } from '../../../src/lib/instagram/art-v2.fixture.ts';
import { previewScript as v3Script } from '../../../src/lib/instagram/art-v3.fixture.ts';

const KEY = "sb_secret_test_only", URL_ = "https://edge.invalid";
const env = { url: URL_, serviceKey: KEY, aiKey: "ai-test", releaseFlag: "true" };
const photo = await Deno.readFile(new URL("../../../src/assets/bikes/v20-ultra-landing.webp", import.meta.url));
const pngScene = await Deno.readFile(new URL("../_shared/cover-renderer/fixture.png", import.meta.url));

function world(job: Job, opts: { generation?: boolean; photos?: Record<string, Uint8Array> } = {}) {
  const files = new Map<string, Uint8Array>(), uploads: string[] = [];
  const settings = { generation_enabled: opts.generation ?? true, paused_reason: null };
  const query = (table: string) => {
    const filters: Array<(r: Record<string, unknown>) => boolean> = [];
    const q = {
      select: () => q,
      eq: (k: string, v: unknown) => (filters.push(r => r[k] === v), q),
      gt: (k: string, v: string) => (filters.push(r => String(r[k]) > v), q),
      not: (k: string) => (filters.push(r => r[k] != null), q),
      async maybeSingle() { return { data: rows(table).find(r => filters.every(f => f(r))) ?? null, error: null }; },
      async single() { const d = rows(table).find(r => filters.every(f => f(r))); return { data: d ?? null, error: d ? null : { message: "none" } }; },
    };
    return q;
  };
  const rows = (table: string): Record<string, unknown>[] =>
    table === "instagram_carousel_jobs" ? [structuredClone(job) as unknown as Record<string, unknown>]
      : table === "instagram_carousel_settings" ? [{ singleton: true, ...settings }]
      : table === "bike_assets" ? Object.keys(opts.photos ?? {}).map(id => ({ bike_id: id, status: "ready", storage_path: `${id}.webp` }))
      : table === "editorial_videos" ? [{youtube_id:'AHHPeeQE11k',thumbnail_url:'https://i.ytimg.com/vi/AHHPeeQE11k/maxresdefault.jpg'}]
      : [];
  const db = {
    from: query,
    storage: {
      from: (bucket: string) => ({
        async upload(path: string, bytes: Uint8Array) { assertEquals(bucket, "instagram-carousels"); files.set(path, bytes); uploads.push(path); return { error: null }; },
        async download(path: string) {
          const bytes = bucket === "bike-images" ? opts.photos?.[path.replace(/\.webp$/, "")] : files.get(path);
          return bytes ? { data: new Blob([new Uint8Array(bytes).buffer]), error: null } : { data: null, error: { message: "missing" } };
        },
      }),
    },
  };
  const calls: string[] = [];
  const fetcher = (async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)); calls.push(body.op);
    return handleInstagramInternal(new Request(URL_, { method: "POST", headers: init.headers, body: init.body }), db as never, body, env);
  }) as typeof fetch;
  const store = {
    async save(patch: Partial<Job>) { Object.assign(job, structuredClone(patch)); },
    async download(path: string) { const f = files.get(path); if (!f) throw Error("missing"); return f; },
  };
  return { files, uploads, calls, store, studio: edge(undefined, fetcher), settings };
}
function stubAi(script: unknown, image?: Uint8Array) {
  const original = globalThis.fetch; const hits: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input); hits.push(url);
    if (!url.startsWith("https://ai.gateway.lovable.dev/")) throw Error("unexpected network");
    const frame = url.endsWith("/images/generations")
      ? `data: ${JSON.stringify({ type: "image_generation.completed", b64_json: btoa(String.fromCharCode(...(image??new Uint8Array()))) })}\n\n`
      : `data: ${JSON.stringify({ choices: [{ delta: { content: JSON.stringify(script) }, finish_reason: "stop" }] })}\n\n`;
    return new Response(new Blob([frame]).stream(), { status: 200 });
  }) as typeof fetch;
  return { hits, restore: () => { globalThis.fetch = original; } };
}
function leased() { const job = jobFixture(); job.lease_token = crypto.randomUUID(); job.lease_until = new Date(Date.now() + 600000).toISOString(); return job; }
Deno.env.set("SUPABASE_URL", URL_); Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", KEY);

Deno.test('v2 full mock: grounded script, six actual JPEGs, one photo, checkpoint resume with zero paid calls',async()=>{
 const job=leased();job.source=structuredClone(previewSource);job.video_id=previewSource.videoId;job.article_id=previewSource.articleId;
 job.script=structuredClone(previewScript);job.script_attempted=true;job.state='rendering';
 const w=world(job,{photos:{v9_max:photo}});
 await prepare(job,w.store,w.studio);assertEquals(job.state,'review');assertEquals(job.assets.length,6);
 assertEquals(w.calls.filter(op=>op==='script'||op==='scene'),[]);
 assertEquals(job.assets.flatMap(a=>a.photoHashes??[]).length,1);
 for(const asset of job.assets){const bytes=w.files.get(asset.path);assert(bytes);assertEquals(inspectJpeg(bytes),{width:1080,height:1350});}
 const before=w.uploads.length;await prepare(job,w.store,w.studio);assertEquals(w.uploads.length,before);
});

Deno.test('v3 leased cover uses shared model/validated thumb/catalog once, renders six JPEGs and resumes without replay',async()=>{
 const job=leased();job.source=structuredClone(previewSource);job.script=structuredClone(v3Script);
 job.script.slides[0].scene='Night urban environment';job.script_attempted=true;job.state='scene';
 const catalog=await Deno.readFile(new URL('../../../src/assets/bikes/v9-max.jpg',import.meta.url));
 const thumb=renderSlideForThumb();const w=world(job,{photos:{v9_max:catalog}});
 const original=globalThis.fetch;let paid=0;
 globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input);
  if(url==='https://i.ytimg.com/vi/AHHPeeQE11k/maxresdefault.jpg')return new Response(new Uint8Array(thumb).buffer,{headers:{'Content-Type':'image/jpeg'}});
  if(url==='https://ai.gateway.lovable.dev/v1/images/generations'){
   paid++;const p=JSON.parse(String(init?.body));assertEquals(p.model,'google/gemini-3.1-flash-image');assertEquals(p.image_config.aspect_ratio,'4:5');
   assert(p.messages[0].content[1].image_url.url.startsWith('data:image/jpeg;'));
   assert(p.messages[0].content[2].text.includes('v9_max'));assert(p.messages[0].content[3].image_url.url.startsWith('data:image/'));
   return new Response(`data: ${JSON.stringify({type:'image_generation.completed',b64_json:btoa(String.fromCharCode(...pngScene))})}\n\n`);
  }throw Error('unexpected network');
 }) as typeof fetch;
 try{
  await prepare(job,w.store,w.studio);assertEquals(job.state,'review');assertEquals(job.assets.length,6);assertEquals(paid,1);
  for(const a of job.assets){const b=w.files.get(a.path);assert(b);assertEquals(inspectJpeg(b),{width:1080,height:1350});}
  await prepare(job,w.store,w.studio);assertEquals(paid,1);
  job.assets=[];job.state='rendering';await prepare(job,w.store,w.studio);assertEquals(paid,1);
 }finally{globalThis.fetch=original;}
});
import {renderSlide} from '../_shared/instagram-render/index.ts';
function renderSlideForThumb(){return renderSlide(null).bytes;}

Deno.test("full mock run: 4 JPEG 1080x1350, real photo once, fixed final slide, review state", async () => {
  const job = leased(), w = world(job, { photos: { bike1: photo } }), ai = stubAi(scriptFixture);
  try { await prepare(job, w.store, w.studio); } finally { ai.restore(); }
  assertEquals(job.state, "review"); assertEquals(job.assets.length, 4); assert(approvable(job));
  for (const a of job.assets) { const bytes=w.files.get(a.path);assert(bytes);assertEquals(inspectJpeg(bytes), { width: 1080, height: 1350 }); }
  assertEquals(job.assets.flatMap(a => a.photoHashes ?? []).length, 1);
  assertEquals(job.assets[3].alt, "Curta, Compartilhe, Comente e Salve. @vitalemobilidade.");
  assertEquals(ai.hits.length, 1);
  await Deno.mkdir("/tmp/browser/instagram", { recursive: true });
  for (const a of job.assets) {const bytes=w.files.get(a.path);assert(bytes);await Deno.writeFile(`/tmp/browser/instagram/e2e-${a.position}.jpg`, bytes);}
});
Deno.test("missing catalog photo is explicit and still completes without a scene", async () => {
  const job = leased(), w = world(job), ai = stubAi(scriptFixture);
  try { await prepare(job, w.store, w.studio); } finally { ai.restore(); }
  assertEquals(job.state, "review"); assertEquals(job.assets[0].missingBikeIds, ["bike1"]);
});
Deno.test("scene generated once, path resolved by Edge, resume re-renders without paid calls", async () => {
  const script = structuredClone(scriptFixture); script.slides[1].scene = "Ladeira vazia";
  const job = leased(), w = world(job, { photos: { bike1: photo } }), ai = stubAi(script, pngScene);
  try {
    await prepare(job, w.store, w.studio);
    assertEquals(job.scene_path, `${job.id}/r1/scene.png`);
    job.assets = job.assets.slice(0, 1); job.state = "rendering";
    await prepare(job, w.store, w.studio);
  } finally { ai.restore(); }
  assertEquals(job.assets.length, 4); assertEquals(ai.hits.length, 2);
  assertEquals(job.assets.flatMap(a => a.photoHashes ?? []).length, 1);
});
Deno.test("Edge refuses paid ops when generation is off, and never replays scripts", async () => {
  const job = leased(), w = world(job, { generation: false }), ai = stubAi(scriptFixture);
  try {
    await assertRejects(() => prepare(job, w.store, w.studio), Error, "instagram_generation_disabled");
    const again = leased(); again.script_attempted = true; const w2 = world(again);
    await assertRejects(() => prepare(again, w2.store, w2.studio), Error, "no_replay");
  } finally { ai.restore(); }
  assertEquals(ai.hits.length, 0);
});
Deno.test("private action rejects missing/wrong key and stale leases; render needs no AI key", async () => {
  const job = leased(), w = world(job);
  const call = (headers: Record<string, string>, body: Record<string, unknown>) =>
    handleInstagramInternal(new Request(URL_, { method: "POST", headers }), {} as never, body, env);
  assertEquals((await call({}, { op: "runtime" })).status, 403);
  assertEquals((await call({ "x-instagram-internal-key": "nope" }, { op: "runtime" })).status, 403);
  assertEquals(await internalCallerAllowed("eyJfake", env, (async () => new Response(null, { status: 401 })) as typeof fetch), false);
  const stale = { ...job, lease_token: crypto.randomUUID() };
  await assertRejects(() => w.studio.render(stale as Job, 1), Error, "instagram_lease_required");
  const big = await call({ "x-instagram-internal-key": KEY }, { op: "runtime", pad: "x".repeat(3000) });
  assertEquals(big.status, 413);
  const rt = await w.studio.runtime(true); assertEquals(rt, { release: true, ai: true, renderer: true });
});
