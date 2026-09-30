export const CONSENT_STORAGE_KEY = "vitale_cookie_consent_v1";
export const CONSENT_OPEN_EVENT = "vitale:open-consent";
export const CONSENT_CHANGED_EVENT = "vitale:consent-changed";

export type ConsentChoice = {
  version: 1;
  analytics: boolean;
  marketing: boolean;
};

const denied = "denied";
const granted = "granted";

export function getConsentChoice(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(
      window.localStorage.getItem(CONSENT_STORAGE_KEY) || "null",
    );
    if (
      value?.version === 1 &&
      typeof value.analytics === "boolean" &&
      typeof value.marketing === "boolean"
    )
      return {
        version: 1,
        analytics: value.analytics,
        marketing: value.marketing,
      };
  } catch {
    /* Storage may be disabled. */
  }
  return null;
}

export function saveConsentChoice(
  analytics: boolean,
  marketing: boolean,
): void {
  if (typeof window === "undefined") return;
  const w = window as typeof window & {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    __vitaleConsent?: ConsentChoice;
  };
  const previous = w.__vitaleConsent ?? getConsentChoice();
  const choice: ConsentChoice = { version: 1, analytics, marketing };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(choice));
  } catch {
    /* In-memory choice still applies. */
  }
  w.__vitaleConsent = choice;
  w.gtag?.("consent", "update", {
    analytics_storage: analytics ? granted : denied,
    ad_storage: marketing ? granted : denied,
    ad_user_data: marketing ? granted : denied,
    ad_personalization: marketing ? granted : denied,
  });
  w.dataLayer?.push({
    event: "vitale_consent_changed",
    vitale_analytics_consent: analytics ? granted : denied,
    vitale_marketing_consent: marketing ? granted : denied,
  });
  if (analytics && !previous?.analytics) {
    w.dataLayer?.push({ event: "vitale_analytics_granted" });
  }
  if (marketing && !previous?.marketing) {
    w.dataLayer?.push({ event: "vitale_marketing_granted" });
  }
  window.dispatchEvent(
    new CustomEvent(CONSENT_CHANGED_EVENT, { detail: choice }),
  );
  // Already-loaded non-Google tags cannot be unloaded by Consent Mode.
  if (
    previous &&
    ((previous.marketing && !marketing) || (previous.analytics && !analytics))
  ) {
    window.location.reload();
  }
}

/** Runs in the SSR head before gtm.js and before any third-party tag. */
export const CONSENT_BOOTSTRAP = `(function(w){
if(location.pathname.startsWith('/admin'))return;
var d=w.dataLayer=w.dataLayer||[];
w.gtag=w.gtag||function(){d.push(arguments)};
w.__vitaleConsent={version:1,analytics:false,marketing:false};
d.push({vitale_analytics_consent:'denied',vitale_marketing_consent:'denied'});
w.gtag('consent','default',{
  analytics_storage:'denied',ad_storage:'denied',
  ad_user_data:'denied',ad_personalization:'denied',
  functionality_storage:'granted',security_storage:'granted'
});
try{
  var c=JSON.parse(w.localStorage.getItem('${CONSENT_STORAGE_KEY}')||'null');
  if(c&&c.version===1&&typeof c.analytics==='boolean'&&typeof c.marketing==='boolean'){
    w.__vitaleConsent={version:1,analytics:c.analytics,marketing:c.marketing};
    w.gtag('consent','update',{
      analytics_storage:c.analytics?'granted':'denied',
      ad_storage:c.marketing?'granted':'denied',
      ad_user_data:c.marketing?'granted':'denied',
      ad_personalization:c.marketing?'granted':'denied'
    });
    d.push({event:'vitale_consent_restored',vitale_analytics_consent:c.analytics?'granted':'denied',vitale_marketing_consent:c.marketing?'granted':'denied'});
  }
}catch(e){}
})(window);`;
