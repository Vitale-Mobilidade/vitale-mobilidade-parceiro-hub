import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildSnapshotFromCsv, snapshotHash, SHEET_CSV_URL } from "../_shared/bike-sheet.ts";

const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hora
const RETRY_INTERVAL_MS = 15 * 60 * 1000; // backoff em caso de falha
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // trava expira em 5 min

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Mensagem de erro segura: sem tokens, sem payloads internos. */
function safeError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  return raw
    .replace(/eyJ[A-Za-z0-9._-]{10,}/g, "[redacted]")
    .replace(/https?:\/\/\S*key=\S*/gi, "[redacted]")
    .slice(0, 300);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Force só é permitido com service role (cron/admin), nunca publicamente.
  const authHeader = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const isAdmin = SERVICE_ROLE_KEY.length > 0 && authHeader === SERVICE_ROLE_KEY;
  const url = new URL(req.url);
  const force = isAdmin && url.searchParams.get("force") === "true";

  const now = new Date();
  const lockCutoff = new Date(now.getTime() - LOCK_TIMEOUT_MS).toISOString();

  // Trava + verificação de vencimento em uma única escrita condicional.
  let lockQuery = supabase
    .from("bike_catalog_sync_state")
    .update({
      status: "running",
      last_attempt_at: now.toISOString(),
      running_since: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", "current")
    .or(`running_since.is.null,running_since.lt.${lockCutoff}`);

  if (!force) lockQuery = lockQuery.lte("next_run_at", now.toISOString());

  const { data: locked, error: lockError } = await lockQuery.select("id").maybeSingle();

  if (lockError) return json({ ok: false, error: safeError(lockError) }, 500);
  if (!locked) return json({ ok: true, skipped: true, reason: "not_due_or_running" });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(SHEET_CSV_URL, { signal: controller.signal, redirect: "follow" });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Planilha indisponível (HTTP ${res.status})`);
    const csv = await res.text();

    const result = buildSnapshotFromCsv(csv);
    if (result.recognizedCount === 0) throw new Error("Nenhuma linha válida reconhecida na planilha");

    const hash = snapshotHash(result.bikes);
    const { data: current } = await supabase
      .from("bike_catalog_snapshot")
      .select("content_hash")
      .eq("id", "current")
      .maybeSingle();

    let changed = false;
    if (current?.content_hash !== hash) {
      changed = true;
      const { error: upErr } = await supabase.from("bike_catalog_snapshot").upsert({
        id: "current",
        data: {
          generated_at: new Date().toISOString(),
          bikes: result.bikes,
          ignored: result.ignored,
        },
        content_hash: hash,
        recognized_count: result.recognizedCount,
        ignored_count: result.ignoredCount,
        updated_at: new Date().toISOString(),
      });
      if (upErr) throw new Error(`Falha ao gravar snapshot: ${upErr.message}`);
    }

    const done = new Date();
    await supabase.from("bike_catalog_sync_state").update({
      status: "ok",
      last_success_at: done.toISOString(),
      next_run_at: new Date(done.getTime() + SYNC_INTERVAL_MS).toISOString(),
      recognized_count: result.recognizedCount,
      ignored_count: result.ignoredCount,
      ignored_rows: result.ignored,
      error_message: null,
      running_since: null,
      updated_at: done.toISOString(),
    }).eq("id", "current");

    return json({
      ok: true,
      changed,
      recognized: result.recognizedCount,
      ignored: result.ignoredCount,
    });
  } catch (e) {
    const message = safeError(e);
    const done = new Date();
    await supabase.from("bike_catalog_sync_state").update({
      status: "error",
      error_message: message,
      next_run_at: new Date(done.getTime() + RETRY_INTERVAL_MS).toISOString(),
      running_since: null,
      updated_at: done.toISOString(),
    }).eq("id", "current");
    return json({ ok: false, error: message }, 500);
  }
});
