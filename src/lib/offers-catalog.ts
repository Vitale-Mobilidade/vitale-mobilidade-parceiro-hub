import { BIKE_ID_RE } from "./bike-identity";
import {
  buildRadarEntries,
  sortEntries,
  type RadarBike,
} from "./radar-rankings";

export type CampaignBike = {
  id: string;
  name: string;
  image: string | null;
  offer: { price: number; href: string; savingsPct: number | null } | null;
};

/** Accept canonical product links and the same Mercado Livre affiliate short links used in the Radar. */
export function campaignOfferUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.origin !== `https://${url.hostname}` ||
      url.username ||
      url.password
    )
      return null;
    const path = url.pathname;
    const shortLink =
      url.hostname === "meli.la" && /^\/[a-z0-9]+\/?$/i.test(path);
    const productLink =
      [
        "mercadolivre.com.br",
        "www.mercadolivre.com.br",
        "produto.mercadolivre.com.br",
      ].includes(url.hostname) &&
      (/(?:^|\/)p\/MLB\d+(?:\/|$)/i.test(path) ||
        /^\/MLB-\d+(?:-|\/|$)/i.test(path));
    if (!shortLink && !productLink) return null;
    for (const key of url.searchParams.keys()) {
      // Preserve approved affiliate links byte for byte; reject unsafe stored URLs rather than rewriting.
      if (
        !/^(?:matt_tool|matt_word|matt_source|matt_campaign|matt_ad_group|matt_match_type|matt_network|matt_device|matt_creative|matt_keyword|matt_ad_position|matt_ad_type|matt_merchant_id|matt_product_id|matt_product_partition_id|matt_target_id|matt_internal_campaign_id|matt|aff_id|tracking_id)$/i.test(
          key,
        )
      )
        return null;
    }
    return url.hash ? null : value;
  } catch {
    return null;
  }
}

export function buildCampaignCatalog(
  active: RadarBike[],
  archived: RadarBike[],
) {
  const entries = sortEntries(buildRadarEntries(active, "all"), "relevance");
  const toBike = ({ id, name, image }: RadarBike): CampaignBike => ({
    id,
    name,
    image,
    offer: null,
  });
  const grid = new Map<string, CampaignBike>();
  for (const bike of entries) {
    if (!BIKE_ID_RE.test(bike.id)) continue;
    const record = toBike(bike);
    const href = campaignOfferUrl(bike.link);
    if (href && Number.isFinite(bike.currentPrice)) {
      record.offer = {
        price: bike.currentPrice,
        href,
        savingsPct: bike.savingsPct,
      };
    }
    grid.set(bike.id, record);
  }
  for (const bike of [...active, ...archived]) {
    if (BIKE_ID_RE.test(bike.id) && !grid.has(bike.id))
      grid.set(bike.id, toBike(bike));
  }
  const bikes = [...grid.values()];
  const highlights = bikes
    .filter(
      (bike) => bike.image && bike.offer && (bike.offer.savingsPct ?? 0) > 0,
    )
    .sort((a, b) => b.offer!.savingsPct! - a.offer!.savingsPct!)
    .slice(0, 4);
  return { highlights, bikes };
}
