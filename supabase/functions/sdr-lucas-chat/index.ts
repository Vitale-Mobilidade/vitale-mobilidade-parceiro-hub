// SDR IA "Lucas" — endpoint da conversa consultiva do quiz /escolherbike.
// Chama Lovable AI Gateway (LOVABLE_API_KEY) e devolve JSON estruturado.
// A UI é responsável por resolver URLs de compra via getPurchaseLink().
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-flash";
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(4000),
});

const BikeCtxSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortDescription: z.string().optional(),
  fullDescription: z.string().optional(),
  autonomyKm: z.number().optional(),
  capacity: z.number().optional(),
  weightSupportKg: z.number().optional(),
  internalPrice: z.number().optional(),
  strengths: z.array(z.string()).optional(),
  diferencial: z.string().optional(),
  perfilIndicado: z.string().optional(),
  budgetTiers: z.array(z.string()).optional(),
});

const BodySchema = z.object({
  lead_id: z.string().uuid().nullable().optional(),
  user_message: z.string().min(1).max(2000),
  history: z.array(MessageSchema).max(30).default([]),
  context: z.object({
    name: z.string().nullable().optional(),
    answers: z.record(z.any()).optional(),
    labels: z.record(z.any()).optional(),
    clusters: z.record(z.any()).optional(),
    recommendation: z
      .object({
        primary: BikeCtxSchema.nullable().optional(),
        secondary: BikeCtxSchema.nullable().optional(),
        reasonPrimary: z.string().optional(),
        reasonSecondary: z.string().optional(),
      })
      .optional(),
    origin: z.record(z.any()).optional(),
    catalog: z.array(BikeCtxSchema).max(40).optional(),
    affiliate_disclosure_shown: z.boolean().optional(),
  }),
});

type SdrResponse = {
  reply: string;
  intent_level?: "low" | "medium" | "high" | null;
  preferred_bike?: string | null;
  main_objection?: string | null;
  main_objection_label?: string | null;
  purchase_timing?: string | null;
  suggested_action?:
    | "answer"
    | "compare"
    | "offer_link"
    | "offer_group"
    | "offer_list"
    | "offer_handoff"
    | "offer_consultoria"
    | "recalc"
    | null;
  offer_link?: boolean;
  offer_group?: boolean;
  offer_list?: boolean;
  offer_handoff?: boolean;
  offer_consultoria?: boolean;
  bike_for_link?: string | null;
  secondary_bike_for_link?: string | null;
  show_affiliate_disclosure?: boolean;
};

const SYSTEM_PROMPT_BASE = `Você é o Lucas, assistente virtual da Vitale Mobilidade, especializado em bicicletas elétricas.

Objetivo principal: conduzir o visitante à COMPRA DIRETA da bike recomendada. O foco é venda; consultoria paga só quando fizer sentido.

Hierarquia comercial:
1. Venda direta (offer_link=true com bike_for_link da recomendada)
2. Responder objeções (autonomia, peso, garupa, subidas, bateria, freios, conforto, preço)
3. Consultoria paga de R$ 297 (offer_consultoria=true) — SOMENTE quando o usuário demonstrar insegurança relevante, muitas dúvidas, caso complexo, medo de comprar errado, pedir análise personalizada ou pedir atendimento humano
4. Grupo de ofertas (offer_group=true) — apenas quando o usuário estiver claramente sem urgência

REGRA CRÍTICA DE INTENÇÃO DE COMPRA:
Se o usuário disser QUALQUER coisa que demonstre intenção de compra ("quero comprar", "onde compro", "me manda o link", "vou comprar", "quero essa", "como faço para comprar", "quanto custa", "já decidi", "vou fechar", "quero a V29", "quero a segunda opção", etc), responda IMEDIATAMENTE com:
- reply: uma frase confirmando a recomendação em 1-2 frases (ex.: "Perfeito. Pelo seu perfil, eu iria de <primária>. Ela é a opção mais completa para o seu uso.")
- offer_link=true, bike_for_link=<id da bike principal recomendada>
- se houver alternativa, também informar secondary_bike_for_link=<id da alternativa>
- NÃO faça outra pergunta. NÃO ofereça explicações longas antes do link. NÃO termine com "quer saber mais?".

REGRAS GERAIS:
- Use SEMPRE as respostas do quiz e os dados oficiais do catálogo. Nunca invente specs, preços, estoque, garantia, prazos, cupom, frete, legislação.
- Respostas curtas: máximo ~80 palavras, 1-2 parágrafos, uma pergunta por vez.
- NUNCA mostre identificadores técnicos no reply: id, bike_id, slug, chaves internas, nomes de variáveis. Escreva apenas o nome comercial da bike (ex.: "V8 Pro", não "V8 Pro (id=v8_pro)").
- NUNCA mencione origem do lead, canal, campanha, anúncio, vídeo, YouTube, Meta, Facebook, Instagram, UTM, source_url, traffic_origin ou qualquer motivo interno de priorização. Justifique recomendações somente com uso, distância, trajeto, garupa, peso, orçamento, experiência, autonomia, conforto, segurança e custo-benefício.
- Nunca gere URLs. Use bike_for_link/secondary_bike_for_link com o id da bike. O frontend resolve o link correto.
- NÃO seja neutro quando já houver dados suficientes. Evite "ambas são ótimas", "depende", "as duas fazem sentido". Faça uma escolha clara: "Pelo seu perfil, eu escolheria a X porque Y."
- Se o usuário mudar uma resposta importante (orçamento, garupa, peso, distância, trajeto), use suggested_action="recalc" e sugira refazer o quiz.
- Respeite filtros rígidos: nunca recomende bike acima do orçamento ou incompatível com garupa/peso.
- Consultoria paga: só quando o usuário demonstrar insegurança real ou pedir atendimento humano. NÃO oferecer para quem só perguntou preço/link/autonomia.
- Handoff humano: só se o usuário pedir explicitamente.
- Se ainda não mostrou o aviso de afiliado nesta conversa e for enviar o primeiro link, show_affiliate_disclosure=true.
- Escopo: bikes cadastradas, quiz, comparação, uso, autonomia, garupa, peso, trajeto, delivery, preço, escolha. Fora disso: "Posso ajudar com dúvidas sobre as bikes elétricas e o resultado do quiz."

FORMATO DA RESPOSTA (JSON estrito, sem markdown/crases):
{
  "reply": "texto natural (curto)",
  "intent_level": "low" | "medium" | "high" | null,
  "preferred_bike": "id ou null",
  "main_objection": "preco|autonomia|peso|garupa|subida|conforto|manutencao|seguranca|potencia|marca|entrega|parcelamento|medo_escolher_errado|outra | null",
  "main_objection_label": "descrição curta ou null",
  "purchase_timing": "agora|proximos_dias|proximas_semanas|sem_previsao|null",
  "suggested_action": "answer|compare|offer_link|offer_group|offer_list|offer_handoff|offer_consultoria|recalc|null",
  "offer_link": boolean,
  "offer_group": boolean,
  "offer_list": boolean,
  "offer_handoff": boolean,
  "offer_consultoria": boolean,
  "bike_for_link": "id ou null",
  "secondary_bike_for_link": "id ou null",
  "show_affiliate_disclosure": boolean
}`;

function buildContextBlock(ctx: z.infer<typeof BodySchema>["context"]) {
  const parts: string[] = [];
  if (ctx.name) parts.push(`Nome do lead: ${ctx.name}`);
  if (ctx.labels && Object.keys(ctx.labels).length) {
    parts.push("Respostas do quiz:");
    for (const [k, v] of Object.entries(ctx.labels)) {
      if (v) parts.push(`- ${k}: ${v}`);
    }
  }
  if (ctx.recommendation?.primary) {
    parts.push(`Recomendação principal: ${ctx.recommendation.primary.name} (id=${ctx.recommendation.primary.id}).`);
    if (ctx.recommendation.reasonPrimary) parts.push(`Motivo: ${ctx.recommendation.reasonPrimary}`);
  }
  if (ctx.recommendation?.secondary) {
    parts.push(`Recomendação secundária: ${ctx.recommendation.secondary.name} (id=${ctx.recommendation.secondary.id}).`);
    if (ctx.recommendation.reasonSecondary) parts.push(`Motivo: ${ctx.recommendation.reasonSecondary}`);
  }
  if (ctx.origin?.traffic_origin) parts.push(`Origem do tráfego: ${ctx.origin.traffic_origin}`);
  if (ctx.origin?.utm_content) parts.push(`utm_content: ${ctx.origin.utm_content}`);
  if (ctx.origin?.source_bike_interest_label) parts.push(`Interesse identificado na origem: ${ctx.origin.source_bike_interest_label}`);

  if (ctx.catalog?.length) {
    parts.push("\nCatálogo oficial de bikes (use APENAS estes dados):");
    for (const b of ctx.catalog) {
      const bits = [
        `id=${b.id}`,
        `nome="${b.name}"`,
        b.autonomyKm ? `autonomia=${b.autonomyKm}km` : "",
        b.capacity ? `capacidade=${b.capacity}p` : "",
        b.weightSupportKg ? `suporta=${b.weightSupportKg}kg` : "",
        b.internalPrice ? `preço=R$${b.internalPrice}` : "",
        b.diferencial ? `diferencial="${b.diferencial}"` : "",
        b.perfilIndicado ? `perfil="${b.perfilIndicado}"` : "",
      ].filter(Boolean).join(", ");
      parts.push(`- ${bits}`);
      if (b.fullDescription) parts.push(`  detalhes: ${b.fullDescription.slice(0, 900)}`);
    }
  }
  if (ctx.affiliate_disclosure_shown) {
    parts.push("\nAviso de afiliado JÁ FOI mostrado nesta conversa — não repita (show_affiliate_disclosure = false).");
  } else {
    parts.push("\nAviso de afiliado AINDA NÃO foi mostrado nesta conversa.");
  }
  return parts.join("\n");
}

function safeParseJson(text: string): SdrResponse | null {
  const trimmed = text.trim();
  // remove code fences if any
  const cleaned = trimmed.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned) as SdrResponse;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]) as SdrResponse; } catch { /* ignore */ }
    }
    return null;
  }
}

async function updateLeadSdrFields(
  supabase: ReturnType<typeof createClient>,
  leadId: string,
  patch: Record<string, unknown>,
) {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    clean[k] = v;
  }
  if (!Object.keys(clean).length) return;
  const { error } = await supabase.from("quiz_leads").update(clean).eq("id", leadId);
  if (error) console.error("[sdr-lucas] update lead failed", error);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) {
    return new Response(JSON.stringify({ error: "missing_lovable_api_key" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "invalid_body", details: parsed.error.flatten() }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const { lead_id, user_message, history, context } = parsed.data;

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT_BASE },
    { role: "system", content: `CONTEXTO DO LEAD:\n${buildContextBlock(context)}` },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: user_message },
  ];

  let reply = "";
  let structured: SdrResponse | null = null;
  try {
    const gwRes = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });
    if (gwRes.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (gwRes.status === 402) {
      return new Response(JSON.stringify({ error: "credits_exhausted" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!gwRes.ok) {
      const txt = await gwRes.text().catch(() => "");
      console.error("[sdr-lucas] gateway error", gwRes.status, txt);
      return new Response(JSON.stringify({ error: "gateway_error", status: gwRes.status }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await gwRes.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";
    reply = typeof raw === "string" ? raw : "";
    structured = safeParseJson(reply);
  } catch (e) {
    console.error("[sdr-lucas] fetch failed", e);
    return new Response(JSON.stringify({ error: "gateway_unreachable" }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!structured || typeof structured.reply !== "string" || !structured.reply.trim()) {
    return new Response(JSON.stringify({
      error: "invalid_ai_response",
      raw: reply.slice(0, 500),
    }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Validate bike_for_link against catalog
  const catalogIds = new Set((context.catalog ?? []).map((b) => b.id));
  if (structured.bike_for_link && !catalogIds.has(structured.bike_for_link)) {
    console.warn("[sdr-lucas] bike_for_link inválido, ignorando", structured.bike_for_link);
    structured.bike_for_link = null;
    structured.offer_link = false;
  }
  if (structured.secondary_bike_for_link && !catalogIds.has(structured.secondary_bike_for_link)) {
    console.warn("[sdr-lucas] secondary_bike_for_link inválido, ignorando", structured.secondary_bike_for_link);
    structured.secondary_bike_for_link = null;
  }

  // Persist SDR fields if lead exists
  if (lead_id) {
    try {
      const url = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (url && serviceKey) {
        const admin = createClient(url, serviceKey);
        await updateLeadSdrFields(admin, lead_id, {
          sdr_last_interaction_at: new Date().toISOString(),
          sdr_conversation_started_at: undefined, // set by first-message client call
          sdr_intent_level: structured.intent_level ?? undefined,
          sdr_preferred_bike: structured.preferred_bike ?? undefined,
          sdr_main_objection: structured.main_objection ?? undefined,
          sdr_main_objection_label: structured.main_objection_label ?? undefined,
          sdr_purchase_timing: structured.purchase_timing ?? undefined,
          sdr_link_offered: structured.offer_link ? true : undefined,
          sdr_affiliate_disclosure_shown: structured.show_affiliate_disclosure ? true : undefined,
          sdr_human_handoff_requested: structured.offer_handoff ? true : undefined,
          sdr_conversation_status: structured.suggested_action ?? undefined,
        });
      }
    } catch (e) {
      console.error("[sdr-lucas] persist failed", e);
    }
  }

  return new Response(JSON.stringify(structured), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
