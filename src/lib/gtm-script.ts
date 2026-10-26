/** Start the public analytics container on the initial document load. */
export const GTM_SNIPPET = `if (!location.pathname.startsWith('/admin')) (function(w,d,s,l,i){
w[l]=w[l]||[];w.gtag=w.gtag||function(){w[l].push(arguments)};
w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;
j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;d.head.appendChild(j);
})(window,document,'script','dataLayer','GTM-NM9MGXNM');`;

/** Public GA4 only. The GTM release must keep marketing/legacy tracking paused. */
export const GA4_ID = "G-LXMH4RWQHV";
const GTM_ID = "GTM-NM9MGXNM";
const OPT_OUT_KEY = "vitale_ga4_disabled_v1";
const LEGACY_CHOICE_KEY = "vitale_cookie_consent_v1";
const PUBLIC_PATH =
  /^\/$|^\/(radar|bikes|conteudos)(\/[a-z0-9_-]+)?\/?$|^\/ferramentas(\/[a-z0-9-]+)?\/?$|^\/(quiz|videos|newsletter|privacidade|grupodeofertas|escolherbike|acompanhamento)\/?$/;

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  "ga-disable-G-LXMH4RWQHV"?: boolean;
  __vitaleGa4OptOut?: boolean;
  __vitaleGa4?: { lastPath: string | null; previousUrl: string };
};

export function googleAnalyticsDisabled(): boolean {
  if (typeof window === "undefined") return true;
  if (
    window.navigator.doNotTrack === "1" ||
    (window.navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl
  )
    return true;
  if ((window as AnalyticsWindow).__vitaleGa4OptOut !== undefined)
    return Boolean((window as AnalyticsWindow).__vitaleGa4OptOut);
  try {
    const current = window.localStorage.getItem(OPT_OUT_KEY);
    if (current === "true") return true;
    if (current === "false") return false;
    const previous = JSON.parse(window.localStorage.getItem(LEGACY_CHOICE_KEY) || "null");
    return previous?.version === 1 && previous.analytics === false;
  } catch {
    return false;
  }
}

export function setGoogleAnalyticsDisabled(disabled: boolean): void {
  if (typeof window === "undefined") return;
  const w = window as AnalyticsWindow;
  w.__vitaleGa4OptOut = disabled;
  w["ga-disable-G-LXMH4RWQHV"] = disabled;
  let persisted = false;
  try {
    window.localStorage.setItem(OPT_OUT_KEY, String(disabled));
    persisted = true;
    if (disabled) {
      for (const cookie of document.cookie.split(";")) {
        const name = cookie.split("=")[0].trim();
        if (name !== "_ga" && name !== "_ga_LXMH4RWQHV") continue;
        for (const domain of ["", "; Domain=vitalemobilidade.com"]) {
          document.cookie = `${name}=; Max-Age=0; Path=/${domain}; SameSite=Lax; Secure`;
        }
      }
    }
  } catch {
    // Disabling remains effective in memory when storage is unavailable.
  }
  // Unload any already-running Google code after a preference change.
  if (persisted) window.location.reload();
}

function referrerOrigin(value: string): string {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? `${url.origin}/` : "";
  } catch {
    return "";
  }
}

export function trackGooglePageView(href: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  try {
    const w = window as AnalyticsWindow;
    const url = new URL(href);
    const permittedHost = /^(www\.)?vitalemobilidade\.com$/.test(window.location.hostname);
    const publicPage = url.origin === window.location.origin && PUBLIC_PATH.test(url.pathname);
    if (!permittedHost || !publicPage || googleAnalyticsDisabled()) {
      w["ga-disable-G-LXMH4RWQHV"] = true;
      if (w.__vitaleGa4) w.__vitaleGa4.lastPath = null;
      return;
    }
    w["ga-disable-G-LXMH4RWQHV"] = false;
    if (w.__vitaleGa4?.lastPath === url.pathname) return;

    const pageLocation = `${url.origin}${url.pathname}`;
    const referrer = w.__vitaleGa4?.previousUrl ?? referrerOrigin(document.referrer);
    const settings: Record<string, unknown> = {
      page_location: pageLocation,
      page_referrer: referrer,
      page_title: document.title.slice(0, 300),
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: 90 * 24 * 60 * 60,
      cookie_update: false,
      cookie_flags: "SameSite=Lax;Secure",
    };
    // Campaign codes only: never forward arbitrary search, form answers or tokens.
    for (const key of ["source", "medium", "campaign", "content", "term"] as const) {
      const value = url.searchParams.get(`utm_${key}`);
      if (value && /^[a-z0-9][a-z0-9_.-]{0,99}$/i.test(value)) {
        settings[key === "campaign" ? "campaign_name" : `campaign_${key}`] = value;
      }
    }

    const layer = (w.dataLayer = w.dataLayer || []);
    w.gtag =
      w.gtag ||
      function () {
        // Match Google's documented gtag command queue representation.
        // eslint-disable-next-line prefer-rest-params
        layer.push(arguments);
      };
    if (!w.__vitaleGa4) {
      w.gtag("consent", "default", {
        analytics_storage: "granted",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        personalization_storage: "denied",
        functionality_storage: "granted",
        security_storage: "granted",
      });
      w.gtag("set", "ads_data_redaction", true);
    }
    w.gtag("set", settings);
    if (!w.__vitaleGa4) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
      layer.push({ "gtm.start": Date.now(), event: "gtm.js" });
      document.head.appendChild(script);
      w.__vitaleGa4 = { lastPath: null, previousUrl: referrer };
    }
    w.gtag("event", "page_view", {
      send_to: GA4_ID,
      page_location: pageLocation,
      page_referrer: referrer,
      page_title: settings.page_title,
    });
    w.__vitaleGa4.lastPath = url.pathname;
    w.__vitaleGa4.previousUrl = pageLocation;
  } catch {
    // Analytics must never interrupt the site, forms or direct affiliate links.
  }
}
