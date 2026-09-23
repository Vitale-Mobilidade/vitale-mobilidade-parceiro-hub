/**
 * Selo comercial da PÁGINA CANÔNICA DA BIKE (/bikes/$slug).
 *
 * Só aqui. O painel analítico /radar/$bikeId continua sem selo de avaliação de preço.
 *
 * Regras:
 *  - Nada é inventado: usamos a classificação já calculada por `dailyMetrics`
 *    sobre preços inseridos e validados manualmente pelo time.
 *  - Amostra insuficiente (`forming`) → selo NEUTRO "Preço registrado", nunca bom/mau.
 *  - Sem oferta com link válido → "Oferta indisponível": o preço exibido é o último
 *    registro histórico, com data, e não há CTA.
 *  - "Imperdível" NÃO é gerado automaticamente: exige decisão humana explícita
 *    (campo editorial futuro). Preço baixo isolado não comprova urgência nem estoque.
 *  - Nenhum percentual de desconto é fabricado.
 */

import type { Classification } from "./price-tracker";

export type CommercialBadgeKind =
  | "unavailable"
  | "neutral"
  | "lowest"
  | "opportunity"
  | "typical"
  | "above";

export interface CommercialBadge {
  kind: CommercialBadgeKind;
  label: string;
  /** Frase curta factual, sem alarmismo e sem promessa. */
  hint: string;
}

const BADGES: Record<CommercialBadgeKind, { label: string; hint: string }> = {
  unavailable: {
    label: "Oferta indisponível",
    hint: "Sem anúncio ativo no Mercado Livre agora. O valor abaixo é o último preço registrado.",
  },
  neutral: {
    label: "Preço registrado",
    hint: "Histórico ainda curto para comparar: mostramos o preço registrado, sem avaliação.",
  },
  lowest: {
    label: "Menor preço registrado",
    hint: "É o menor valor que registramos para este modelo no período acompanhado.",
  },
  opportunity: {
    label: "Oportunidade",
    hint: "Está abaixo da faixa habitual dos preços que registramos no período.",
  },
  typical: {
    label: "Na faixa habitual",
    hint: "Está dentro da faixa de preços que registramos no período.",
  },
  above: {
    label: "Acima do habitual",
    hint: "Está acima da faixa de preços que registramos no período.",
  },
};

export interface BadgeInput {
  /** Oferta atual coesa: preço e link válidos do mesmo registro. */
  hasOffer: boolean;
  /** Classificação de `dailyMetrics`; null quando não há histórico diário. */
  classification: Classification | null;
}

export function commercialBadge({ hasOffer, classification }: BadgeInput): CommercialBadge {
  const kind: CommercialBadgeKind = !hasOffer
    ? "unavailable"
    : classification === "lowest"
      ? "lowest"
      : classification === "good"
        ? "opportunity"
        : classification === "typical"
          ? "typical"
          : classification === "above"
            ? "above"
            : "neutral"; // forming ou sem histórico
  return { kind, ...BADGES[kind] };
}
