/**
 * Rotina central de sincronização do catálogo (planilha -> snapshot + eventos).
 *
 * Compartilhada entre:
 *  - sync-bike-catalog (cron horário, force=false)
 *  - bike-panel "sync-now" (admin, force=true)
 *
 * Garantias:
 *  - Trava de concorrência com expiração (running_since).
 *  - Resiliência: linhas incompletas viram PENDÊNCIAS e nunca bloqueiam as
 *    linhas válidas. A versão anterior de uma bike existente é preservada
 *    (marcada pendente/não publicável) quando a linha fica temporariamente ruim.
 *  - A coluna "Status" da planilha é a fonte oficial da elegibilidade e é
 *    espelhada idempotentemente em bike_admin_overrides (updated_by="sheet").
 *  - Escrita do snapshot só quando o conteúdo muda (content_hash).
 *  - Efeitos downstream (imagem/IA) são EVENTOS separados: falhas neles
 *    NUNCA invalidam o snapshot comercial.
 *  - Hashes separados: comercial (preço/link/...) e técnico (id+descrição).
 *    Preço, link, Status e imagem JAMAIS disparam IA.
 *  - Baseline: bikes legadas registram o hash atual da Descrição sem IA; só uma
 *    mudança FUTURA de Descrição enfileira o reprocessamento.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  buildSnapshotFromCsv,
  KNOWN_BIKE_IDS,
  snapshotHash,
  SHEET_CSV_URL,
  type PendingRow,
  type SnapshotBike,
} from "./bike-sheet.ts";
import { technicalHash } from "./bike-hash.ts";
import { buildDailyRows, saoPauloDay, type DailyCandidate, type DailyExisting } from "./price-daily.ts";
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

/** IDs do catálogo estático: recebem baseline de hash técnico, nunca IA retroativa. */
const LEGACY_IDS = new Set<string>(KNOWN_BIKE_IDS as readonly string[]);

export interface SyncOutcome {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  changed?: boolean;
  snapshotWritten?: boolean;
  recognized?: number;
  pending?: number;
  ignored?: number;
  drafts?: number;
  blank?: number;
  jobsCreated?: number;
  baselines?: number;
  assetsQueued?: number;
  assetsReview?: number;
  overridesSynced?: number;
  eligible?: number;
  notEligible?: number;
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

/**
 * Junta as bikes válidas com as versões anteriores das bikes que ficaram
 * temporariamente pendentes — preservando dados para não apagar por erro de
 * digitação. As preservadas ficam "draft" (não publicáveis) até a correção.
 */
export function mergeWithPreserved(
  fresh: SnapshotBike[],
  pending: PendingRow[],
  previous: SnapshotBike[],
): SnapshotBike[] {
  const freshIds = new Set(fresh.map((b) => b.id));
  const prevById = new Map(previous.map((b) => [b.id, b]));
  const out = [...fresh];
  for (const p of pending) {
    if (!p.id || freshIds.has(p.id)) continue;
    const before = prevById.get(p.id);
    if (!before) continue;
    out.push({
      ...before,
      status: "draft",
      missingFields: p.missingFields,
      line: p.line,
      sheetEligible: p.sheetEligible ?? before.sheetEligible ?? null,
    });
  }
  out.sort((a, b) => a.id.localeCompare(b.id));
  return out;
}

interface OverrideSyncResult {
  synced: number;
  eligible: number;
  notEligible: number;
}

/**
 * Espelha a coluna Status da planilha em bike_admin_overrides.
 * Idempotente: só escreve (e só audita) quando o valor realmente muda.
 * Bikes pendentes/preservadas não são tocadas.
 */
async function syncSheetOverrides(
  supabase: SupabaseClient,
  bikes: SnapshotBike[],
): Promise<OverrideSyncResult> {
  const out: OverrideSyncResult = { synced: 0, eligible: 0, notEligible: 0 };
  const managed = bikes.filter((b) => b.status === "eligible" && typeof b.sheetEligible === "boolean");
  if (managed.length === 0) return out;

  const ids = managed.map((b) => b.id);
  const { data: existing, error } = await supabase
    .from("bike_admin_overrides")
    .select("bike_id, eligible")
    .in("bike_id", ids);
  if (error) {
    console.error("[sync] leitura de overrides falhou:", safeError(error));
    return out;
  }
  const current = new Map((existing ?? []).map((r: { bike_id: string; eligible: boolean }) => [r.bike_id, r.eligible]));

  const now = new Date().toISOString();
  const changes: { bike_id: string; before: boolean | null; after: boolean }[] = [];
  for (const bike of managed) {
    const after = bike.sheetEligible === true;
    if (after) out.eligible++; else out.notEligible++;
    const before = current.has(bike.id) ? (current.get(bike.id) as boolean) : null;
    if (before === after) continue;
    changes.push({ bike_id: bike.id, before, after });
  }
  if (changes.length === 0) return out;

  const { error: upErr } = await supabase.from("bike_admin_overrides").upsert(
    changes.map((c) => ({ bike_id: c.bike_id, eligible: c.after, updated_by: "sheet", updated_at: now })),
  );
  if (upErr) {
    console.error("[sync] upsert de overrides falhou:", safeError(upErr));
    return out;
  }
  out.synced = changes.length;

  const { error: auditErr } = await supabase.from("bike_admin_audit").insert(
    changes.map((c) => ({
      action: "sheet-status",
      bike_id: c.bike_id,
      detail: { eligible: c.after, previous: c.before, origin: "planilha" },
      actor: "sheet",
    })),
  );
  if (auditErr) console.error("[sync] audit de Status falhou:", safeError(auditErr));

  return out;
}

interface ReconcileResult {
  jobsCreated: number;
  baselines: number;
  assetsQueued: number;
  assetsReview: number;
}

/**
 * Efeitos downstream após um snapshot novo: estado de imagem e jobs técnicos.
 * Nunca lança — cada bike é independente e falhas são apenas logadas.
 */
async function reconcileDownstream(
  supabase: SupabaseClient,
  bikes: SnapshotBike[],
): Promise<ReconcileResult> {
  const out: ReconcileResult = { jobsCreated: 0, baselines: 0, assetsQueued: 0, assetsReview: 0 };

  for (const bike of bikes) {
    // Pendentes (draft) e inativas não geram efeitos downstream.
    if (bike.status !== "eligible") continue;
    try {
      // ---- Imagem ----
      // Sem "Imagem da Bike": a origem passa a ser a própria página do Link
      // Vitale (Mercado Livre), resolvida com segurança pelo worker.
      const sourceUrl = bike.image ?? bike.linkVitale ?? null;
      const sourceKind = bike.image ? "image" : "page";
      if (sourceUrl) {
        const { data: asset } = await supabase
          .from("bike_assets")
          .select("bike_id, source_url, stored_source_url, status, attempts")
          .eq("bike_id", bike.id)
          .maybeSingle();

        if (!asset) {
          const { error } = await supabase.from("bike_assets").insert({
            bike_id: bike.id,
            source_url: sourceUrl,
            source_kind: sourceKind,
            status: "pending",
          });
          if (error) console.error(`[sync] asset insert ${bike.id}:`, safeError(error));
          else out.assetsQueued++;
        } else if (asset.status === "ready") {
          // URL nova com imagem existente: apenas marca revisão, preserva a atual.
          if (asset.stored_source_url && asset.stored_source_url !== sourceUrl && asset.source_url !== sourceUrl) {
            const { error } = await supabase.from("bike_assets")
              .update({
                source_url: sourceUrl,
                source_kind: sourceKind,
                needs_review: true,
                updated_at: new Date().toISOString(),
              })
              .eq("bike_id", bike.id);
            if (error) console.error(`[sync] asset review ${bike.id}:`, safeError(error));
            else out.assetsReview++;
          }
        } else if (asset.status !== "downloading" && asset.source_url !== sourceUrl) {
          // Ainda não baixada e a origem mudou: reprocessa com a origem nova.
          const { error } = await supabase.from("bike_assets")
            .update({
              source_url: sourceUrl,
              source_kind: sourceKind,
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

      // ---- Perfil técnico (IA): event-driven por id + Descrição ----
      // Preço, link, Status, autonomia e capacidade NÃO entram no hash técnico
      // e portanto nunca disparam IA.
      const th = technicalHash(bike);
      const { data: profile } = await supabase
        .from("bike_profiles")
        .select("bike_id, technical_hash, status")
        .eq("bike_id", bike.id)
        .maybeSingle();

      if (profile && profile.technical_hash === th) continue; // já cobre esta versão

      if (!profile && LEGACY_IDS.has(bike.id)) {
        // Baseline sem IA: registra o hash atual das 19 legadas preservando o
        // ranking estático. Só uma mudança futura de Descrição gera job.
        const { error } = await supabase.from("bike_profiles").insert({
          bike_id: bike.id,
          technical_hash: th,
          status: "baseline",
          data: null,
          missing_fields: [],
        });
        if (error) console.error(`[sync] baseline ${bike.id}:`, safeError(error));
        else out.baselines++;
        continue;
      }

      const { data: openJob } = await supabase
        .from("bike_profile_jobs")
        .select("id")
        .eq("bike_id", bike.id)
        .eq("technical_hash", th)
        .in("status", ["queued", "processing"])
        .maybeSingle();
      if (openJob) continue;

      const { error: jobErr } = await supabase.from("bike_profile_jobs").insert({
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
      if (jobErr) console.error(`[sync] job insert ${bike.id}:`, safeError(jobErr));
      else out.jobsCreated++;
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

// ---------- Radar de preços (analytics, event-sourced) ----------

export interface PriceHistoryCandidate {
  bike_id: string;
  bike_name: string;
  price: number;
  link_vitale: string | null;
  eligible: boolean;
}

export interface PriceHistoryLastRow {
  bike_id: string;
  price: number | string;
  link_vitale: string | null;
  eligible: boolean;
}

/**
 * Decide quais bikes merecem um novo evento de histórico.
 * Só grava quando preço, link ou elegibilidade mudaram — ou quando a bike
 * ainda não tem baseline. Nunca duplica linhas idênticas a cada hora.
 */
export function priceHistoryDelta(
  candidates: PriceHistoryCandidate[],
  last: PriceHistoryLastRow[],
): { rows: PriceHistoryCandidate[]; baselines: number } {
  const lastById = new Map(last.map((r) => [r.bike_id, r]));
  const rows: PriceHistoryCandidate[] = [];
  let baselines = 0;
  for (const c of candidates) {
    if (!(c.price > 0)) continue;
    const prev = lastById.get(c.bike_id);
    if (!prev) {
      baselines++;
      rows.push(c);
      continue;
    }
    const samePrice = Number(prev.price) === Number(c.price);
    const sameLink = (prev.link_vitale ?? null) === (c.link_vitale ?? null);
    const sameEligible = prev.eligible === c.eligible;
    if (samePrice && sameLink && sameEligible) continue;
    rows.push(c);
  }
  return { rows, baselines };
}

/**
 * Persiste os eventos do Radar de Preços. NUNCA lança: falha de analytics não
 * pode quebrar o catálogo nem o quiz.
 */
async function recordPriceHistory(
  supabase: SupabaseClient,
  bikes: SnapshotBike[],
  runId: string | null,
): Promise<{ events: number; changedIds: Set<string> }> {
  try {
    const candidates: PriceHistoryCandidate[] = bikes
      .filter((b) => b.status === "eligible" && typeof b.price === "number" && b.price > 0)
      .map((b) => ({
        bike_id: b.id,
        bike_name: b.name,
        price: b.price,
        link_vitale: b.linkVitale ?? null,
        eligible: b.sheetEligible === true,
      }));
    if (candidates.length === 0) return { events: 0, changedIds: new Set<string>() };

    const ids = candidates.map((c) => c.bike_id);
    const { data, error } = await supabase
      .from("bike_price_history")
      .select("bike_id, price, link_vitale, eligible, observed_at")
      .in("bike_id", ids)
      .order("observed_at", { ascending: false });
    if (error) throw error;

    const seen = new Set<string>();
    const last: PriceHistoryLastRow[] = [];
    for (const row of (data ?? []) as (PriceHistoryLastRow & { observed_at: string })[]) {
      if (seen.has(row.bike_id)) continue;
      seen.add(row.bike_id);
      last.push(row);
    }

    const { rows, baselines } = priceHistoryDelta(candidates, last);
    const changedIds = new Set(rows.map((r) => r.bike_id));
    if (rows.length === 0) return { events: 0, changedIds };

    const observedAt = new Date().toISOString();
    const { error: insErr } = await supabase.from("bike_price_history").insert(
      rows.map((r) => ({
        ...r,
        observed_at: observedAt,
        source_run_id: runId,
        source: baselines > 0 && !seen.has(r.bike_id) ? "new_baseline" : "sync",
        confidence: "observed",
      })),
    );
    if (insErr) throw insErr;
    return { events: rows.length, changedIds };
  } catch (e) {
    console.error("[sync] histórico de preços:", safeError(e));
    return { events: 0, changedIds: new Set<string>() };
  }
}

/**
 * Fechamento diário confirmado por execução bem-sucedida. NUNCA lança.
 */
async function recordPriceDaily(
  supabase: SupabaseClient,
  bikes: SnapshotBike[],
  changedIds: Set<string>,
  at: Date,
): Promise<number> {
  try {
    const candidates: DailyCandidate[] = bikes
      .filter((b) => b.status === "eligible" && typeof b.price === "number" && b.price > 0)
      .map((b) => ({ bike_id: b.id, price: b.price, changed: changedIds.has(b.id) }));
    if (candidates.length === 0) return 0;

    const day = saoPauloDay(at);
    const { data, error } = await supabase
      .from("bike_price_daily")
      .select("bike_id, day, low, high, verified_runs, changed")
      .eq("day", day)
      .in("bike_id", candidates.map((c) => c.bike_id));
    if (error) throw error;

    const rows = buildDailyRows(candidates, (data ?? []) as DailyExisting[], at);
    if (rows.length === 0) return 0;
    const { error: upErr } = await supabase
      .from("bike_price_daily")
      .upsert(rows, { onConflict: "bike_id,day" });
    if (upErr) throw upErr;
    return rows.length;
  } catch (e) {
    console.error("[sync] fechamento diário:", safeError(e));
    return 0;
  }
}

// ---------- Histórico auditável ----------

type RunStatus = "ok" | "ok_no_changes" | "skipped" | "error";

/** Abre a linha de histórico. Nunca lança: histórico não pode quebrar o sync. */
async function startRun(
  supabase: SupabaseClient,
  origin: "auto" | "manual",
  startedAt: Date,
  scheduledFor: Date | null,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.from("bike_sync_runs").insert({
      origin,
      scheduled_for: scheduledFor ? scheduledFor.toISOString() : null,
      started_at: startedAt.toISOString(),
      status: "running",
    }).select("id").maybeSingle();
    if (error) throw error;
    return (data as { id: string } | null)?.id ?? null;
  } catch (e) {
    console.error("[sync] histórico start:", safeError(e));
    return null;
  }
}

/** Fecha a linha de histórico e grava o diff. Nunca lança. */
async function finishRun(
  supabase: SupabaseClient,
  runId: string | null,
  startedAt: Date,
  fields: {
    status: RunStatus;
    recognized?: number | null;
    ignored?: number | null;
    snapshotWritten?: boolean;
    errorMessage?: string | null;
    detail?: Record<string, unknown>;
    changes?: BikeFieldChange[];
  },
): Promise<void> {
  if (!runId) return;
  const finishedAt = new Date();
  const changes = fields.changes ?? [];
  try {
    await supabase.from("bike_sync_runs").update({
      status: fields.status,
      finished_at: finishedAt.toISOString(),
      duration_ms: finishedAt.getTime() - startedAt.getTime(),
      recognized_count: fields.recognized ?? null,
      ignored_count: fields.ignored ?? null,
      snapshot_written: fields.snapshotWritten ?? false,
      changed_bikes: countChangedBikes(changes),
      changed_fields: changes.length,
      error_message: fields.errorMessage ?? null,
      detail: fields.detail ?? {},
    }).eq("id", runId);

    if (changes.length > 0) {
      await supabase.from("bike_sync_changes").insert(
        changes.slice(0, 500).map((c) => ({ ...c, run_id: runId })),
      );
    }
  } catch (e) {
    console.error("[sync] histórico finish:", safeError(e));
  }
}

/**
 * Executa a sincronização. Retorna { status, body } pronto para resposta HTTP.
 * force=true ignora o agendamento (uso exclusivo admin/service role) e NUNCA
 * adia a próxima execução automática (o next_run_at é sempre o próximo HH:07).
 */
export async function runBikeCatalogSync(
  supabase: SupabaseClient,
  opts: { force: boolean; supabaseUrl: string; serviceKey: string },
): Promise<{ status: number; body: SyncOutcome }> {
  const now = new Date();
  const origin: "auto" | "manual" = opts.force ? "manual" : "auto";
  const scheduledFor = opts.force ? null : currentScheduledSlot(now);
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

  // Tolerância: o cron pode chegar milissegundos antes do horário exato.
  if (!opts.force) {
    lockQuery = lockQuery.lte(
      "next_run_at",
      new Date(now.getTime() + DUE_TOLERANCE_MS).toISOString(),
    );
  }

  const { data: locked, error: lockError } = await lockQuery.select("id").maybeSingle();
  if (lockError) return { status: 500, body: { ok: false, error: safeError(lockError) } };
  if (!locked) {
    const runId = await startRun(supabase, origin, now, scheduledFor);
    await finishRun(supabase, runId, now, {
      status: "skipped",
      errorMessage: null,
      detail: { reason: "not_due_or_running" },
    });
    return { status: 200, body: { ok: true, skipped: true, reason: "not_due_or_running", runId: runId ?? undefined } };
  }

  const runId = await startRun(supabase, origin, now, scheduledFor);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(SHEET_CSV_URL, { signal: controller.signal, redirect: "follow" });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Planilha indisponível (HTTP ${res.status})`);
    const csv = await res.text();

    const result = buildSnapshotFromCsv(csv);
    if (result.recognizedCount === 0) throw new Error("Nenhuma linha válida reconhecida na planilha");

    const { data: current } = await supabase
      .from("bike_catalog_snapshot")
      .select("content_hash, data")
      .eq("id", "current")
      .maybeSingle();

    const previousBikes = Array.isArray((current?.data as { bikes?: unknown } | null)?.bikes)
      ? ((current!.data as { bikes: SnapshotBike[] }).bikes)
      : [];

    // Linhas ruins não apagam bikes boas: a versão anterior é preservada.
    const bikes = mergeWithPreserved(result.bikes, result.pending, previousBikes);
    const hash = snapshotHash(bikes, result.pending);

    let changed = false;
    let changes: BikeFieldChange[] = [];
    let downstream: ReconcileResult = { jobsCreated: 0, baselines: 0, assetsQueued: 0, assetsReview: 0 };

    if (current?.content_hash !== hash) {
      changed = true;
      changes = diffBikes(previousBikes, bikes);

      const { error: upErr } = await supabase.from("bike_catalog_snapshot").upsert({
        id: "current",
        data: {
          generated_at: new Date().toISOString(),
          bikes,
          pending: result.pending,
          ignored: result.ignored,
        },
        content_hash: hash,
        recognized_count: result.recognizedCount,
        ignored_count: result.ignoredCount + result.pendingCount,
        updated_at: new Date().toISOString(),
      });
      if (upErr) throw new Error(`Falha ao gravar snapshot: ${upErr.message}`);
    }

    // Status da planilha é espelhado em TODA execução bem-sucedida (idempotente).
    const overrides = await syncSheetOverrides(supabase, bikes);
    if (changed) downstream = await reconcileDownstream(supabase, bikes);

    // Analytics do Radar de Preços: idempotente e isolado do catálogo/quiz.
    const priceHistory = await recordPriceHistory(supabase, bikes, runId);
    const priceEvents = priceHistory.events;
    const dailyRows = await recordPriceDaily(supabase, bikes, priceHistory.changedIds, new Date());

    // Pendências visíveis no painel: linhas nomeadas incompletas + estruturais.
    const pendingRows = [
      ...result.pending.map((p) => ({
        line: p.line,
        name: p.name,
        reason: `Pendente — faltam: ${p.missingFields.join(", ")}`,
      })),
      ...result.ignored,
    ];

    const done = new Date();
    await supabase.from("bike_catalog_sync_state").update({
      status: "ok",
      last_success_at: done.toISOString(),
      // Agenda fixa: próximo HH:07 (o trigger do banco normaliza igualmente).
      next_run_at: nextScheduledRun(done).toISOString(),
      recognized_count: result.recognizedCount,
      ignored_count: pendingRows.length,
      ignored_rows: pendingRows,
      error_message: null,
      running_since: null,
      updated_at: done.toISOString(),
    }).eq("id", "current");

    await finishRun(supabase, runId, now, {
      status: changed ? "ok" : "ok_no_changes",
      recognized: result.recognizedCount,
      ignored: pendingRows.length,
      snapshotWritten: changed,
      changes,
      detail: {
        drafts: result.draftCount,
        pending: result.pendingCount,
        blank: result.blankCount,
        jobsCreated: downstream.jobsCreated,
        baselines: downstream.baselines,
        assetsQueued: downstream.assetsQueued,
        assetsReview: downstream.assetsReview,
        priceEvents,
        dailyRows,
        overridesSynced: overrides.synced,
      },
    });

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
        pending: result.pendingCount,
        ignored: pendingRows.length,
        drafts: result.draftCount,
        blank: result.blankCount,
        jobsCreated: downstream.jobsCreated,
        baselines: downstream.baselines,
        assetsQueued: downstream.assetsQueued,
        assetsReview: downstream.assetsReview,
        overridesSynced: overrides.synced,
        eligible: overrides.eligible,
        notEligible: overrides.notEligible,
        changedBikes: countChangedBikes(changes),
        runId: runId ?? undefined,
      },
    };
  } catch (e) {
    const message = safeError(e);
    const done = new Date();
    await supabase.from("bike_catalog_sync_state").update({
      status: "error",
      error_message: message,
      next_run_at: retryAt(done).toISOString(),
      running_since: null,
      updated_at: done.toISOString(),
    }).eq("id", "current");
    await finishRun(supabase, runId, now, { status: "error", errorMessage: message });
    return { status: 500, body: { ok: false, error: message, runId: runId ?? undefined } };
  }
}

/** Retry curto após falha, nunca depois do próximo horário programado. */
function retryAt(from: Date): Date {
  const retry = new Date(from.getTime() + RETRY_INTERVAL_MS);
  const scheduled = nextScheduledRun(from);
  return retry.getTime() < scheduled.getTime() ? retry : scheduled;
}
