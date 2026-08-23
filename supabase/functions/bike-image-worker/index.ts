// bike-image-worker: baixa imagens da planilha para o bucket privado `bike-images`.
// Idempotente, single-flight, lote pequeno, pausa automática após falhas consecutivas.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { assetStorageKey, sha256Text } from "../_shared/bike-hash.ts";
import { downloadImageSafely, ImageDownloadError, sha256Hex } from "../_shared/image-fetch.ts";
import { checkImageUrl } from "../_shared/image-safety.ts";
import {
  clearWorkerPause,
  ensureWorkerState,
  pauseWorker,
  recordWorkerEvent,
  recordWorkerRun,
  releaseWorkerLock,
  tryAcquireWorkerLock,
} from "../_shared/worker-state.ts";

const WORKER = "bike-image-worker" as const;
const BUCKET = "bike-images";
const BATCH_SIZE = 5;
const MAX_ATTEMPTS = 3;
const PAUSE_AFTER_CONSECUTIVE_FAILURES = 3;
const TRANSIENT_PAUSE_MS = 15 * 60 * 1000;

interface AssetRow {
  bike_id: string;
  source_url: string | null;
  stored_source_url: string | null;
  status: string;
  attempts: number;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

function errMessage(err: unknown): string {
  if (err instanceof ImageDownloadError) return err.message;
  return "Falha no download da imagem";
}

/** Trava por asset: pending → downloading (condicional, anti-corrida). */
async function claimAsset(supabase: SupabaseClient, bikeId: string, attempts: number): Promise<boolean> {
  const { data, error } = await supabase
    .from("bike_assets")
    .update({ status: "downloading", attempts: attempts + 1, error_message: null })
    .eq("bike_id", bikeId)
    .eq("status", "pending")
    .select("bike_id");
  return !error && Array.isArray(data) && data.length === 1;
}

async function markFailed(supabase: SupabaseClient, bikeId: string, message: string): Promise<void> {
  await supabase.from("bike_assets").update({ status: "error", error_message: message.slice(0, 300) }).eq("bike_id", bikeId);
}

/** Reencaminha asset em erro para nova tentativa (até o limite) ou desiste. */
async function scheduleRetry(supabase: SupabaseClient, asset: AssetRow, message: string): Promise<void> {
  if (asset.attempts + 1 >= MAX_ATTEMPTS) {
    await markFailed(supabase, asset.bike_id, `${message} (desistido após ${MAX_ATTEMPTS} tentativas)`);
  } else {
    await supabase
      .from("bike_assets")
      .update({ status: "pending", error_message: message.slice(0, 300) })
      .eq("bike_id", asset.bike_id);
  }
}

async function processAsset(supabase: SupabaseClient, asset: AssetRow, publicBaseUrl: string): Promise<"ready" | "skipped" | "error"> {
  const bikeId = asset.bike_id;

  // Idempotência: já processado para esta URL.
  if (asset.status === "ready" && asset.stored_source_url && asset.stored_source_url === asset.source_url) {
    return "skipped";
  }

  // URL de origem alterada depois de pronta: preserva imagem atual e sinaliza revisão.
  if (asset.status === "ready" && asset.stored_source_url && asset.source_url && asset.stored_source_url !== asset.source_url) {
    if (!asset.source_url) return "skipped";
    await supabase.from("bike_assets").update({ needs_review: true }).eq("bike_id", bikeId);
    await recordWorkerEvent(supabase, WORKER, bikeId, "source_changed_needs_review", {});
    return "skipped";
  }

  if (!asset.source_url) {
    await markFailed(supabase, bikeId, "Sem URL de origem");
    return "error";
  }

  const urlCheck = checkImageUrl(asset.source_url);
  if (!urlCheck.ok) {
    await markFailed(supabase, bikeId, `URL rejeitada: ${urlCheck.reason}`);
    return "error";
  }

  // Travamento por asset (retry respeita MAX_ATTEMPTS).
  if (asset.status === "pending") {
    const claimed = await claimAsset(supabase, bikeId, asset.attempts);
    if (!claimed) return "skipped"; // outra execução pegou
  }

  try {
    const { bytes, contentType } = await downloadImageSafely(asset.source_url);
    const checksum = await sha256Hex(bytes);
    const sourceHash = await sha256Text(asset.source_url);
    const storagePath = assetStorageKey(bikeId, sourceHash, contentType);

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType,
      upsert: true,
    });
    if (upErr) throw new ImageDownloadError("Falha ao gravar no storage");

    const publicUrl = `${publicBaseUrl}/functions/v1/bike-image?id=${encodeURIComponent(bikeId)}`;

    await supabase.from("bike_assets").update({
      status: "ready",
      storage_path: storagePath,
      public_url: publicUrl,
      content_type: contentType,
      bytes: bytes.byteLength,
      checksum,
      stored_source_url: asset.source_url,
      downloaded_at: new Date().toISOString(),
      error_message: null,
      needs_review: false,
    }).eq("bike_id", bikeId);

    await recordWorkerEvent(supabase, WORKER, bikeId, "image_ready", { bytes: bytes.byteLength, contentType });
    return "ready";
  } catch (err) {
    const message = errMessage(err);
    await recordWorkerEvent(supabase, WORKER, bikeId, "image_error", { error: message.slice(0, 200) });
    await scheduleRetry(supabase, { ...asset, status: "pending" }, message);
    return "error";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "config" }, 500);
  const supabase = createClient(supabaseUrl, serviceKey);

  const startedAt = new Date();
  const state = await ensureWorkerState(supabase, WORKER);

  // Guarda de pausa: pausas transitórias expiram sozinhas (resume_at).
  if (state.status === "paused") {
    if (state.resume_at && new Date(state.resume_at).getTime() <= Date.now()) {
      await clearWorkerPause(supabase, WORKER);
    } else {
      return json({ ok: true, paused: true, reason: state.paused_reason ?? "paused" });
    }
  }

  if (!(await tryAcquireWorkerLock(supabase, WORKER))) {
    return json({ ok: true, locked: true });
  }

  let processed = 0, succeeded = 0, failed = 0;
  let note: string | undefined;
  try {
    // Assets elegíveis ao worker: pending com tentativas restantes.
    const { data: assets } = await supabase
      .from("bike_assets")
      .select("bike_id, source_url, stored_source_url, status, attempts")
      .eq("status", "pending")
      .lt("attempts", MAX_ATTEMPTS)
      .order("bike_id")
      .limit(BATCH_SIZE);

    // Detecção de origem alterada em assets prontos (sem baixar nada).
    const { data: changed } = await supabase
      .from("bike_assets")
      .select("bike_id, source_url, stored_source_url, status, attempts")
      .eq("status", "ready")
      .eq("needs_review", false)
      .not("stored_source_url", "is", null)
      .limit(BATCH_SIZE);

    const toProcess: AssetRow[] = [
      ...((assets ?? []) as AssetRow[]),
      ...((changed ?? []) as AssetRow[]).filter((a) => a.source_url && a.stored_source_url && a.source_url !== a.stored_source_url),
    ].slice(0, BATCH_SIZE);

    for (const asset of toProcess) {
      processed += 1;
      const result = await processAsset(supabase, asset, supabaseUrl);
      if (result === "ready") succeeded += 1;
      else if (result === "error") failed += 1;
    }

    // Circuit breaker transitório: falhas consecutivas sem sucesso.
    const consecutive = failed > 0 && succeeded === 0 ? state.consecutive_failures + failed : 0;
    if (consecutive >= PAUSE_AFTER_CONSECUTIVE_FAILURES) {
      const resumeAt = new Date(Date.now() + TRANSIENT_PAUSE_MS).toISOString();
      await pauseWorker(supabase, WORKER, "Falhas consecutivas no download de imagens", resumeAt);
      note = "paused_transient";
    }
    await releaseWorkerLock(supabase, WORKER, {
      status: note === "paused_transient" ? "paused" : "idle",
      consecutive_failures: consecutive,
    });
  } catch (err) {
    note = "worker_error";
    await releaseWorkerLock(supabase, WORKER, {
      status: "idle",
      consecutive_failures: state.consecutive_failures + 1,
    });
    console.error("bike-image-worker erro:", err);
  }

  await recordWorkerRun(supabase, WORKER, startedAt, { processed, succeeded, failed, note });
  return json({ ok: true, processed, succeeded, failed, note: note ?? null });
});
