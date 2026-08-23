// bike-profile-worker: gera perfil técnico via Lovable AI SOMENTE para bikes novas.
// Nunca chama IA para as 19 bikes legadas. Circuit breaker para 402/403/401 com probe;
// retry apenas para 429/5xx com backoff curto.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { isLegacyBikeId } from "../_shared/bike-hash.ts";
import {
  buildProfilePrompt,
  classifyAiError,
  extractJsonObject,
  jobFailureDecision,
  PROFILE_MAX_ATTEMPTS,
  retryDelayMs,
  validateAiProfile,
  type ProfilePromptBike,
} from "../_shared/profile-ai.ts";
import {
  clearWorkerPause,
  ensureWorkerState,
  pauseWorker,
  recordWorkerEvent,
  recordWorkerRun,
  releaseWorkerLock,
  tryAcquireWorkerLock,
} from "../_shared/worker-state.ts";

const WORKER = "bike-profile-worker" as const;
const BATCH_SIZE = 3;
const PROBE_BATCH_SIZE = 1;
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";
const AI_MAX_RETRIES = 2;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface JobRow {
  id: string;
  bike_id: string;
  technical_hash: string;
  status: string;
  attempts: number;
  payload: ProfilePromptBike | null;
}

type AiCallResult =
  | { kind: "ok"; parsed: Record<string, unknown> }
  | { kind: "error"; status: number; retryAfter: string | null; message: string };

async function callAi(apiKey: string, bike: ProfilePromptBike): Promise<AiCallResult> {
  const { system, user } = buildProfilePrompt(bike);
  let lastStatus = 0;
  let lastRetryAfter: string | null = null;
  let lastMessage = "unknown";

  for (let attempt = 0; attempt <= AI_MAX_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: AI_MODEL,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
    } catch {
      lastStatus = 0; // falha de rede → tratada como server retryable
      lastMessage = "network_error";
      if (attempt < AI_MAX_RETRIES) await sleep(retryDelayMs("server", null, attempt + 1));
      continue;
    }

    lastStatus = res.status;
    lastRetryAfter = res.headers.get("retry-after");
    const text = await res.text();

    if (res.status === 200) {
      try {
        const body = JSON.parse(text);
        const content: string = body?.choices?.[0]?.message?.content ?? "";
        const parsed = extractJsonObject(content);
        if (parsed) return { kind: "ok", parsed };
        return { kind: "error", status: 400, retryAfter: null, message: "invalid_ai_json" };
      } catch {
        return { kind: "error", status: 400, retryAfter: null, message: "invalid_gateway_response" };
      }
    }

    lastMessage = text.slice(0, 200);
    const kind = classifyAiError(res.status);
    // Somente 429/5xx são re-tentados; os demais são terminais.
    if (kind !== "rate_limited" && kind !== "server") {
      return { kind: "error", status: res.status, retryAfter: lastRetryAfter, message: lastMessage };
    }
    if (attempt < AI_MAX_RETRIES) await sleep(retryDelayMs(kind, lastRetryAfter, attempt + 1));
  }

  return { kind: "error", status: lastStatus, retryAfter: lastRetryAfter, message: lastMessage };
}

/** Lease do job: queued → processing (condicional). */
async function claimJob(supabase: SupabaseClient, job: JobRow): Promise<boolean> {
  const { data, error } = await supabase
    .from("bike_profiles_jobs_claim_guard" as never) // placeholder nunca usado
    .select("*" as never);
  void data; void error;
  const { data: claimed, error: claimErr } = await supabase
    .from("bike_profile_jobs")
    .update({ status: "processing", locked_at: new Date().toISOString(), error_message: null })
    .eq("id", job.id)
    .eq("status", "queued")
    .select("id");
  return !claimErr && Array.isArray(claimed) && claimed.length === 1;
}

async function requeueJob(supabase: SupabaseClient, job: JobRow, burnAttempt: boolean, message: string): Promise<void> {
  await supabase.from("bike_profile_jobs").update({
    status: "queued",
    locked_at: null,
    attempts: burnAttempt ? job.attempts + 1 : job.attempts,
    error_message: message.slice(0, 300),
  }).eq("id", job.id);
}

async function failJob(supabase: SupabaseClient, job: JobRow, message: string): Promise<void> {
  await supabase.from("bike_profile_jobs").update({
    status: "failed",
    locked_at: null,
    attempts: job.attempts + 1,
    error_message: message.slice(0, 300),
  }).eq("id", job.id);
}

async function processJob(
  supabase: SupabaseClient,
  apiKey: string,
  job: JobRow,
): Promise<"done" | "retry" | "failed" | "skipped" | "pause"> {
  // Proteção absoluta: nunca IA para bike legada.
  if (isLegacyBikeId(job.bike_id)) {
    await supabase.from("bike_profile_jobs").update({ status: "skipped_legacy", locked_at: null }).eq("id", job.id);
    return "skipped";
  }

  // Idempotência: já existe perfil ready para este hash.
  const { data: existing } = await supabase
    .from("bike_profiles")
    .select("status")
    .eq("bike_id", job.bike_id)
    .eq("technical_hash", job.technical_hash)
    .eq("status", "ready")
    .maybeSingle();
  if (existing) {
    await supabase.from("bike_profile_jobs").update({ status: "done", locked_at: null }).eq("id", job.id);
    return "done";
  }

  if (!(await claimJob(supabase, job))) return "skipped";

  if (!job.payload || !job.payload.name) {
    await failJob(supabase, job, "payload ausente");
    return "failed";
  }

  const result = await callAi(apiKey, job.payload);

  if (result.kind === "error") {
    const kind = classifyAiError(result.status);
    const attemptsAfter = job.attempts + 1;
    const decision = jobFailureDecision(kind, attemptsAfter);
    await recordWorkerEvent(supabase, WORKER, job.bike_id, "ai_error", {
      status: result.status, kind, message: result.message.slice(0, 200),
    });

    if (decision.action === "pause_worker") {
      await requeueJob(supabase, job, false, `ai_${kind}: ${result.message}`);
      await pauseWorker(supabase, WORKER, `ai_${kind}: ${result.message.slice(0, 200)}`, null);
      return "pause";
    }
    if (decision.action === "retry_later") {
      await requeueJob(supabase, job, true, `ai_${kind}: ${result.message}`);
      return "retry";
    }
    await failJob(supabase, job, `ai_${kind}: ${result.message}`);
    await supabase.from("bike_profiles").upsert({
      bike_id: job.bike_id,
      technical_hash: job.technical_hash,
      status: "error",
      error_message: `ai_${kind}`.slice(0, 300),
      attempts: attemptsAfter,
    }, { onConflict: "bike_id" });
    return "failed";
  }

  const validated = validateAiProfile(result.parsed);
  if (!validated) {
    await failJob(supabase, job, "invalid_ai_payload");
    return "failed";
  }

  // Falha não apaga o último perfil ready: upsert só escreve quando há dados válidos.
  await supabase.from("bike_profiles").upsert({
    bike_id: job.bike_id,
    technical_hash: job.technical_hash,
    status: validated.readiness,
    data: validated.data,
    missing_fields: validated.missingFields,
    model: AI_MODEL,
    error_message: null,
    attempts: job.attempts + 1,
  }, { onConflict: "bike_id" });

  await supabase.from("bike_profile_jobs").update({ status: "done", locked_at: null }).eq("id", job.id);
  await recordWorkerEvent(supabase, WORKER, job.bike_id, "profile_ready", {
    readiness: validated.readiness, missing: validated.missingFields,
  });
  return "done";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "config" }, 500);
  const supabase = createClient(supabaseUrl, serviceKey);

  const startedAt = new Date();
  const state = await ensureWorkerState(supabase, WORKER);

  // Guarda de pausa em TODO ponto de entrada (cron/encadeamento/manual).
  let probeMode = false;
  if (state.status === "paused") {
    if (state.resume_at && new Date(state.resume_at).getTime() <= Date.now()) {
      await clearWorkerPause(supabase, WORKER);
    } else if (state.resume_at === null) {
      // Pausa por 402/403/401: somente UM item probe por execução.
      probeMode = true;
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
    if (!apiKey) {
      await pauseWorker(supabase, WORKER, "LOVABLE_API_KEY ausente", null);
      await releaseWorkerLock(supabase, WORKER, { status: "paused" });
      await recordWorkerRun(supabase, WORKER, startedAt, { processed: 0, succeeded: 0, failed: 0, note: "no_api_key" });
      return json({ ok: false, error: "no_api_key" });
    }

    const batchSize = probeMode ? PROBE_BATCH_SIZE : BATCH_SIZE;
    const { data: jobs } = await supabase
      .from("bike_profile_jobs")
      .select("id, bike_id, technical_hash, status, attempts, payload")
      .eq("status", "queued")
      .lt("attempts", PROFILE_MAX_ATTEMPTS)
      .order("created_at", { ascending: true })
      .limit(batchSize + 8); // margem para pular legadas sem chamada extra

    const eligibleJobs = ((jobs ?? []) as JobRow[]).filter((j) => !isLegacyBikeId(j.bike_id)).slice(0, batchSize);

    let paused = false;
    for (const job of eligibleJobs) {
      processed += 1;
      const result = await processJob(supabase, apiKey, job);
      if (result === "done") {
        succeeded += 1;
        if (probeMode) {
          // Probe bem-sucedido: retoma a operação normal.
          await clearWorkerPause(supabase, WORKER);
          note = "probe_ok_resumed";
        }
      } else if (result === "pause") {
        paused = true;
        note = "paused";
        break;
      } else if (result === "failed" || result === "retry") {
        failed += 1;
        if (probeMode) note = "probe_failed_still_paused";
      }
    }

    await releaseWorkerLock(supabase, WORKER, { status: paused ? "paused" : "idle" });
  } catch (err) {
    note = "worker_error";
    await releaseWorkerLock(supabase, WORKER, { status: "idle" });
    console.error("bike-profile-worker erro:", err);
  }

  await recordWorkerRun(supabase, WORKER, startedAt, { processed, succeeded, failed, note });
  return json({ ok: true, processed, succeeded, failed, note: note ?? null });
});
