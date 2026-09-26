// bike-image: proxy público de imagens persistentes.
// Recebe apenas bike_id validado, busca asset ready e serve o arquivo do bucket
// privado via service role. Nenhum caminho arbitrário é aceito.
import { createClient } from "npm:@supabase/supabase-js@2";
import { sanitizeBikeId } from "../_shared/image-safety.ts";
import { articleReferencesCover, COVER_BUCKET, coverObjectPath, isCoverUuid } from "../_shared/editorial-cover.ts";

const BUCKET = "bike-images";
const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

/** Capa editorial aprovada: serve só o arquivo referenciado exatamente por artigo publicado. */
async function serveEditorialCover(req: Request, params: URLSearchParams): Promise<Response> {
  const articleId = params.get("id");
  const fileId = params.get("file");
  if (!isCoverUuid(articleId) || !isCoverUuid(fileId)) return json({ error: "invalid_cover" }, 400);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "config" }, 500);
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: article } = await supabase.from("editorial_articles")
    .select("og_image_url, status").eq("id", articleId).eq("status", "published").maybeSingle();
  if (!article || !articleReferencesCover(article.og_image_url, supabaseUrl, articleId, fileId)) {
    return json({ error: "not_found" }, 404);
  }
  const { data: file, error } = await supabase.storage.from(COVER_BUCKET).download(coverObjectPath(articleId, fileId));
  if (error || !file) return json({ error: "not_found" }, 404);
  const headers: Record<string, string> = {
    ...CORS,
    "Content-Type": "image/jpeg",
    // Arquivo imutável por UUID: nova capa gera nova URL.
    "Cache-Control": CACHE_CONTROL,
    "X-Content-Type-Options": "nosniff",
    "Content-Length": String(file.size),
    ETag: `"${fileId}"`,
  };
  if (req.method === "HEAD") return new Response(null, { status: 200, headers });
  return new Response(file, { status: 200, headers });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET" && req.method !== "HEAD") return json({ error: "method_not_allowed" }, 405);

  const params = new URL(req.url).searchParams;
  if (params.has("type")) {
    if (params.get("type") === "editorial-cover") return serveEditorialCover(req, params);
    return json({ error: "invalid_type" }, 400);
  }

  const bikeId = sanitizeBikeId(params.get("id"));
  if (!bikeId) return json({ error: "invalid_bike_id" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "config" }, 500);
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: asset } = await supabase
    .from("bike_assets")
    .select("storage_path, content_type, checksum")
    .eq("bike_id", bikeId)
    .eq("status", "ready")
    .not("storage_path", "is", null)
    .maybeSingle();

  if (!asset?.storage_path) return json({ error: "not_found" }, 404);

  const { data: file, error } = await supabase.storage.from(BUCKET).download(asset.storage_path);
  if (error || !file) return json({ error: "not_found" }, 404);

  const headers: Record<string, string> = {
    ...CORS,
    "Content-Type": asset.content_type ?? file.type ?? "image/jpeg",
    "Cache-Control": CACHE_CONTROL,
    "X-Content-Type-Options": "nosniff",
    "Content-Length": String(file.size),
  };
  if (asset.checksum) headers["ETag"] = `"${asset.checksum}"`;

  if (req.method === "HEAD") return new Response(null, { status: 200, headers });
  return new Response(file, { status: 200, headers });
});
