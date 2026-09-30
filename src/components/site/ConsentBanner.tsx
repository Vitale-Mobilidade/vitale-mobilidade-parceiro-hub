import { useEffect, useRef, useState } from "react";
import {
  CONSENT_OPEN_EVENT,
  getConsentChoice,
  saveConsentChoice,
  type ConsentChoice,
} from "@/lib/consent";

export function ConsentBanner() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [choice, setChoice] = useState<ConsentChoice | null | undefined>(
    undefined,
  );
  const [configuring, setConfiguring] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    setChoice(getConsentChoice());
    const open = () => {
      const current = getConsentChoice();
      setAnalytics(current?.analytics ?? false);
      setMarketing(current?.marketing ?? false);
      setConfiguring(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
  }, []);

  useEffect(() => {
    if (configuring) headingRef.current?.focus();
  }, [configuring]);

  if (choice === undefined || (choice !== null && !configuring)) return null;

  const commit = (allowAnalytics: boolean, allowMarketing: boolean) => {
    saveConsentChoice(allowAnalytics, allowMarketing);
    setChoice({
      version: 1,
      analytics: allowAnalytics,
      marketing: allowMarketing,
    });
    setConfiguring(false);
  };

  return (
    <section
      aria-label="Preferências de privacidade"
      className="fixed inset-x-3 bottom-3 z-[110] mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl sm:inset-x-6 sm:p-5"
    >
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-base font-bold sm:text-lg"
      >
        Sua privacidade na Vitale
      </h2>
      <p className="mt-1 text-sm leading-relaxed">
        Usamos tecnologias opcionais para entender o uso do site e para
        publicidade. Você pode aceitar, rejeitar ou escolher por finalidade. O
        site e os links de ofertas funcionam sem elas.{" "}
        <a href="/privacidade" className="underline underline-offset-2">
          Saiba mais
        </a>
        .
      </p>
      {configuring && (
        <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 text-sm">
          <p>
            <strong>Necessários:</strong> mantêm funções básicas e sua escolha
            de privacidade. Sempre ativos.
          </p>
          <label className="flex min-h-11 cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={analytics}
              onChange={(event) => setAnalytics(event.target.checked)}
              className="mt-1 size-5 accent-emerald-700"
            />
            <span>
              <strong>Análise:</strong> Google Analytics para medir visitas e
              melhorar páginas.
            </span>
          </label>
          <label className="flex min-h-11 cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(event) => setMarketing(event.target.checked)}
              className="mt-1 size-5 accent-emerald-700"
            />
            <span>
              <strong>Publicidade e atendimento:</strong> Google Ads, Meta Pixel
              e Zoho SalesIQ para campanhas e acompanhamento de visitantes.
            </span>
          </label>
          <p className="text-xs text-slate-600">
            Você pode mudar esta escolha em “Preferências de privacidade” no
            rodapé.
          </p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => commit(true, true)}
          className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Aceitar todos
        </button>
        <button
          type="button"
          onClick={() => commit(false, false)}
          className="min-h-11 rounded-lg border border-slate-400 px-4 py-2 text-sm font-semibold hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
        >
          Rejeitar não necessários
        </button>
        {configuring ? (
          <button
            type="button"
            onClick={() => commit(analytics, marketing)}
            className="min-h-11 rounded-lg border border-slate-400 px-4 py-2 text-sm font-semibold hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
          >
            Salvar escolhas
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfiguring(true)}
            className="min-h-11 rounded-lg px-4 py-2 text-sm font-semibold underline underline-offset-4 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
          >
            Configurar
          </button>
        )}
      </div>
    </section>
  );
}
