/**
 * Detecção de "bike de origem" a partir de UTMs / URLs de tráfego
 * ---------------------------------------------------------------
 *
 * Objetivo: quando o usuário chega ao quiz por um conteúdo (vídeo) sobre uma
 * bike específica, usar essa informação como sinal adicional de interesse na
 * engine de recomendação, sem forçar recomendação incompatível.
 *
 * Fonte de sinal (ordem de prioridade):
 *   1. utm_content atual
 *   2. source_url atual (URL da página no momento da recomendação)
 *   3. first_url (primeira URL vista pelo lead) — apenas como fallback
 *
 * O first_url NUNCA substitui uma UTM atual válida.
 *
 * O bônus na engine é aplicado somente quando o tráfego é de YouTube
 * (utm_source = youtube ou traffic_origin = youtube). Para outras origens,
 * a identificação ocorre (para auditoria/CRM), mas o score não muda.
 */

import { BIKES, type Bike } from "@/data/bikes";

// ---------- Aliases por bike ----------
// A ordem dentro do array é irrelevante, mas os aliases são ordenados
// globalmente pelo comprimento (maior primeiro) na hora do match para evitar
// que um alias curto ("gt20") case dentro de um composto ("coswheel_gt20").
export const BIKE_ALIASES: Record<string, string[]> = {
  ft03: ["ft03", "ft_03", "panda_ft03", "mangosteen_ft03"],
  v20_mini: ["v20_mini", "v20mini"],
  v9_max: ["v9_max", "v9max"],
  v10_max: ["v10_max", "v10max"],
  v40_pro: ["v40_pro", "v40pro"],
  v8_pro: ["v8_pro", "v8pro"],
  v8_pro_s: ["v8_pro_s", "v8pros", "v8_pros"],
  v8_ultra: ["v8_ultra", "v8ultra"],
  ouxi_gt20: ["ouxi_gt20", "ouxigt20"],
  coswheel_gt20: ["coswheel_gt20", "coswheelgt20"],
  gt2000: ["gt2000", "wanshida_gt2000"],
  v29_pro: ["v29_pro", "v29pro"],
  v35: ["v35"],
  v20_pro: ["v20_pro", "v20pro", "v20_brake_pro", "v20brakepro"],
  s8: ["honeywhale_s8", "s8"],
  bw02: ["bw02", "honeywhale_bw02"],
  f6_pro_s: ["f6_pro_s", "f6pros", "f6_pros", "honeywhale_f6_pro_s"],
};

/**
 * Grupos de similaridade — usados para dar um bônus MENOR (4 pts) a bikes
 * tecnicamente próximas quando a bike do vídeo não é elegível (ou como
 * reforço para modelos aparentados). Não é similaridade por nome.
 */
const SIMILARITY_GROUPS: Record<string, string[]> = {
  entrada_urbana: ["ft03", "v9_max", "v40_pro", "s8", "v20_mini"],
  urbana_conforto: ["v8_pro", "v8_ultra", "v20_pro", "ouxi_gt20"],
  compacta_dobravel: ["bw02", "f6_pro_s", "v20_mini"],
  longa_autonomia: ["v29_pro", "v35", "v8_pro_s"],
  premium_performance: ["gt2000", "coswheel_gt20", "v10_max"],
};

const SIMILARITY_INDEX: Record<string, Set<string>> = (() => {
  const idx: Record<string, Set<string>> = {};
  for (const ids of Object.values(SIMILARITY_GROUPS)) {
    for (const id of ids) {
      if (!idx[id]) idx[id] = new Set();
      for (const other of ids) if (other !== id) idx[id].add(other);
    }
  }
  return idx;
})();

/** Retorna ids de bikes tecnicamente semelhantes à `bikeId`. */
export function similarBikeIds(bikeId: string): string[] {
  const set = SIMILARITY_INDEX[bikeId];
  return set ? Array.from(set) : [];
}

// ---------- Detecção ----------

export type SourceBikeTracking = {
  utm_content?: string | null;
  utm_source?: string | null;
  source_url?: string | null;
  first_url?: string | null;
  traffic_origin?: string | null;
};

export type SourceBikeInterest = {
  /** slug principal (primeira bike detectada, na ordem de aparição). */
  interest: string | null;
  /** nome exibido da bike principal detectada. */
  label: string | null;
  /** todos os slugs identificados no conteúdo. */
  matches: string[];
  /** de onde veio a detecção. */
  detectionSource: "utm_content" | "source_url" | "first_url" | null;
  /** true quando o bônus de score deve ser aplicado (gating por YouTube). */
  shouldApplyBonus: boolean;
};

function normalizeText(input: string | null | undefined): string {
  if (!input) return "";
  try {
    const decoded = decodeURIComponent(input);
    return `_${decoded.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_`;
  } catch {
    return `_${input.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_`;
  }
}

/**
 * Lista global de aliases ordenada por comprimento decrescente. Aliases mais
 * específicos ("coswheel_gt20", "v8_pro_s") são testados antes de aliases
 * genéricos ("gt20" NÃO existe como alias solto justamente por isso, "v8_pro").
 */
const ALIAS_ENTRIES: Array<{ bikeId: string; alias: string }> = (() => {
  const list: Array<{ bikeId: string; alias: string }> = [];
  for (const [bikeId, aliases] of Object.entries(BIKE_ALIASES)) {
    for (const alias of aliases) list.push({ bikeId, alias });
  }
  list.sort((a, b) => b.alias.length - a.alias.length);
  return list;
})();

function detectBikesInText(rawText: string): string[] {
  let text = normalizeText(rawText);
  if (!text) return [];
  const found: string[] = [];
  for (const { bikeId, alias } of ALIAS_ENTRIES) {
    if (found.includes(bikeId)) continue;
    // Token boundaries garantidos pelos underscores da normalização.
    const needle = `_${alias}_`;
    const idx = text.indexOf(needle);
    if (idx !== -1) {
      found.push(bikeId);
      // Substitui a ocorrência por underscores para não interferir em outros
      // matches mais curtos (ex.: remover "coswheel_gt20" antes que qualquer
      // alias interno seja testado — hoje não temos "gt20" solto, mas isso
      // protege contra aliases futuros).
      text =
        text.slice(0, idx) +
        "_".repeat(needle.length) +
        text.slice(idx + needle.length);
    }
  }
  return found;
}

function isYoutubeOrigin(tracking: SourceBikeTracking): boolean {
  const utm = (tracking.utm_source ?? "").toString().toLowerCase().trim();
  if (utm === "youtube" || utm === "yt") return true;
  const origin = (tracking.traffic_origin ?? "").toString().toLowerCase().trim();
  if (origin === "youtube" || origin === "yt") return true;
  return false;
}

/**
 * Detecta a(s) bike(s) mencionada(s) no material de origem do tráfego.
 */
export function detectSourceBikeInterest(
  tracking: SourceBikeTracking | null | undefined,
): SourceBikeInterest {
  const empty: SourceBikeInterest = {
    interest: null,
    label: null,
    matches: [],
    detectionSource: null,
    shouldApplyBonus: false,
  };
  if (!tracking) return empty;

  const candidates: Array<{
    text: string | null | undefined;
    source: "utm_content" | "source_url" | "first_url";
  }> = [
    { text: tracking.utm_content, source: "utm_content" },
    { text: tracking.source_url, source: "source_url" },
    { text: tracking.first_url, source: "first_url" },
  ];

  for (const c of candidates) {
    if (!c.text || String(c.text).trim() === "") continue;
    const matches = detectBikesInText(String(c.text));
    if (matches.length > 0) {
      const primary = matches[0];
      const bike = BIKES.find((b) => b.id === primary);
      return {
        interest: primary,
        label: bike?.name ?? null,
        matches,
        detectionSource: c.source,
        shouldApplyBonus: isYoutubeOrigin(tracking),
      };
    }
  }

  return empty;
}

// ---------- Bônus ----------

export const SOURCE_INTEREST_BONUS = {
  /** Bike do vídeo, elegível após filtros rígidos. */
  exact: 10,
  /** Duas bikes citadas e ambas elegíveis (comparativo). */
  comparativeEach: 7,
  /** Bike tecnicamente semelhante à(s) do vídeo. */
  similar: 4,
} as const;

/**
 * Calcula o mapa de bônus por bike id, respeitando:
 *  - bikes eligíveis (após filtros rígidos de orçamento/peso/etc.)
 *  - comparativos com duas bikes
 *  - similaridade quando a exata é inelegível
 *
 * @param sourceMatches ids das bikes detectadas na origem (na ordem)
 * @param eligibleIds   ids das bikes que passaram nos filtros rígidos
 */
export function computeSourceInterestBonuses(
  sourceMatches: string[],
  eligibleIds: string[],
): Record<string, number> {
  if (sourceMatches.length === 0) return {};
  const eligible = new Set(eligibleIds);
  const bonuses: Record<string, number> = {};

  const eligibleMatches = sourceMatches.filter((id) => eligible.has(id));

  if (sourceMatches.length >= 2) {
    // Comparativo
    if (eligibleMatches.length >= 2) {
      for (const id of eligibleMatches.slice(0, 2)) {
        bonuses[id] = (bonuses[id] ?? 0) + SOURCE_INTEREST_BONUS.comparativeEach;
      }
    } else if (eligibleMatches.length === 1) {
      const id = eligibleMatches[0];
      bonuses[id] = (bonuses[id] ?? 0) + SOURCE_INTEREST_BONUS.exact;
    }
    // Se nenhuma é elegível → apenas bônus de similaridade (abaixo).
  } else {
    // Apenas 1 bike citada
    if (eligibleMatches.length === 1) {
      const id = eligibleMatches[0];
      bonuses[id] = (bonuses[id] ?? 0) + SOURCE_INTEREST_BONUS.exact;
    }
  }

  // Similaridade: sempre calculada para reforçar bikes próximas às citadas
  // (mesmo quando a exata é elegível, similares recebem um bônus menor).
  const similarSet = new Set<string>();
  for (const id of sourceMatches) {
    for (const sim of similarBikeIds(id)) similarSet.add(sim);
  }
  // Não empilhar bônus de similaridade sobre a bônus exata da mesma bike.
  for (const id of similarSet) {
    if (bonuses[id]) continue;
    if (!eligible.has(id)) continue;
    bonuses[id] = SOURCE_INTEREST_BONUS.similar;
  }

  return bonuses;
}

/** Retorna a bike (do BIKES) pelo id ou undefined. */
export function bikeById(id: string | null | undefined): Bike | undefined {
  if (!id) return undefined;
  return BIKES.find((b) => b.id === id);
}
