import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Award, Briefcase, Bike, Mountain, Route, Wallet, Check, ShoppingCart, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { recommend, computeClusters, buildPersonalizedCopy, type Answers } from "@/lib/quiz-engine";
import { BIKES } from "@/data/bikes";
import logo96 from "@/assets/logo-96.webp";
import logo192 from "@/assets/logo-192.webp";

// ---------- Quiz config ----------
type StepKey = "main_use" | "daily_km_range" | "route_type" | "budget_range" | "had_ebike_before";

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

const STEP_ICONS: Record<StepKey, any> = {
  main_use: Briefcase,
  daily_km_range: Route,
  route_type: Mountain,
  budget_range: Wallet,
  had_ebike_before: Bike,
};

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

async function sendWebhook(payload: any) {
  try {
    await supabase.functions.invoke("quiz-webhook", { body: payload });
  } catch (e) {
    console.error("webhook error", e);
  }
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
  const recommendation = useMemo(() => {
    if (Object.keys(answers).length === 5) return recommend(answers as Answers);
    return null;
  }, [answers]);

  const baseLeadDataRef = useRef<any>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const { device_type, browser, operating_system } = detectDevice();
    baseLeadDataRef.current = {
      source_url: window.location.href,
      landing_path: window.location.pathname,
      referrer: document.referrer || null,
      ...getUTMs(),
      device_type, browser, operating_system,
    };
  }, []);

  // ---------- Intro ----------
  if (phase === "intro") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="container mx-auto px-6 py-12 lg:py-16">
          <div className="max-w-2xl mx-auto text-center">
            <img
              src={logo96}
              srcSet={`${logo96} 1x, ${logo192} 2x`}
              width={96}
              height={96}
              alt="Vitale Mobilidade"
              className="h-16 w-auto mx-auto mb-8"
            />
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-base font-medium mb-6">
              <Sparkles className="h-4 w-4" /> Recomendação personalizada gratuita
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-5 text-foreground">
              Vai comprar uma bike elétrica?
            </h1>
            <h2 className="text-xl lg:text-2xl text-muted-foreground mb-5 font-medium">
              Descubra em 2 minutos qual modelo ideal e evite jogar dinheiro fora
            </h2>
            <p className="text-base text-muted-foreground mb-8">
              A maioria das pessoas escolhe errado e só percebe depois.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-base font-medium">
                <Award className="h-4 w-4 text-primary" /> +10 anos no mercado
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-base font-medium">
                <Award className="h-4 w-4 text-primary" /> +R$100 milhões vendidos
              </span>
            </div>
            <Button
              size="lg"
              onClick={() => setPhase("lead")}
              data-event="quiz_start_click"
              className="text-base font-bold px-10 py-6 rounded-xl shadow-lg w-full sm:w-auto"
            >
              Começar agora
            </Button>
            <p className="text-base text-muted-foreground mt-4">
              Recomendação gratuita baseada no seu uso, trajeto e orçamento.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ---------- Lead capture ----------
  if (phase === "lead") {
    const valid = name.trim().length >= 2 && validatePhoneBR(phone);

    const handleSubmit = async () => {
      if (!valid) return;
      const payload = {
        name: name.trim(),
        phone,
        status: "incompleto",
        current_step: 1,
        completion_percentage: 10,
        started_at: new Date().toISOString(),
        ...baseLeadDataRef.current,
      };
      const { data, error } = await supabase.from("quiz_leads").insert(payload).select("id").single();
      if (error) { console.error(error); return; }
      setLeadId(data.id);

      await supabase.from("quiz_events").insert({
        lead_id: data.id, event_name: "quiz_started", step: 0, payload,
      });

      sendWebhook({ event_name: "quiz_started", event_created_at: new Date().toISOString(), lead_id: data.id, ...payload });

      setPhase("quiz");
    };

    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-12 bg-background">
        <div className="max-w-md w-full">
          <img
            src={logo96}
            srcSet={`${logo96} 1x, ${logo192} 2x`}
            width={96}
            height={96}
            alt="Vitale Mobilidade"
            className="h-12 w-auto mx-auto mb-6"
          />
          <div className="mb-6">
            <Progress value={10} className="h-2" />
            <p className="text-base text-muted-foreground mt-2 text-center">Etapa 1 de {STEPS.length + 1}</p>
          </div>
          <h2 className="text-2xl font-bold mb-3 text-foreground text-center">Antes de recomendar sua bike ideal, me diga com quem estou falando</h2>
          <p className="text-base text-muted-foreground mb-6 text-center">Assim conseguimos salvar sua recomendação e melhorar sua experiência.</p>
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
            </div>
            <Button onClick={handleSubmit} disabled={!valid} data-event="quiz_started" className="w-full py-6 text-base font-bold">
              Continuar
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // ---------- Quiz ----------
  if (phase === "quiz") {
    const step = STEPS[stepIdx];
    const Icon = STEP_ICONS[step.key];
    const progress = ((stepIdx + 1) / STEPS.length) * 100;

    const handleAnswer = async (opt: Option) => {
      const newAnswers = { ...answers, [step.key]: opt.value };
      const newLabels = { ...labels, [`${step.key}_label`]: opt.label };
      setAnswers(newAnswers);
      setLabels(newLabels);

      const isLast = stepIdx === STEPS.length - 1;
      const completion = Math.round(((stepIdx + 1) / STEPS.length) * 100);

      const updateData: any = {
        [step.key]: opt.value,
        [`${step.key}_label`]: opt.label,
        current_step: stepIdx + 2,
        completion_percentage: completion,
        last_interaction_at: new Date().toISOString(),
      };

      if (leadId) {
        await supabase.from("quiz_leads").update(updateData).eq("id", leadId);
        await supabase.from("quiz_events").insert({
          lead_id: leadId, event_name: "quiz_step_completed", step: stepIdx + 1,
          field_name: step.key, field_value: opt.value, field_label: opt.label,
        });

        sendWebhook({
          event_name: "quiz_step_completed",
          event_created_at: new Date().toISOString(),
          lead_id: leadId, name, phone,
          ...newAnswers, ...newLabels,
          last_answer_field: step.key, last_answer_value: opt.value, last_answer_label: opt.label,
          current_step: stepIdx + 2, completion_percentage: completion, status: "incompleto",
          ...baseLeadDataRef.current,
        });
      }

      if (isLast) {
        setPhase("processing");
        setTimeout(() => finishQuiz(newAnswers as Answers, newLabels), 1800);
      } else {
        setStepIdx(stepIdx + 1);
      }
    };

    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-8 lg:py-12">
          <div className="mb-8">
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between mt-3 text-base text-muted-foreground">
              <button onClick={() => stepIdx > 0 ? setStepIdx(stepIdx - 1) : setPhase("lead")} className="inline-flex items-center gap-1 hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              <span>Pergunta {stepIdx + 1} de {STEPS.length}</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 lg:p-10 shadow-sm">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
              <Icon className="h-6 w-6 text-primary" />
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
          <p className="text-lg font-medium text-foreground mb-2">Analisando seu perfil de uso...</p>
          <p className="text-base text-muted-foreground">Comparando autonomia, potência, trajeto e orçamento...</p>
        </div>
      </main>
    );
  }

  // ---------- Result ----------
  async function finishQuiz(finalAnswers: Answers, finalLabels: Record<string, string>) {
    const rec = recommend(finalAnswers);
    const clusters = computeClusters(finalAnswers);
    const reasonPrimary = buildPersonalizedCopy(finalAnswers, true);
    const reasonSecondary = rec.secondary ? buildPersonalizedCopy(finalAnswers, false) : null;

    const updateData: any = {
      status: "completo",
      completion_percentage: 100,
      completed_at: new Date().toISOString(),
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
      raw_recommendation_json: { primary: rec.primary.id, secondary: rec.secondary?.id, primaryScore: rec.primaryScore, secondaryScore: rec.secondaryScore },
    };

    if (leadId) {
      await supabase.from("quiz_leads").update(updateData).eq("id", leadId);
      await supabase.from("quiz_events").insert({
        lead_id: leadId, event_name: "quiz_completed", step: STEPS.length, payload: updateData,
      });
      await supabase.from("quiz_events").insert({
        lead_id: leadId, event_name: "recommendation_generated", payload: { primary: rec.primary.id, secondary: rec.secondary?.id },
      });

      sendWebhook({
        event_name: "quiz_completed",
        event_created_at: new Date().toISOString(),
        lead_id: leadId, name, phone,
        ...finalAnswers, ...finalLabels,
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
        status: "completo", completion_percentage: 100,
        completed_at: new Date().toISOString(),
        ...baseLeadDataRef.current,
        raw_answers_json: finalAnswers,
      });
    }

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
  const reasonPrimary = buildPersonalizedCopy(answers, true);
  const reasonSecondary = recommendation.secondary ? buildPersonalizedCopy(answers, false) : null;

  const handleBuy = async (bike: any, position: "principal" | "segunda_opcao") => {
    if (leadId) {
      const eventName = position === "principal" ? "buy_button_clicked" : "secondary_option_clicked";
      const conversion_status = position === "principal" ? "clicou_recomendacao_principal" : "clicou_segunda_opcao";

      await supabase.from("quiz_leads").update({
        conversion_status,
        clicked_bike_name: bike.name,
        clicked_bike_position: position,
        clicked_bike_link: bike.affiliateLink,
        clicked_at: new Date().toISOString(),
      }).eq("id", leadId);

      await supabase.from("quiz_events").insert({
        lead_id: leadId, event_name: eventName,
        field_value: bike.id, field_label: bike.name,
        payload: { position, link: bike.affiliateLink },
      });

      sendWebhook({
        event_name: eventName,
        event_created_at: new Date().toISOString(),
        lead_id: leadId, name, phone,
        ...answers, ...labels,
        clicked_bike_name: bike.name,
        clicked_bike_position: position,
        clicked_bike_link: bike.affiliateLink,
        conversion_status,
        ...baseLeadData,
      });
    }
    window.open(bike.affiliateLink, "_blank", "noopener,noreferrer");
  };

  const profileSummary = [
    { label: "Uso", value: labels.main_use_label },
    { label: "Distância", value: labels.daily_km_range_label },
    { label: "Trajeto", value: labels.route_type_label },
    { label: "Orçamento", value: labels.budget_range_label },
    { label: "Experiência", value: labels.had_ebike_before_label },
  ];

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 lg:py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-3">Sua bike elétrica ideal está aqui</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Com base no seu uso, trajeto, distância diária e orçamento, selecionamos as opções que fazem mais sentido para você.
          </p>
        </div>

        {/* Perfil */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-8">
          {profileSummary.map((p, i) => (
            <div key={i} className="bg-muted rounded-lg p-3 text-center">
              <div className="text-base text-muted-foreground">{p.label}</div>
              <div className="text-base font-semibold text-foreground mt-0.5 truncate">{p.value}</div>
            </div>
          ))}
        </div>

        {/* Recomendação principal */}
        <div className="bg-card border-2 border-primary rounded-2xl overflow-hidden shadow-lg mb-6">
          <div className="bg-primary text-primary-foreground px-4 py-2 text-base font-bold inline-block rounded-br-xl">
            ⭐ Melhor escolha para o seu perfil
          </div>
          <div className="grid lg:grid-cols-2 gap-6 p-6 lg:p-8">
            <div className="bg-muted rounded-xl p-4 flex items-center justify-center aspect-[4/3]">
              <img
                src={recommendation.primary.image}
                alt={`Bike elétrica ${recommendation.primary.name}`}
                width={800} height={600} loading="lazy"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">{recommendation.primary.name}</h2>
              <p className="text-muted-foreground mb-4">{recommendation.primary.shortDescription}</p>
              <ul className="space-y-2 mb-5">
                {recommendation.primary.strengths.slice(0, 4).map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-base">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">{s}</span>
                  </li>
                ))}
              </ul>
              {reasonPrimary && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-5">
                  <div className="text-base font-bold text-primary mb-1">Por que recomendamos essa bike</div>
                  <p className="text-base text-foreground">{reasonPrimary}</p>
                </div>
              )}
              <Button
                onClick={() => handleBuy(recommendation.primary, "principal")}
                data-event="buy_button_clicked"
                data-bike-name={recommendation.primary.name}
                data-bike-position="principal"
                size="lg"
                className="w-full text-base font-bold py-6 rounded-xl shadow-lg"
              >
                <ShoppingCart className="mr-2 h-5 w-5" /> Comprar aqui
              </Button>
              <p className="text-base text-center text-muted-foreground mt-2">
                Você será direcionado para o Mercado Livre com o link oficial de compra.
              </p>
            </div>
          </div>
        </div>

        {/* Segunda opção */}
        {recommendation.secondary && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
            <div className="bg-muted text-foreground px-4 py-2 text-base font-bold inline-block rounded-br-xl">
              💡 Alternativa inteligente
            </div>
            <div className="grid lg:grid-cols-2 gap-6 p-6">
              <div className="bg-muted rounded-xl p-4 flex items-center justify-center aspect-[4/3]">
                <img
                  src={recommendation.secondary.image}
                  alt={`Bike elétrica ${recommendation.secondary.name}`}
                  width={800} height={600} loading="lazy"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-2">{recommendation.secondary.name}</h3>
                <p className="text-base text-muted-foreground mb-3">{recommendation.secondary.diferencial}</p>
                <ul className="space-y-1.5 mb-4">
                  {recommendation.secondary.strengths.slice(0, 3).map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-base">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">{s}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleBuy(recommendation.secondary, "segunda_opcao")}
                  data-event="secondary_option_clicked"
                  data-bike-name={recommendation.secondary.name}
                  data-bike-position="segunda_opcao"
                  variant="outline"
                  size="lg"
                  className="w-full font-bold py-5 rounded-xl border-2"
                >
                  Ver essa opção
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Comparação */}
        {recommendation.secondary && (
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <h3 className="font-bold text-foreground mb-3 text-base">Comparação rápida</h3>
            <div className="grid grid-cols-3 gap-2 text-base">
              <div></div>
              <div className="font-bold text-primary text-center">{recommendation.primary.name}</div>
              <div className="font-bold text-center">{recommendation.secondary.name}</div>

              <div className="text-muted-foreground">Autonomia</div>
              <div className="text-center">~{recommendation.primary.autonomyKm} km</div>
              <div className="text-center">~{recommendation.secondary.autonomyKm} km</div>

              <div className="text-muted-foreground">Diferencial</div>
              <div className="text-center">{recommendation.primary.diferencial}</div>
              <div className="text-center">{recommendation.secondary.diferencial}</div>

              <div className="text-muted-foreground">Indicada para</div>
              <div className="text-center">{recommendation.primary.perfilIndicado}</div>
              <div className="text-center">{recommendation.secondary.perfilIndicado}</div>
            </div>
          </div>
        )}

        {/* Educativo */}
        <div className="bg-muted rounded-xl p-5 mb-4">
          <h3 className="font-bold text-foreground mb-2">Por que não recomendamos só pela ficha técnica?</h3>
          <p className="text-base text-muted-foreground">
            Porque autonomia, motor e preço não dizem tudo. A escolha certa depende do seu trajeto, da distância diária, do orçamento e do tipo de uso.
          </p>
        </div>

        <p className="text-base text-center text-muted-foreground">
          Valores, disponibilidade e condições podem variar no Mercado Livre.
        </p>
      </div>
    </main>
  );
}
