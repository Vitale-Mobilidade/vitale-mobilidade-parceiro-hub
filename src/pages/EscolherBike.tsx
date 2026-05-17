import { useEffect, useMemo, useRef, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Check, ShoppingCart, Loader2, Sparkles, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { recommend, computeClusters, buildPersonalizedCopy, buildSecondaryCopy, type Answers } from "@/lib/quiz-engine";
import {
  savePendingLead,
  queuePendingUpdate,
  queuePendingEvent,
  retryPendingLeadSync,
} from "@/lib/quiz-storage";
import { VitaleBrand } from "@/components/VitaleBrand";
import { FloatingSpecialistWhatsApp } from "@/components/FloatingSpecialistWhatsApp";

// ---------- Quiz config ----------
type StepKey = "main_use" | "daily_km_range" | "route_type" | "rider_capacity_need" | "weight_range" | "budget_range" | "had_ebike_before";

interface Option {
  value: string;
  label: string;
  micro: string;
}

const STEPS: { key: StepKey; title: string; field: string; options: Option[] }[] = [
  {
    key: "main_use", field: "main_use",
    title: "Qual será o principal uso da sua bike elétrica?",
    options: [
      { value: "trabalho_delivery_renda", label: "Trabalho, delivery ou renda", micro: "Para quem roda bastante e precisa de autonomia, força e confiabilidade." },
      { value: "locomocao_diaria", label: "Locomoção diária", micro: "Para ir e voltar com economia, conforto e praticidade." },
      { value: "lazer_passeio", label: "Lazer ou passeio", micro: "Para curtir trajetos com conforto, estilo e segurança." },
    ],
  },
  {
    key: "daily_km_range", field: "daily_km_range",
    title: "Quantos km você roda por dia?",
    options: [
      { value: "ate_10_km", label: "Até 10 km", micro: "Uso leve, autonomia padrão costuma atender bem." },
      { value: "10_25_km", label: "10 a 25 km", micro: "Uso intermediário, vale equilibrar autonomia e conforto." },
      { value: "25_40_km", label: "25 a 40 km", micro: "Uso mais intenso, autonomia e bateria começam a pesar." },
      { value: "mais_40_km", label: "Mais de 40 km", micro: "Uso pesado, priorizar autonomia maior e robustez." },
    ],
  },
  {
    key: "route_type", field: "route_type",
    title: "Como é o trajeto?",
    options: [
      { value: "plano", label: "Plano", micro: "Menor exigência de motor, mais foco em conforto e economia." },
      { value: "misto", label: "Misto", micro: "Precisa de equilíbrio entre potência, autonomia e estabilidade." },
      { value: "muitas_subidas", label: "Muitas subidas", micro: "Exige motor forte, bom torque e estrutura robusta." },
    ],
  },
  {
    key: "rider_capacity_need", field: "rider_capacity_need",
    title: "A bike será usada por quantas pessoas?",
    options: [
      { value: "apenas_1_pessoa", label: "Só eu", micro: "Melhor para quem vai usar sozinho e quer uma escolha mais simples e racional." },
      { value: "garupa_as_vezes", label: "Eu e garupa às vezes", micro: "Indicado para quem pode levar outra pessoa ocasionalmente." },
      { value: "garupa_frequente", label: "Eu e garupa com frequência", micro: "Prioriza modelos com estrutura para 2 pessoas e mais conforto." },
    ],
  },
  {
    key: "weight_range", field: "weight_range",
    title: "Qual faixa de peso aproximada a bike precisa suportar?",
    options: [
      { value: "ate_80kg", label: "Até 80 kg", micro: "Uso leve, com menor exigência estrutural." },
      { value: "80_100kg", label: "80 a 100 kg", micro: "Faixa comum para uso urbano e deslocamento diário." },
      { value: "100_120kg", label: "100 a 120 kg", micro: "Prioriza estrutura, estabilidade e segurança." },
      { value: "acima_120kg", label: "Acima de 120 kg", micro: "Prioriza modelos mais robustos e capacidade superior." },
    ],
  },
  {
    key: "budget_range", field: "budget_range",
    title: "Qual seu orçamento?",
    options: [
      { value: "ate_7000", label: "Até R$7.000", micro: "Buscar melhor custo benefício dentro do essencial." },
      { value: "7000_8000", label: "R$7.000 a R$8.000", micro: "Boa faixa para modelos urbanos fortes e completos." },
      { value: "8000_10000", label: "R$8.000 a R$10.000", micro: "Permite modelos com mais conforto, tecnologia e desempenho." },
      { value: "acima_10000", label: "Mais de R$10.000", micro: "Priorizar autonomia, estrutura superior e uso mais exigente." },
    ],
  },
  {
    key: "had_ebike_before", field: "had_ebike_before",
    title: "Você já teve uma bike elétrica antes?",
    options: [
      { value: "sim", label: "Sim", micro: "A recomendação pode considerar critérios mais técnicos." },
      { value: "nao", label: "Não", micro: "A recomendação evita escolhas erradas comuns na primeira compra." },
    ],
  },
];

const AFFILIATE_LIST_URL = "https://meli.la/2y7TYaH";
const OFFERS_GROUP_URL = "https://chat.whatsapp.com/EKsWhyOxeEg5XVdbTCYK7g?mode=gi_t";

// ---------- Helpers ----------
function detectDevice() {
  if (typeof window === "undefined") return { device_type: "", browser: "", operating_system: "" };
  const ua = navigator.userAgent;
  const device_type = /Mobi|Android|iPhone|iPad/i.test(ua) ? "mobile" : "desktop";
  const browser = /Chrome/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : /Edg/.test(ua) ? "Edge" : "Other";
  const operating_system = /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /Linux/.test(ua) ? "Linux" : /iPhone|iPad/.test(ua) ? "iOS" : "Other";
  return { device_type, browser, operating_system };
}

function getUTMs() {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get("utm_source") || null,
    utm_medium: p.get("utm_medium") || null,
    utm_campaign: p.get("utm_campaign") || null,
    utm_content: p.get("utm_content") || null,
    utm_term: p.get("utm_term") || null,
  };
}

function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function detectTrafficOrigin(utms: Record<string, string | null>, referrer: string | null) {
  const referrer_domain = extractDomain(referrer);
  const utm_source = utms.utm_source || null;
  const utm_medium = utms.utm_medium || null;

  let detected_source: string;
  if (utm_source) {
    detected_source = utm_source;
  } else if (referrer_domain && /(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(referrer_domain)) {
    detected_source = "youtube";
  } else if (referrer_domain && /(^|\.)instagram\.com$/.test(referrer_domain)) {
    detected_source = "instagram";
  } else if (referrer_domain && /(^|\.)tiktok\.com$/.test(referrer_domain)) {
    detected_source = "tiktok";
  } else if (referrer_domain && /(^|\.)google\./.test(referrer_domain)) {
    detected_source = "google";
  } else if (referrer_domain) {
    detected_source = referrer_domain;
  } else {
    detected_source = "direct_unknown";
  }

  let detected_medium: string;
  if (utm_medium) {
    detected_medium = utm_medium;
  } else if (detected_source === "youtube") {
    detected_medium = "organic_referral";
  } else if (detected_source === "instagram" || detected_source === "tiktok") {
    detected_medium = "social_bio";
  } else if (detected_source === "google") {
    detected_medium = "organic_search_or_referral";
  } else if (detected_source === "direct_unknown") {
    detected_medium = "direct_or_app";
  } else {
    detected_medium = "referral";
  }

  return {
    referrer_domain,
    detected_source,
    detected_medium,
    traffic_origin: `${detected_source} / ${detected_medium}`,
  };
}

async function invokeQuizTrack(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("quiz-track", { body });
  if (error) throw { invoke_error: error, response: data };
  return data;
}

async function sendCompletedWebhookFallback(payload: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("quiz-webhook", { body: payload });
  if (error) throw { invoke_error: error, response: data };
  return data;
}

function validatePhoneBR(p: string) {
  const digits = p.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

function maskPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

// ---------- Page ----------
type Phase = "intro" | "lead" | "quiz" | "processing" | "result";

export default function EscolherBike() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [leadId, setLeadId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const recommendation = useMemo(() => {
    if (Object.keys(answers).length === STEPS.length) return recommend(answers as Answers);
    return null;
  }, [answers]);

  const baseLeadDataRef = useRef<any>({});
  const startedAtRef = useRef<string | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const { device_type, browser, operating_system } = detectDevice();
    const utms = getUTMs();
    const referrer = document.referrer || null;
    const traffic = detectTrafficOrigin(utms as Record<string, string | null>, referrer);
    baseLeadDataRef.current = {
      source_url: window.location.href,
      landing_path: window.location.pathname,
      referrer,
      ...utms,
      ...traffic,
      device_type, browser, operating_system,
    };
  }, []);

  // ---------- Intro ----------
  if (phase === "intro") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="container mx-auto px-6 py-12 lg:py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <VitaleBrand size="md" />
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-base font-medium mb-6">
              <Sparkles className="h-4 w-4" /> Recomendação personalizada gratuita
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-5 text-foreground">
              Vai comprar uma bike elétrica?
            </h1>
            <h2 className="text-xl lg:text-2xl text-muted-foreground mb-8 font-medium">
              Descubra em 2 minutos qual modelo ideal
              <br />
              e evite jogar dinheiro fora
            </h2>

            <Button
              size="lg"
              onClick={() => {
                startedAtRef.current = new Date().toISOString();
                setPhase("quiz");
              }}
              data-event="quiz_start_click"
              className="text-lg font-bold px-12 py-7 rounded-xl shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all w-full sm:w-auto bg-primary hover:bg-primary/90"
            >
              Começar agora
            </Button>

            <div className="mt-5">
              <p className="text-base text-muted-foreground mb-1.5">
                Prefere ver as ofertas direto no Mercado Livre?
              </p>
              <a
                href={AFFILIATE_LIST_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-event="affiliate_list_clicked"
                onClick={() => {
                  try {
                    const payload = {
                      source: "intro_secondary_cta",
                      ...baseLeadDataRef.current,
                    };
                    (window as any).dataLayer = (window as any).dataLayer || [];
                    (window as any).dataLayer.push({ event: "affiliate_list_clicked", ...payload });
                    console.info("[quiz] affiliate_list_clicked", payload);
                  } catch (err) {
                    console.error("[quiz] affiliate_list_clicked tracking failed", err);
                  }
                }}
                className="inline-block text-base font-semibold text-primary underline underline-offset-4 hover:text-primary/80"
              >
                Ver lista de bikes em promoção
              </a>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mt-10 mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-base font-medium">
                <Award className="h-4 w-4 text-primary" /> +10 anos no mercado
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-base font-medium">
                <Award className="h-4 w-4 text-primary" /> +R$100 milhões vendidos
              </span>
            </div>

            <p className="text-base text-muted-foreground">
              Recomendação gratuita baseada no seu uso, trajeto e orçamento.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ---------- Lead capture (AFTER quiz, before result) ----------
  if (phase === "lead") {
    const valid = name.trim().length >= 2 && validatePhoneBR(phone);
    const phoneInvalid = phone.length > 0 && !validatePhoneBR(phone);

    const handleSubmit = async () => {
      if (!valid || submitting) return;
      setSubmitting(true);
      setPhase("processing");
      // Pequeno delay UX para a tela de processamento aparecer
      setTimeout(() => {
        finishQuiz(answers as Answers, labels).finally(() => setSubmitting(false));
      }, 100);
    };

    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-12 bg-background">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <VitaleBrand size="sm" />
          </div>
          <div className="mb-6">
            <Progress value={95} className="h-2" />
            <p className="text-base text-muted-foreground mt-2 text-center">Último passo</p>
          </div>
          <h2 className="text-2xl font-bold mb-3 text-foreground text-center">Sua recomendação está pronta</h2>
          <p className="text-base text-muted-foreground mb-6 text-center">
            Preencha seus dados para liberar o resultado da bike ideal para o seu perfil.
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-base font-medium mb-2 block">Nome</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full p-3 text-base border border-border rounded-lg focus:outline-none focus:border-primary bg-background"
              />
            </div>
            <div>
              <label className="text-base font-medium mb-2 block">WhatsApp</label>
              <input
                type="tel" value={phone} onChange={e => setPhone(maskPhone(e.target.value))}
                placeholder="(11) 99999-9999" inputMode="numeric"
                className="w-full p-3 text-base border border-border rounded-lg focus:outline-none focus:border-primary bg-background"
              />
              {phoneInvalid && (
                <p className="text-sm text-destructive mt-2">
                  Informe um WhatsApp válido para receber sua recomendação.
                </p>
              )}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!valid || submitting}
              data-event="lead_capture_submitted"
              className="w-full py-6 text-base font-bold"
            >
              {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando recomendação...</>) : "Ver minha recomendação"}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // ---------- Quiz ----------
  if (phase === "quiz") {
    const step = STEPS[stepIdx];
    const progress = ((stepIdx + 1) / STEPS.length) * 100;

    const handleAnswer = (opt: Option) => {
      const newAnswers = { ...answers, [step.key]: opt.value };
      const newLabels = { ...labels, [`${step.key}_label`]: opt.label };
      setAnswers(newAnswers);
      setLabels(newLabels);

      const isLast = stepIdx === STEPS.length - 1;

      if (isLast) {
        // Vai para a captura de nome/telefone (lead ainda não existe no banco)
        setPhase("lead");
      } else {
        setStepIdx(stepIdx + 1);
      }
    };

    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-8 lg:py-12">
          <div className="flex justify-center mb-6">
            <VitaleBrand size="sm" />
          </div>
          <div className="mb-8">
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between mt-3 text-base text-muted-foreground">
              <button onClick={() => stepIdx > 0 ? setStepIdx(stepIdx - 1) : setPhase("intro")} className="inline-flex items-center gap-1 hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              <span>Pergunta {stepIdx + 1} de {STEPS.length}</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 lg:p-10 shadow-sm">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 mb-5">
              <span className="text-base font-bold text-primary">Vitale Mobilidade</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold mb-8 text-foreground">{step.title}</h2>
            <div className="space-y-3">
              {step.options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleAnswer(opt)}
                  data-event="quiz_step_completed"
                  data-field-name={step.key}
                  data-field-value={opt.value}
                  data-field-label={opt.label}
                  className="w-full text-left p-4 lg:p-5 border-2 border-border rounded-xl hover:border-primary hover:bg-primary/5 transition group"
                >
                  <div className="font-semibold text-foreground group-hover:text-primary">{opt.label}</div>
                  <div className="text-base text-muted-foreground mt-1">{opt.micro}</div>
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-base text-muted-foreground mt-6">
            +10 anos no mercado · +R$100 milhões vendidos · Recomendação gratuita
          </p>
        </div>
      </main>
    );
  }

  // ---------- Processing ----------
  if (phase === "processing") {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-6" />
          <p className="text-lg font-medium text-foreground mb-2">Analisando seu perfil...</p>
          <p className="text-base text-muted-foreground">Estamos cruzando uso, trajeto, distância e orçamento para recomendar a melhor opção.</p>
        </div>
      </main>
    );
  }

  // ---------- Result ----------
  async function finishQuiz(finalAnswers: Answers, finalLabels: Record<string, string>) {
    if (completedRef.current) return;
    completedRef.current = true;
    console.info("[quiz] Criando lead após respostas");

    const rec = recommend(finalAnswers);
    const clusters = computeClusters(finalAnswers);
    const reasonPrimary = buildPersonalizedCopy(finalAnswers, true, rec.budgetLimited);
    const reasonSecondary = rec.secondary ? buildSecondaryCopy(rec.primary, rec.secondary) : null;
    const startedAt = startedAtRef.current ?? new Date().toISOString();
    const completedAt = new Date().toISOString();
    const rawRecommendation = { primary: rec.primary.id, secondary: rec.secondary?.id ?? null, primaryScore: rec.primaryScore, secondaryScore: rec.secondaryScore ?? null, budgetLimited: rec.budgetLimited };

    // Respostas + labels coletadas localmente
    const answersFlat: Record<string, any> = {
      main_use: finalAnswers.main_use,
      main_use_label: finalLabels.main_use_label,
      daily_km_range: finalAnswers.daily_km_range,
      daily_km_range_label: finalLabels.daily_km_range_label,
      route_type: finalAnswers.route_type,
      route_type_label: finalLabels.route_type_label,
      rider_capacity_need: finalAnswers.rider_capacity_need,
      rider_capacity_need_label: finalLabels.rider_capacity_need_label,
      weight_range: finalAnswers.weight_range,
      weight_range_label: finalLabels.weight_range_label,
      budget_range: finalAnswers.budget_range,
      budget_range_label: finalLabels.budget_range_label,
      had_ebike_before: finalAnswers.had_ebike_before,
      had_ebike_before_label: finalLabels.had_ebike_before_label,
    };

    const fullLeadPayload: Record<string, any> = {
      name: name.trim(),
      phone,
      status: "completo",
      current_step: STEPS.length + 1,
      completion_percentage: 100,
      started_at: startedAt,
      completed_at: completedAt,
      last_interaction_at: completedAt,
      ...baseLeadDataRef.current,
      ...answersFlat,
      ...clusters,
      recommended_bike_1: rec.primary.id,
      recommended_bike_1_label: rec.primary.name,
      recommended_bike_1_score: rec.primaryScore,
      recommended_bike_1_reason: reasonPrimary,
      recommended_bike_1_link: rec.primary.affiliateLink,
      recommended_bike_2: rec.secondary?.id ?? null,
      recommended_bike_2_label: rec.secondary?.name ?? null,
      recommended_bike_2_score: rec.secondaryScore ?? null,
      recommended_bike_2_reason: reasonSecondary,
      recommended_bike_2_link: rec.secondary?.affiliateLink ?? null,
      recommendation_reason: reasonPrimary,
      raw_answers_json: finalAnswers,
      raw_recommendation_json: rawRecommendation,
    };

    let activeLeadId: string | null = null;
    try {
      const result = await invokeQuizTrack({ action: "create_lead", lead: fullLeadPayload });
      if (!result?.success || !result?.lead_id) throw result;
      activeLeadId = result.lead_id;
      setLeadId(activeLeadId);
      console.info("[quiz] Lead completo criado com sucesso", { lead_id: activeLeadId });
    } catch (e) {
      console.error("[quiz] Erro ao criar lead completo", e);
      savePendingLead(fullLeadPayload);
    }

    // GTM dataLayer: lead capturado (antes do resultado)
    try {
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({
        event: "event_lead",
        form_name: "escolherbike",
        lead_type: "quiz_recommendation",
      });
      console.log("[GTM] event_lead pushed");
    } catch (e) {
      console.error("[GTM] event_lead push failed", e);
    }

    const webhookPayload = {
      event_name: "quiz_completed",
      event_created_at: completedAt,
      lead_id: activeLeadId,
      ...fullLeadPayload,
      conversion_status: "sem_clique",
    };

    if (activeLeadId) {
      // Salvar eventos retroativos em lote (quiz_step_completed por resposta)
      console.info("[quiz] Salvando eventos retroativos");
      try {
        await Promise.all(
          STEPS.map((s, idx) => {
            const value = (finalAnswers as any)[s.key];
            const label = finalLabels[`${s.key}_label`];
            return invokeQuizTrack({
              action: "save_event",
              lead_id: activeLeadId,
              event: {
                event_name: "quiz_step_completed",
                step: idx + 1,
                field_name: s.key,
                field_value: value,
                field_label: label,
                payload: {
                  field_name: s.key, field_value: value, field_label: label,
                  ...baseLeadDataRef.current,
                  ...answersFlat,
                },
              },
            }).catch((err) => console.error("[quiz] Erro evento retroativo", s.key, err));
          })
        );
        console.info("[quiz] Eventos retroativos salvos");
      } catch (e) {
        console.error("[quiz] Erro ao salvar eventos retroativos", e);
      }

      // Salva quiz_completed + recommendation_generated + dispara webhook via complete_quiz
      console.info("[quiz] Disparando webhook quiz_completed");
      try {
        const result = await invokeQuizTrack({
          action: "complete_quiz",
          lead_id: activeLeadId,
          lead: {
            status: "completo",
            completion_percentage: 100,
            completed_at: completedAt,
            last_interaction_at: completedAt,
          },
          webhook_payload: webhookPayload,
          recommendation_event_payload: rawRecommendation,
        });
        if (result?.webhook?.success) console.info("[quiz] Webhook quiz_completed enviado com sucesso", result.webhook.status);
        else console.error("[quiz] Erro ao enviar webhook quiz_completed", result?.webhook ?? result);
      } catch (e) {
        console.error("[quiz] Erro ao enviar webhook quiz_completed", e);
        try {
          const fb = await sendCompletedWebhookFallback(webhookPayload);
          console.info("[quiz] Webhook quiz_completed enviado com sucesso (fallback)", fb?.status ?? fb);
        } catch (we) {
          console.error("[quiz] Erro ao enviar webhook quiz_completed (fallback)", we);
        }
      }
    } else {
      // Sem lead_id — tenta apenas o webhook direto para não perder a venda
      console.info("[quiz] Disparando webhook quiz_completed (sem lead_id)");
      try {
        const fb = await sendCompletedWebhookFallback(webhookPayload);
        console.info("[quiz] Webhook quiz_completed enviado com sucesso (fallback)", fb?.status ?? fb);
      } catch (we) {
        console.error("[quiz] Erro ao enviar webhook quiz_completed", we);
      }
    }

    try { sessionStorage.removeItem("vitale_dismissed_floating_whatsapp_bubble"); } catch {}

    setPhase("result");
  }

  if (phase === "result" && recommendation) {
    return <ResultScreen
      answers={answers as Answers}
      labels={labels}
      recommendation={recommendation}
      leadId={leadId}
      name={name}
      phone={phone}
      baseLeadData={baseLeadDataRef.current}
    />;
  }

  return null;
}

// ---------- Result component ----------
function ResultScreen({ answers, labels, recommendation, leadId, name, phone, baseLeadData }: any) {
  const reasonPrimary = buildPersonalizedCopy(answers, true, recommendation.budgetLimited);
  const reasonSecondary = recommendation.secondary ? buildSecondaryCopy(recommendation.primary, recommendation.secondary) : null;

  const handleBuy = (bike: any, position: "principal" | "segunda_opcao", e?: React.MouseEvent) => {
    if (e) e.preventDefault();

    // GTM dataLayer: clique de compra (antes de abrir Mercado Livre)
    try {
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({
        event: "event_click_buy",
        product_name: bike.name,
        product_url: bike.affiliateLink,
      });
      console.log("[GTM] event_click_buy pushed", { product_name: bike.name });
    } catch (err) {
      console.error("[GTM] event_click_buy push failed", err);
    }

    // Aguarda 300ms para garantir que o GTM processe o evento, depois redireciona
    setTimeout(() => {
      window.open(bike.affiliateLink, "_blank", "noopener,noreferrer");
    }, 300);

    const eventName = position === "principal" ? "buy_button_clicked" : "secondary_option_clicked";
    const conversion_status = position === "principal" ? "clicou_recomendacao_principal" : "clicou_segunda_opcao";

    const clickUpdate = {
      conversion_status,
      clicked_bike_name: bike.name,
      clicked_bike_position: position,
      clicked_bike_link: bike.affiliateLink,
      clicked_at: new Date().toISOString(),
      buy_click_count: undefined as any,
    };

    // Background — não bloqueia
    (async () => {
      let activeLeadId = leadId;
      if (!activeLeadId) {
        const synced = await retryPendingLeadSync().catch(() => null);
        if (synced) activeLeadId = synced;
      }

      if (activeLeadId) {
        try {
          const webhookPayload = {
            event_name: eventName,
            event_created_at: new Date().toISOString(),
            lead_id: activeLeadId, name, phone,
            ...answers, ...labels,
            clicked_bike_name: bike.name,
            clicked_bike_position: position,
            clicked_bike_link: bike.affiliateLink,
            recommended_bike_1: recommendation.primary.id,
            recommended_bike_2: recommendation.secondary?.id ?? null,
            conversion_status,
            ...baseLeadData,
          };
          const result = await invokeQuizTrack({
            action: "buy_click",
            lead_id: activeLeadId,
            lead: clickUpdate,
            event: {
              event_name: eventName,
              field_value: bike.id,
              field_label: bike.name,
              payload: { position, link: bike.affiliateLink, ...baseLeadData },
            },
            webhook_payload: webhookPayload,
          });
          if (!result?.success) throw result;
          console.info("[quiz] Clique registrado com sucesso", bike.name);
          console.info("[quiz] Evento salvo com sucesso:", eventName);
        } catch (e) {
          console.error("[quiz] Exceção ao registrar clique. Fallback local.", e);
          queuePendingUpdate(clickUpdate);
        }
      } else {
        queuePendingUpdate(clickUpdate);
        queuePendingEvent({
          event_name: eventName,
          field_value: bike.id, field_label: bike.name,
          payload: { position, link: bike.affiliateLink },
        });
      }
    })();
  };

  const profileSummary = [
    { label: "Uso", value: labels.main_use_label },
    { label: "Distância", value: labels.daily_km_range_label },
    { label: "Trajeto", value: labels.route_type_label },
    { label: "Garupa", value: labels.rider_capacity_need_label },
    { label: "Peso", value: labels.weight_range_label },
    { label: "Orçamento", value: labels.budget_range_label },
    { label: "Experiência", value: labels.had_ebike_before_label },
  ];

  // Sticky CTA visibility (mobile only)
  const [showSticky, setShowSticky] = useState(false);
  const primaryCardRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = primaryCardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 lg:py-12 pb-28 lg:pb-12">
        <div className="flex justify-center mb-5">
          <VitaleBrand size="sm" />
        </div>

        {/* Título + Subtítulo */}
        <div className="text-center mb-7">
          <h1 className="text-[28px] leading-tight sm:text-3xl lg:text-4xl font-bold text-foreground mb-3">
            Sua bike elétrica ideal está aqui
          </h1>
          <p className="text-[15px] sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Com base no seu perfil, selecionamos as opções que fazem mais sentido para você.
          </p>
        </div>

        {/* Recomendação principal */}
        <div ref={primaryCardRef} className="bg-card border-2 border-primary rounded-[18px] overflow-hidden shadow-lg mb-5">
          <div className="bg-primary text-primary-foreground px-4 py-2 text-base font-bold inline-block rounded-br-xl">
            ⭐ Melhor escolha para o seu perfil
          </div>
          <div className="grid lg:grid-cols-2 gap-5 lg:gap-6 p-4 sm:p-6 lg:p-8">
            <div className="bg-muted rounded-[14px] p-3 sm:p-4 flex items-center justify-center">
              <img
                src={recommendation.primary.image}
                alt={`Bike elétrica ${recommendation.primary.name}`}
                width={800} height={600} loading="lazy"
                className="w-full h-auto object-contain max-h-[260px] lg:max-h-none lg:aspect-[4/3]"
              />
            </div>
            <div>
              <h2 className="text-[24px] sm:text-[26px] lg:text-3xl font-bold text-foreground mb-2 leading-tight">{recommendation.primary.name}</h2>
              <p className="text-[15px] sm:text-base text-muted-foreground mb-3 leading-relaxed">{recommendation.primary.shortDescription}</p>
              <BikeSpecsRow bike={recommendation.primary} />
              <ul className="space-y-2 mb-5">
                {recommendation.primary.strengths.slice(0, 4).map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-[15px] sm:text-base">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">{s}</span>
                  </li>
                ))}
              </ul>

              {/* CTA antes da explicação */}
              <Button
                onClick={(e) => handleBuy(recommendation.primary, "principal", e)}
                data-event="buy_button_clicked"
                data-bike-name={recommendation.primary.name}
                data-bike-position="principal"
                size="lg"
                className="w-full text-base font-bold py-6 rounded-xl shadow-lg shadow-primary/30"
              >
                <ShoppingCart className="mr-2 h-5 w-5" /> Comprar aqui
              </Button>
              <p className="text-[14px] text-center text-muted-foreground mt-2 leading-relaxed">
                Você será direcionado para o Mercado Livre com o link oficial de compra.
              </p>

              {reasonPrimary && (
                <ReasonBlock title="Por que recomendamos essa bike" text={reasonPrimary} />
              )}
            </div>
          </div>
        </div>

        {/* Alternativa inteligente */}
        {recommendation.secondary && (
          <div className="bg-card border-2 border-primary/40 rounded-[18px] overflow-hidden mb-5 shadow-md">
            <div className="bg-primary/15 text-primary px-4 py-2 text-base font-bold inline-block rounded-br-xl">
              💡 Alternativa inteligente
            </div>
            <div className="grid lg:grid-cols-2 gap-5 lg:gap-6 p-4 sm:p-6 lg:p-8">
              <div className="bg-muted rounded-[14px] p-3 sm:p-4 flex items-center justify-center">
                <img
                  src={recommendation.secondary.image}
                  alt={`Bike elétrica ${recommendation.secondary.name}`}
                  width={800} height={600} loading="lazy"
                  className="w-full h-auto object-contain max-h-[260px] lg:max-h-none lg:aspect-[4/3]"
                />
              </div>
              <div>
                <h3 className="text-[24px] sm:text-[26px] lg:text-3xl font-bold text-foreground mb-2 leading-tight">{recommendation.secondary.name}</h3>
                <p className="text-[15px] sm:text-base text-muted-foreground mb-4 leading-relaxed">{recommendation.secondary.shortDescription}</p>
                <ul className="space-y-2 mb-5">
                  {recommendation.secondary.strengths.slice(0, 4).map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-[15px] sm:text-base">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">{s}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={(e) => handleBuy(recommendation.secondary, "segunda_opcao", e)}
                  data-event="secondary_option_clicked"
                  data-bike-name={recommendation.secondary.name}
                  data-bike-position="segunda_opcao"
                  size="lg"
                  className="w-full text-base font-bold py-6 rounded-xl shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <ShoppingCart className="mr-2 h-5 w-5" /> Comprar aqui
                </Button>
                <p className="text-[14px] text-center text-muted-foreground mt-2 leading-relaxed">
                  Você será direcionado para o Mercado Livre com o link oficial de compra.
                </p>

                {reasonSecondary && (
                  <ReasonBlock title="Por que essa também faz sentido" text={reasonSecondary} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Seu perfil analisado — lista compacta no mobile, grid no desktop */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-foreground mb-4 text-center">Seu perfil analisado</h3>

          {/* Mobile: lista única */}
          <div className="lg:hidden bg-muted rounded-[18px] p-4 divide-y divide-border/60">
            {profileSummary.map((p, i) => (
              <div key={i} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="text-[15px] text-muted-foreground flex-shrink-0">{p.label}</span>
                <span className="text-[15px] font-semibold text-foreground text-right">{p.value}</span>
              </div>
            ))}
          </div>

          {/* Desktop: grid */}
          <div className="hidden lg:grid grid-cols-7 gap-2">
            {profileSummary.map((p, i) => (
              <div key={i} className="bg-muted rounded-lg p-3 text-center">
                <div className="text-base text-muted-foreground">{p.label}</div>
                <div className="text-base font-semibold text-foreground mt-0.5 truncate">{p.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Comparação rápida */}
        {recommendation.secondary && (
          <div className="mb-6">
            <h3 className="font-bold text-foreground mb-4 text-lg text-center lg:text-left">Comparação rápida</h3>

            {/* Mobile: cards empilhados */}
            <div className="grid gap-4 lg:hidden">
              {[recommendation.primary, recommendation.secondary].map((bike: any, idx: number) => (
                <div key={idx} className="bg-card border border-border rounded-[18px] p-4">
                  <div className={`text-[15px] font-bold mb-3 ${idx === 0 ? "text-primary" : "text-foreground"}`}>
                    {bike.name}
                  </div>
                  <dl className="space-y-2 text-[15px]">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Autonomia</dt>
                      <dd className="text-foreground text-right">Até {bike.autonomyKm} km</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Capacidade</dt>
                      <dd className="text-foreground text-right">{bike.capacity} {bike.capacity === 1 ? "pessoa" : "pessoas"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground flex-shrink-0">Diferencial</dt>
                      <dd className="text-foreground text-right">{bike.diferencial}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground flex-shrink-0">Indicada para</dt>
                      <dd className="text-foreground text-right">{bike.perfilIndicado}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>

            {/* Desktop: tabela */}
            <div className="hidden lg:block bg-card border border-border rounded-xl p-5">
              <div className="grid grid-cols-3 gap-2 text-base">
                <div></div>
                <div className="font-bold text-primary text-center">{recommendation.primary.name}</div>
                <div className="font-bold text-center">{recommendation.secondary.name}</div>

                <div className="text-muted-foreground">Autonomia</div>
                <div className="text-center">Até {recommendation.primary.autonomyKm} km</div>
                <div className="text-center">Até {recommendation.secondary.autonomyKm} km</div>

                <div className="text-muted-foreground">Capacidade</div>
                <div className="text-center">{recommendation.primary.capacity} {recommendation.primary.capacity === 1 ? "pessoa" : "pessoas"}</div>
                <div className="text-center">{recommendation.secondary.capacity} {recommendation.secondary.capacity === 1 ? "pessoa" : "pessoas"}</div>

                <div className="text-muted-foreground">Diferencial</div>
                <div className="text-center">{recommendation.primary.diferencial}</div>
                <div className="text-center">{recommendation.secondary.diferencial}</div>

                <div className="text-muted-foreground">Indicada para</div>
                <div className="text-center">{recommendation.primary.perfilIndicado}</div>
                <div className="text-center">{recommendation.secondary.perfilIndicado}</div>
              </div>
            </div>
          </div>
        )}

        {/* Falar com especialista */}
        <SpecialistBlock
          leadId={leadId}
          name={name}
          phone={phone}
          answers={answers}
          labels={labels}
          recommendation={recommendation}
          baseLeadData={baseLeadData}
        />

        {/* Bloco educativo */}
        <div className="bg-muted rounded-[18px] p-5 mb-4">
          <h3 className="font-bold text-foreground mb-2 text-base">Por que não recomendamos só pela ficha técnica?</h3>
          <p className="text-[15px] sm:text-base text-muted-foreground leading-relaxed">
            Porque autonomia, motor e preço não dizem tudo. A escolha certa depende do seu trajeto, da distância diária, do orçamento e do tipo de uso.
          </p>
        </div>

        {/* Aviso ML */}
        <p className="text-[14px] sm:text-base text-center text-muted-foreground mb-8 leading-relaxed">
          Valores, disponibilidade e condições podem variar no Mercado Livre.
        </p>

        {/* Ações secundárias */}
        <SecondaryActions
          recommendation={recommendation}
          leadId={leadId}
          name={name}
          phone={phone}
          baseLeadData={baseLeadData}
        />
      </div>

      {/* Sticky CTA mobile */}
      {showSticky && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.06)] px-4 py-3">
          <div className="flex items-center gap-3 max-w-md mx-auto">
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-muted-foreground leading-tight">Recomendada</div>
              <div className="text-[15px] font-bold text-foreground truncate leading-tight">{recommendation.primary.name}</div>
            </div>
            <Button
              onClick={(e) => handleBuy(recommendation.primary, "principal", e)}
              className="flex-shrink-0 h-12 px-5 rounded-xl text-[15px] font-bold"
            >
              <ShoppingCart className="mr-1.5 h-4 w-4" /> Comprar
            </Button>
          </div>
        </div>
      )}

      {/* Floating WhatsApp — only on result screen */}
      <FloatingSpecialistWhatsApp
        name={name}
        phone={phone}
        answers={answers}
        labels={labels}
        recommendation={recommendation}
        baseLeadData={baseLeadData}
        leadId={leadId}
        liftedAboveStickyBar={showSticky}
        onTrack={({ whatsapp_phone, whatsapp_message, source }) => {
          if (!leadId) return;
          const payload = {
            name,
            phone,
            main_use: answers?.main_use,
            main_use_label: labels?.main_use_label,
            daily_km_range: answers?.daily_km_range,
            daily_km_range_label: labels?.daily_km_range_label,
            route_type: answers?.route_type,
            route_type_label: labels?.route_type_label,
            budget_range: answers?.budget_range,
            budget_range_label: labels?.budget_range_label,
            had_ebike_before: answers?.had_ebike_before,
            had_ebike_before_label: labels?.had_ebike_before_label,
            recommended_bike_1: recommendation?.primary?.id,
            recommended_bike_1_label: recommendation?.primary?.name,
            recommended_bike_2: recommendation?.secondary?.id,
            recommended_bike_2_label: recommendation?.secondary?.name,
            whatsapp_phone,
            whatsapp_message,
            source,
            ...(baseLeadData ?? {}),
          };
          invokeQuizTrack({
            action: "save_event",
            lead_id: leadId,
            event: { event_name: "floating_specialist_whatsapp_clicked", payload },
          })
            .then((result) => {
              if (!result?.success) console.error("[quiz] Erro ao salvar evento:", { event_name: "floating_specialist_whatsapp_clicked", result });
              else console.info("[quiz] Evento salvo com sucesso:", { event_name: "floating_specialist_whatsapp_clicked" });
            })
            .catch((error) => console.error("[quiz] Erro ao salvar evento:", { event_name: "floating_specialist_whatsapp_clicked", error }));
        }}
      />
    </main>
  );
}

// ---------- Reason block (collapsible on mobile) ----------
function ReasonBlock({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(false);
  const isLong = text.length > 160;

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mt-5">
      <div className="text-[15px] sm:text-base font-bold text-primary mb-1">{title}</div>

      {/* Mobile: clamp + toggle */}
      <div className="lg:hidden">
        <Collapsible open={open} onOpenChange={setOpen}>
          {!open && (
            <p className="text-[15px] text-foreground leading-relaxed line-clamp-4">{text}</p>
          )}
          <CollapsibleContent>
            <p className="text-[15px] text-foreground leading-relaxed">{text}</p>
          </CollapsibleContent>
          {isLong && (
            <CollapsibleTrigger asChild>
              <button className="mt-2 text-[14px] font-semibold text-primary underline-offset-2 hover:underline">
                {open ? "Ver menos" : "Ler análise completa"}
              </button>
            </CollapsibleTrigger>
          )}
        </Collapsible>
      </div>

      {/* Desktop: texto completo */}
      <p className="hidden lg:block text-base text-foreground leading-relaxed">{text}</p>
    </div>
  );
}

// ---------- Specialist WhatsApp block ----------
const SPECIALIST_WHATSAPP_PHONE = "5511986893890";

function SpecialistBlock({ leadId, name, phone, answers, labels, recommendation, baseLeadData }: any) {
  const handleSpecialist = () => {
    const trimmedName = (name ?? "").trim();
    const identification = trimmedName
      ? `sou o ${trimmedName}`
      : "sou uma pessoa que veio do quiz";

    const lines = [
      `Fala Lucas, ${identification} e vim do quiz.`,
      "",
      "Minhas respostas:",
      "",
      `Uso: ${labels?.main_use_label ?? "-"}`,
      `Distância: ${labels?.daily_km_range_label ?? "-"}`,
      `Terreno: ${labels?.route_type_label ?? "-"}`,
      `Orçamento: ${labels?.budget_range_label ?? "-"}`,
      `Experiência: ${labels?.had_ebike_before_label ?? "-"}`,
      "",
      `Bike recomendada: ${recommendation?.primary?.name ?? "-"}`,
    ];
    if (recommendation?.secondary?.name) {
      lines.push(`Alternativa: ${recommendation.secondary.name}`);
    }
    lines.push("", "Quero ajuda para escolher minha bike ideal.");

    const message = lines.join("\n");
    const url = `https://wa.me/${SPECIALIST_WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;

    // GTM dataLayer: clique no WhatsApp (antes de abrir)
    try {
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({
        event: "event_click_whatsapp",
        button_location: "escolherbike",
      });
      console.log("[GTM] event_click_whatsapp pushed (specialist block)");
    } catch (err) {
      console.error("[GTM] event_click_whatsapp push failed", err);
    }

    setTimeout(() => {
      window.open(url, "_blank", "noopener,noreferrer");
    }, 300);

    if (leadId) {
      const payload = {
        name,
        phone,
        main_use: answers?.main_use,
        main_use_label: labels?.main_use_label,
        daily_km_range: answers?.daily_km_range,
        daily_km_range_label: labels?.daily_km_range_label,
        route_type: answers?.route_type,
        route_type_label: labels?.route_type_label,
        budget_range: answers?.budget_range,
        budget_range_label: labels?.budget_range_label,
        had_ebike_before: answers?.had_ebike_before,
        had_ebike_before_label: labels?.had_ebike_before_label,
        recommended_bike_1: recommendation?.primary?.id,
        recommended_bike_1_label: recommendation?.primary?.name,
        recommended_bike_2: recommendation?.secondary?.id,
        recommended_bike_2_label: recommendation?.secondary?.name,
        whatsapp_phone: SPECIALIST_WHATSAPP_PHONE,
        whatsapp_message: message,
        ...(baseLeadData ?? {}),
      };
      invokeQuizTrack({ action: "save_event", lead_id: leadId, event: { event_name: "specialist_whatsapp_clicked", payload } })
        .then((result) => {
          if (!result?.success) console.error("[quiz] Erro ao salvar evento:", { event_name: "specialist_whatsapp_clicked", result });
          else console.info("[quiz] Evento salvo com sucesso:", { event_name: "specialist_whatsapp_clicked" });
        })
        .catch((error) => console.error("[quiz] Erro ao salvar evento:", { event_name: "specialist_whatsapp_clicked", error }));
    }
  };

  return (
    <section
      className="rounded-[18px] p-5 sm:p-6 mb-6 border-2"
      style={{ backgroundColor: "#DCFCE7", borderColor: "#16A34A" }}
    >
      <h3 className="text-[20px] sm:text-2xl font-bold mb-1.5 leading-tight" style={{ color: "#15803D" }}>
        Ainda está em dúvida?
      </h3>
      <p className="text-[16px] sm:text-lg font-semibold text-foreground mb-3 leading-snug">
        Fale com um especialista antes de comprar.
      </p>
      <p className="text-[15px] sm:text-base text-foreground/80 mb-3 leading-relaxed">
        Se você quer confirmar se a recomendação faz sentido para o seu uso, envie suas respostas para a Vitale Mobilidade e receba uma orientação mais segura antes de decidir.
      </p>
      <p className="text-[14px] sm:text-[15px] text-foreground/70 mb-4 leading-relaxed">
        A mensagem já vai com seu perfil do quiz preenchido, para facilitar a análise.
      </p>
      <Button
        onClick={handleSpecialist}
        data-event="specialist_whatsapp_clicked"
        className="w-full sm:w-auto min-h-[48px] text-[16px] font-bold py-3 px-6 rounded-xl text-white"
        style={{ backgroundColor: "#16A34A" }}
      >
        Falar com especialista
      </Button>
      <p className="text-[13px] sm:text-[14px] text-foreground/60 mt-3 leading-relaxed">
        Você será direcionado para o WhatsApp da Vitale Mobilidade.
      </p>
    </section>
  );
}

function SecondaryActions({ recommendation, leadId, name, phone, baseLeadData }: any) {
  const handleRestart = () => {
    if (leadId) {
      invokeQuizTrack({ action: "save_event", lead_id: leadId, event: { event_name: "quiz_restart_clicked", payload: { ...(baseLeadData ?? {}) } } })
        .then((result) => {
          if (!result?.success) console.error("[quiz] Erro ao salvar evento:", { event_name: "quiz_restart_clicked", result });
          else console.info("[quiz] Evento salvo com sucesso:", { event_name: "quiz_restart_clicked" });
        })
        .catch((error) => console.error("[quiz] Erro ao salvar evento:", { event_name: "quiz_restart_clicked", error }));
    }
    try { sessionStorage.removeItem("vitale_dismissed_floating_whatsapp_bubble"); } catch {}
    // Volta para intro mantendo dados já salvos no banco intactos
    window.location.href = "/escolherbike";
  };

  const handleShareWhatsApp = () => {
    const url = typeof window !== "undefined" ? window.location.origin + "/escolherbike" : "";
    const principal = recommendation.primary?.name ?? "";
    const alternativa = recommendation.secondary?.name ?? "";
    const msg = alternativa
      ? `Fiz o quiz da Vitale Mobilidade e recebi uma recomendação de bike elétrica para o meu perfil: ${principal}. Também apareceu como alternativa: ${alternativa}. Dá uma olhada: ${url}`
      : `Fiz o quiz da Vitale Mobilidade e recebi uma recomendação de bike elétrica para o meu perfil: ${principal}. Dá uma olhada: ${url}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");

    if (leadId) {
      invokeQuizTrack({ action: "save_event", lead_id: leadId, event: { event_name: "result_shared_whatsapp", payload: { primary: recommendation.primary?.id, secondary: recommendation.secondary?.id, ...(baseLeadData ?? {}) } } })
        .then((result) => {
          if (!result?.success) console.error("[quiz] Erro ao salvar evento:", { event_name: "result_shared_whatsapp", result });
          else console.info("[quiz] Evento salvo com sucesso:", { event_name: "result_shared_whatsapp" });
        })
        .catch((error) => console.error("[quiz] Erro ao salvar evento:", { event_name: "result_shared_whatsapp", error }));
    }
  };

  return (
    <section className="mt-6 border-t border-border pt-8">
      <h3 className="text-lg font-semibold text-foreground text-center mb-1">Ainda quer comparar melhor?</h3>
      <p className="text-[15px] sm:text-base text-muted-foreground text-center mb-5">Outras formas de continuar sua jornada.</p>

      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2.5 sm:gap-3 max-w-2xl mx-auto mb-8">
        <Button
          onClick={handleRestart}
          variant="outline"
          data-event="quiz_restart_clicked"
          className="w-full min-h-[46px] text-base font-semibold rounded-xl bg-background"
        >
          Faça o quiz novamente
        </Button>
        <Button
          onClick={handleShareWhatsApp}
          variant="outline"
          data-event="result_shared_whatsapp"
          className="w-full min-h-[46px] text-base font-semibold rounded-xl bg-background"
        >
          Compartilhar resultado
        </Button>
      </div>
    </section>
  );
}
