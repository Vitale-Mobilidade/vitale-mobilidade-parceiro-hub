// bike-image: proxy público de imagens persistentes.
// Recebe apenas bike_id validado, busca asset ready e serve o arquivo do bucket
// privado via service role. Nenhum caminho arbitrário é aceito.
import { createClient } from "npm:@supabase/supabase-js@2";
import { sanitizeBikeId } from "../_shared/image-safety.ts";

const BUCKET = "bike-images";
const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET" && req.method !== "HEAD") return json({ error: "method_not_allowed" }, 405);

  const bikeId = sanitizeBikeId(new URL(req.url).searchParams.get("id"));
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
