/**
 * Rotina central de sincronização do catálogo (planilha -> snapshot + eventos).
 *
 * Compartilhada entre:
 *  - sync-bike-catalog (cron horário, force=false)
 *  - bike-panel "sync-now" (admin, force=true)
 *
 * Garantias:
 *  - Trava de concorrência com expiração (running_since).
 *  - Atomicidade: qualquer erro estrutural de linha aborta a gravação do
 *    snapshot e o quiz permanece no último snapshot válido.
 *  - Escrita só quando o conteúdo muda (content_hash).
 *  - Efeitos downstream (imagem/IA) são EVENTOS separados: falhas neles
 *    NUNCA invalidam o snapshot comercial.
 *  - Hashes separados: comercial (preço/link/...) e técnico (id+descrição).
 *    Mudança comercial não gera IA nem download de imagem.
 *  - IA somente para bikes NOVAS (as 19 legadas têm metadados estáticos e
 *    permanecem no ranking hardcoded).
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { buildSnapshotFromCsv, snapshotHash, SHEET_CSV_URL, type SnapshotBike } from "./bike-sheet.ts";
import { technicalHash } from "./bike-hash.ts";
import {
  countChangedBikes,
  currentScheduledSlot,
  diffBikes,
  DUE_TOLERANCE_MS,
  nextScheduledRun,
  type BikeFieldChange,
} from "./bike-diff.ts";

export const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hora
export const RETRY_INTERVAL_MS = 15 * 60 * 1000; // backoff em caso de falha
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // trava expira em 5 min

export interface SyncOutcome {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  changed?: boolean;
  snapshotWritten?: boolean;
  recognized?: number;
  ignored?: number;
  drafts?: number;
  blank?: number;
  jobsCreated?: number;
  assetsQueued?: number;
  assetsReview?: number;
  changedBikes?: number;
  runId?: string;
  error?: string;
}


/** Mensagem de erro segura: sem tokens, sem payloads internos. */
export function safeError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  return raw
    .replace(/eyJ[A-Za-z0-9._-]{10,}/g, "[redacted]")
    .replace(/https?:\/\/\S*key=\S*/gi, "[redacted]")
    .slice(0, 300);
}

interface ReconcileResult {
  jobsCreated: number;
  assetsQueued: number;
  assetsReview: number;
  overridesCreated: number;
}

/**
 * Efeitos downstream após um snapshot novo: overrides default, estado de
 * imagem e jobs técnicos. Nunca lança — cada bike é independente e falhas
 * são apenas logadas (não invalidam o snapshot comercial já gravado).
 */
async function reconcileDownstream(
  supabase: SupabaseClient,
  bikes: SnapshotBike[],
): Promise<ReconcileResult> {
  const out: ReconcileResult = { jobsCreated: 0, assetsQueued: 0, assetsReview: 0, overridesCreated: 0 };

  // ---- Overrides: bike nova nasce NÃO elegível; existentes são preservados ----
  const newIds = bikes.filter((b) => b.isNew && b.status !== "inactive").map((b) => b.id);
  if (newIds.length > 0) {
    const { data: existing } = await supabase
      .from("bike_admin_overrides")
      .select("bike_id")
      .in("bike_id", newIds);
    const have = new Set((existing ?? []).map((r: { bike_id: string }) => r.bike_id));
    const toInsert = newIds.filter((id) => !have.has(id)).map((id) => ({ bike_id: id, eligible: false }));
    if (toInsert.length > 0) {
      const { error } = await supabase.from("bike_admin_overrides").insert(toInsert);
      if (error) console.error("[sync] overrides insert falhou:", safeError(error));
      else out.overridesCreated = toInsert.length;
    }
  }

  for (const bike of bikes) {
    if (bike.status === "inactive") continue;
    try {
      // ---- Imagem ----
      if (bike.image) {
        const { data: asset } = await supabase
          .from("bike_assets")
          .select("bike_id, source_url, stored_source_url, status, attempts")
          .eq("bike_id", bike.id)
          .maybeSingle();

        if (!asset) {
          const { error } = await supabase.from("bike_assets").insert({
            bike_id: bike.id,
            source_url: bike.image,
            status: "pending",
          });
          if (error) console.error(`[sync] asset insert ${bike.id}:`, safeError(error));
          else out.assetsQueued++;
        } else if (asset.status === "ready") {
          // URL nova com imagem existente: apenas marca revisão, preserva a atual.
          if (asset.stored_source_url && asset.stored_source_url !== bike.image && asset.source_url !== bike.image) {
            const { error } = await supabase.from("bike_assets")
              .update({ source_url: bike.image, needs_review: true, updated_at: new Date().toISOString() })
              .eq("bike_id", bike.id);
            if (error) console.error(`[sync] asset review ${bike.id}:`, safeError(error));
            else out.assetsReview++;
          }
        } else if (asset.status !== "downloading" && asset.source_url !== bike.image) {
          // Ainda não baixada e a URL mudou: reprocessa com a URL nova.
          const { error } = await supabase.from("bike_assets")
            .update({
              source_url: bike.image,
              status: "pending",
              attempts: 0,
              error_message: null,
              updated_at: new Date().toISOString(),
            })
            .eq("bike_id", bike.id);
          if (error) console.error(`[sync] asset update ${bike.id}:`, safeError(error));
          else out.assetsQueued++;
        }
      }

      // ---- Perfil técnico (IA): SOMENTE bikes novas, um job por hash ----
      if (bike.isNew) {
        const th = technicalHash(bike);
        const [{ data: profile }, { data: openJob }] = await Promise.all([
          supabase.from("bike_profiles").select("bike_id")
            .eq("bike_id", bike.id).eq("technical_hash", th).maybeSingle(),
          supabase.from("bike_profile_jobs").select("id")
            .eq("bike_id", bike.id).eq("technical_hash", th)
            .in("status", ["queued", "processing"]).maybeSingle(),
        ]);
        if (!profile && !openJob) {
          const { error } = await supabase.from("bike_profile_jobs").insert({
            bike_id: bike.id,
            technical_hash: th,
            status: "queued",
            payload: {
              name: bike.name,
              description: bike.description,
              capacity: bike.capacity,
              autonomyKm: bike.autonomyKm,
            },
          });
          if (error) console.error(`[sync] job insert ${bike.id}:`, safeError(error));
          else out.jobsCreated++;
        }
      }
    } catch (e) {
      console.error(`[sync] reconcile ${bike.id}:`, safeError(e));
    }
  }

  return out;
}

/** Dispara os workers downstream (melhor latência). Nunca lança. */
async function kickWorkers(supabase: SupabaseClient, supabaseUrl: string, serviceKey: string) {
  try {
    const [{ count: pendingAssets }, { count: queuedJobs }] = await Promise.all([
      supabase.from("bike_assets").select("bike_id", { count: "exact", head: true })
        .in("status", ["pending", "error"]),
      supabase.from("bike_profile_jobs").select("id", { count: "exact", head: true })
        .eq("status", "queued"),
    ]);
    const headers = { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
    const kicks: Promise<unknown>[] = [];
    if ((pendingAssets ?? 0) > 0) {
      kicks.push(fetch(`${supabaseUrl}/functions/v1/bike-image-worker`, { method: "POST", headers, body: "{}" }));
    }
    if ((queuedJobs ?? 0) > 0) {
      kicks.push(fetch(`${supabaseUrl}/functions/v1/bike-profile-worker`, { method: "POST", headers, body: "{}" }));
    }
    const results = await Promise.allSettled(kicks);
    for (const r of results) {
      if (r.status === "rejected") console.error("[sync] kick worker falhou:", safeError(r.reason));
    }
  } catch (e) {
    console.error("[sync] kick workers:", safeError(e));
  }
}

/**
 * Executa a sincronização. Retorna { status, body } pronto para resposta HTTP.
 * force=true ignora o agendamento (uso exclusivo admin/service role).
 */
export async function runBikeCatalogSync(
  supabase: SupabaseClient,
  opts: { force: boolean; supabaseUrl: string; serviceKey: string },
): Promise<{ status: number; body: SyncOutcome }> {
  const now = new Date();
  const lockCutoff = new Date(now.getTime() - LOCK_TIMEOUT_MS).toISOString();

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

  if (!opts.force) lockQuery = lockQuery.lte("next_run_at", now.toISOString());

  const { data: locked, error: lockError } = await lockQuery.select("id").maybeSingle();
  if (lockError) return { status: 500, body: { ok: false, error: safeError(lockError) } };
  if (!locked) return { status: 200, body: { ok: true, skipped: true, reason: "not_due_or_running" } };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(SHEET_CSV_URL, { signal: controller.signal, redirect: "follow" });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Planilha indisponível (HTTP ${res.status})`);
    const csv = await res.text();

    const result = buildSnapshotFromCsv(csv);

    // Atomicidade: qualquer erro estrutural de linha aborta a sincronização.
    if (!result.valid) {
      const done = new Date();
      const preview = result.ignored.slice(0, 5).map((i) => `linha ${i.line}: ${i.reason}`).join("; ");
      const message = `Planilha com ${result.ignored.length} linha(s) inválida(s) — snapshot anterior preservado (${preview})`.slice(0, 300);
      await supabase.from("bike_catalog_sync_state").update({
        status: "error",
        error_message: message,
        recognized_count: result.recognizedCount,
        ignored_count: result.ignoredCount,
        ignored_rows: result.ignored,
        next_run_at: new Date(done.getTime() + RETRY_INTERVAL_MS).toISOString(),
        running_since: null,
        updated_at: done.toISOString(),
      }).eq("id", "current");
      return {
        status: 422,
        body: {
          ok: false,
          snapshotWritten: false,
          error: message,
          recognized: result.recognizedCount,
          ignored: result.ignoredCount,
        },
      };
    }

    if (result.recognizedCount === 0) throw new Error("Nenhuma linha válida reconhecida na planilha");

    const hash = snapshotHash(result.bikes);
    const { data: current } = await supabase
      .from("bike_catalog_snapshot")
      .select("content_hash")
      .eq("id", "current")
      .maybeSingle();

    let changed = false;
    let downstream: ReconcileResult = { jobsCreated: 0, assetsQueued: 0, assetsReview: 0, overridesCreated: 0 };

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

      downstream = await reconcileDownstream(supabase, result.bikes);
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

    if (downstream.jobsCreated > 0 || downstream.assetsQueued > 0) {
      await kickWorkers(supabase, opts.supabaseUrl, opts.serviceKey);
    }

    return {
      status: 200,
      body: {
        ok: true,
        changed,
        snapshotWritten: changed,
        recognized: result.recognizedCount,
        ignored: result.ignoredCount,
        drafts: result.draftCount,
        blank: result.blankCount,
        jobsCreated: downstream.jobsCreated,
        assetsQueued: downstream.assetsQueued,
        assetsReview: downstream.assetsReview,
      },
    };
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
    return { status: 500, body: { ok: false, error: message } };
  }
}
