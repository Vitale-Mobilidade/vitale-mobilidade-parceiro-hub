// Estado operacional dos workers: trava de execução, pausa (circuit breaker) e
// registro de runs/eventos. Runtime Deno — não importar no frontend.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type WorkerName = "bike-image-worker" | "bike-profile-worker";

export interface WorkerStateRow {
  worker: string;
  status: string;
  paused_reason: string | null;
  resume_at: string | null;
  running_since: string | null;
  consecutive_failures: number;
  last_run_at: string | null;
}

export async function getWorkerState(supabase: SupabaseClient, worker: WorkerName): Promise<WorkerStateRow | null> {
  const { data } = await supabase.from("worker_state").select("*").eq("worker", worker).maybeSingle();
  return (data as WorkerStateRow | null) ?? null;
}

/** Garante a linha de estado; retorna o estado atual. */
export async function ensureWorkerState(supabase: SupabaseClient, worker: WorkerName): Promise<WorkerStateRow> {
  const existing = await getWorkerState(supabase, worker);
  if (existing) return existing;
  await supabase.from("worker_state").upsert({ worker, status: "idle" }, { onConflict: "worker" });
  return (await getWorkerState(supabase, worker)) ?? {
    worker, status: "idle", paused_reason: null, resume_at: null, running_since: null,
    consecutive_failures: 0, last_run_at: null,
  };
}

/**
 * Trava single-flight: vence a corrida somente se nenhuma outra execução
 * estiver com running_since dentro do lease.
 */
export async function tryAcquireWorkerLock(
  supabase: SupabaseClient,
  worker: WorkerName,
  leaseMs = 10 * 60 * 1000,
): Promise<boolean> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - leaseMs).toISOString();

  const { data: running } = await supabase
    .from("worker_state")
    .select("worker")
    .eq("worker", worker)
    .gt("running_since", staleBefore)
    .maybeSingle();
  if (running) return false;

  const { data, error } = await supabase
    .from("worker_state")
    .update({ running_since: now.toISOString(), status: "running" })
    .eq("worker", worker)
    .or(`running_since.is.null,running_since.lte.${staleBefore}`)
    .select("worker");

  return !error && Array.isArray(data) && data.length === 1;
}

export async function releaseWorkerLock(
  supabase: SupabaseClient,
  worker: WorkerName,
  patch: Partial<Pick<WorkerStateRow, "status" | "consecutive_failures" | "paused_reason" | "resume_at">> = {},
): Promise<void> {
  await supabase
    .from("worker_state")
    .update({ running_since: null, last_run_at: new Date().toISOString(), ...patch })
    .eq("worker", worker);
}

/** Pausa o worker (circuit breaker). resumeAt=null → só probe/ação manual retoma. */
export async function pauseWorker(
  supabase: SupabaseClient,
  worker: WorkerName,
  reason: string,
  resumeAt: string | null,
): Promise<void> {
  await supabase
    .from("worker_state")
    .update({ status: "paused", paused_reason: reason.slice(0, 300), resume_at: resumeAt, running_since: null })
    .eq("worker", worker);
}

export async function clearWorkerPause(supabase: SupabaseClient, worker: WorkerName): Promise<void> {
  await supabase
    .from("worker_state")
    .update({ status: "idle", paused_reason: null, resume_at: null })
    .eq("worker", worker);
}

export interface WorkerRunStats {
  processed: number;
  succeeded: number;
  failed: number;
  note?: string;
}

export async function recordWorkerRun(
  supabase: SupabaseClient,
  worker: WorkerName,
  startedAt: Date,
  stats: WorkerRunStats,
): Promise<void> {
  await supabase.from("worker_runs").insert({
    worker,
    started_at: startedAt.toISOString(),
    finished_at: new Date().toISOString(),
    processed: stats.processed,
    succeeded: stats.succeeded,
    failed: stats.failed,
    note: stats.note?.slice(0, 300) ?? null,
  });
}

export async function recordWorkerEvent(
  supabase: SupabaseClient,
  worker: WorkerName,
  bikeId: string | null,
  event: string,
  detail: Record<string, unknown> = {},
): Promise<void> {
  await supabase.from("worker_events").insert({ worker, bike_id: bikeId, event, detail });
}
