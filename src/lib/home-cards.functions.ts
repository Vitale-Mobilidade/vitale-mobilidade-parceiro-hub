import { createServerFn } from "@tanstack/react-start";
import { fetchTrackerCatalog } from "./radar-repository.server";
import { buildRadarEntries, type RadarBike } from "./radar-rankings";
import { BIKE_ID_RE } from "./bike-identity";

export type HomeCard = { id: string; name: string; currentPrice: number };
const MAX_CARDS = 6;

/** Home B2C: até 6 cards (ordem alfabética de buildRadarEntries), só {id,name,currentPrice}. */
export const getHomeCards = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ ok: true; cards: HomeCard[] } | { ok: false }> => {
    try {
      const r = await fetchTrackerCatalog();
      if (!r.ok || !Array.isArray(r.data)) return { ok: false };
      const cards = buildRadarEntries(r.data as unknown as RadarBike[], "all")
        .filter(
          (e) =>
            typeof e.id === "string" &&
            BIKE_ID_RE.test(e.id) &&
            typeof e.name === "string" &&
            e.name.trim() !== "" &&
            typeof e.currentPrice === "number" &&
            Number.isFinite(e.currentPrice),
        )
        .slice(0, MAX_CARDS)
        .map((e) => ({ id: e.id, name: e.name, currentPrice: e.currentPrice }));
      return { ok: true, cards };
    } catch {
      return { ok: false };
    }
  },
);
