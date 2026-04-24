import { supabase } from "@/integrations/supabase/client";

const PENDING_KEY = "vitale_quiz_pending_lead";
const PENDING_UPDATES_KEY = "vitale_quiz_pending_updates";
const PENDING_EVENTS_KEY = "vitale_quiz_pending_events";

export interface PendingLead {
  payload: Record<string, any>;
  createdAt: string;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function savePendingLead(payload: Record<string, any>) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ payload, createdAt: new Date().toISOString() }));
  } catch (e) {
    console.error("[quiz] Falha ao salvar pending lead em localStorage", e);
  }
}

export function getPendingLead(): PendingLead | null {
  if (typeof window === "undefined") return null;
  return safeParse<PendingLead | null>(localStorage.getItem(PENDING_KEY), null);
}

export function clearPendingLead() {
  try { localStorage.removeItem(PENDING_KEY); } catch {}
}

export function queuePendingUpdate(update: Record<string, any>) {
  try {
    const merged = { ...safeParse<Record<string, any>>(localStorage.getItem(PENDING_UPDATES_KEY), {}), ...update };
    localStorage.setItem(PENDING_UPDATES_KEY, JSON.stringify(merged));
  } catch (e) {
    console.error("[quiz] Falha ao enfileirar update local", e);
  }
}

export function getPendingUpdates(): Record<string, any> {
  if (typeof window === "undefined") return {};
  return safeParse<Record<string, any>>(localStorage.getItem(PENDING_UPDATES_KEY), {});
}

export function clearPendingUpdates() {
  try { localStorage.removeItem(PENDING_UPDATES_KEY); } catch {}
}

export function queuePendingEvent(event: Record<string, any>) {
  try {
    const list = safeParse<any[]>(localStorage.getItem(PENDING_EVENTS_KEY), []);
    list.push(event);
    localStorage.setItem(PENDING_EVENTS_KEY, JSON.stringify(list.slice(-50)));
  } catch (e) {
    console.error("[quiz] Falha ao enfileirar evento local", e);
  }
}

export function getPendingEvents(): any[] {
  if (typeof window === "undefined") return [];
  return safeParse<any[]>(localStorage.getItem(PENDING_EVENTS_KEY), []);
}

export function clearPendingEvents() {
  try { localStorage.removeItem(PENDING_EVENTS_KEY); } catch {}
}

/**
 * Tenta sincronizar lead pendente. Retorna o lead_id sincronizado ou null.
 * Não interrompe o usuário em caso de erro.
 */
export async function retryPendingLeadSync(): Promise<string | null> {
  const pending = getPendingLead();
  if (!pending) return null;

  try {
    const { data, error } = await supabase
      .from("quiz_leads")
      .insert(pending.payload)
      .select("id")
      .single();

    if (error || !data) {
      console.error("[quiz] Retry de lead falhou", error);
      return null;
    }

    const newLeadId = data.id;
    const updates = getPendingUpdates();
    if (Object.keys(updates).length > 0) {
      const { error: upErr } = await supabase
        .from("quiz_leads")
        .update(updates)
        .eq("id", newLeadId);
      if (upErr) console.error("[quiz] Retry de updates falhou", upErr);
    }

    const events = getPendingEvents();
    if (events.length > 0) {
      const eventsWithLead = events.map(ev => ({ ...ev, lead_id: newLeadId }));
      const { error: evErr } = await supabase.from("quiz_events").insert(eventsWithLead);
      if (evErr) console.error("[quiz] Retry de events falhou", evErr);
    }

    clearPendingLead();
    clearPendingUpdates();
    clearPendingEvents();
    console.info("[quiz] Sincronização posterior concluída", { newLeadId });
    return newLeadId;
  } catch (e) {
    console.error("[quiz] Exceção em retryPendingLeadSync", e);
    return null;
  }
}
