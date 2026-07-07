import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BIKES } from "@/data/bikes";
import type { SDRApiResponse, SDRContext, SDRMessage } from "./types";

const STORAGE_PREFIX = "sdr_lucas_thread_";
const AFF_FLAG_PREFIX = "sdr_lucas_aff_shown_";
const MAX_HISTORY_TO_SEND = 20;

function uid() {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadPersisted(leadId: string | null): SDRMessage[] {
  if (!leadId || typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + leadId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as SDRMessage[];
  } catch {}
  return [];
}

function persist(leadId: string | null, msgs: SDRMessage[]) {
  if (!leadId || typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_PREFIX + leadId, JSON.stringify(msgs));
  } catch {}
}

function buildCatalog(ctx: SDRContext) {
  // Envia catálogo enxuto para a IA (sem URLs).
  return BIKES.map((b) => ({
    id: b.id,
    name: b.name,
    shortDescription: b.shortDescription,
    fullDescription: b.fullDescription,
    autonomyKm: b.autonomyKm,
    capacity: b.capacity,
    weightSupportKg: b.weightSupportKg,
    internalPrice: b.internalPrice,
    strengths: b.strengths,
    diferencial: b.diferencial,
    perfilIndicado: b.perfilIndicado,
    budgetTiers: b.budgetTiers,
  }));
}

export function useLucasChat(ctx: SDRContext, opts: { onEvent?: (name: string, payload?: Record<string, any>) => void }) {
  const { leadId } = ctx;
  const [messages, setMessages] = useState<SDRMessage[]>(() => loadPersisted(leadId));
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const affiliateShownRef = useRef<boolean>(false);
  const startedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!leadId) return;
    try {
      affiliateShownRef.current = sessionStorage.getItem(AFF_FLAG_PREFIX + leadId) === "true";
    } catch {}
  }, [leadId]);

  useEffect(() => {
    persist(leadId, messages);
  }, [leadId, messages]);

  const appendAssistantIntro = useCallback(() => {
    if (messages.length > 0) return;
    const primary = ctx.recommendation?.primary?.name;
    const secondary = ctx.recommendation?.secondary?.name;
    let text = "";
    if (primary && secondary) {
      text = `Oi, eu sou o Lucas, assistente virtual da Vitale.\n\nO quiz indicou a ${primary} e a ${secondary} para o seu perfil.\n\nVocê quer comprar agora ou comparar rapidamente antes de decidir?`;
    } else if (primary) {
      text = `Oi, eu sou o Lucas, assistente virtual da Vitale.\n\nO quiz indicou a ${primary} para o seu perfil.\n\nVocê quer comprar agora ou tirar alguma dúvida antes?`;
    } else {
      text = `Oi, eu sou o Lucas, assistente virtual da Vitale. Como posso te ajudar com sua escolha?`;
    }
    setMessages([{ id: uid(), role: "assistant", content: text, createdAt: Date.now() }]);
  }, [ctx.recommendation?.primary?.name, ctx.recommendation?.secondary?.name, messages.length]);

  const sendMessage = useCallback(async (userText: string, meta?: { isQuickReply?: boolean; label?: string }) => {
    const trimmed = userText.trim();
    if (!trimmed) return;

    const userMsg: SDRMessage = { id: uid(), role: "user", content: trimmed, createdAt: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setStatus("sending");
    setErrorMsg(null);

    opts.onEvent?.(meta?.isQuickReply ? "sdr_quick_question_clicked" : "sdr_message_sent", {
      message: trimmed,
      label: meta?.label,
    });

    if (!startedRef.current) {
      startedRef.current = true;
      opts.onEvent?.("sdr_conversation_closed", { started_at: new Date().toISOString(), phase: "started" });
    }

    const history = [...messages, userMsg]
      .slice(-MAX_HISTORY_TO_SEND)
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const { data, error } = await supabase.functions.invoke("sdr-lucas-chat", {
        body: {
          lead_id: leadId,
          user_message: trimmed,
          history: history.slice(0, -1), // exclude the message we're about to send
          context: {
            name: ctx.name,
            answers: ctx.answers,
            labels: ctx.labels,
            clusters: ctx.clusters,
            recommendation: ctx.recommendation
              ? {
                  primary: ctx.recommendation.primary
                    ? {
                        id: ctx.recommendation.primary.id,
                        name: ctx.recommendation.primary.name,
                        shortDescription: ctx.recommendation.primary.shortDescription,
                        autonomyKm: ctx.recommendation.primary.autonomyKm,
                        capacity: ctx.recommendation.primary.capacity,
                        weightSupportKg: ctx.recommendation.primary.weightSupportKg,
                        internalPrice: ctx.recommendation.primary.internalPrice,
                        strengths: ctx.recommendation.primary.strengths,
                        diferencial: ctx.recommendation.primary.diferencial,
                        perfilIndicado: ctx.recommendation.primary.perfilIndicado,
                        budgetTiers: ctx.recommendation.primary.budgetTiers,
                      }
                    : null,
                  secondary: ctx.recommendation.secondary
                    ? {
                        id: ctx.recommendation.secondary.id,
                        name: ctx.recommendation.secondary.name,
                        shortDescription: ctx.recommendation.secondary.shortDescription,
                        autonomyKm: ctx.recommendation.secondary.autonomyKm,
                        capacity: ctx.recommendation.secondary.capacity,
                        weightSupportKg: ctx.recommendation.secondary.weightSupportKg,
                        internalPrice: ctx.recommendation.secondary.internalPrice,
                        strengths: ctx.recommendation.secondary.strengths,
                        diferencial: ctx.recommendation.secondary.diferencial,
                        perfilIndicado: ctx.recommendation.secondary.perfilIndicado,
                        budgetTiers: ctx.recommendation.secondary.budgetTiers,
                      }
                    : null,
                  reasonPrimary: ctx.recommendation.reasonPrimary,
                  reasonSecondary: ctx.recommendation.reasonSecondary,
                }
              : undefined,
            origin: ctx.origin,
            catalog: buildCatalog(ctx),
            affiliate_disclosure_shown: affiliateShownRef.current,
          },
        },
      });
      if (error) throw error;
      const resp = data as SDRApiResponse;
      if (!resp || typeof resp.reply !== "string") throw new Error("empty_response");

      const isFirstLink = !!resp.offer_link && !!resp.bike_for_link && !affiliateShownRef.current;
      const showAffiliate = isFirstLink || !!resp.show_affiliate_disclosure;

      const assistantMsg: SDRMessage = {
        id: uid(),
        role: "assistant",
        content: resp.reply,
        createdAt: Date.now(),
        bikeForLink: resp.offer_link ? (resp.bike_for_link ?? null) : null,
        showAffiliateDisclosure: showAffiliate && !!resp.offer_link,
        offerGroup: !!resp.offer_group,
        offerList: !!resp.offer_list,
        offerHandoff: !!resp.offer_handoff,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (showAffiliate && leadId) {
        affiliateShownRef.current = true;
        try { sessionStorage.setItem(AFF_FLAG_PREFIX + leadId, "true"); } catch {}
      }

      opts.onEvent?.("sdr_response_received", {
        intent_level: resp.intent_level,
        preferred_bike: resp.preferred_bike,
        main_objection: resp.main_objection,
        suggested_action: resp.suggested_action,
      });
      if (resp.intent_level === "high") opts.onEvent?.("sdr_high_intent_detected", { preferred_bike: resp.preferred_bike });
      if (resp.offer_link) opts.onEvent?.("sdr_link_offered", { bike_for_link: resp.bike_for_link });
      setStatus("idle");
    } catch (err: any) {
      console.error("[sdr] send failed", err);
      const msg = err?.message?.includes("rate_limited")
        ? "Muitas mensagens em pouco tempo. Aguarde um instante e tente de novo."
        : "No momento estou com dificuldade para processar sua pergunta. Pode tentar novamente? Se preferir, posso te encaminhar para um especialista.";
      setMessages((prev) => [...prev, {
        id: uid(), role: "assistant", content: msg, createdAt: Date.now(), offerHandoff: true,
      }]);
      setStatus("error");
      setErrorMsg(msg);
    }
  }, [messages, leadId, ctx, opts]);

  const reset = useCallback(() => {
    setMessages([]);
    if (leadId) try { sessionStorage.removeItem(STORAGE_PREFIX + leadId); } catch {}
  }, [leadId]);

  return { messages, status, errorMsg, sendMessage, appendAssistantIntro, reset };
}
