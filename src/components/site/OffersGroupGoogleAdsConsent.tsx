import { useEffect, useState } from "react";
import { loadVitaleGtm, prepareVitaleGtm } from "@/lib/gtm-script";
import {
  isOffersGroupLanding,
  OFFERS_GROUP_LANDING_PATH,
  setOffersGroupAdsEventConsent,
} from "@/lib/offers-group-landing";

const STORAGE_KEY = "vitale_offers_google_ads_session_v1";
type Choice = "granted" | "denied";

function onProductionLanding() {
  return (
    window.location.origin === "https://vitalemobilidade.com" &&
    isOffersGroupLanding(window.location.pathname)
  );
}

function privacySignalEnabled() {
  const navigator = window.navigator as Navigator & {
    globalPrivacyControl?: boolean;
  };
  return (
    navigator.globalPrivacyControl === true || navigator.doNotTrack === "1"
  );
}

function restoreChoice(): Choice | null {
  try {
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    return saved === "granted" || saved === "denied" ? saved : null;
  } catch {
    return null;
  }
}

function updateGoogleConsent(granted: boolean) {
  setOffersGroupAdsEventConsent(false);
  if (!granted) {
    const w = window as Window & { gtag?: (...args: unknown[]) => void };
    w.gtag?.("consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    return;
  }

  const gtag = prepareVitaleGtm();
  gtag("consent", "update", {
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "denied",
  });
  loadVitaleGtm();
  const w = window as Window & { dataLayer?: unknown[] };
  w.dataLayer?.push({
    event: "offers_group_google_ads_ready",
    page_path: OFFERS_GROUP_LANDING_PATH,
    vitale_offers_google_ads: true,
  });
  setOffersGroupAdsEventConsent(true);
}

export function OffersGroupGoogleAdsConsent() {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!onProductionLanding()) return;
    const saved = restoreChoice();
    const blocked = privacySignalEnabled();
    if (saved === "granted" && !blocked) updateGoogleConsent(true);
    setChoice(blocked ? "denied" : saved);
    setReady(!blocked);
    return () => updateGoogleConsent(false);
  }, []);

  function save(next: Choice) {
    if (!onProductionLanding() || privacySignalEnabled()) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The visitor can still choose for this page when storage is unavailable.
    }
    updateGoogleConsent(next === "granted");
    setChoice(next);
  }

  if (!ready) return null;

  return (
    <aside
      aria-labelledby="offers-google-consent"
      className="mt-5 max-w-xl rounded-xl border border-white/25 p-3 text-sm leading-relaxed"
    >
      <h2 id="offers-google-consent" className="font-bold">
        Medição de anúncios do Google
      </h2>
      <p>
        Com sua permissão, o Google Ads pode associar o clique no botão do
        WhatsApp a um anúncio. Sua escolha vale nesta aba.{" "}
        <a
          href="/privacidade#medicao-google-ofertas"
          className="underline underline-offset-2"
        >
          Saiba como funciona
        </a>
      </p>
      <p role="status" className="mt-1">
        {choice === "granted" && "Medição permitida."}
        {choice === "denied" && "Medição desativada."}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {choice !== "granted" && (
          <button
            type="button"
            className="min-h-11 rounded-lg border border-white/70 px-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={() => save("granted")}
          >
            Permitir medição
          </button>
        )}
        {choice !== "denied" && (
          <button
            type="button"
            className="min-h-11 rounded-lg border border-white/70 px-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={() => save("denied")}
          >
            {choice === "granted" ? "Retirar permissão" : "Recusar"}
          </button>
        )}
      </div>
    </aside>
  );
}
