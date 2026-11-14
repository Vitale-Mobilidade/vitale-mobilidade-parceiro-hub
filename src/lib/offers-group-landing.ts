import { OFFERS_GROUP_LANDING_PATH } from "../../supabase/functions/_shared/site-analytics";
import { siteAnalytics } from "./site-analytics";

export { OFFERS_GROUP_LANDING_PATH };

export function isOffersGroupLanding(path: string): boolean {
  return path.replace(/\/$/, "") === OFFERS_GROUP_LANDING_PATH;
}

const CAMPAIGN_FIELDS = ["source", "medium", "campaign", "content"] as const;
type CampaignField = (typeof CAMPAIGN_FIELDS)[number];
type CampaignValues = Record<`utm_${CampaignField}`, string | null>;

export function offersGroupCampaign(search: string): CampaignValues {
  const params = new URLSearchParams(search);
  const values = {} as CampaignValues;

  for (const field of CAMPAIGN_FIELDS) {
    const key = `utm_${field}` as const;
    const [value, duplicate] = params.getAll(key);
    // Campaign slugs only. Reject free text, URLs, emails, and phone/CPF-like values.
    values[key] =
      duplicate === undefined &&
      value &&
      /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(value) &&
      !/^\d[\d_-]{6,}\d$/.test(value)
        ? value
        : null;
  }
  return values;
}

export type OffersGroupCtaPosition = "hero" | "carousel" | "sticky";

export function trackOffersGroupCta(position: OffersGroupCtaPosition): void {
  try {
    const url = new URL(window.location.href);
    if (!isOffersGroupLanding(url.pathname)) return;
    siteAnalytics.offersCta(url.href);
    const w = window as Window & { dataLayer?: unknown[] };
    (w.dataLayer ??= []).push({
      event: "offers_group_cta_click",
      page_path: OFFERS_GROUP_LANDING_PATH,
      cta_position: position,
      ...offersGroupCampaign(url.search),
    });
  } catch {
    // Measurement is best effort; the browser always follows the anchor.
  }
}
