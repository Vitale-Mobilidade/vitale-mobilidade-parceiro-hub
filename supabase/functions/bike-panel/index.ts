/**
 * bike-panel — API administrativa do painel /painel-bikes.
 *
 * Ações (POST JSON { action, ... }):
 *  - login           { password, remember }  -> { token, expiresAt }
 *  - validate        (Bearer)                -> { ok, expiresAt }
 *  - logout          (Bearer)                -> { ok }
 *  - get-data        (Bearer)                -> snapshot + sync state + overrides + assets/profiles
 *  - sync-now        (Bearer)                -> executa runBikeCatalogSync(force=true) e aguarda
 *  - set-eligibility (Bearer) { bikeId, eligible } -> upsert override + audit
 *
 * Segurança:
 *  - Senha verificada com PBKDF2-HMAC-SHA-256 timing-safe contra
 *    bike_panel_credentials (service role only). Nunca logamos senha/hash/token.
 *  - Sessões: token opaco; apenas SHA-256 do token é persistido.
 *  - Rate limit/lockout por fingerprint (IP + user-agent).
 *  - CORS restrito aos domínios Vitale e previews Lovable.
 *  - Nenhuma resposta expõe service role nem dados de credencial.
 */

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  generateSessionToken,
  hashSessionToken,
  loginFingerprint,
  verifyPassword,
  SESSION_TTL_SHORT_MS,
  SESSION_TTL_REMEMBER_MS,
  MAX_LOGIN_ATTEMPTS,
  LOCKOUT_MS,
} from "../_shared/panel-crypto.ts";
import { runBikeCatalogSync, safeError } from "../_shared/bike-sync.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED_ORIGINS = new Set([
  "https://vitalemobilidade.com",
  "https://www.vitalemobilidade.com",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
]);
const PREVIEW_ORIGIN_RE =
  /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.(lovable\.app|lovableproject\.com|lovableproject-dev\.com|gptengineer\.run|gpt-eng\.com)$/i;

function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.has(origin) || PREVIEW_ORIGIN_RE.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "https://vitalemobilidade.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsFor(req), "Content-Type": "application/json" },
  });
}

interface PanelSession {
  id: string;
}

/** Exige Bearer token de sessão válida (não revogada, não expirada). */
async function requireSession(supabase: SupabaseClient, req: Request): Promise<PanelSession | null> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (token.length < 20 || token.length > 200) return null;
  let hash: string;
  try {
    hash = await hashSessionToken(token);
  } catch {
    return null;
  }
  const { data, error } = await supabase
    .from("bike_panel_sessions")
    .select("id, expires_at, revoked_at")
    .eq("token_hash", hash)
    .maybeSingle();
  if (error || !data) return null;
  if (data.revoked_at) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;
  // Atualiza last_seen sem bloquear a resposta.
  supabase
    .from("bike_panel_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => undefined);
  return { id: data.id };
}

async function handleLogin(
  supabase: SupabaseClient,
  req: Request,
  body: { password?: unknown; remember?: unknown },
): Promise<Response> {
  const password = typeof body.password === "string" ? body.password : "";
  const remember = body.remember === true;
  if (!password || password.length > 200) {
    return json(req, { ok: false, error: "Credenciais inválidas." }, 401);
  }

  const ip =
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";
  const ua = req.headers.get("user-agent") ?? "";
  const fp = await loginFingerprint(ip, ua);
  const now = new Date();

  // Rate limit / lockout por fingerprint.
  const { data: attemptsRow } = await supabase
    .from("bike_panel_login_attempts")
    .select("attempts, locked_until")
    .eq("fingerprint", fp)
    .maybeSingle();
  if (attemptsRow?.locked_until && new Date(attemptsRow.locked_until).getTime() > now.getTime()) {
    return json(req, { ok: false, error: "Muitas tentativas. Tente novamente em alguns minutos." }, 429);
  }

  const { data: cred } = await supabase
    .from("bike_panel_credentials")
    .select("salt_base64, hash_base64, iterations")
    .eq("id", "current")
    .maybeSingle();
  if (!cred) {
    return json(req, { ok: false, error: "Painel ainda não configurado." }, 503);
  }

  const valid = await verifyPassword(password, cred);
  if (!valid) {
    const attempts = (attemptsRow?.attempts ?? 0) + 1;
    const lockedUntil = attempts >= MAX_LOGIN_ATTEMPTS
      ? new Date(now.getTime() + LOCKOUT_MS).toISOString()
      : null;
    await supabase.from("bike_panel_login_attempts").upsert({
      fingerprint: fp,
      attempts: lockedUntil ? 0 : attempts,
      locked_until: lockedUntil,
      updated_at: now.toISOString(),
    });
    return json(req, { ok: false, error: "Credenciais inválidas." }, 401);
  }

  // Sucesso: limpa tentativas e cria sessão (só o hash do token é persistido).
  await supabase.from("bike_panel_login_attempts").upsert({
    fingerprint: fp,
    attempts: 0,
    locked_until: null,
    updated_at: now.toISOString(),
  });

  const token = generateSessionToken();
  const tokenHash = await hashSessionToken(token);
  const expiresAt = new Date(now.getTime() + (remember ? SESSION_TTL_REMEMBER_MS : SESSION_TTL_SHORT_MS));
  const { error: sessErr } = await supabase.from("bike_panel_sessions").insert({
    token_hash: tokenHash,
    remember,
    expires_at: expiresAt.toISOString(),
  });
  if (sessErr) {
    return json(req, { ok: false, error: "Não foi possível iniciar a sessão." }, 500);
  }
  return json(req, { ok: true, token, expiresAt: expiresAt.toISOString() });
}

async function handleGetData(supabase: SupabaseClient, req: Request): Promise<Response> {
  const [snap, state, overrides, assets, profiles] = await Promise.all([
    supabase.from("bike_catalog_snapshot").select("id, data, updated_at").eq("id", "current").maybeSingle(),
    supabase.from("bike_catalog_sync_state").select("*").eq("id", "current").maybeSingle(),
    supabase.from("bike_admin_overrides").select("bike_id, eligible, updated_by, updated_at"),
    supabase.from("bike_assets")
      .select("bike_id, source_url, status, needs_review, error_message, public_url, updated_at"),
    supabase.from("bike_profiles").select("bike_id, status, updated_at, error_message"),
  ]);
  const firstError = [snap, state, overrides, assets, profiles].find((r) => r.error);
  if (firstError?.error) {
    return json(req, { ok: false, error: "Falha ao carregar dados do painel." }, 500);
  }
  return json(req, {
    ok: true,
    snapshot: snap.data ?? null,
    syncState: state.data ?? null,
    overrides: overrides.data ?? [],
    assets: assets.data ?? [],
    profiles: profiles.data ?? [],
  });
}

async function handleSyncNow(supabase: SupabaseClient, req: Request): Promise<Response> {
  const { status, body } = await runBikeCatalogSync(supabase, {
    force: true,
    supabaseUrl: SUPABASE_URL,
    serviceKey: SERVICE_ROLE_KEY,
  });
  await supabase.from("bike_admin_audit").insert({
    action: "sync-now",
    bike_id: null,
    detail: {
      ok: body.ok,
      skipped: body.skipped ?? false,
      recognized: body.recognized ?? null,
      ignored: body.ignored ?? null,
      snapshotWritten: body.snapshotWritten ?? false,
    },
    actor: "painel-admin",
  });
  if (body.skipped) {
    return json(req, { ok: false, error: "Já existe uma sincronização em andamento. Aguarde alguns instantes." }, 409);
  }
  return json(req, body, status);
}

/**
 * get-history — histórico auditável paginado.
 * Retorna as execuções (automáticas e manuais, com sucesso ou erro), o diff por
 * bike de cada uma e, na mesma janela de tempo, as mudanças de elegibilidade
 * registradas em bike_admin_audit.
 */
async function handleGetHistory(
  supabase: SupabaseClient,
  req: Request,
  body: { page?: unknown; pageSize?: unknown; origin?: unknown; status?: unknown },
): Promise<Response> {
  const page = Math.max(0, Math.min(500, Number(body.page) || 0));
  const pageSize = Math.max(5, Math.min(50, Number(body.pageSize) || 20));
  const origin = typeof body.origin === "string" ? body.origin : "all";
  const status = typeof body.status === "string" ? body.status : "all";
  const from = page * pageSize;

  let q = supabase
    .from("bike_sync_runs")
    .select(
      "id, origin, scheduled_for, started_at, finished_at, status, duration_ms, recognized_count, ignored_count, snapshot_written, changed_bikes, changed_fields, error_message, detail",
      { count: "exact" },
    )
    .order("started_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (origin === "auto" || origin === "manual") q = q.eq("origin", origin);
  if (status === "error") q = q.eq("status", "error");
  else if (status === "skipped") q = q.eq("status", "skipped");
  else if (status === "changes") q = q.gt("changed_fields", 0);
  else if (status === "ok") q = q.in("status", ["ok", "ok_no_changes"]);

  const { data: runs, error, count } = await q;
  if (error) {
    console.error("[bike-panel] get-history:", safeError(error));
    return json(req, { ok: false, error: "Falha ao carregar o histórico." }, 500);
  }

  const runList = runs ?? [];
  const ids = runList.map((r) => r.id as string);
  const [changesRes, auditRes] = await Promise.all([
    ids.length
      ? supabase
          .from("bike_sync_changes")
          .select("run_id, bike_id, bike_name, change_type, field, field_label, old_value, new_value")
          .in("run_id", ids)
          .order("bike_name", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("bike_admin_audit")
      .select("id, action, bike_id, detail, actor, created_at")
      .eq("action", "set-eligibility")
      .order("created_at", { ascending: false })
      .limit(pageSize * 3),
  ]);

  return json(req, {
    ok: true,
    page,
    pageSize,
    total: count ?? runList.length,
    runs: runList,
    changes: changesRes.data ?? [],
    eligibilityAudit: auditRes.data ?? [],
  });
}

async function handleSetEligibility(
  supabase: SupabaseClient,

  req: Request,
  body: { bikeId?: unknown; eligible?: unknown },
): Promise<Response> {
  const bikeId = typeof body.bikeId === "string" ? body.bikeId.trim() : "";
  const eligible = body.eligible;
  if (!bikeId || bikeId.length > 80 || typeof eligible !== "boolean") {
    return json(req, { ok: false, error: "Parâmetros inválidos." }, 400);
  }
  const { error } = await supabase.from("bike_admin_overrides").upsert({
    bike_id: bikeId,
    eligible,
    updated_by: "painel-admin",
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("[bike-panel] set-eligibility:", safeError(error));
    return json(req, { ok: false, error: "Não foi possível salvar a elegibilidade." }, 500);
  }
  await supabase.from("bike_admin_audit").insert({
    action: "set-eligibility",
    bike_id: bikeId,
    detail: { eligible },
    actor: "painel-admin",
  });
  return json(req, { ok: true, bikeId, eligible });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsFor(req) });
  if (req.method !== "POST") return json(req, { ok: false, error: "Método não permitido." }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(req, { ok: false, error: "Requisição inválida." }, 400);
  }
  const action = typeof body.action === "string" ? body.action : "";

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    if (action === "login") return await handleLogin(supabase, req, body);

    // Todas as demais ações exigem sessão válida (Bearer).
    const session = await requireSession(supabase, req);
    if (!session) return json(req, { ok: false, error: "Sessão inválida ou expirada." }, 401);

    switch (action) {
      case "validate": {
        return json(req, { ok: true });
      }
      case "logout": {
        await supabase.from("bike_panel_sessions")
          .update({ revoked_at: new Date().toISOString() })
          .eq("id", session.id);
        return json(req, { ok: true });
      }
      case "get-data":
        return await handleGetData(supabase, req);
      case "sync-now":
        return await handleSyncNow(supabase, req);
      case "set-eligibility":
        return await handleSetEligibility(supabase, req, body);
      default:
        return json(req, { ok: false, error: "Ação desconhecida." }, 400);
    }
  } catch (e) {
    console.error("[bike-panel] erro:", safeError(e));
    return json(req, { ok: false, error: "Erro interno." }, 500);
  }
});
