import { useEffect, useState } from "react";
import {
  forgetNewsletterConfirmationToken,
  takeNewsletterConfirmationToken,
} from "@/lib/newsletter-confirmation-token";

export function NewsletterConfirmation() {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<
    "loading" | "ready" | "sending" | "done" | "invalid" | "error"
  >("loading");
  useEffect(() => {
    const candidate = takeNewsletterConfirmationToken();
    if (candidate && /^[a-f0-9]{64}$/.test(candidate)) {
      setToken(candidate);
      setState("ready");
    } else setState("invalid");
  }, []);
  async function confirm() {
    if (!token) return;
    setState("sending");
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke(
        "newsletter-interest",
        { body: { action: "confirm_referral", token } },
      );
      if (error || data?.ok !== true) {
        let code = data?.error;
        if (error && "context" in error && error.context instanceof Response) {
          const result = await error.context
            .clone()
            .json()
            .catch(() => null);
          code = result?.error;
        }
        if (["confirmation_invalid", "confirmation_expired"].includes(code)) {
          forgetNewsletterConfirmationToken();
          setToken(null);
          setState("invalid");
        } else setState("error");
        return;
      }
      forgetNewsletterConfirmationToken();
      setToken(null);
      setState("done");
      try {
        localStorage.setItem("vitale-newsletter-subscribed", "1");
      } catch {
        /* Optional browser storage. */
      }
      window.dispatchEvent(new Event("vitale-newsletter-subscribed"));
    } catch {
      setState("error");
    }
  }
  return (
    <section
      className="rounded-2xl border border-line bg-white p-6 sm:p-8"
      data-heatmap-private
    >
      <h1 className="text-3xl font-bold text-ink">
        {state === "done" ? "Inscrição confirmada" : "Confirme sua inscrição"}
      </h1>
      {state === "loading" && (
        <p role="status" className="mt-4">
          Conferindo o link…
        </p>
      )}
      {state === "invalid" ? (
        <p role="alert" className="mt-4">
          Este link é inválido ou expirou. Abra o convite original e preencha
          novamente o formulário para solicitar uma nova confirmação.
        </p>
      ) : state === "done" ? (
        <p role="status" className="mt-4">
          Seu e-mail foi confirmado. A solicitação foi concluída e as indicações
          elegíveis foram registradas. Se você já tinha uma inscrição, suas
          preferências foram preservadas.
        </p>
      ) : (
        (state === "ready" || state === "sending" || state === "error") && (
          <>
            <p className="mt-4">
              Você pediu para receber a newsletter gratuita da Vitale por um
              convite. Escolha Confirmar inscrição para concluir o cadastro.
            </p>
            {state === "error" && (
              <p role="alert" className="mt-4 text-red-800">
                Não foi possível confirmar agora. Seu link continua nesta tela;
                tente novamente em instantes.
              </p>
            )}
            <button
              type="button"
              onClick={confirm}
              disabled={state === "sending"}
              className="mt-6 min-h-11 rounded-lg bg-ink px-5 py-3 font-bold text-white disabled:opacity-50"
            >
              {state === "sending" ? "Confirmando…" : "Confirmar inscrição"}
            </button>
          </>
        )
      )}
      <p className="mt-6">
        <a
          href="/newsletter"
          className="inline-flex min-h-11 items-center underline"
        >
          Voltar à newsletter
        </a>
      </p>
      <a
        href="/privacidade"
        className="inline-flex min-h-11 items-center text-sm underline"
      >
        Aviso de privacidade
      </a>
    </section>
  );
}
