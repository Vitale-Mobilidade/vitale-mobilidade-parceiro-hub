/** Editorial admin API. Never deploy before the matching migration and role provisioning. */
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  autoRepairArticle, markdownToSections, slugifyEditorialTitle, VIDEO_META_RE,
  validateArticleForPublication, validBikeId, validEditorialSlug, validYoutubeId,
  type EditorialArticle, type EditorialVideo,
} from "../_shared/editorial-contract.ts";
import {
  completeEditorialDraft, detectContentType, detectEditorialBikes, EDITORIAL_OG_FALLBACK, layoutArticle,
  YOUTUBE_THUMBNAILS, youtubeThumbnailUrl, type BikeCandidate,
} from "../_shared/editorial-automation.ts";
import { SHEET_NAME_ALIASES } from "../_shared/bike-sheet.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const AI_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const ALLOWED = new Set([
  "https://vitalemobilidade.com", "https://www.vitalemobilidade.com",
  "http://localhost:5173", "http://localhost:8080", "http://127.0.0.1:8080",
]);
const PREVIEW = /^https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:lovable\.app|lovableproject\.com|lovableproject-dev\.com)$/i;
type Role = "admin" | "content" | "operation";
type Actor = { id: string; role: Role; email: string | null };
type Body = Record<string, unknown>;

function headers(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED.has(origin) || PREVIEW.test(origin) ? origin : "https://vitalemobilidade.com",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}
function json(req: Request, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...headers(req), "Content-Type": "application/json" } });
}
const str = (v: unknown, max = 10000): string => typeof v === "string" ? v.trim().slice(0, max) : "";
const arr = (v: unknown, max = 20): string[] => Array.isArray(v) ? v.filter(validBikeId).slice(0, max) : [];
const uuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const canContent = (a: Actor) => a.role === "admin" || a.role === "content";
const errorMessage = (e: unknown) => e instanceof Error ? e.message.slice(0, 180) : "unknown";
async function actorFor(db: SupabaseClient, req: Request): Promise<Actor | null> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (!token || token.length > 4000) return null;
  const { data: user, error } = await db.auth.getUser(token);
  if (error || !user.user) return null;
  const { data: member } = await db.from("editorial_admin_memberships")
    .select("role, active").eq("user_id", user.user.id).maybeSingle();
  if (!member?.active || !["admin", "content", "operation"].includes(member.role)) return null;
  return { id: user.user.id, role: member.role as Role, email: user.user.email ?? null };
}

async function log(db: SupabaseClient, actor: Actor, action: string, type: string, id: string, detail: Body = {}) {
  const { error } = await db.from("editorial_audit_logs").insert({
    actor: actor.id, action, entity_type: type, entity_id: id, detail,
  });
  if (error) console.error("[editorial-admin] audit write failed", error.code);
}

async function knownBikes(db: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await db.from("bikes").select("bike_id");
  if (error) throw new Error("bike_catalog_unavailable");
  return new Set((data ?? []).map((b) => b.bike_id as string));
}

async function bikeCandidates(db: SupabaseClient): Promise<BikeCandidate[]> {
  const { data, error } = await db.from("bikes").select("bike_id, name, image_url");
  if (error) throw new Error("bike_catalog_unavailable");
  return ((data ?? []) as BikeCandidate[]).map((bike) => ({ ...bike,
    aliases: Object.entries(SHEET_NAME_ALIASES).filter(([, id]) => id === bike.bike_id)
      .map(([alias]) => alias.replace(/_/g, " ")),
  }));
}

async function resolveThumbnail(id: string): Promise<{ url: string | null; variant: string | null }> {
  for (const option of YOUTUBE_THUMBNAILS) {
    const url = youtubeThumbnailUrl(id, option.name);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    try {
      const response = await fetch(url, { method: "HEAD", signal: controller.signal });
      const length = Number(response.headers.get("content-length"));
      if (response.ok && response.headers.get("content-type")?.startsWith("image/") &&
        (!Number.isFinite(length) || length >= 5000)) {
        return { url, variant: option.name };
      }
    } catch { /* Try the next resolution. */ }
    finally { clearTimeout(timer); }
  }
  return { url: null, variant: null };
}

function revisionSnapshot(article: EditorialArticle): Body {
  return { revision: article.revision, snapshot: {
    title: article.title, slug: article.slug, summary: article.summary,
    summarySourceExcerpt: article.summary_source_excerpt, blocks: article.blocks, faq: article.faq,
    seoTitle: article.seo_title, metaDescription: article.meta_description,
    ogTitle: article.og_title, ogDescription: article.og_description, ogImageUrl: article.og_image_url,
    primaryBikeId: article.primary_bike_id, relatedBikeIds: article.related_bike_ids,
    relatedArticleIds: article.related_article_ids,
  } };
}

async function videoById(db: SupabaseClient, videoId: string): Promise<EditorialVideo | null> {
  const { data, error } = await db.from("editorial_videos").select("*").eq("youtube_id", videoId).maybeSingle();
  if (error) throw new Error("video_read_failed");
  return data as EditorialVideo | null;
}

async function articleById(db: SupabaseClient, id: string): Promise<EditorialArticle | null> {
  const { data, error } = await db.from("editorial_articles").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("article_read_failed");
  return data as EditorialArticle | null;
}

async function validate(db: SupabaseClient, article: EditorialArticle): Promise<string[]> {
  const video = await videoById(db, article.video_id);
  if (!video || video.status !== "active") return ["Vídeo de origem ausente ou arquivado."];
  const errors = validateArticleForPublication(article, video.transcript ?? "", await knownBikes(db));
  if (article.related_article_ids.length) {
    const { data: related, error } = await db.from("editorial_articles")
      .select("id, status").in("id", article.related_article_ids);
    if (error || (related ?? []).length !== article.related_article_ids.length ||
      (related ?? []).some((r) => r.status !== "published" || r.id === article.id)) {
      errors.push("Artigo relacionado ausente, não publicado ou autorreferente.");
    }
  }
  return errors;
}

const RESPONSES_URL = "https://ai.gateway.lovable.dev/v1/responses";
const ARTICLE_MODEL = "openai/gpt-6-astra";

/** Streaming Responses call with a strict JSON schema; no timer abort (reasoning runs are long). */
async function aiStructured(system: string, user: string, name: string, schema: Body, onTick?: () => void): Promise<unknown> {
  if (!AI_KEY) throw new Error("ai_not_configured");
  const response = await fetch(RESPONSES_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": AI_KEY, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({ model: ARTICLE_MODEL, instructions: system, input: user, stream: true, store: false,
      reasoning: { effort: "low" }, text: { format: { type: "json_schema", name, strict: true, schema } } }),
  });
  if (!response.ok || !response.body) throw new Error(`ai_http_${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = ""; let text = ""; let last = Date.now();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut: number;
    while ((cut = buffer.indexOf("\n\n")) >= 0) {
      const chunk = buffer.slice(0, cut); buffer = buffer.slice(cut + 2);
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        let event: Body; try { event = JSON.parse(payload); } catch { continue; }
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") text += event.delta;
        if (event.type === "response.failed" || event.type === "error") throw new Error("ai_failed");
      }
    }
    if (onTick && Date.now() - last > 4000) { last = Date.now(); onTick(); }
  }
  if (!text.trim()) throw new Error("ai_empty_response");
  return JSON.parse(text);
}

const ARTICLE_SCHEMA: Body = {
  type: "object", additionalProperties: false,
  required: ["title", "summary", "seoTitle", "metaDescription", "ogTitle", "ogDescription", "sections", "faq", "standsAloneWithoutVideo"],
  properties: {
    title: { type: "string" }, summary: { type: "string" }, seoTitle: { type: "string" },
    metaDescription: { type: "string" }, ogTitle: { type: "string" }, ogDescription: { type: "string" },
    sections: { type: "array", items: { type: "object", additionalProperties: false, required: ["heading", "body"],
      properties: { heading: { type: "string" }, body: { type: "string" } } } },
    faq: { type: "array", items: { type: "object", additionalProperties: false, required: ["question", "answer"],
      properties: { question: { type: "string" }, answer: { type: "string" } } } },
    standsAloneWithoutVideo: { type: "boolean" },
  },
};
const REWRITE_SCHEMA: Body = {
  type: "object", additionalProperties: false, required: ["summary", "sections"],
  properties: { summary: { type: "string" }, sections: { type: "array", items: { type: "object", additionalProperties: false,
    required: ["heading", "body"], properties: { heading: { type: "string" }, body: { type: "string" } } } } },
};

async function activePrompt(db: SupabaseClient) {
  const { data, error } = await db.from("editorial_prompt_versions")
    .select("version, system_prompt, schema_version, model, created_at, change_reason")
    .order("version", { ascending: false }).limit(1).maybeSingle();
  if (error || !data) throw new Error("editorial_prompt_unavailable");
  return data;
}

async function currentOfferIds(db: SupabaseClient, ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const { data } = await db.from("bike_offers").select("bike_id").in("bike_id", ids).eq("is_current", true);
  return new Set((data ?? []).map((o) => o.bike_id as string));
}

async function relatedArticlesFor(db: SupabaseClient, articleId: string, bikeIds: string[], contentType: string): Promise<string[]> {
  const { data } = await db.from("editorial_articles")
    .select("id, primary_bike_id, related_bike_ids, content_type").eq("status", "published").limit(200);
  return (data ?? []).filter((a) => a.id !== articleId).map((a) => {
    const ids = [a.primary_bike_id, ...(a.related_bike_ids ?? [])].filter(Boolean) as string[];
    const shared = ids.filter((id) => bikeIds.includes(id)).length;
    return { id: a.id as string, score: shared * 10 + (a.content_type === contentType ? 1 : 0) };
  }).filter((a) => a.score >= 10).sort((a, b) => b.score - a.score).slice(0, 4).map((a) => a.id);
}

type Progress = (step: string) => void;

/** Full orchestration into an existing article row. Only transcript/IA/persistence failures are fatal. */
async function generateInto(db: SupabaseClient, actor: Actor, article: EditorialArticle, video: EditorialVideo, progress: Progress) {
  const prompt = await activePrompt(db);
  const { data: run, error: runError } = await db.from("editorial_compiler_runs").insert({
    article_id: article.id, kind: "article", status: "running", prompt_version: prompt.version,
    model: ARTICLE_MODEL, actor: actor.id,
  }).select("id").single();
  if (runError || !run) throw new Error("compiler_run_write_failed");
  try {
    progress("Identificando bikes…");
    const catalog = await bikeCandidates(db);
    const detection = detectEditorialBikes(video.title, video.transcript ?? "", catalog);
    const primaryBikeId = detection.primaryBikeId ?? video.primary_bike_id ?? null;
    const relatedBikeIds = [...new Set([...detection.relatedBikeIds, ...video.related_bike_ids])]
      .filter((id) => id !== primaryBikeId && catalog.some((bike) => bike.bike_id === id)).slice(0, 6);
    const bikeIds = [primaryBikeId, ...relatedBikeIds].filter(Boolean) as string[];
    const { data: bikes } = bikeIds.length ? await db.from("bikes")
      .select("bike_id, name, autonomy_km, motor_w, battery, capacity_people").in("bike_id", bikeIds) : { data: [] };
    const contentType = detectContentType(video.title);
    progress("Construindo artigo…");
    const source = JSON.stringify({
      videoTitle: video.title, contentType,
      bikes: (bikes ?? []).map((b) => ({ name: b.name, autonomiaKmCatalogo: b.autonomy_km, motorW: b.motor_w, lugares: b.capacity_people })),
      transcript: video.transcript?.slice(0, 90000),
    });
    const instruction = `Escreva o artigo completo. Responda no schema JSON. title = H1 editorial (pode reformular o título do YouTube, sem caixa alta nem emojis). summary = introdução independente de 2 a 4 frases que fala do assunto. sections = 5 a 9 seções com heading contextual e body em markdown (parágrafos, **negrito**, listas "- ", "> " para opinião marcante, "### " só para subseção real, tabela markdown quando comparar). A última seção é a conclusão prática. seoTitle 30-65 caracteres; metaDescription 110-160 caracteres; ogTitle e ogDescription curtos. faq só com perguntas realmente respondidas (ou []). standsAloneWithoutVideo = true somente se o artigo continuar completo sem o vídeo.`;
    const raw = await aiStructured(prompt.system_prompt, `${instruction}\n\n<untrusted_source_json>\n${source}\n</untrusted_source_json>`, "vitale_article", ARTICLE_SCHEMA, () => progress("Construindo artigo…")) as Body;
    let summary = str(raw.summary, 1500);
    let sections = (Array.isArray(raw.sections) ? raw.sections : []).map((s: Body) => ({ heading: str(s?.heading, 160), body: str(s?.body, 8000) }))
      .filter((s) => s.body);
    const needsRewrite = VIDEO_META_RE.test(summary) || sections.some((s) => VIDEO_META_RE.test(s.body));
    if (needsRewrite || raw.standsAloneWithoutVideo === false) {
      progress("Refinando texto…");
      const fixed = await aiStructured(prompt.system_prompt,
        `Reescreva summary e sections para que o texto fale do assunto e não do vídeo (remova "no vídeo", "o vídeo mostra", "durante o vídeo" etc.), mantendo fatos, headings, ordem e formatação. Responda no schema.\n\n${JSON.stringify({ summary, sections })}`,
        "vitale_rewrite", REWRITE_SCHEMA) as Body;
      const nextSections = (Array.isArray(fixed.sections) ? fixed.sections : []).map((s: Body) => ({ heading: str(s?.heading, 160), body: str(s?.body, 8000) })).filter((s) => s.body);
      if (nextSections.length >= 2) { sections = nextSections; summary = str(fixed.summary, 1500) || summary; }
    }
    progress("Conectando dados da Vitale…");
    const offerIds = await currentOfferIds(db, bikeIds);
    const relatedArticleIds = await relatedArticlesFor(db, article.id, bikeIds, contentType);
    const faq = (Array.isArray(raw.faq) ? raw.faq : []).map((f: Body) => ({ question: str(f?.question, 240), answer: str(f?.answer, 1200), sourceExcerpt: "" }));
    progress("Preparando SEO…");
    const videoImage = video.thumbnail_url?.startsWith("https://") ? video.thumbnail_url : null;
    const bikeImage = catalog.find((item) => item.bike_id === primaryBikeId)?.image_url ?? null;
    const editorialImage = article.og_image_url && article.og_image_url !== EDITORIAL_OG_FALLBACK &&
      !article.og_image_url.includes("i.ytimg.com") && article.og_image_url !== bikeImage ? article.og_image_url : null;
    const title = str(raw.title, 200) || video.title;
    const layout = completeEditorialDraft({
      title, slug: article.slug, summary, seoTitle: str(raw.seoTitle, 90), metaDescription: str(raw.metaDescription, 200),
      ogTitle: str(raw.ogTitle, 160), ogDescription: str(raw.ogDescription, 300),
      blocks: sections.map((s) => ({ type: "text" as const, heading: s.heading, text: s.body })), faq,
      videoId: video.youtube_id, bikeId: primaryBikeId, relatedBikeIds, contentType, offerBikeIds: offerIds,
      ogImageUrl: editorialImage || videoImage || bikeImage || EDITORIAL_OG_FALLBACK, relatedArticleIds,
    });
    progress("Finalizando página…");
    const repaired = autoRepairArticle({ ...layout, summary }, EDITORIAL_OG_FALLBACK);
    const candidate = { ...article, ...repaired, primary_bike_id: primaryBikeId, related_bike_ids: relatedBikeIds } as EditorialArticle;
    const errors = validateArticleForPublication(candidate, video.transcript ?? "", new Set(catalog.map((b) => b.bike_id)));
    if (errors.length) throw new Error("article_not_reliable");
    const { data: saved, error } = await db.from("editorial_articles").update({
      title: repaired.title, slug: repaired.slug, summary: repaired.summary, summary_source_excerpt: "",
      blocks: repaired.blocks, faq: repaired.faq, seo_title: repaired.seo_title, meta_description: repaired.meta_description,
      og_title: repaired.og_title, og_description: repaired.og_description, og_image_url: repaired.og_image_url,
      related_article_ids: relatedArticleIds, primary_bike_id: primaryBikeId, related_bike_ids: relatedBikeIds,
      content_type: contentType, indexable: true, status: "draft", validation_errors: [],
      prompt_version: prompt.version, model: ARTICLE_MODEL, updated_by: actor.id,
    }).eq("id", article.id).eq("revision", article.revision).select("*").maybeSingle();
    if (error || !saved) throw new Error("article_persist_failed");
    await log(db, actor, "article_revision", "article", article.id, revisionSnapshot(article));
    await db.from("editorial_compiler_runs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", run.id);
    await log(db, actor, "article_generated", "article", article.id, { promptVersion: prompt.version, bikes: bikeIds.length, rewrite: needsRewrite });
    return saved as EditorialArticle;
  } catch (e) {
    await db.from("editorial_compiler_runs").update({ status: "failed", error_code: errorMessage(e), completed_at: new Date().toISOString() }).eq("id", run.id);
    await log(db, actor, "generation_failed", "article", article.id, { code: errorMessage(e) });
    throw e;
  }
}

async function saveVideo(db: SupabaseClient, actor: Actor, id: string, title: string, transcript: string) {
  const catalog = await bikeCandidates(db);
  const existing = await videoById(db, id);
  const effectiveTranscript = transcript || existing?.transcript || "";
  const detection = detectEditorialBikes(title, effectiveTranscript, catalog);
  if (existing && transcript && transcript !== (existing.transcript ?? "")) {
    const { count } = await db.from("editorial_articles").select("id", { count: "exact", head: true })
      .eq("video_id", id).eq("status", "published");
    if (count) return { error: "Este vídeo já tem artigo publicado. Mude o artigo para Rascunho antes de trocar a transcrição." };
  }
  const thumbnail = await resolveThumbnail(id);
  const { data, error } = await db.from("editorial_videos").upsert({
    youtube_id: id, title, youtube_url: `https://www.youtube.com/watch?v=${id}`,
    thumbnail_url: thumbnail.url ?? existing?.thumbnail_url ?? null,
    published_on: existing?.published_on ?? null, transcript: effectiveTranscript || null,
    primary_bike_id: detection.primaryBikeId ?? existing?.primary_bike_id ?? null,
    related_bike_ids: detection.relatedBikeIds, content_type: detectContentType(title), status: "active",
    created_by: existing ? undefined : actor.id, updated_by: actor.id, updated_at: new Date().toISOString(),
  }, { onConflict: "youtube_id" }).select("*").single();
  if (error || !data) throw new Error("video_save_failed");
  return { video: data as EditorialVideo };
}

function generateStream(req: Request, db: SupabaseClient, actor: Actor, body: Body): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (v: Body) => controller.enqueue(encoder.encode(`${JSON.stringify(v)}\n`));
      const fail = (message = "Não conseguimos gerar o artigo. Tente novamente.") => { send({ type: "error", message }); controller.close(); };
      try {
        const id = body.youtubeId; const title = str(body.title, 300); const transcript = str(body.transcript, 500_000);
        if (!validYoutubeId(id)) return fail("URL do YouTube inválida.");
        if (title.length < 3) return fail("Informe o título do vídeo.");
        send({ type: "progress", step: "Entendendo conteúdo…" });
        const saved = await saveVideo(db, actor, id, title, transcript);
        if ("error" in saved) return fail(saved.error);
        if ((saved.video.transcript ?? "").trim().length < 200) return fail("Cole a transcrição completa do vídeo.");
        const { data: previous } = await db.from("editorial_articles").select("*").eq("video_id", id)
          .neq("status", "archived").order("updated_at", { ascending: false }).limit(1).maybeSingle();
        let article = previous as EditorialArticle | null;
        if (article?.status === "published") { send({ type: "done", article, reused: true }); controller.close(); return; }
        if (!article) {
          const initial = { video_id: id, title, slug: slugifyEditorialTitle(title), content_type: detectContentType(title),
            og_image_url: saved.video.thumbnail_url, created_by: actor.id, updated_by: actor.id };
          let { data, error } = await db.from("editorial_articles").insert(initial).select("*").single();
          if (error?.code === "23505") ({ data, error } = await db.from("editorial_articles")
            .insert({ ...initial, slug: `${initial.slug.slice(0, 100)}-${id.toLowerCase()}` }).select("*").single());
          if (error || !data) throw new Error("article_create_failed");
          article = data as EditorialArticle;
        }
        const result = await generateInto(db, actor, article, saved.video, (step) => send({ type: "progress", step }));
        send({ type: "done", article: result }); controller.close();
      } catch (e) {
        console.error("[editorial-admin] generate", errorMessage(e));
        fail();
      }
    },
  });
  return new Response(stream, { headers: { ...headers(req), "Content-Type": "application/x-ndjson" } });
}

async function rebuildLayout(db: SupabaseClient, article: EditorialArticle, sections: EditorialArticle["blocks"], overrides: Partial<EditorialArticle>) {
  const primary = overrides.primary_bike_id !== undefined ? overrides.primary_bike_id : article.primary_bike_id;
  const related = overrides.related_bike_ids ?? article.related_bike_ids;
  const ids = [primary, ...related].filter(Boolean) as string[];
  const blocks = layoutArticle({ sections, videoId: article.video_id, bikeId: primary, relatedBikeIds: related,
    contentType: article.content_type, offerBikeIds: await currentOfferIds(db, ids), hasFaq: (overrides.faq ?? article.faq).length > 0 });
  return autoRepairArticle({ ...article, ...overrides, blocks }, EDITORIAL_OG_FALLBACK);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: headers(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);
  if (!SUPABASE_URL || !SERVICE_KEY) return json(req, { error: "not_configured" }, 503);
  if (Number(req.headers.get("content-length") ?? 0) > 1_500_000) return json(req, { error: "request_too_large" }, 413);
  let body: Body;
  try { body = await req.json(); } catch { return json(req, { error: "invalid_json" }, 400); }
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const actor = await actorFor(db, req);
  if (!actor) return json(req, { error: "Acesso não autorizado." }, 403);
  const action = str(body.action, 40);
  try {
    if (action === "session") return json(req, { role: actor.role, email: actor.email });
    if (action === "overview") {
      const [bikes, sync, videos, videosWithTranscript, articles, failures] = await Promise.all([
        db.from("bikes").select("bike_id", { count: "exact", head: true }),
        db.from("bike_catalog_sync_state").select("last_success_at, last_attempt_at, status, error_message").eq("id", "current").maybeSingle(),
        db.from("editorial_videos").select("youtube_id", { count: "exact", head: true }),
        db.from("editorial_videos").select("youtube_id", { count: "exact", head: true }).not("transcript", "is", null),
        db.from("editorial_articles").select("status, video_id"),
        db.from("editorial_compiler_runs").select("id", { count: "exact", head: true }).eq("status", "failed"),
      ]);
      return json(req, { bikes: bikes.count ?? 0, sync: sync.data, videos: videos.count ?? 0,
        videosWithTranscript: videosWithTranscript.count ?? 0,
        videosWithArticle: new Set((articles.data ?? []).map((article) => article.video_id).filter(Boolean)).size,
        articles: (articles.data ?? []).reduce((a: Body, x) => { a[x.status] = Number(a[x.status] ?? 0) + 1; return a; }, {}),
        generationErrors: failures.count ?? 0 });
    }
    if (action === "growth") {
      if (actor.role !== "admin") return json(req, { error: "Somente Admin pode ler dados de Growth." }, 403);
      const requestedDays = Number(body.rangeDays);
      const rangeDays = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
      const since = new Date(Date.now() - rangeDays * 86_400_000).toISOString();
      const [started, completed, clickers, clickerRows, originRows] = await Promise.all([
        db.from("quiz_leads").select("id", { count: "exact", head: true }).gte("created_at", since),
        db.from("quiz_leads").select("id", { count: "exact", head: true }).gte("completed_at", since),
        db.from("quiz_leads").select("id", { count: "exact", head: true }).gte("clicked_at", since),
        db.from("quiz_leads").select("id, name, phone, clicked_bike_name, clicked_bike_position, clicked_at, buy_click_count")
          .gte("clicked_at", since).order("clicked_at", { ascending: false }).limit(2000),
        db.from("quiz_leads").select("traffic_origin, utm_source, landing_path").gte("created_at", since).limit(2000),
      ]);
      const failed = [started, completed, clickers, clickerRows, originRows].find((result) => result.error);
      if (failed?.error) throw new Error(`growth_read_failed:${failed.error.code ?? "unknown"}`);
      const bikeCounts = new Map<string, number>();
      let purchaseClicks = 0;
      for (const row of clickerRows.data ?? []) {
        const clicks = Math.max(1, Number(row.buy_click_count) || 0);
        const name = str(row.clicked_bike_name, 160) || "Bike não identificada";
        purchaseClicks += clicks;
        bikeCounts.set(name, (bikeCounts.get(name) ?? 0) + clicks);
      }
      const originCounts = new Map<string, number>();
      for (const row of originRows.data ?? []) {
        const name = str(row.traffic_origin, 120) || str(row.utm_source, 120) || str(row.landing_path, 180) || "Direto / não identificado";
        originCounts.set(name, (originCounts.get(name) ?? 0) + 1);
      }
      const top = (counts: Map<string, number>, key: "clicks" | "leads") => [...counts.entries()]
        .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, [key]: value }));
      return json(req, {
        rangeDays, generatedAt: new Date().toISOString(),
        quiz: { started: started.count ?? 0, completed: completed.count ?? 0,
          purchaseClicks, identifiedClickers: clickers.count ?? 0 },
        topBikes: top(bikeCounts, "clicks"), origins: top(originCounts, "leads"),
        recentClickers: (clickerRows.data ?? []).slice(0, 50).map((row) => ({
          id: row.id, name: row.name, phone: row.phone, bike: row.clicked_bike_name,
          position: row.clicked_bike_position, clickedAt: row.clicked_at,
        })),
        coverage: { pageViews: "external_analytics_not_connected", sitewideAffiliateClicks: "gtm_only", identifiedClicks: "quiz_supabase" },
      });
    }
    if (action === "bikes") {
      const [bikes, offers] = await Promise.all([
        db.from("bikes").select("bike_id, slug, name, image_url, autonomy_km, motor_w, battery, capacity_people, updated_at").order("name"),
        db.from("bike_offers").select("bike_id, price, url, verified_at, synced_at, is_current, ended_at, end_reason").eq("is_current", true),
      ]);
      if (bikes.error || offers.error) throw new Error("bikes_read_failed");
      return json(req, { bikes: bikes.data ?? [], offers: offers.data ?? [] });
    }
    if (action === "videos") {
      if (!canContent(actor)) return json(req, { error: "Sem permissão editorial." }, 403);
      const { data, error } = await db.from("editorial_videos").select("*").order("updated_at", { ascending: false }).limit(500);
      if (error) throw new Error("videos_read_failed");
      return json(req, { videos: data ?? [] });
    }
    if (action === "editorial-workspace") {
      if (!canContent(actor)) return json(req, { error: "Sem permissão editorial." }, 403);
      const [videos, articles] = await Promise.all([
        db.from("editorial_videos").select("*").order("updated_at", { ascending: false }).limit(500),
        db.from("editorial_articles")
          .select("id, title, slug, status, content_type, video_id, primary_bike_id, updated_at, published_at, validation_errors")
          .order("updated_at", { ascending: false }).limit(300),
      ]);
      if (videos.error || articles.error) throw new Error("editorial_workspace_read_failed");
      return json(req, { videos: videos.data ?? [], articles: articles.data ?? [] });
    }
    if (action === "video-save") {
      if (!canContent(actor)) return json(req, { error: "Sem permissão editorial." }, 403);
      const id = body.youtubeId;
      if (!validYoutubeId(id)) return json(req, { error: "YouTube ID inválido." }, 400);
      const title = str(body.title, 300);
      const transcript = str(body.transcript, 500_000);
      const catalog = await bikeCandidates(db);
      const known = new Set(catalog.map((bike) => bike.bike_id));
      const existing = await videoById(db, id);
      const effectiveTranscript = transcript || existing?.transcript || "";
      const detection = detectEditorialBikes(title, effectiveTranscript, catalog);
      const primaryBikeId = validBikeId(body.primaryBikeId) ? body.primaryBikeId :
        detection.primaryBikeId ?? existing?.primary_bike_id ?? null;
      const bikeIds = body.relatedBikeIds === undefined
        ? [...new Set([...detection.relatedBikeIds, ...(existing?.related_bike_ids ?? [])])].filter((bikeId) => bikeId !== primaryBikeId)
        : arr(body.relatedBikeIds);
      if (title.length < 3 || (primaryBikeId && !known.has(primaryBikeId)) || bikeIds.some((v) => !known.has(v))) {
        return json(req, { error: "Título ou relação de bike inválida." }, 400);
      }
      if (existing && ((transcript && transcript !== (existing.transcript ?? "")) || body.archived === true)) {
        const { count, error: articlesError } = await db.from("editorial_articles")
          .select("id", { count: "exact", head: true })
          .eq("video_id", id).eq("status", "published");
        if (articlesError) throw new Error("video_article_dependency_read_failed");
        if (count) return json(req, { error: "Despublique os artigos ligados a este vídeo antes de alterar sua transcrição ou arquivá-lo." }, 409);
      }
      const thumbnail = await resolveThumbnail(id);
      const { data, error } = await db.from("editorial_videos").upsert({
        youtube_id: id, title, youtube_url: `https://www.youtube.com/watch?v=${id}`,
        thumbnail_url: thumbnail.url ?? existing?.thumbnail_url ?? null,
        published_on: /^\d{4}-\d{2}-\d{2}$/.test(str(body.date, 10)) ? body.date : existing?.published_on ?? null,
        transcript: effectiveTranscript || null, primary_bike_id: primaryBikeId, related_bike_ids: bikeIds,
        content_type: ["test", "comparison", "guide", "tips", "economy", "other"].includes(str(body.contentType))
          ? body.contentType : detectContentType(title),
        status: body.archived === true ? "archived" : "active",
        created_by: existing?.youtube_id ? undefined : actor.id, updated_by: actor.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "youtube_id" }).select("*").single();
      if (error) throw new Error("video_save_failed");
      await log(db, actor, existing ? "video_updated" : "video_imported", "video", id,
        { hasTranscript: !!effectiveTranscript, thumbnailVariant: thumbnail.variant ?? "unavailable_fallback_required", ambiguousBike: detection.ambiguous });
      return json(req, { video: data, bikeDetection: detection, thumbnailVariant: thumbnail.variant });
    }
    if (action === "articles") {
      if (!canContent(actor)) return json(req, { error: "Sem permissão editorial." }, 403);
      const { data, error } = await db.from("editorial_articles")
        .select("id, title, slug, status, content_type, video_id, primary_bike_id, updated_at, published_at, validation_errors")
        .order("updated_at", { ascending: false }).limit(300);
      if (error) throw new Error("articles_read_failed");
      return json(req, { articles: data ?? [] });
    }
    if (action === "article-get") {
      if (!canContent(actor) || !uuid(body.id)) return json(req, { error: "Sem permissão ou ID inválido." }, 403);
      const article = await articleById(db, body.id);
      if (!article) return json(req, { error: "Artigo não encontrado." }, 404);
      return json(req, { article, video: await videoById(db, article.video_id) });
    }
    if (action === "article-revisions") {
      if (!canContent(actor) || !uuid(body.id)) return json(req, { error: "Sem permissão ou ID inválido." }, 403);
      const { data, error } = await db.from("editorial_audit_logs")
        .select("id, created_at, actor, detail").eq("entity_type", "article")
        .eq("entity_id", body.id).eq("action", "article_revision")
        .order("created_at", { ascending: false }).limit(30);
      if (error) throw new Error("article_revisions_read_failed");
      return json(req, { revisions: (data ?? []).map(({ id, created_at, actor, detail }) => ({
        id, createdAt: created_at, actor, revision: detail?.revision,
      })) });
    }
    if (action === "article-create") {
      if (!canContent(actor) || !validYoutubeId(body.videoId)) return json(req, { error: "Vídeo inválido ou sem permissão." }, 403);
      const video = await videoById(db, body.videoId);
      if (!video || video.status !== "active") return json(req, { error: "Vídeo não cadastrado." }, 422);
      const { data: previous, error: previousError } = await db.from("editorial_articles")
        .select("*").eq("video_id", video.youtube_id).neq("status", "archived")
        .order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (previousError) throw new Error("article_lookup_failed");
      if (previous) return json(req, { article: previous, reused: true });
      const title = str(body.title, 200) || video.title;
      const bike = video.primary_bike_id ? (await db.from("bikes").select("image_url")
        .eq("bike_id", video.primary_bike_id).maybeSingle()).data : null;
      const initial = {
        video_id: video.youtube_id, title, slug: slugifyEditorialTitle(title),
        primary_bike_id: video.primary_bike_id, related_bike_ids: video.related_bike_ids,
        og_image_url: video.thumbnail_url || bike?.image_url || EDITORIAL_OG_FALLBACK,
        content_type: video.content_type, created_by: actor.id, updated_by: actor.id,
      };
      let { data, error } = await db.from("editorial_articles").insert(initial).select("*").single();
      if (error?.code === "23505") {
        const uniqueSlug = `${slugifyEditorialTitle(title).slice(0, 100)}-${video.youtube_id.toLowerCase()}`;
        ({ data, error } = await db.from("editorial_articles").insert({ ...initial, slug: uniqueSlug }).select("*").single());
      }
      if (error || !data) return json(req, { error: "Não foi possível criar o artigo." }, 409);
      return json(req, { article: data });
    }
    if (action === "generate") {
      if (!canContent(actor)) return json(req, { error: "Sem permissão editorial." }, 403);
      return generateStream(req, db, actor, body);
    }
    if (action === "article-save") {
      // Simple edit: title, intro and continuous body. Works for drafts and published articles alike.
      if (!canContent(actor) || !uuid(body.id)) return json(req, { error: "Sem permissão ou ID inválido." }, 403);
      const old = await articleById(db, body.id);
      if (!old) return json(req, { error: "Artigo não encontrado." }, 404);
      const sections = markdownToSections(str(body.body, 60000));
      if (sections.length < 2) return json(req, { error: "O corpo do artigo precisa de pelo menos dois trechos." }, 400);
      const overrides: Partial<EditorialArticle> = { title: str(body.title, 200) || old.title, summary: str(body.summary, 1500) };
      if (body.advanced && typeof body.advanced === "object") {
        const a = body.advanced as Body;
        if (validEditorialSlug(a.slug)) overrides.slug = a.slug;
        if (typeof a.seoTitle === "string") overrides.seo_title = str(a.seoTitle, 70);
        if (typeof a.metaDescription === "string") overrides.meta_description = str(a.metaDescription, 170);
        if (/^https:\/\//.test(str(a.ogImageUrl, 1000))) overrides.og_image_url = str(a.ogImageUrl, 1000);
        const known = await knownBikes(db);
        if (a.primaryBikeId === "" || a.primaryBikeId === null) overrides.primary_bike_id = null;
        else if (validBikeId(a.primaryBikeId) && known.has(a.primaryBikeId)) overrides.primary_bike_id = a.primaryBikeId;
        if (Array.isArray(a.relatedBikeIds)) overrides.related_bike_ids = arr(a.relatedBikeIds).filter((id) => known.has(id) && id !== (overrides.primary_bike_id ?? old.primary_bike_id));
        if (typeof a.indexable === "boolean") overrides.indexable = a.indexable;
      }
      const next = await rebuildLayout(db, old, sections, overrides);
      const { data, error } = await db.from("editorial_articles").update({
        title: next.title, slug: next.slug, summary: next.summary, blocks: next.blocks, faq: next.faq,
        seo_title: next.seo_title, meta_description: next.meta_description, og_title: next.og_title,
        og_description: next.og_description, og_image_url: next.og_image_url,
        primary_bike_id: next.primary_bike_id, related_bike_ids: next.related_bike_ids, indexable: next.indexable,
        validation_errors: [], updated_by: actor.id,
      }).eq("id", old.id).eq("revision", Number(body.revision)).select("*").maybeSingle();
      if (error || !data) return json(req, { error: "O artigo foi alterado em outra aba. Recarregue a página." }, 409);
      await log(db, actor, "article_revision", "article", old.id, revisionSnapshot(old));
      await log(db, actor, "article_edited", "article", old.id);
      return json(req, { article: data });
    }
    if (action === "article-status") {
      if (!canContent(actor) || !uuid(body.id)) return json(req, { error: "Sem permissão ou ID inválido." }, 403);
      const target = str(body.status, 20);
      if (!["draft", "published", "archived"].includes(target)) return json(req, { error: "Status inválido." }, 400);
      const article = await articleById(db, body.id);
      if (!article) return json(req, { error: "Artigo não encontrado." }, 404);
      let patch: Body = { status: target, updated_by: actor.id };
      if (target === "published") {
        // Automatic QA immediately before going live; only an empty/unreliable article is refused.
        const bikeIds = [article.primary_bike_id, ...article.related_bike_ids].filter(Boolean) as string[];
        const related = await relatedArticlesFor(db, article.id, bikeIds, article.content_type);
        const repaired = await rebuildLayout(db, article, article.blocks.filter((b) => b.type === "text"), {});
        const video = await videoById(db, article.video_id);
        const errors = validateArticleForPublication(repaired, video?.transcript ?? "", await knownBikes(db));
        if (errors.length) return json(req, { error: "Este artigo ainda não tem conteúdo suficiente para ir ao ar. Use Regenerar artigo." }, 422);
        patch = { ...patch, title: repaired.title, slug: repaired.slug, summary: repaired.summary, blocks: repaired.blocks,
          faq: repaired.faq, seo_title: repaired.seo_title, meta_description: repaired.meta_description,
          og_title: repaired.og_title, og_description: repaired.og_description, og_image_url: repaired.og_image_url,
          related_article_ids: related, indexable: true, validation_errors: [], published_by: actor.id };
      } else if (target === "archived") patch.indexable = false;
      let { data, error } = await db.from("editorial_articles").update(patch)
        .eq("id", article.id).eq("revision", Number(body.revision)).select("*").maybeSingle();
      if (error?.code === "23505" && target === "published") {
        ({ data, error } = await db.from("editorial_articles").update({ ...patch, slug: `${String(patch.slug).slice(0, 100)}-${article.video_id.toLowerCase()}` })
          .eq("id", article.id).eq("revision", Number(body.revision)).select("*").maybeSingle());
      }
      if (error || !data) return json(req, { error: "Não foi possível alterar o status. Recarregue a página e tente novamente." }, 409);
      return json(req, { article: data });
    }
    if (action === "compile-article") {
      // "Regenerar artigo": same orchestration as the first generation, into the same draft.
      if (!canContent(actor) || !uuid(body.id)) return json(req, { error: "Sem permissão editorial." }, 403);
      const article = await articleById(db, body.id);
      if (!article) return json(req, { error: "Artigo não encontrado." }, 404);
      if (article.status === "published") return json(req, { error: "Mude para Rascunho antes de regenerar." }, 409);
      const video = await videoById(db, article.video_id);
      if (!video || (video.transcript ?? "").trim().length < 200) return json(req, { error: "Não conseguimos gerar o artigo. Tente novamente." }, 422);
      try { return json(req, { article: await generateInto(db, actor, article, video, () => {}) }); }
      catch { return json(req, { error: "Não conseguimos gerar o artigo. Tente novamente." }, 422); }
    }
    if (["archive-article", "delete-article"].includes(action)) {
      if (!canContent(actor) || !uuid(body.id)) return json(req, { error: "Sem permissão ou ID inválido." }, 403);
      const article = await articleById(db, body.id);
      if (!article) return json(req, { error: "Artigo não encontrado." }, 404);
      if (action === "delete-article") {
        if (actor.role !== "admin" || article.status !== "archived" || body.confirm !== article.slug) {
          return json(req, { error: "Exclusão exige Admin, artigo arquivado e confirmação do endereço." }, 403);
        }
        const { data: references, error: referencesError } = await db.from("editorial_articles")
          .select("id").contains("related_article_ids", [article.id]).limit(1);
        if (referencesError) throw new Error("article_dependency_read_failed");
        if (references?.length) return json(req, { error: "Outro artigo aponta para este conteúdo." }, 409);
        const { error, count } = await db.from("editorial_articles").delete({ count: "exact" })
          .eq("id", article.id).eq("status", "archived").eq("revision", Number(body.revision));
        if (error) throw new Error("article_delete_failed");
        if (count !== 1) return json(req, { error: "O artigo mudou. Recarregue antes de excluir." }, 409);
        await log(db, actor, "article_deleted", "article", article.id, { slug: article.slug });
        return json(req, { ok: true });
      }
      const { data, error } = await db.from("editorial_articles").update({ status: "archived", indexable: false, updated_by: actor.id })
        .eq("id", article.id).eq("revision", Number(body.revision)).select("*").maybeSingle();
      if (error || !data) return json(req, { error: "O artigo mudou. Recarregue antes de alterar o estado." }, 409);
      return json(req, { article: data });
    }
    if (action === "ai-status") {
      if (!canContent(actor)) return json(req, { error: "Sem permissão editorial." }, 403);
      const [prompt, runs] = await Promise.all([
        activePrompt(db), db.from("editorial_compiler_runs")
          .select("id, article_id, kind, status, prompt_version, model, error_code, started_at, completed_at")
          .order("started_at", { ascending: false }).limit(30),
      ]);
      return json(req, { prompt: { version: prompt.version, model: prompt.model, schemaVersion: prompt.schema_version,
        createdAt: prompt.created_at, changeReason: prompt.change_reason,
        ...(actor.role === "admin" ? { systemPrompt: prompt.system_prompt } : {}) }, runs: runs.data ?? [] });
    }
    if (action === "prompt-create") {
      if (actor.role !== "admin") return json(req, { error: "Somente Admin pode alterar prompts." }, 403);
      const previous = await activePrompt(db);
      const systemPrompt = str(body.systemPrompt, 12000);
      const reason = str(body.reason, 500);
      if (systemPrompt.length < 100 || reason.length < 10) return json(req, { error: "Prompt e motivo são obrigatórios." }, 400);
      const { error } = await db.from("editorial_prompt_versions").insert({
        version: previous.version + 1, system_prompt: systemPrompt,
        schema_version: previous.schema_version, model: previous.model,
        change_reason: reason, changed_by: actor.id,
      });
      if (error) throw new Error("prompt_version_failed");
      await log(db, actor, "prompt_version_created", "prompt", String(previous.version + 1), { previous: previous.version, reason });
      return json(req, { version: previous.version + 1 });
    }
    if (action === "logs") {
      if (actor.role !== "admin") return json(req, { error: "Somente Admin pode ler logs." }, 403);
      const { data, error } = await db.from("editorial_audit_logs")
        .select("id, actor, action, entity_type, entity_id, detail, created_at")
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw new Error("logs_read_failed");
      return json(req, { logs: data ?? [] });
    }
    if (action === "sync-now") {
      // Intentionally not proxied: the existing bike-panel remains the sole manual-sync owner.
      return json(req, { error: "Use o painel de bikes existente para sincronizar a planilha." }, 409);
    }
    return json(req, { error: "Ação desconhecida." }, 400);
  } catch (e) {
    console.error("[editorial-admin]", errorMessage(e));
    return json(req, { error: "Falha na operação administrativa." }, 500);
  }
});
