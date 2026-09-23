/** Editorial admin API. Never deploy before the matching migration and role provisioning. */
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  parseArticleBlocks, parseCompilerOutput, parseFaq, slugifyEditorialTitle,
  validateArticleForPublication, validBikeId, validEditorialSlug, validYoutubeId,
  type EditorialArticle, type EditorialVideo,
} from "../_shared/editorial-contract.ts";

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

async function aiJson(model: string, system: string, user: string): Promise<unknown> {
  if (!AI_KEY) throw new Error("ai_not_configured");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);
  try {
    const response = await fetch(AI_URL, {
      method: "POST", signal: controller.signal,
      headers: { Authorization: `Bearer ${AI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, temperature: 0.1, response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
    });
    if (!response.ok) throw new Error(`ai_http_${response.status}`);
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("ai_empty_response");
    return JSON.parse(content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
  } finally { clearTimeout(timer); }
}

async function activePrompt(db: SupabaseClient) {
  const { data, error } = await db.from("editorial_prompt_versions")
    .select("version, system_prompt, schema_version, model, created_at, change_reason")
    .order("version", { ascending: false }).limit(1).maybeSingle();
  if (error || !data) throw new Error("editorial_prompt_unavailable");
  return data;
}

async function compile(db: SupabaseClient, actor: Actor, body: Body) {
  if (!uuid(body.id)) return { status: 400, data: { error: "ID inválido." } };
  const article = await articleById(db, body.id);
  if (!article) return { status: 404, data: { error: "Artigo não encontrado." } };
  if (article.status === "published" || article.status === "archived") return { status: 409, data: { error: "Despublique ou restaure antes de gerar." } };
  const video = await videoById(db, article.video_id);
  if (!video || (video.transcript ?? "").trim().length < 200) {
    return { status: 422, data: { error: "Cadastre a transcrição do vídeo antes de gerar." } };
  }
  const prompt = await activePrompt(db);
  const kind = body.action === "regenerate-block" ? "block" : "article";
  const index = Number(body.index);
  if (kind === "block" && (!Number.isInteger(index) || index < 0 || index >= article.blocks.length)) {
    return { status: 400, data: { error: "Bloco inválido." } };
  }
  const { data: recent } = await db.from("editorial_compiler_runs").select("id, started_at, status")
    .eq("article_id", article.id).order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (recent && Date.now() - new Date(recent.started_at).getTime() < (recent.status === "running" ? 120000 : 45000)) {
    return { status: 429, data: { error: "Aguarde antes de solicitar outra geração." } };
  }
  const { data: run, error: runError } = await db.from("editorial_compiler_runs").insert({
    article_id: article.id, kind, status: "running", prompt_version: prompt.version,
    model: prompt.model, actor: actor.id,
  }).select("id").single();
  if (runError || !run) throw new Error("compiler_run_write_failed");
  try {
    const { data: bike } = article.primary_bike_id
      ? await db.from("bikes").select("bike_id, name, autonomy_km, motor_w, battery, capacity_people")
        .eq("bike_id", article.primary_bike_id).maybeSingle()
      : { data: null };
    const { data: related } = await db.from("editorial_articles")
      .select("id, title, slug").eq("status", "published").limit(12);
    const source = JSON.stringify({
      video: { youtubeId: video.youtube_id, title: video.title, date: video.published_on,
        url: video.youtube_url, transcript: video.transcript?.slice(0, 90000) },
      bike, relatedArticles: related ?? [],
      allowedBikeIds: [...await knownBikes(db)],
      currentArticle: kind === "block" ? { title: article.title, blocks: article.blocks, index } : undefined,
    });
    const instruction = kind === "block"
      ? "Reescreva APENAS o bloco solicitado. Responda JSON {\"block\":{\"type\",\"heading\",\"text\",\"sourceExcerpt\",\"bikeId\",\"videoId\"}}. Preserve o tipo."
      : "Produza JSON {title,slug,summary,summarySourceExcerpt,seoTitle,metaDescription,ogTitle,ogDescription,blocks,faq,relatedBikeIds}. O resumo exige summarySourceExcerpt literal da transcrição. Cada bloco factual de texto e FAQ precisa de sourceExcerpt copiado literalmente da transcrição. Use apenas IDs fornecidos. Nenhuma URL afiliada. Inclua vídeo e conteúdo útil, sem inventar teste, medição, opinião, preço ou conclusão.";
    const raw = await aiJson(prompt.model, prompt.system_prompt, `${instruction}\n\n<untrusted_source_json>\n${source}\n</untrusted_source_json>`);
    let patch: Body;
    if (kind === "block") {
      const replacement = parseArticleBlocks([(raw as Body)?.block])[0];
      if (!replacement || replacement.type !== article.blocks[index]?.type) throw new Error("invalid_block_output");
      const blocks = [...article.blocks]; blocks[index] = replacement;
      patch = { blocks };
    } else {
      const parsed = parseCompilerOutput(raw);
      if (!parsed) throw new Error("invalid_article_output");
      patch = parsed;
    }
    const candidate = { ...article, ...patch } as EditorialArticle;
    const errors = await validate(db, candidate);
    const { data: saved, error } = await db.from("editorial_articles").update({
      ...patch, validation_errors: errors, status: errors.length ? "validation_error" : "generated",
      prompt_version: prompt.version, model: prompt.model, updated_by: actor.id,
    }).eq("id", article.id).eq("revision", article.revision).select("*").maybeSingle();
    if (error || !saved) throw new Error("article_revision_conflict");
    await db.from("editorial_compiler_runs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", run.id);
    await log(db, actor, kind === "block" ? "block_regenerated" : "article_generated", "article", article.id,
      { promptVersion: prompt.version, validationErrorCount: errors.length });
    return { status: 200, data: { article: saved, errors } };
  } catch (e) {
    await db.from("editorial_compiler_runs").update({ status: "failed", error_code: errorMessage(e), completed_at: new Date().toISOString() }).eq("id", run.id);
    await log(db, actor, "generation_failed", "article", article.id, { code: errorMessage(e) });
    return { status: 422, data: { error: "Geração não concluída. O artigo anterior foi preservado.", code: errorMessage(e) } };
  }
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
      const [bikes, sync, videos, articles, failures] = await Promise.all([
        db.from("bikes").select("bike_id", { count: "exact", head: true }),
        db.from("bike_catalog_sync_state").select("last_success_at, last_attempt_at, status, error_message").eq("id", "current").maybeSingle(),
        db.from("editorial_videos").select("youtube_id", { count: "exact", head: true }),
        db.from("editorial_articles").select("status"),
        db.from("editorial_compiler_runs").select("id", { count: "exact", head: true }).eq("status", "failed"),
      ]);
      return json(req, { bikes: bikes.count ?? 0, sync: sync.data, videos: videos.count ?? 0,
        articles: (articles.data ?? []).reduce((a: Body, x) => { a[x.status] = Number(a[x.status] ?? 0) + 1; return a; }, {}),
        generationErrors: failures.count ?? 0 });
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
    if (action === "video-save") {
      if (!canContent(actor)) return json(req, { error: "Sem permissão editorial." }, 403);
      const id = body.youtubeId;
      if (!validYoutubeId(id)) return json(req, { error: "YouTube ID inválido." }, 400);
      const title = str(body.title, 300);
      const transcript = str(body.transcript, 500_000);
      const primaryBikeId = validBikeId(body.primaryBikeId) ? body.primaryBikeId : null;
      const bikeIds = arr(body.relatedBikeIds);
      const known = await knownBikes(db);
      if (title.length < 3 || (primaryBikeId && !known.has(primaryBikeId)) || bikeIds.some((v) => !known.has(v))) {
        return json(req, { error: "Título ou relação de bike inválida." }, 400);
      }
      const existing = await videoById(db, id);
      if (existing && ((transcript && transcript !== (existing.transcript ?? "")) || body.archived === true)) {
        const { count, error: articlesError } = await db.from("editorial_articles")
          .select("id", { count: "exact", head: true })
          .eq("video_id", id).eq("status", "published");
        if (articlesError) throw new Error("video_article_dependency_read_failed");
        if (count) return json(req, { error: "Despublique os artigos ligados a este vídeo antes de alterar sua transcrição ou arquivá-lo." }, 409);
      }
      const { data, error } = await db.from("editorial_videos").upsert({
        youtube_id: id, title, youtube_url: `https://www.youtube.com/watch?v=${id}`,
        thumbnail_url: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
        published_on: /^\d{4}-\d{2}-\d{2}$/.test(str(body.date, 10)) ? body.date : null,
        transcript: transcript || existing?.transcript || null, primary_bike_id: primaryBikeId, related_bike_ids: bikeIds,
        content_type: ["test", "comparison", "guide", "tips", "economy", "other"].includes(str(body.contentType)) ? body.contentType : "other",
        status: body.archived === true ? "archived" : "active",
        created_by: existing?.youtube_id ? undefined : actor.id, updated_by: actor.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "youtube_id" }).select("*").single();
      if (error) throw new Error("video_save_failed");
      await log(db, actor, existing ? "video_updated" : "video_imported", "video", id, { hasTranscript: !!transcript });
      return json(req, { video: data });
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
    if (action === "article-create") {
      if (!canContent(actor) || !validYoutubeId(body.videoId)) return json(req, { error: "Vídeo inválido ou sem permissão." }, 403);
      const video = await videoById(db, body.videoId);
      if (!video || video.status !== "active") return json(req, { error: "Vídeo não cadastrado." }, 422);
      const title = str(body.title, 200) || video.title;
      const { data, error } = await db.from("editorial_articles").insert({
        video_id: video.youtube_id, title, slug: slugifyEditorialTitle(title),
        primary_bike_id: video.primary_bike_id, related_bike_ids: video.related_bike_ids,
        content_type: video.content_type, created_by: actor.id, updated_by: actor.id,
      }).select("*").single();
      if (error) return json(req, { error: error.code === "23505" ? "Slug já existe. Edite o artigo existente." : "Não foi possível criar." }, 409);
      return json(req, { article: data });
    }
    if (action === "article-save") {
      if (!canContent(actor) || !uuid(body.id)) return json(req, { error: "Sem permissão ou ID inválido." }, 403);
      const old = await articleById(db, body.id);
      if (!old) return json(req, { error: "Artigo não encontrado." }, 404);
      if (old.status === "published") return json(req, { error: "Despublique antes de editar." }, 409);
      const slug = str(body.slug, 120);
      if (!validEditorialSlug(slug)) return json(req, { error: "Slug inválido." }, 400);
      const primaryBikeId = validBikeId(body.primaryBikeId) ? body.primaryBikeId : null;
      const relatedBikeIds = arr(body.relatedBikeIds);
      const known = await knownBikes(db);
      if ((primaryBikeId && !known.has(primaryBikeId)) || relatedBikeIds.some((id) => !known.has(id))) return json(req, { error: "Bike desconhecida." }, 400);
      const blocks = parseArticleBlocks(body.blocks);
      const faq = parseFaq(body.faq);
      const { data, error } = await db.from("editorial_articles").update({
        title: str(body.title, 200), slug, summary: str(body.summary, 1200),
        summary_source_excerpt: str(body.summarySourceExcerpt, 1200), blocks, faq,
        seo_title: str(body.seoTitle, 70), meta_description: str(body.metaDescription, 170),
        og_title: str(body.ogTitle, 160), og_description: str(body.ogDescription, 300),
        og_image_url: /^https:\/\//.test(str(body.ogImageUrl, 1000)) ? body.ogImageUrl : null,
        primary_bike_id: primaryBikeId, related_bike_ids: relatedBikeIds,
        related_article_ids: Array.isArray(body.relatedArticleIds) ? [...new Set(body.relatedArticleIds.filter(uuid))].slice(0, 20) : [],
        indexable: body.indexable === true, status: "draft", validation_errors: [], updated_by: actor.id,
      }).eq("id", old.id).eq("revision", Number(body.revision)).select("*").maybeSingle();
      if (error || !data) return json(req, { error: "Conflito de edição. Recarregue o artigo." }, 409);
      await log(db, actor, "article_edited", "article", old.id);
      return json(req, { article: data });
    }
    if (action === "validate-article" || action === "review-article" || action === "publish-article") {
      if (!canContent(actor) || !uuid(body.id)) return json(req, { error: "Sem permissão ou ID inválido." }, 403);
      const article = await articleById(db, body.id);
      if (!article) return json(req, { error: "Artigo não encontrado." }, 404);
      const errors = await validate(db, article);
      if (action === "validate-article") {
        const { data, error } = await db.from("editorial_articles").update({
          validation_errors: errors, status: errors.length ? "validation_error" : "ready", updated_by: actor.id,
        }).eq("id", article.id).eq("revision", Number(body.revision)).select("*").maybeSingle();
        if (error || !data) return json(req, { error: "O artigo mudou. Recarregue antes de validar." }, 409);
        return json(req, { article: data, errors });
      }
      if (errors.length) return json(req, { error: "Corrija a validação antes de continuar.", errors }, 422);
      if (action === "review-article") {
        const { data, error } = await db.from("editorial_articles").update({
          validation_errors: [], status: "ready", reviewed_at: new Date().toISOString(),
          reviewed_by: actor.id, updated_by: actor.id,
        }).eq("id", article.id).eq("revision", Number(body.revision)).select("*").maybeSingle();
        if (error || !data) return json(req, { error: "O artigo mudou. Recarregue antes de revisar." }, 409);
        await log(db, actor, "article_reviewed", "article", article.id);
        return json(req, { article: data });
      }
      if (!article.reviewed_at || article.status !== "ready") return json(req, { error: "Revisão humana pendente." }, 422);
      const { data, error } = await db.from("editorial_articles").update({
        status: "published", validation_errors: [], published_by: actor.id, updated_by: actor.id,
      }).eq("id", article.id).eq("revision", Number(body.revision)).select("*").maybeSingle();
      if (error || !data) return json(req, { error: "Publicação falhou; revise a versão atual." }, 409);
      return json(req, { article: data });
    }
    if (["unpublish-article", "archive-article", "delete-article"].includes(action)) {
      if (!canContent(actor) || !uuid(body.id)) return json(req, { error: "Sem permissão ou ID inválido." }, 403);
      const article = await articleById(db, body.id);
      if (!article) return json(req, { error: "Artigo não encontrado." }, 404);
      if (action === "delete-article") {
        if (actor.role !== "admin" || article.status !== "archived" || body.confirm !== article.slug) {
          return json(req, { error: "Exclusão exige Admin, artigo arquivado e confirmação literal do slug." }, 403);
        }
        const { data: references, error: referencesError } = await db.from("editorial_articles")
          .select("id").contains("related_article_ids", [article.id]).limit(1);
        if (referencesError) throw new Error("article_dependency_read_failed");
        if (references?.length) return json(req, { error: "Remova primeiro as relações de outros artigos com este conteúdo." }, 409);
        const { error, count } = await db.from("editorial_articles").delete({ count: "exact" })
          .eq("id", article.id).eq("status", "archived").eq("revision", Number(body.revision));
        if (error) throw new Error("article_delete_failed");
        if (count !== 1) return json(req, { error: "O artigo mudou. Recarregue antes de excluir." }, 409);
        await log(db, actor, "article_deleted", "article", article.id, { slug: article.slug });
        return json(req, { ok: true });
      }
      const status = action === "archive-article" ? "archived" : "draft";
      const { data, error } = await db.from("editorial_articles").update({ status, indexable: false, updated_by: actor.id })
        .eq("id", article.id).eq("revision", Number(body.revision)).select("*").maybeSingle();
      if (error || !data) return json(req, { error: "O artigo mudou. Recarregue antes de alterar o estado." }, 409);
      return json(req, { article: data });
    }
    if (action === "compile-article" || action === "regenerate-block") {
      if (!canContent(actor)) return json(req, { error: "Sem permissão editorial." }, 403);
      const result = await compile(db, actor, body);
      return json(req, result.data, result.status);
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
