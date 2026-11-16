import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { setOffersMetaConsent } from "@/lib/offers-meta-pixel";
import { loadVitaleGtm, prepareVitaleGtm } from "@/lib/gtm-script";
import {
  isOffersGroupLanding,
  OFFERS_GROUP_LANDING_PATH,
  setOffersGroupAdsEventConsent,
} from "@/lib/offers-group-landing";

const JOINT_STORAGE_KEY = "vitale_offers_ads_session_v3";
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
    const saved = window.sessionStorage.getItem(JOINT_STORAGE_KEY);
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

const choiceButton =
  "min-h-11 rounded-lg border border-action px-3 py-2 text-sm font-bold text-action hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action";

export function OffersAdsConsent({
  stickyAction,
}: {
  stickyAction?: ReactNode;
}) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [available, setAvailable] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const preferences = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const moveFocus = useRef(false);

  useEffect(() => {
    if (privacySignalEnabled()) return;
    const saved = restoreChoice();
    const production = onProductionLanding();
    if (saved === "granted" && production) {
      updateGoogleConsent(true);
      setOffersMetaConsent(true);
    }
    setChoice(saved);
    setOpen(saved === null);
    setAvailable(true);
    if (!production) return;
    return () => {
      updateGoogleConsent(false);
      setOffersMetaConsent(false);
    };
  }, []);

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    const destination = isOpen ? closeButton : preferences;
    destination.current?.focus({ preventScroll: true });
  }, [isOpen]);

  function close(fromKeyboard: boolean) {
    moveFocus.current = fromKeyboard;
    setOpen(false);
  }

  function save(next: Choice, fromKeyboard: boolean) {
    if (!privacySignalEnabled() && next !== choice) {
      try {
        window.sessionStorage.setItem(JOINT_STORAGE_KEY, next);
        window.sessionStorage.removeItem("vitale_offers_google_ads_session_v2");
      } catch {
        // The visitor can still choose for this page when storage is unavailable.
      }
      if (onProductionLanding()) {
        updateGoogleConsent(next === "granted");
        setOffersMetaConsent(next === "granted");
      }
      setChoice(next);
    }
    close(fromKeyboard);
  }

  return (
    <>
      {available && (
        <>
          {!isOpen && (
            <button
              ref={preferences}
              type="button"
              onClick={(event) => {
                moveFocus.current = event.detail === 0;
                setOpen(true);
              }}
              className="mt-1 block min-h-11 w-fit rounded-sm text-sm text-ink-foreground/80 underline underline-offset-2 hover:text-ink-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint"
            >
              Preferências de medição
            </button>
          )}
          <span role="status" className="sr-only">
            {choice === "granted" && "Medição permitida nesta aba."}
            {choice === "denied" && "Medição de anúncios desativada nesta aba."}
          </span>
        </>
      )}

      {(isOpen || stickyAction) && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex flex-col items-center sm:bottom-4">
          {isOpen && (
            <section
              id="offers-ads-consent"
              aria-labelledby="offers-ads-consent-title"
              className="offers-ads-consent pointer-events-auto w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-line bg-white px-4 pt-3 text-ink shadow-2xl sm:w-[calc(100%-2rem)] sm:rounded-2xl sm:px-5 sm:pt-4"
              onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                event.stopPropagation();
                if (choice === null) save("denied", true);
                else close(true);
              }}
            >
              <div className="flex min-h-8 items-center justify-between gap-2">
                <h2
                  id="offers-ads-consent-title"
                  className="text-base font-bold sm:text-lg"
                >
                  Medição de anúncios
                </h2>
                <button
                  ref={closeButton}
                  type="button"
                  aria-label={
                    choice === null
                      ? "Fechar sem permitir medição"
                      : "Fechar preferências"
                  }
                  className="-my-1.5 grid size-11 shrink-0 place-items-center rounded-md hover:bg-surface focus-visible:outline-2 focus-visible:outline-action"
                  onClick={(event) => {
                    const fromKeyboard = event.detail === 0;
                    if (choice === null) save("denied", fromKeyboard);
                    else close(fromKeyboard);
                  }}
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-1 max-w-xl text-sm leading-snug">
                {choice === "granted"
                  ? "Google Ads e Meta podem medir cliques no convite nesta aba."
                  : "Com sua permissão, Google Ads e Meta podem medir cliques no convite nesta aba."}{" "}
                O grupo abre com qualquer escolha.{" "}
                <a
                  href="/privacidade#medicao-google-ofertas"
                  className="text-action underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  Privacidade
                </a>
              </p>
              <div className="mt-3 flex gap-2">
                {choice !== "granted" && (
                  <button
                    type="button"
                    className={choiceButton}
                    onClick={(event) => save("granted", event.detail === 0)}
                  >
                    Permitir medição
                  </button>
                )}
                {choice !== "denied" && (
                  <button
                    type="button"
                    className={choiceButton}
                    onClick={(event) => save("denied", event.detail === 0)}
                  >
                    {choice === "granted" ? "Retirar permissão" : "Recusar"}
                  </button>
                )}
              </div>
            </section>
          )}
          {stickyAction}
        </div>
      )}
    </>
  );
}
