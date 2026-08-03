import { useEffect, useMemo, useRef, useState } from "react";


import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Check, ShoppingCart, Loader2, Sparkles, Award, MessageCircle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { recommend, computeClusters, buildPersonalizedCopy, buildSecondaryCopy, type Answers } from "@/lib/quiz-engine";
import { LucasSDRWidget } from "@/components/LucasSDR/LucasSDRWidget";
import type { SDRContext } from "@/components/LucasSDR/types";
import { isChatOpen, isChatCoolingDown } from "@/lib/lucas-chat-bus";
import { detectSourceBikeInterest } from "@/lib/source-bike-interest";
import { getPurchaseLink, isMetaTraffic } from "@/data/bikes";
import {
  savePendingLead,
  queuePendingUpdate,
  queuePendingEvent,
  retryPendingLeadSync,
} from "@/lib/quiz-storage";
import { VitaleBrand } from "@/components/VitaleBrand";

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
    title: "Qual faixa de peso total a bike precisa suportar?",
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

const TRACKING_STORAGE_KEY = "vitale_quiz_tracking_v1";
const EVENT_LEAD_FLAG_PREFIX = "vitale_event_lead_sent_";

type StoredTracking = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  gclid: string | null;
  referrer: string | null;
  landing_page: string | null;
  first_url: string | null;
  first_seen_at: string | null;
};

function getUrlParams() {
  if (typeof window === "undefined") return {} as Record<string, string | null>;
  const p = new URLSearchParams(window.location.search);
  const get = (k: string) => {
    const v = p.get(k);
    return v && v.trim().length > 0 ? v : null;
  };
  return {
    utm_source: get("utm_source"),
    utm_medium: get("utm_medium"),
    utm_campaign: get("utm_campaign"),
    utm_content: get("utm_content"),
    utm_term: get("utm_term"),
    fbclid: get("fbclid"),
    gclid: get("gclid"),
  };
}

function readStoredTracking(): Partial<StoredTracking> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(TRACKING_STORAGE_KEY) || sessionStorage.getItem(TRACKING_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function persistTracking(t: StoredTracking) {
  if (typeof window === "undefined") return;
  try {
    const json = JSON.stringify(t);
    localStorage.setItem(TRACKING_STORAGE_KEY, json);
    sessionStorage.setItem(TRACKING_STORAGE_KEY, json);
  } catch {}
}

/**
 * Captura UTMs+fbclid+gclid da URL e mescla com o que já estava salvo,
 * SEM sobrescrever valores existentes com vazio. Persiste em local+sessionStorage.
 */
function captureAndPersistTracking(): StoredTracking {
  const stored = readStoredTracking();
  const url = getUrlParams();
  const referrer = (typeof document !== "undefined" ? document.referrer : "") || stored.referrer || null;
  const landing_page = stored.landing_page || (typeof window !== "undefined" ? window.location.pathname : null);
  const first_url = stored.first_url || (typeof window !== "undefined" ? window.location.href : null);
  const first_seen_at = stored.first_seen_at || new Date().toISOString();

  const merged: StoredTracking = {
    utm_source: (url.utm_source ?? stored.utm_source) || null,
    utm_medium: (url.utm_medium ?? stored.utm_medium) || null,
    utm_campaign: (url.utm_campaign ?? stored.utm_campaign) || null,
    utm_content: (url.utm_content ?? stored.utm_content) || null,
    utm_term: (url.utm_term ?? stored.utm_term) || null,
    fbclid: (url.fbclid ?? stored.fbclid) || null,
    gclid: (url.gclid ?? stored.gclid) || null,
    referrer,
    landing_page,
    first_url,
    first_seen_at,
  };
  persistTracking(merged);
  return merged;
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

const META_SOURCE_RE = /(facebook|^fb$|meta|instagram|^ig$)/i;
const META_REFERRER_RE = /(^|\.)(facebook\.com|instagram\.com|l\.facebook\.com|lm\.facebook\.com|m\.facebook\.com)$/i;

function detectTrafficOrigin(
  tracking: { utm_source: string | null; utm_medium: string | null; fbclid: string | null },
  referrer: string | null,
) {
  const referrer_domain = extractDomain(referrer);
  const utm_source = tracking.utm_source;
  const utm_medium = tracking.utm_medium;

  // Classificação principal solicitada (Meta-aware)
  let traffic_origin: string;
  if (utm_source && META_SOURCE_RE.test(utm_source)) {
    traffic_origin = "meta";
  } else if (tracking.fbclid) {
    traffic_origin = "meta";
  } else if (referrer_domain && META_REFERRER_RE.test(referrer_domain)) {
    traffic_origin = "meta_referral";
  } else if (utm_source) {
    traffic_origin = utm_source;
  } else if (referrer_domain) {
    traffic_origin = `referral:${referrer_domain}`;
  } else {
    traffic_origin = "direct_or_unknown";
  }

  // Compatibilidade com os campos antigos
  const detected_source = utm_source || (tracking.fbclid ? "meta" : referrer_domain || "direct_unknown");
  const detected_medium = utm_medium || (traffic_origin.startsWith("meta") ? "paid_social" : referrer_domain ? "referral" : "direct_or_app");

  return { referrer_domain, detected_source, detected_medium, traffic_origin };
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

import { validateBrazilianWhatsApp, formatBrazilianPhoneMask } from "@/lib/validate-whatsapp";
import { captureQuizAttribution, attributionPayload } from "@/lib/quiz-attribution";

function validatePhoneBR(p: string) {
  return validateBrazilianWhatsApp(p).isValid;
}

function maskPhone(value: string) {
  return formatBrazilianPhoneMask(value);
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
  const [submitError, setSubmitError] = useState<string | null>(null);

  const baseLeadDataRef = useRef<any>({});
  const startedAtRef = useRef<string | null>(null);
  const completedRef = useRef(false);

  const recommendation = useMemo(() => {
    if (Object.keys(answers).length === STEPS.length) {
      const t = baseLeadDataRef.current || {};
      const sourceInterest = detectSourceBikeInterest({
        utm_content: t.utm_content ?? null,
        utm_source: t.utm_source ?? null,
        traffic_origin: t.traffic_origin ?? null,
        source_url: baseLeadDataRef.current?.source_url ?? null,
        first_url: t.first_url ?? null,
      });
      const rec = recommend(answers as Answers, sourceInterest);
      return { ...rec, sourceInterest };
    }
    return null;
  }, [answers]);


  useEffect(() => {
    if (typeof window === "undefined") return;
    const { device_type, browser, operating_system } = detectDevice();
    const tracking = captureAndPersistTracking();
    const attribution = captureQuizAttribution();
    const attr = attributionPayload(attribution);
    const referrer = document.referrer || tracking.referrer || null;
    baseLeadDataRef.current = {
      landing_path: window.location.pathname,
      landing_page: tracking.landing_page,
      first_url: attribution.source_url,
      first_seen_at: attribution.entry_at ?? tracking.first_seen_at,
      referrer,
      user_agent: navigator.userAgent,
      fbclid: tracking.fbclid,
      gclid: tracking.gclid,
      // Atribuição real da sessão: sem UTM na URL não há valor padrão.
      ...attr,
      device_type, browser, operating_system,
    };
  }, []);


  // Per-route SEO head (set on mount, restore on unmount)
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Quiz: descubra sua bike elétrica ideal | Vitale Mobilidade";

    const setMeta = (selector: string, create: () => HTMLElement, value: string) => {
      let el = document.head.querySelector(selector) as HTMLElement | null;
      const prev = el?.getAttribute(selector.includes('name=') ? 'content' : selector.includes('property=') ? 'content' : 'href') ?? null;
      const created = !el;
      if (!el) { el = create(); document.head.appendChild(el); }
      if (el.tagName === 'META') el.setAttribute('content', value);
      else el.setAttribute('href', value);
      return () => {
        if (created) el!.remove();
        else if (prev !== null) {
          if (el!.tagName === 'META') el!.setAttribute('content', prev);
          else el!.setAttribute('href', prev);
        }
      };
    };

    const restorers = [
      setMeta('meta[name="description"]', () => { const m = document.createElement('meta'); m.setAttribute('name','description'); return m; }, "Responda 7 perguntas e receba a recomendação de bike elétrica ideal para seu uso, trajeto e orçamento. Curadoria da Vitale Mobilidade."),
      setMeta('link[rel="canonical"]', () => { const l = document.createElement('link'); l.setAttribute('rel','canonical'); return l; }, "https://vitalemobilidade.com/escolherbike"),
      setMeta('meta[property="og:url"]', () => { const m = document.createElement('meta'); m.setAttribute('property','og:url'); return m; }, "https://vitalemobilidade.com/escolherbike"),
      setMeta('meta[property="og:title"]', () => { const m = document.createElement('meta'); m.setAttribute('property','og:title'); return m; }, "Quiz: descubra sua bike elétrica ideal"),
      setMeta('meta[property="og:description"]', () => { const m = document.createElement('meta'); m.setAttribute('property','og:description'); return m; }, "Quiz rápido para encontrar a bike elétrica certa para você, com curadoria da Vitale Mobilidade."),
    ];

    return () => {
      document.title = prevTitle;
      restorers.forEach(r => r());
    };
  }, []);



  // ---------- Intro ----------
  if (phase === "intro") {
    return (
      <main className="min-h-screen bg-background flex items-start sm:items-center justify-center">
        <div className="container mx-auto px-6 pt-4 pb-10 sm:py-12 lg:py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-6 flex justify-center">
              <VitaleBrand variant="cover" size="md" />
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
              className="cta-pulse text-lg font-bold px-12 py-7 rounded-xl shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto bg-primary hover:bg-primary/90"
            >
              Começar agora
            </Button>

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
      setSubmitError(null);
      // Reset trava de "completed" para permitir retry após erro
      completedRef.current = false;
      setPhase("processing");
      // Pequeno delay UX para a tela de processamento aparecer
      setTimeout(() => {
        finishQuiz(answers as Answers, labels)
          .catch(() => {})
          .finally(() => setSubmitting(false));
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
                  Informe um WhatsApp válido para concluir sua inscrição.
                </p>
              )}
            </div>
            {submitError && (
              <p className="text-sm text-destructive text-center">{submitError}</p>
            )}
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
            <h2 className="text-2xl lg:text-3xl font-bold mb-3 text-foreground">{step.title}</h2>
            {step.key === "weight_range" && (
              <p className="text-[15px] sm:text-base text-muted-foreground mb-6 leading-relaxed">
                {answers.rider_capacity_need === "garupa_as_vezes" || answers.rider_capacity_need === "garupa_frequente"
                  ? "Considere o peso total: o seu peso + o peso da garupa."
                  : "Considere o seu peso somado ao peso da garupa, caso você pretenda levar outra pessoa."}
              </p>
            )}
            <div className="mb-2" />
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

    // --- Sinal de interesse de origem (bike do vídeo/UTM) ---
    const trackingForInterest = {
      utm_content: baseLeadDataRef.current?.utm_content ?? null,
      utm_source: baseLeadDataRef.current?.utm_source ?? null,
      traffic_origin: baseLeadDataRef.current?.traffic_origin ?? null,
      source_url: baseLeadDataRef.current?.source_url ?? null,
      first_url: baseLeadDataRef.current?.first_url ?? null,
    };
    const sourceInterest = detectSourceBikeInterest(trackingForInterest);

    const rec = recommend(finalAnswers, sourceInterest);
    const clusters = computeClusters(finalAnswers);

    const basePrimaryCopy = buildPersonalizedCopy(finalAnswers, true, rec.budgetLimited);
    const reasonPrimary = basePrimaryCopy;
    const reasonSecondary = rec.secondary ? buildSecondaryCopy(rec.primary, rec.secondary) : null;

    const startedAt = startedAtRef.current ?? new Date().toISOString();
    const completedAt = new Date().toISOString();
    const rawRecommendation = {
      primary: rec.primary.id,
      secondary: rec.secondary?.id ?? null,
      primaryScore: rec.primaryScore,
      secondaryScore: rec.secondaryScore ?? null,
      budgetLimited: rec.budgetLimited,
      sourceBikeInterest: sourceInterest.interest,
      sourceBikeInterestLabel: sourceInterest.label,
      sourceBikeMatches: sourceInterest.matches,
      sourceBikeDetectionSource: sourceInterest.detectionSource,
      sourceBikeBonusApplied: rec.sourceInterestBonuses,
      baseScores: rec.baseScores,
      sourceInterestBonuses: rec.sourceInterestBonuses,
      finalScores: rec.finalScores,
      sourceInterestInfluencedRanking: rec.sourceInterestInfluencedRanking,
    };

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

    const submittedAt = completedAt;
    const phoneValidation = validateBrazilianWhatsApp(phone);
    const fullLeadPayload: Record<string, any> = {
      name: name.trim(),
      phone: phoneValidation.isValid ? phoneValidation.formattedPhone : phone,
      phone_digits: phoneValidation.isValid ? phoneValidation.normalizedPhone : phone.replace(/\D/g, ""),
      status: "completo",
      current_step: STEPS.length + 1,
      completion_percentage: 100,
      started_at: startedAt,
      completed_at: completedAt,
      submitted_at: submittedAt,
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
      source_bike_interest: sourceInterest.interest,
      source_bike_interest_label: sourceInterest.label,
      source_bike_interest_matches: sourceInterest.matches,
      source_bike_bonus_applied: rec.sourceInterestBonuses,
      source_bike_detection_source: sourceInterest.detectionSource,
      raw_answers_json: finalAnswers,
      raw_recommendation_json: rawRecommendation,
    };

    let activeLeadId: string | null = null;
    let createError: unknown = null;
    try {
      const result = await invokeQuizTrack({ action: "create_lead", lead: fullLeadPayload });
      if (!result?.success || !result?.lead_id) throw result;
      activeLeadId = result.lead_id;
      setLeadId(activeLeadId);
      console.info("[quiz] Lead completo criado com sucesso", { lead_id: activeLeadId });
    } catch (e) {
      createError = e;
      console.error("[quiz] Erro ao criar lead completo", e);
      savePendingLead(fullLeadPayload);

      // Retry automático único antes de mostrar erro
      try {
        const retry = await invokeQuizTrack({ action: "create_lead", lead: fullLeadPayload });
        if (retry?.success && retry?.lead_id) {
          activeLeadId = retry.lead_id;
          setLeadId(activeLeadId);
          createError = null;
          console.info("[quiz] Lead criado no retry", { lead_id: activeLeadId });
        }
      } catch (re) {
        console.error("[quiz] Retry de create_lead também falhou", re);
      }
    }

    // ❌ Se falhou em criar o lead: NÃO disparar event_lead, voltar p/ formulário com erro.
    if (!activeLeadId) {
      completedRef.current = false;
      setSubmitError("Não conseguimos enviar seus dados. Verifique sua conexão e tente novamente.");
      setPhase("lead");
      console.error("[quiz] event_lead BLOQUEADO — sem lead_id confirmado", createError);
      return;
    }

    // ✅ Lead criado com sucesso. Disparar event_lead p/ Meta/GTM uma única vez por lead_id.
    try {
      const flagKey = EVENT_LEAD_FLAG_PREFIX + activeLeadId;
      const alreadySent = (() => { try { return localStorage.getItem(flagKey) === "true"; } catch { return false; } })();
      if (alreadySent) {
        console.info("[GTM] event_lead bloqueado por dedup", activeLeadId);
      } else {
        const t = baseLeadDataRef.current || {};
        (window as any).dataLayer = (window as any).dataLayer || [];
        (window as any).dataLayer.push({
          event: "event_lead",
          lead_id: activeLeadId,
          event_id: activeLeadId,
          form_name: "escolherbike",
          lead_type: "quiz_recommendation",
          utm_source: t.utm_source || null,
          utm_medium: t.utm_medium || null,
          utm_campaign: t.utm_campaign || null,
          utm_content: t.utm_content || null,
          utm_term: t.utm_term || null,
          fbclid: t.fbclid || null,
          gclid: t.gclid || null,
          traffic_origin: t.traffic_origin || null,
          source_url: baseLeadDataRef.current?.source_url ?? null,
          landing_page: t.landing_page || null,
          referrer: document.referrer || null,
          device_type: t.device_type || null,
        });
        try { localStorage.setItem(flagKey, "true"); } catch {}
        console.log("[GTM] event_lead pushed", { lead_id: activeLeadId });
      }
    } catch (e) {
      console.error("[GTM] event_lead push failed", e);
    }

    const webhookPayload = {
      event_name: "quiz_completed",
      event_created_at: completedAt,
      lead_id: activeLeadId,
      "LeadID Lovable": activeLeadId,
      ...fullLeadPayload,
      conversion_status: "sem_clique",
    };

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
          submitted_at: submittedAt,
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
  const basePrimaryCopy = buildPersonalizedCopy(answers, true, recommendation.budgetLimited);
  const reasonPrimary = basePrimaryCopy;
  const reasonSecondary = recommendation.secondary ? buildSecondaryCopy(recommendation.primary, recommendation.secondary) : null;

  // ---- Popup tracking state ----
  const mainActionClickedRef = useRef(false);
  const [mainActionClicked, setMainActionClicked] = useState(false);
  const [showPrimaryOfferPopup, setShowPrimaryOfferPopup] = useState(false);
  const offerPopupDecidedRef = useRef(false);
  const resultMountedAtRef = useRef<number>(Date.now());

  const trackEvent = (event_name: string, payload: Record<string, any> = {}) => {
    const finalPayload = { ...(baseLeadData ?? {}), ...payload };
    try {
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({ event: event_name, ...finalPayload });
    } catch {}
    if (leadId) {
      invokeQuizTrack({ action: "save_event", lead_id: leadId, event: { event_name, payload: finalPayload } }).catch((e) =>
        console.error("[quiz] track event failed", event_name, e)
      );
    }
  };

  const markMainActionClicked = () => {
    if (!mainActionClickedRef.current) {
      mainActionClickedRef.current = true;
      setMainActionClicked(true);
    }
  };

  const handleBuy = (bike: any, position: "principal" | "segunda_opcao", e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    markMainActionClicked();

    // Resolve link conforme origem do tráfego (Meta Ads vs Vitale)
    const t = baseLeadData ?? {};
    const { url: purchaseLink, group: linkGroup } = getPurchaseLink(bike, {
      utm_source: t.utm_source,
      traffic_origin: t.traffic_origin,
      fbclid: t.fbclid,
    });
    const clickedAt = new Date().toISOString();

    // GTM dataLayer: clique de compra (antes de abrir Mercado Livre)
    try {
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({
        event: "event_click_buy",
        product_name: bike.name,
        product_url: purchaseLink,
        link_group_used: linkGroup,
        purchase_link_used: purchaseLink,
        bike_model_clicked: bike.name,
        lead_id: leadId,
        utm_source: t.utm_source || null,
        utm_medium: t.utm_medium || null,
        utm_campaign: t.utm_campaign || null,
        utm_content: t.utm_content || null,
        utm_term: t.utm_term || null,
        fbclid: t.fbclid || null,
        traffic_origin: t.traffic_origin || null,
      });
      console.log("[GTM] event_click_buy pushed", { product_name: bike.name, link_group_used: linkGroup });
    } catch (err) {
      console.error("[GTM] event_click_buy push failed", err);
    }

    // Aguarda 300ms para garantir que o GTM processe o evento, depois redireciona
    setTimeout(() => {
      if (purchaseLink) window.open(purchaseLink, "_blank", "noopener,noreferrer");
      else console.error("[quiz] Sem link de compra disponível para", bike.id);
    }, 300);

    const eventName = position === "principal" ? "buy_button_clicked" : "secondary_option_clicked";
    const conversion_status = position === "principal" ? "clicou_recomendacao_principal" : "clicou_segunda_opcao";

    const clickUpdate = {
      conversion_status,
      clicked_bike_name: bike.name,
      clicked_bike_position: position,
      clicked_bike_link: purchaseLink,
      clicked_at: clickedAt,
      bike_model_clicked: bike.name,
      purchase_link_used: purchaseLink,
      link_group_used: linkGroup,
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
            event_created_at: clickedAt,
            lead_id: activeLeadId, name, phone,
            ...answers, ...labels,
            clicked_bike_name: bike.name,
            clicked_bike_position: position,
            clicked_bike_link: purchaseLink,
            bike_model_clicked: bike.name,
            purchase_link_used: purchaseLink,
            link_group_used: linkGroup,
            clicked_at: clickedAt,
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
              payload: {
                position,
                link: purchaseLink,
                link_group_used: linkGroup,
                purchase_link_used: purchaseLink,
                bike_model_clicked: bike.name,
                ...baseLeadData,
              },
            },
            webhook_payload: webhookPayload,
          });
          if (!result?.success) throw result;
          console.info("[quiz] Clique registrado com sucesso", bike.name, "via", linkGroup);
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
          payload: { position, link: purchaseLink, link_group_used: linkGroup, bike_model_clicked: bike.name },
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

  // ---- Primary offer popup (ML) ----
  const SS_KEYS = {
    shown: "vitale_primary_offer_popup_shown",
    dismissed: "vitale_primary_offer_popup_dismissed",
    clicked: "vitale_primary_offer_popup_clicked",
  };
  const ssGet = (k: string) => {
    try { return sessionStorage.getItem(k) === "true"; } catch { return false; }
  };
  const ssSet = (k: string) => {
    try { sessionStorage.setItem(k, "true"); } catch {}
  };

  const tryShowPrimaryOffer = () => {
    if (offerPopupDecidedRef.current) return;
    if (mainActionClickedRef.current) return;
    if (ssGet(SS_KEYS.shown) || ssGet(SS_KEYS.dismissed) || ssGet(SS_KEYS.clicked)) return;
    // Coordenação com o chat do Lucas: se estiver aberto ou tiver fechado
    // há pouco tempo, o popup não pode competir.
    if (isChatOpen() || isChatCoolingDown(15000)) return;

    offerPopupDecidedRef.current = true;
    ssSet(SS_KEYS.shown);
    setShowPrimaryOfferPopup(true);
    trackEvent("primary_offer_popup_viewed", {
      recommended_bike_1: recommendation?.primary?.id,
      recommended_bike_1_label: recommendation?.primary?.name,
    });
  };

  // Popup de SAÍDA — desktop apenas.
  // Não abre por tempo, scroll, mouse parado ou mouse no meio da página.
  // Só dispara quando o cursor sai pela borda superior (clientY <= 12) ou
  // quando a aba perde foco/visibilidade após o resultado ter sido visto por
  // pelo menos 8s.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth < 1024) return; // mobile: sem popup de saída

    const canTrigger = () => Date.now() - resultMountedAtRef.current >= 8000;

    const onMouseOut = (e: MouseEvent) => {
      // Verdadeiro exit-intent: cursor cruza a borda superior da viewport.
      // `relatedTarget` é null quando o mouse sai da janela.
      const to = (e.relatedTarget as Node | null) ?? (e as any).toElement ?? null;
      if (to) return;
      if (e.clientY > 12) return;
      if (!canTrigger()) return;
      tryShowPrimaryOffer();
    };

    document.addEventListener("mouseout", onMouseOut);
    return () => document.removeEventListener("mouseout", onMouseOut);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Se o chat abrir enquanto o popup estiver aberto, fecha o popup.
  useEffect(() => {
    if (!showPrimaryOfferPopup) return;
    const handler = () => {
      if (isChatOpen()) setShowPrimaryOfferPopup(false);
    };
    window.addEventListener("lucas-chat-changed", handler);
    return () => window.removeEventListener("lucas-chat-changed", handler);
  }, [showPrimaryOfferPopup]);




  const handlePrimaryOfferClick = () => {
    ssSet(SS_KEYS.clicked);
    markMainActionClicked();
    const bike = recommendation.primary;
    trackEvent("primary_offer_popup_clicked", {
      recommended_bike_1: bike.id,
      recommended_bike_1_label: bike.name,
      recommended_bike_1_link: bike.affiliateLink,
    });
    // also fire normal buy tracking
    handleBuy(bike, "principal");
    setShowPrimaryOfferPopup(false);
  };
  const handlePrimaryOfferDismiss = () => {
    ssSet(SS_KEYS.dismissed);
    trackEvent("primary_offer_popup_dismissed");
    setShowPrimaryOfferPopup(false);
  };

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
                <p className="text-[15px] sm:text-base text-muted-foreground mb-3 leading-relaxed">{recommendation.secondary.shortDescription}</p>
                <BikeSpecsRow bike={recommendation.secondary} />
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
                      <dt className="text-muted-foreground">Peso suportado</dt>
                      <dd className="text-foreground text-right">Até {bike.weightSupportKg} kg</dd>
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

                <div className="text-muted-foreground">Peso suportado</div>
                <div className="text-center">Até {recommendation.primary.weightSupportKg} kg</div>
                <div className="text-center">Até {recommendation.secondary.weightSupportKg} kg</div>

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

        {/* Grupo de ofertas WhatsApp */}
        <OffersGroupBlock
          leadId={leadId}
          name={name}
          phone={phone}
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
          onMainAction={markMainActionClicked}
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





      {/* Primary offer popup (Mercado Livre) */}
      {showPrimaryOfferPopup && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={handlePrimaryOfferDismiss}>
          <div className="bg-background rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-foreground mb-2">Veja o preço atual da sua bike recomendada</h3>
            <p className="text-base text-muted-foreground mb-5 leading-relaxed">
              A {recommendation.primary.name} foi selecionada com base no seu uso, trajeto e orçamento. Confira a oferta no Mercado Livre antes de decidir.
            </p>
            <Button onClick={handlePrimaryOfferClick} className="w-full py-5 text-base font-bold mb-2">
              <ShoppingCart className="mr-2 h-5 w-5" /> Ver oferta no Mercado Livre
            </Button>
            <Button onClick={handlePrimaryOfferDismiss} variant="outline" className="w-full py-4 text-base font-semibold">
              Continuar vendo recomendação
            </Button>
          </div>
        </div>
      )}

      {/* Assistente virtual Lucas — flutuante, canto inferior direito */}
      <LucasSDRWidget
        ctx={{
          leadId,
          name,
          phone,
          answers,
          labels,
          recommendation: {
            primary: recommendation.primary,
            secondary: recommendation.secondary,
            reasonPrimary,
            reasonSecondary: reasonSecondary ?? undefined,
          },
        } satisfies SDRContext}
        buyClicked={mainActionClicked}
        onBuyLink={(bikeId) => {
          const bike = [recommendation.primary, recommendation.secondary].find((b: any) => b?.id === bikeId);
          if (bike) {
            const position = bike.id === recommendation.primary.id ? "principal" : "segunda_opcao";
            handleBuy(bike, position);
          }
        }}
        onEvent={(name, payload) => trackEvent(name, payload ?? {})}
      />

    </main>
  );
}

// ---------- Bike specs row ----------
function BikeSpecsRow({ bike }: { bike: any }) {
  return (
    <div className="flex flex-wrap gap-2 mb-4 text-[13px] sm:text-sm">
      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted text-foreground font-medium">
        Autonomia até {bike.autonomyKm} km
      </span>
      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted text-foreground font-medium">
        {bike.capacity === 1 ? "1 pessoa" : "2 pessoas"}
      </span>
      {bike.weightSupportKg && (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted text-foreground font-medium">
          Até {bike.weightSupportKg} kg
        </span>
      )}
    </div>
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

// ---------- Paid consultation block ----------
const OFFERS_GROUP_WA_URL = "https://chat.whatsapp.com/EKsWhyOxeEg5XVdbTCYK7g";


// ---------- Falar com a Vitale no WhatsApp (leva o resultado do quiz) ----------
const VITALE_WHATSAPP_PHONE = "5511998693904";

function buildVitaleWhatsAppMessage({
  name,
  labels,
  recommendation,
}: {
  name?: string | null;
  labels?: Record<string, string> | null;
  recommendation: any;
}) {
  const fb = (v?: string | null) => {
    const s = (v ?? "").toString().trim();
    if (!s) return "Não informado";
    if (/^(undefined|null|n\/a|enter your)/i.test(s)) return "Não informado";
    return s;
  };
  const trimmedName = (name ?? "").trim();
  const greeting = trimmedName
    ? `Fala Lucas, sou o ${trimmedName} e vim do quiz.`
    : "Fala Lucas, vim do quiz.";
  const lines: string[] = [
    greeting,
    "",
    "Minhas respostas:",
    `Uso: ${fb(labels?.main_use_label)}`,
    `Distância: ${fb(labels?.daily_km_range_label)}`,
    `Terreno: ${fb(labels?.route_type_label)}`,
    `Uso com garupa: ${fb(labels?.rider_capacity_need_label)}`,
    `Peso aproximado: ${fb(labels?.weight_range_label)}`,
    `Orçamento: ${fb(labels?.budget_range_label)}`,
    `Experiência: ${fb(labels?.had_ebike_before_label)}`,
    "",
    `Bike recomendada: ${fb(recommendation?.primary?.name)}`,
  ];
  if (recommendation?.secondary?.name) {
    lines.push(`Alternativa: ${recommendation.secondary.name}`);
  }
  lines.push("", "Quero ajuda para escolher minha bike ideal.");
  return lines.join("\n");
}

function VitaleWhatsAppBlock({
  leadId, name, phone, labels, recommendation, baseLeadData, onMainAction,
}: any) {
  const handleClick = () => {
    onMainAction?.();
    const message = buildVitaleWhatsAppMessage({ name, labels, recommendation });
    const waUrl = `https://wa.me/${VITALE_WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
    const clickedAt = new Date().toISOString();
    const t = baseLeadData ?? {};
    const payload = {
      lead_id: leadId,
      name,
      phone,
      recommended_bike_1: recommendation?.primary?.id ?? null,
      recommended_bike_1_label: recommendation?.primary?.name ?? null,
      recommended_bike_2: recommendation?.secondary?.id ?? null,
      recommended_bike_2_label: recommendation?.secondary?.name ?? null,
      utm_source: t.utm_source ?? null,
      utm_medium: t.utm_medium ?? null,
      utm_campaign: t.utm_campaign ?? null,
      utm_content: t.utm_content ?? null,
      utm_term: t.utm_term ?? null,
      traffic_origin: t.traffic_origin ?? null,
      source_url: baseLeadDataRef.current?.source_url ?? null,
      clicked_at: clickedAt,
      whatsapp_number: VITALE_WHATSAPP_PHONE,
      whatsapp_message: message,
      ...t,
    };
    try {
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({ event: "whatsapp_specialist_clicked", ...payload });
    } catch {}
    if (leadId) {
      invokeQuizTrack({ action: "save_event", lead_id: leadId, event: { event_name: "whatsapp_specialist_clicked", payload } })
        .catch((e) => console.error("[quiz] Erro ao salvar evento whatsapp_specialist_clicked", e));
    }
    setTimeout(() => window.open(waUrl, "_blank", "noopener,noreferrer"), 200);
  };

  return (
    <section className="rounded-[18px] p-5 sm:p-6 mb-6 border-2 border-primary/30 bg-primary/5">
      <h3 className="text-[20px] sm:text-2xl font-bold text-foreground mb-1.5 leading-tight">
        Ainda quer ajuda para escolher?
      </h3>
      <p className="text-[15px] sm:text-base font-medium text-foreground/90 mb-3 leading-snug">
        Envie seu resultado para a Vitale Mobilidade e receba uma orientação mais segura antes de comprar.
      </p>
      <Button
        onClick={handleClick}
        data-event="whatsapp_specialist_clicked"
        className="w-full sm:w-auto min-h-[48px] text-[15px] font-bold py-3 px-6 rounded-xl"
      >
        <MessageCircle className="mr-2 h-5 w-5" /> Falar com a Vitale no WhatsApp
      </Button>
      <p className="text-[13px] sm:text-[14px] text-foreground/60 mt-3 leading-relaxed">
        A mensagem já vai com suas respostas e bikes recomendadas.
      </p>
    </section>
  );
}

// ---------- WhatsApp offers group block ----------
function OffersGroupBlock({ leadId, name, phone, baseLeadData }: any) {
  const handleClick = () => {
    const clickedAt = new Date().toISOString();
    const t = baseLeadData ?? {};
    const payload = {
      lead_id: leadId,
      name,
      phone,
      utm_source: t.utm_source ?? null,
      utm_medium: t.utm_medium ?? null,
      utm_campaign: t.utm_campaign ?? null,
      traffic_origin: t.traffic_origin ?? null,
      clicked_at: clickedAt,
      group_url: OFFERS_GROUP_WA_URL,
      ...t,
    };
    try {
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({ event: "whatsapp_group_clicked", ...payload });
    } catch {}
    if (leadId) {
      invokeQuizTrack({ action: "save_event", lead_id: leadId, event: { event_name: "whatsapp_group_clicked", payload } })
        .catch((e) => console.error("[quiz] Erro ao salvar evento whatsapp_group_clicked", e));
    }
    setTimeout(() => window.open(OFFERS_GROUP_WA_URL, "_blank", "noopener,noreferrer"), 200);
  };

  return (
    <section className="rounded-[18px] p-5 sm:p-6 mb-6 border-2 border-primary/30 bg-primary/5">
      <h3 className="text-[20px] sm:text-2xl font-bold text-foreground mb-1.5 leading-tight">
        Quer acompanhar novas ofertas?
      </h3>
      <p className="text-[15px] sm:text-base font-medium text-foreground/90 mb-3 leading-snug">
        Entre no grupo de ofertas da Vitale Mobilidade e receba promoções, mudanças de preço e oportunidades de bikes elétricas no Mercado Livre.
      </p>
      <Button
        onClick={handleClick}
        data-event="whatsapp_group_clicked"
        className="w-full sm:w-auto min-h-[48px] text-[15px] font-bold py-3 px-6 rounded-xl"
      >
        <Users className="mr-2 h-5 w-5" /> Entrar no grupo de ofertas
      </Button>
      <p className="text-[13px] sm:text-[14px] text-foreground/60 mt-3 leading-relaxed">
        Grupo focado em ofertas. Você pode sair quando quiser.
      </p>
    </section>
  );
}




function SecondaryActions({ recommendation, leadId, name, phone, baseLeadData, onMainAction }: any) {
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
    onMainAction?.();
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
