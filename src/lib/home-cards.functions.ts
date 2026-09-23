import { createServerFn } from "@tanstack/react-start";
import { fetchTrackerCatalog } from "./radar-repository.server";
import { buildRadarEntries, sortEntries, type RadarBike } from "./radar-rankings";
import { BIKE_ID_RE } from "./bike-identity";
import type { Classification } from "./price-tracker";

export type HomeCard = { id: string; name: string; currentPrice: number; image: string | null };
export type HomeSearchItem = { id: string; name: string; currentPrice: number; classification: Classification };
export type HomeRadarItem = {
  id: string;
  name: string;
  currentPrice: number;
  typicalPrice: number | null;
  classification: Classification;
};
const MAX_CARDS = 6;
const MAX_RADAR = 4;

/**
 * Home B2C: cards (até 6, alfabético), lista de busca {id,name} e preview do Radar
 * (ordem "opportunity" da regra real do Radar). Nunca devolve link afiliado nem histórico.
 */
export const getHomeCards = createServerFn({ method: "GET" }).handler(
  async (): Promise<
    | { ok: true; cards: HomeCard[]; search: HomeSearchItem[]; radar: HomeRadarItem[] }
    | { ok: false }
  > => {
    try {
      const r = await fetchTrackerCatalog();
      if (!r.ok || !Array.isArray(r.data)) return { ok: false };
      const valid = buildRadarEntries(r.data as unknown as RadarBike[], "all").filter(
        (e) =>
          typeof e.id === "string" &&
          BIKE_ID_RE.test(e.id) &&
          typeof e.name === "string" &&
          e.name.trim() !== "" &&
          typeof e.currentPrice === "number" &&
          Number.isFinite(e.currentPrice),
      );
      const cards = valid
        .slice(0, MAX_CARDS)
        .map((e) => ({
          id: e.id,
          name: e.name,
          currentPrice: e.currentPrice,
          // Imagem da bike já servida pelo catálogo (bike-image); só https.
          image: typeof e.image === "string" && /^https:\/\/[^\s"<>]+$/.test(e.image) ? e.image : null,
        }));
      const search = valid.map((e) => ({ id: e.id, name: e.name, currentPrice: e.currentPrice, classification: e.metrics.classification }));
      const radar = sortEntries(valid, "opportunity")
        .slice(0, MAX_RADAR)
        .map((e) => ({
          id: e.id,
          name: e.name,
          currentPrice: e.currentPrice,
          typicalPrice:
            typeof e.metrics.typicalPrice === "number" && Number.isFinite(e.metrics.typicalPrice)
              ? e.metrics.typicalPrice
              : null,
          classification: e.metrics.classification,
        }));
      return { ok: true, cards, search, radar };
    } catch {
      return { ok: false };
    }
  },
);
