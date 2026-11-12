import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { EDITORIAL_ALERT_RECIPIENT } from "../_shared/editorial-alert.ts";

type Stage = "preparação" | "RSS" | "Instagram";

const reasons: Record<string, string> = {
  podcast_article_unavailable: "O artigo do episódio deixou de estar disponível.",
  podcast_cover_or_summary_missing: "O artigo publicado ainda precisa de capa ou resumo.",
  podcast_cover_render_failed: "A capa quadrada não pôde ser gerada.",
  podcast_cover_save_failed: "A capa quadrada não pôde ser salva.",
  podcast_queue_audio_missing: "O MP3 está indisponível no armazenamento.",
  podcast_queue_empty: "A fila ficou sem um episódio preparado para esta janela.",
  podcast_slot_missed: "Nenhum episódio foi publicado nesta janela.",
  podcast_release_failed: "O Lovable encontrou um erro ao liberar o episódio no RSS.",
  podcast_workdrive_check_failed: "O Lovable não conseguiu conferir o MP3 no WorkDrive.",
  podcast_workdrive_import_failed: "O Lovable não conseguiu importar o MP3 do WorkDrive.",
  podcast_instagram_unconfirmed: "A Meta não confirmou a publicação nesta janela.",
  meta_authorization: "A autorização de publicação do Instagram precisa de atenção.",
  not_configured: "A integração com o Instagram está sem configuração.",
  wrong_instagram_account: "A conta autorizada na Meta não corresponde à Vitale.",
};

const windowFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short",
});

export async function notifyPodcastError(db: SupabaseClient, stage: Stage, event: string, error: unknown) {
  const code = error instanceof Error ? error.message : error;
  const reason = typeof code === "string" && /^[a-z0-9_]{1,100}$/.test(code)
    ? code : "podcast_operation_failed";
  const identity = `${stage}:${event}:${reason}`;
  const safeEvent = /^[A-Za-z0-9:_+.-]{1,70}$/.test(event) ? event : "worker";
  if (safeEvent !== event) return;
  const reference = /^\d{4}-\d{2}-\d{2}T/.test(event) && Number.isFinite(Date.parse(event))
    ? `${windowFormat.format(new Date(event))} (Brasília)` : event;
  try {
    const prior = await db.from("editorial_audit_logs").select("action,created_at")
      .eq("entity_type", "podcast").eq("entity_id", identity)
      .in("action", ["podcast_alert_sent", "podcast_alert_failed"])
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (prior.error) throw new Error("podcast_alert_audit_failed");
    if (prior.data?.action === "podcast_alert_sent" ||
      (prior.data && Date.parse(prior.data.created_at) > Date.now() - 600_000)) return;

    const settings = await db.from("newsletter_settings").select("from_email").eq("singleton", true).single();
    const key = Deno.env.get("RESEND_API_KEY");
    const gateway = Deno.env.get("LOVABLE_API_KEY");
    if (settings.error || !settings.data?.from_email || !key) throw new Error("podcast_alert_not_configured");

    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity));
    const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const response = await fetch(gateway ? "https://connector-gateway.lovable.dev/resend/emails" : "https://api.resend.com/emails", {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
      headers: {
        Authorization: `Bearer ${gateway ?? key}`,
        ...(gateway ? { "X-Connection-Api-Key": key } : {}),
        "Content-Type": "application/json",
        "Idempotency-Key": `podcast-error-${hash}`,
      },
      body: JSON.stringify({
        from: settings.data.from_email,
        to: [EDITORIAL_ALERT_RECIPIENT],
        subject: `Vitale: ${stage} do podcast precisa de atenção`,
        text: `A automação encontrou um problema na etapa ${stage}.\nReferência: ${reference}\nMotivo: ${reasons[reason] ?? reason}\nConfira o estado da fila no painel:\nhttps://vitalemobilidade.com/admin/podcasts`,
      }),
    });
    if (!response.ok) throw new Error("podcast_alert_delivery_failed");
    const saved = await db.from("editorial_audit_logs").insert({
      actor: null, action: "podcast_alert_sent", entity_type: "podcast", entity_id: identity,
      detail: { stage, event, code: reason },
    });
    if (saved.error) throw new Error("podcast_alert_audit_failed");
  } catch {
    console.error("[podcast] podcast_alert_failed", stage, safeEvent, reason);
    try {
      await db.from("editorial_audit_logs").insert({
        actor: null, action: "podcast_alert_failed", entity_type: "podcast", entity_id: identity,
        detail: { stage, event, code: reason },
      });
    } catch { /* Preserve the original publication result. */ }
  }
}
