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

/** Detecta intenção clara de compra na frase do usuário. */
function detectPurchaseIntent(text: string, forced?: "buy_primary" | "buy_secondary" | "compare" | "doubts") {
  if (forced === "buy_primary") return "buy_primary" as const;
  if (forced === "buy_secondary") return "buy_secondary" as const;
  if (forced === "compare" || forced === "doubts") return null;
  const t = text.toLowerCase();
  const secondaryRe = /(segunda|alternativa|a outra|outra opção|a 2|a segunda)/;
  const buyRe = /(quero comprar|comprar agora|onde compro|me manda o link|manda o link|qual o link|vou comprar|quero essa|quero a principal|quero a primeira|quero a segunda|como faço para comprar|quanto custa|onde encontro|qual você compraria|já decidi|vou fechar|comprar a recomendada|onde comprar)/;
  if (buyRe.test(t)) return secondaryRe.test(t) ? "buy_secondary" as const : "buy_primary" as const;
  return null;
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

  const sendMessage = useCallback(async (userText: string, meta?: { isQuickReply?: boolean; label?: string; forceIntent?: "buy_primary" | "buy_secondary" | "compare" | "doubts" }) => {
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

    // ---- Short-circuit: intenção de compra clara ----
    // Detecta padrões inequívocos e responde IMEDIATAMENTE com os botões de compra,
    // sem esperar a IA. Isso garante o comportamento comercial mesmo em rate limit.
    const primary = ctx.recommendation?.primary;
    const secondary = ctx.recommendation?.secondary;
    const purchaseIntentShort = detectPurchaseIntent(trimmed, meta?.forceIntent);
    if (purchaseIntentShort && primary) {
      const wantsSecondary = purchaseIntentShort === "buy_secondary" && !!secondary;
      const bikePrimary = wantsSecondary ? secondary! : primary;
      const bikeSecondary = wantsSecondary ? primary : secondary;
      const introLine = wantsSecondary
        ? `A ${bikePrimary.name} é uma boa escolha se você prioriza ${bikePrimary.diferencial?.toLowerCase() ?? "essa proposta"}.`
        : `Perfeito. Pelo seu perfil, a ${bikePrimary.name} é a escolha que eu faria.`;
      const showAff = !affiliateShownRef.current;
      if (showAff && leadId) {
        affiliateShownRef.current = true;
        try { sessionStorage.setItem(AFF_FLAG_PREFIX + leadId, "true"); } catch {}
      }
      const assistantMsg: SDRMessage = {
        id: uid(), role: "assistant", createdAt: Date.now(),
        content: introLine,
        bikeForLink: bikePrimary.id,
        secondaryBikeForLink: bikeSecondary?.id ?? null,
        showAffiliateDisclosure: showAff,
        quickReplies: [
          { label: "Ainda tenho uma dúvida", text: "Ainda tenho uma dúvida antes de comprar." },
          { label: "Falar com especialista", text: "Quero falar com um especialista." },
        ],
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStatus("idle");
      opts.onEvent?.("sdr_purchase_intent_detected", { via: "client_short_circuit", bike_for_link: bikePrimary.id });
      opts.onEvent?.("sdr_link_offered", { bike_for_link: bikePrimary.id });
      return;
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
            // origin removida propositalmente: a IA não deve receber nem
            // mencionar UTM/campanha/conteúdo/anúncio/vídeo/origem do lead.
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
        secondaryBikeForLink: resp.offer_link ? (resp.secondary_bike_for_link ?? null) : null,
        showAffiliateDisclosure: showAffiliate && !!resp.offer_link,
        offerGroup: !!resp.offer_group,
        offerList: !!resp.offer_list,
        offerHandoff: !!resp.offer_handoff,
        offerConsultoria: !!resp.offer_consultoria,
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
