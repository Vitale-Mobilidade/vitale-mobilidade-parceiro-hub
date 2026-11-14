import {
  offersMetaConsentGranted,
  trackOffersMetaClick,
} from "./offers-meta-pixel";
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

export type OffersGroupCtaPosition = "hero" | "carousel" | "grid" | "sticky";

let adsConsent = false;
const MAX_ADS_WAIT_MS = 500;

export function setOffersGroupAdsEventConsent(granted: boolean) {
  adsConsent = granted;
}

type LinkClick = {
  currentTarget: HTMLAnchorElement;
  defaultPrevented: boolean;
  nativeEvent: { isTrusted: boolean };
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  preventDefault(): void;
};

function isPlainClick(event: LinkClick) {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function openGroupInvite(href: string) {
  const invite = document.createElement("a");
  invite.href = href;
  invite.rel = "noreferrer";
  invite.click();
}

export function handleOffersGroupCta(
  event: LinkClick,
  position: OffersGroupCtaPosition,
  bikeId?: string,
) {
  if (!event.nativeEvent.isTrusted || event.defaultPrevented) return;
  if (event.button !== 0 && event.button !== 1) return;
  if (bikeId) {
    siteAnalytics.offersOffer(
      window.location.href,
      bikeId,
      position === "carousel" ? "hero" : "grid",
    );
  } else {
    siteAnalytics.offersCta(window.location.href);
  }
  const href = event.currentTarget.href;
  const meta = offersMetaConsentGranted();
  const canWait = (adsConsent || meta) && isPlainClick(event);
  if (meta) trackOffersMetaClick(position);
  if (canWait) event.preventDefault();
  if (canWait && meta) {
    window.setTimeout(() => openGroupInvite(href), MAX_ADS_WAIT_MS);
    trackGroupInvite(position);
  } else {
    trackGroupInvite(
      position,
      canWait ? () => openGroupInvite(href) : undefined,
    );
  }
}

export function trackGroupInvite(
  position: OffersGroupCtaPosition,
  open?: () => void,
) {
  let timer: number | undefined;
  const finish = () => {
    if (timer === undefined) return;
    window.clearTimeout(timer);
    timer = undefined;
    open?.();
  };
  try {
    const url = new URL(window.location.href);
    if (!isOffersGroupLanding(url.pathname) || !adsConsent) {
      open?.();
      return;
    }
    const w = window as Window & { dataLayer?: unknown[] };
    if (open) timer = window.setTimeout(finish, MAX_ADS_WAIT_MS);
    (w.dataLayer ??= []).push({
      event: "offers_group_cta_click",
      page_path: OFFERS_GROUP_LANDING_PATH,
      cta_position: position,
      vitale_offers_google_ads: true,
      ...(open ? { eventCallback: finish, eventTimeout: MAX_ADS_WAIT_MS } : {}),
    });
  } catch {
    if (timer !== undefined) finish();
    else open?.();
  }
}
