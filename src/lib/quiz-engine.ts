import {
  BIKES,
  BUDGET_MAX_PRICE,
  type Bike,
  type BudgetTier,
} from "@/data/bikes";
import {
  computeSourceInterestBonuses,
  type SourceBikeInterest,
} from "@/lib/source-bike-interest";

export type Answers = {
  main_use: string;
  daily_km_range: string;
  route_type: string;
  rider_capacity_need: string;
  weight_range: string;
  budget_range: string;
  had_ebike_before: string;
};

export type Labels = {
  main_use_label: string;
  daily_km_range_label: string;
  route_type_label: string;
  rider_capacity_need_label: string;
  weight_range_label: string;
  budget_range_label: string;
  had_ebike_before_label: string;
};

export type Clusters = {
  usage_cluster: string;
  distance_cluster: string;
  route_cluster: string;
  passenger_cluster: string;
  weight_cluster: string;
  budget_cluster: string;
  experience_cluster: string;
  intent_cluster: string;
  recommendation_profile: string;
};

export function computeClusters(a: Answers): Clusters {
  const usage_cluster =
    a.main_use === "trabalho_delivery_renda"
      ? "uso_profissional"
      : a.main_use === "locomocao_diaria"
        ? "uso_mobilidade"
        : "uso_lazer";

  const distance_cluster =
    a.daily_km_range === "ate_10_km"
      ? "baixa_distancia"
      : a.daily_km_range === "10_25_km"
        ? "media_distancia"
        : a.daily_km_range === "25_40_km"
          ? "alta_distancia"
          : "distancia_intensa";

  const route_cluster =
    a.route_type === "plano"
      ? "baixa_exigencia"
      : a.route_type === "misto"
        ? "media_exigencia"
        : "alta_exigencia";

  const passenger_cluster =
    a.rider_capacity_need === "apenas_1_pessoa"
      ? "solo"
      : a.rider_capacity_need === "garupa_as_vezes"
        ? "occasional_passenger"
        : a.rider_capacity_need === "garupa_frequente"
          ? "frequent_passenger"
          : "solo";

  const weight_cluster =
    a.weight_range === "ate_80kg"
      ? "light"
      : a.weight_range === "80_100kg"
        ? "medium"
        : a.weight_range === "100_120kg"
          ? "heavy"
          : a.weight_range === "acima_120kg"
            ? "extra_heavy"
            : "medium";

  const budget_cluster =
    a.budget_range === "ate_7000"
      ? "entrada"
      : a.budget_range === "7000_8000"
        ? "intermediario"
        : a.budget_range === "8000_10000"
          ? "avancado"
          : "premium";

  const experience_cluster =
    a.had_ebike_before === "sim" ? "comprador_experiente" : "primeira_compra";

  let intent_cluster = "intencao_padrao";
  if (
    a.main_use === "trabalho_delivery_renda" &&
    a.daily_km_range === "mais_40_km"
  )
    intent_cluster = "alta_intencao_uso_profissional";
  else if (
    a.main_use === "trabalho_delivery_renda" &&
    a.daily_km_range === "25_40_km"
  )
    intent_cluster = "media_alta_intencao_uso_profissional";
  else if (
    a.main_use === "locomocao_diaria" &&
    (a.budget_range === "8000_10000" || a.budget_range === "acima_10000")
  )
    intent_cluster = "alta_intencao_mobilidade";
  else if (
    a.main_use === "lazer_passeio" &&
    (a.budget_range === "8000_10000" || a.budget_range === "acima_10000")
  )
    intent_cluster = "alta_intencao_lazer";

  let recommendation_profile = "urbano_equilibrado";
  if (
    a.main_use === "trabalho_delivery_renda" &&
    (a.daily_km_range === "mais_40_km" || a.daily_km_range === "25_40_km")
  )
    recommendation_profile = "profissional_alta_autonomia";
  else if (a.route_type === "muitas_subidas")
    recommendation_profile = "subidas_potencia";
  else if (a.main_use === "lazer_passeio")
    recommendation_profile = "lazer_versatil";
  else if (a.budget_range === "ate_7000")
    recommendation_profile = "entrada_custo_beneficio";
  else if (a.budget_range === "acima_10000")
    recommendation_profile = "premium_performance";

  return {
    usage_cluster,
    distance_cluster,
    route_cluster,
    passenger_cluster,
    weight_cluster,
    budget_cluster,
    experience_cluster,
    intent_cluster,
    recommendation_profile,
  };
}

/** Maximum score spread in a group where editorial coverage breaks ties. */
export const CLOSE_SCORE_MARGIN = 5;

function normalized(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** No counts for repeated keywords, negative claims or comparisons with another model. */
function positiveEvidence(bike: Bike): string {
  const description = bike.fullDescription?.trim();
  const text =
    description ||
    [
      bike.shortDescription,
      ...bike.bestFor,
      ...(bike.terrains ?? []),
      ...bike.strengths,
      bike.perfilIndicado,
    ].join(". ");
  return normalized(text)
    .split(/[.!?;\n]+/)
    .filter(
      (clause) =>
        !/\b(nao|sem|menos|diferente|diferentemente|comparad|versus|vs)\b|do que|em relacao/.test(
          clause,
        ),
    )
    .join(". ");
}

function supportedWeight(bike: Bike): number {
  // Explicit load declarations only; never the weight of the bicycle or a comparison.
  const text = normalized(bike.fullDescription ?? "");
  const match = text.match(
    /capacidade maxima(?: de carga| combinada| informada)?\s*:?\s*(?:de |ate |aproximadamente )*(\d{2,3})\s*kg/,
  );
  const declared = match ? Number(match[1]) : 0;
  return declared >= 80 && declared <= 300 ? declared : bike.weightSupportKg;
}

function scoreBike(bike: Bike, a: Answers): number {
  let s = 0;
  const evidence = positiveEvidence(bike);
  const usePatterns: Record<string, RegExp> = {
    trabalho_delivery_renda:
      /trabalh|delivery|profission|entrega|carga|rotina.*intens/,
    locomocao_diaria: /locomoc|urban|diari|deslocamento|cidade|mobilidade/,
    lazer_passeio: /lazer|passeio|turismo|fim de semana/,
  };
  const terrainPatterns: Record<string, RegExp> = {
    plano: /plano|asfalt|urban|cidade/,
    misto: /misto|irregular|terra batida|cascalho|ruas ruins|pisos ruins|cross/,
    muitas_subidas: /subida|ladeira|aclive|morro|serra/,
  };
  if (usePatterns[a.main_use]?.test(evidence)) s += 30;
  if (terrainPatterns[a.route_type]?.test(evidence)) s += 20;
  else if (a.route_type === "muitas_subidas") s -= 15;

  // Advertised range needs a reserve: 30 / 40 / 60 / 80 km respectively.
  const km = bike.autonomyKm;
  const target: Record<string, number> = {
    ate_10_km: 30,
    "10_25_km": 40,
    "25_40_km": 60,
    mais_40_km: 80,
  };
  const required = target[a.daily_km_range];
  if (required) s += km >= required ? 30 : km >= required * 0.75 ? 10 : -30;

  // Copy may explicitly limit passenger comfort despite a nominal capacity of two.
  const limitedPassenger =
    /nao.{0,60}(garupa|dois adultos|duas pessoas)|(?:garupa|passageiro).{0,50}(limitad|reduzid|apertad)/.test(
      normalized(bike.fullDescription ?? ""),
    );
  const weightSupportKg = supportedWeight(bike);
  // Garupa
  if (a.rider_capacity_need === "apenas_1_pessoa") {
    // modelos de 1 pessoa pontuam um pouco; sem penalizar 2 pessoas
    if (bike.capacity === 1) s += 8;
  } else if (a.rider_capacity_need === "garupa_as_vezes") {
    if (bike.capacity === 2) s += 18;
    if (bike.capacity === 1) s -= 15;
  } else if (a.rider_capacity_need === "garupa_frequente") {
    if (bike.capacity === 2) s += 30;
    if (bike.capacity === 1) s -= 40;
    // priorizar peso suportado maior
    if (weightSupportKg >= 150) s += 10;
  }

  if (limitedPassenger && a.rider_capacity_need !== "apenas_1_pessoa") {
    s -= a.rider_capacity_need === "garupa_frequente" ? 40 : 15;
  }
  if (
    a.had_ebike_before === "nao" &&
    /exige.{0,30}(experiencia|adaptacao)|usuarios experientes/.test(evidence)
  )
    s -= 5;
  if (
    a.had_ebike_before === "nao" &&
    /primeira bike|primeira compra|iniciante|facil de controlar/.test(evidence)
  )
    s += 5;

  // Peso
  if (a.weight_range === "80_100kg") {
    if (weightSupportKg >= 120) s += 5;
  } else if (a.weight_range === "100_120kg") {
    if (weightSupportKg >= 150) s += 18;
    else if (weightSupportKg >= 120) s += 8;
    else s -= 20;
  } else if (a.weight_range === "acima_120kg") {
    if (weightSupportKg >= 165) s += 25;
    else if (weightSupportKg >= 150) s += 18;
    else s -= 60; // forte penalização — só recomendar se não houver alternativa
  }

  // Orçamento (aderência forte)
  if (bike.budgetTiers.includes(a.budget_range as BudgetTier)) s += 30;
  else {
    const order = ["ate_7000", "7000_8000", "8000_10000", "acima_10000"];
    const userIdx = order.indexOf(a.budget_range);
    const minBike = Math.min(...bike.budgetTiers.map((t) => order.indexOf(t)));
    const maxBike = Math.max(...bike.budgetTiers.map((t) => order.indexOf(t)));
    if (userIdx < minBike) s -= 25 * (minBike - userIdx);
    else if (userIdx > maxBike) s -= 5 * (userIdx - maxBike);
  }

  return s;
}

type ScoredBike = { bike: Bike; score: number };

function rankCloseScores(items: ScoredBike[]): ScoredBike[] {
  const remaining = [...items].sort(
    (a, b) => b.score - a.score || a.bike.id.localeCompare(b.bike.id),
  );
  const ranked: ScoredBike[] = [];
  while (remaining.length) {
    const anchor = remaining[0].score;
    const end = remaining.findIndex(
      (item) => anchor - item.score > CLOSE_SCORE_MARGIN,
    );
    const group = remaining.splice(0, end < 0 ? remaining.length : end);
    const count = (bike: Bike) =>
      Number.isSafeInteger(bike.videoCount) && (bike.videoCount ?? 0) > 0
        ? bike.videoCount!
        : 0;
    group.sort(
      (a, b) =>
        count(b.bike) - count(a.bike) ||
        b.score - a.score ||
        a.bike.id.localeCompare(b.bike.id),
    );
    ranked.push(...group);
  }
  return ranked;
}

export type RecommendResult = {
  primary: Bike;
  secondary?: Bike;
  primaryScore: number;
  secondaryScore?: number;
  budgetLimited: boolean;
  /** Score original (antes de qualquer bônus por interesse de origem). */
  baseScores: Record<string, number>;
  /** Bônus aplicado por bike (apenas as que receberam). */
  sourceInterestBonuses: Record<string, number>;
  /** Score final = base + bonus. */
  finalScores: Record<string, number>;
  /** True quando o bônus mudou a ordem de recomendação. */
  sourceInterestInfluencedRanking: boolean;
};

export function recommend(
  a: Answers,
  sourceInterest?: SourceBikeInterest | null,
  /** Catálogo dinâmico (planilha). Sem ele, usa o catálogo estático. */
  catalog?: Bike[] | null,
): RecommendResult {
  const source = catalog && catalog.length > 0 ? catalog : BIKES;
  const maxPrice = BUDGET_MAX_PRICE[a.budget_range as BudgetTier] ?? 999999;
  // Filtro RÍGIDO de orçamento — nunca recomenda acima do limite
  const eligible = source.filter((b) => b.internalPrice <= maxPrice);
  const pool = eligible.length > 0 ? eligible : source;
  const budgetLimited = eligible.length < source.length;

  // 1) Pontuação normal (base)
  const baseRanked = pool
    .map((b) => ({ bike: b, score: scoreBike(b, a) }))
    .sort((x, y) => y.score - x.score || x.bike.id.localeCompare(y.bike.id));
  const baseScores: Record<string, number> = {};
  for (const r of baseRanked) baseScores[r.bike.id] = r.score;
  const baseOrder = rankCloseScores(baseRanked).map((r) => r.bike.id);

  // 2) Bônus por interesse de origem (apenas para bikes elegíveis; e só se
  //    a origem for elegível para receber bônus — gating por YouTube).
  let sourceInterestBonuses: Record<string, number> = {};
  if (
    sourceInterest &&
    sourceInterest.shouldApplyBonus &&
    sourceInterest.matches.length > 0
  ) {
    sourceInterestBonuses = computeSourceInterestBonuses(
      sourceInterest.matches,
      pool.map((b) => b.id),
    );
  }

  // 3) Ordenação final
  const finalScores: Record<string, number> = { ...baseScores };
  for (const id of Object.keys(sourceInterestBonuses)) {
    if (finalScores[id] !== undefined) {
      finalScores[id] = finalScores[id] + sourceInterestBonuses[id];
    }
  }
  const ranked = rankCloseScores(
    pool.map((b) => ({ bike: b, score: finalScores[b.id] ?? 0 })),
  );

  const primary = ranked[0];
  const secondary = ranked.find(
    (r, i) => i > 0 && r.bike.id !== primary.bike.id,
  );

  const finalOrder = ranked.map((r) => r.bike.id);
  const sourceInterestInfluencedRanking =
    Object.keys(sourceInterestBonuses).length > 0 &&
    (baseOrder[0] !== finalOrder[0] || baseOrder[1] !== finalOrder[1]);

  return {
    primary: primary.bike,
    primaryScore: primary.score,
    secondary: secondary?.bike,
    secondaryScore: secondary?.score,
    budgetLimited,
    baseScores,
    sourceInterestBonuses,
    finalScores,
    sourceInterestInfluencedRanking,
  };
}

export function buildPersonalizedCopy(
  a: Answers,
  isPrimary: boolean,
  budgetLimited = false,
): string {
  const parts: string[] = [];

  if (
    a.main_use === "trabalho_delivery_renda" &&
    (a.daily_km_range === "mais_40_km" || a.daily_km_range === "25_40_km")
  ) {
    parts.push(
      "Você vai usar a bike para trabalho e roda bastante por dia. A recomendação prioriza autonomia, resistência e menor risco de ficar sem bateria no meio da rotina.",
    );
  } else if (a.main_use === "locomocao_diaria") {
    parts.push(
      "Para deslocamento diário, a melhor escolha equilibra autonomia, conforto e segurança, sem exagerar no que você não precisa.",
    );
  } else if (a.main_use === "lazer_passeio") {
    parts.push(
      "Para lazer e passeio, a escolha ideal entrega conforto, estabilidade e prazer de uso, com estrutura robusta e boa autonomia.",
    );
  }

  if (a.route_type === "muitas_subidas") {
    parts.push(
      "Como seu trajeto tem muitas subidas, priorizamos motor forte, estrutura adequada e freios confiáveis.",
    );
  }

  if (a.rider_capacity_need === "garupa_frequente") {
    parts.push(
      "Como você vai usar a bike com garupa com frequência, priorizamos modelos com estrutura para 2 pessoas e maior peso suportado.",
    );
  } else if (a.rider_capacity_need === "garupa_as_vezes") {
    parts.push(
      "Como você pode levar garupa às vezes, priorizamos modelos preparados para 2 pessoas.",
    );
  }

  if (a.weight_range === "acima_120kg") {
    parts.push(
      "Considerando a faixa de peso informada, priorizamos modelos mais robustos com maior capacidade de carga.",
    );
  } else if (a.weight_range === "100_120kg") {
    parts.push(
      "Considerando a faixa de peso informada, priorizamos modelos com estrutura, estabilidade e segurança adequadas.",
    );
  }

  if (a.had_ebike_before === "nao" && isPrimary) {
    parts.push(
      "Como pode ser sua primeira bike elétrica, evitamos modelos que parecem bons no papel mas não fazem sentido para seu uso real.",
    );
  } else if (a.had_ebike_before === "sim" && isPrimary) {
    parts.push(
      "Como você já teve experiência, a recomendação considera critérios mais técnicos: autonomia, motor, freios e desempenho em trajetos exigentes.",
    );
  }

  if (budgetLimited && isPrimary) {
    parts.push(
      "Dentro do orçamento informado, priorizamos a opção com melhor equilíbrio entre autonomia, segurança e risco menor de compra errada.",
    );
  }

  return parts.join(" ");
}

/**
 * Copy específica para a alternativa, considerando se é mais barata ou mais cara.
 */
export function buildSecondaryCopy(primary: Bike, secondary: Bike): string {
  if (secondary.internalPrice < primary.internalPrice) {
    return "Essa opção aparece como alternativa porque entrega uma escolha mais econômica dentro do seu perfil, mantendo os critérios essenciais para o seu uso.";
  }
  if (secondary.internalPrice > primary.internalPrice) {
    return "Essa opção aparece como alternativa porque entrega mais robustez e conforto, mantendo aderência ao orçamento informado.";
  }
  return "Essa opção aparece como alternativa porque também atende ao seu perfil dentro do orçamento informado, mas com um equilíbrio diferente entre conforto, autonomia e estrutura.";
}

/**
 * Frase adicional (natural) quando o interesse de origem influenciou a
 * recomendação. NUNCA menciona UTM, algoritmo, pontuação ou bônus.
 * Retorna string vazia quando não há nada a adicionar.
 */
export function buildSourceInterestCopy(
  sourceBikeName: string | null | undefined,
  recommendedBikeId: string,
  sourceBikeId: string | null | undefined,
): string {
  if (!sourceBikeName || !sourceBikeId) return "";
  if (recommendedBikeId === sourceBikeId) {
    return `Como você chegou ao quiz por um conteúdo sobre a ${sourceBikeName} e ela também se encaixa no seu orçamento e perfil de uso, ela ganhou prioridade na recomendação.`;
  }
  return `Você chegou ao quiz por um conteúdo sobre a ${sourceBikeName}. Como outra opção apresentou melhor aderência ao seu orçamento e às suas respostas, priorizamos um modelo semelhante que atende melhor ao seu perfil.`;
}
