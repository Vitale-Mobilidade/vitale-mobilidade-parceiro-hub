const PIXEL_ID = "1012221744823940";
const LANDING_URL = "https://vitalemobilidade.com/entrenogrupodeofertas";
const SDK_URL = "https://connect.facebook.net/en_US/fbevents.js";

type MetaPixel = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  loaded: boolean;
  version: string;
  push: MetaPixel;
  disablePushState: boolean;
};

type PixelWindow = Window & { fbq?: MetaPixel; _fbq?: MetaPixel };

let pixel: MetaPixel | undefined;
let consent = false;

export function offersMetaAvailable() {
  const url = new URL(window.location.href);
  if (url.origin + url.pathname.replace(/\/$/, "") !== LANDING_URL || url.hash)
    return false;
  // The SDK reports the browser URL. Admit campaign codes and click IDs, never arbitrary parameters.
  if (url.searchParams.get("vitale_meta_test") !== "1") return false;
  const accepted =
    /^(utm_source|utm_medium|utm_campaign|utm_content|fbclid|gclid|gbraid|wbraid|vitale_meta_test)$/;
  for (const [key, value] of url.searchParams) {
    if (
      !accepted.test(key) ||
      !/^[a-z0-9_-]{1,512}$/i.test(value) ||
      url.searchParams.getAll(key).length !== 1
    )
      return false;
    if (key.startsWith("utm_") && /^\d[\d_-]{6,}\d$/.test(value)) return false;
  }
  return true;
}

export function setOffersMetaConsent(granted: boolean) {
  consent = false;
  if (!granted) {
    if (pixel && !pixel.callMethod)
      pixel.queue = pixel.queue.filter(
        ([command]) => command !== "trackSingleCustom",
      );
    pixel?.("consent", "revoke");
    return;
  }
  if (!offersMetaAvailable()) return;
  const browser = window as PixelWindow;
  if (!pixel) {
    if (browser.fbq || browser._fbq) return;
    const queue = ((...args: unknown[]) => {
      if (queue.callMethod) queue.callMethod(...args);
      else queue.queue.push(args);
    }) as MetaPixel;
    queue.queue = [];
    queue.push = queue;
    queue.loaded = true;
    queue.version = "2.0";
    queue.disablePushState = true;
    browser.fbq = browser._fbq = pixel = queue;
    queue("consent", "grant");
    queue("set", "autoConfig", false, PIXEL_ID);
    queue("optOut", PIXEL_ID, "AutomaticMatching");
    queue("optOut", PIXEL_ID, "ESTRuleEngine");
    queue("skipOpenbridge", PIXEL_ID);
    queue("optOut", PIXEL_ID, "AutomaticMatchingForPartnerIntegrations");
    queue("init", PIXEL_ID);
    const sdk = document.createElement("script");
    sdk.async = true;
    sdk.referrerPolicy = "no-referrer";
    sdk.src = SDK_URL;
    document.head.appendChild(sdk);
  } else {
    pixel("consent", "grant");
  }
  consent = true;
}

export function offersMetaConsentGranted() {
  return consent;
}

export function trackOffersMetaClick(position: string) {
  try {
    if (consent && offersMetaAvailable() && pixel) {
      pixel("trackSingleCustom", PIXEL_ID, "OffersGroupCtaClick", {
        cta_position: position,
      });
    }
  } catch {
    // The invite remains available if the SDK blocks or throws.
  }
}
