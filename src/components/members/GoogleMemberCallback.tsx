import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  clearGoogleMemberContext,
  readGoogleMemberContext,
  googleMemberReturnHref,
} from "@/lib/member-google-context";
import { startGoogleMemberSignIn } from "@/lib/member-google-auth";
export function GoogleMemberCallback() {
  const [error, setError] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      const url = new URL(window.location.href);
      if (
        url.searchParams.has("error") ||
        new URLSearchParams(url.hash.slice(1)).has("error")
      ) {
        if (active) {
          window.history.replaceState(null, "", "/conta/google");
          setError(true);
        }
        return;
      }
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        if (active) setError(true);
        return;
      }
      const verified = await supabase.auth.getUser();
      if (
        verified.error ||
        !verified.data.user ||
        verified.data.user.is_anonymous
      ) {
        if (active) setError(true);
        return;
      }
      if (!active) return;
      const context = readGoogleMemberContext();
      clearGoogleMemberContext();
      if (active) window.location.replace(googleMemberReturnHref(context));
    })().catch(() => {
      if (active) setError(true);
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <section className="rounded-2xl border border-line bg-white p-7">
      <h1 className="text-2xl font-bold">
        {error ? "Não foi possível concluir o acesso" : "Concluindo seu acesso"}
      </h1>
      {error ? (
        <>
          <p role="alert" className="mt-4">
            O acesso com Google não foi concluído ou foi cancelado. Você pode
            tentar novamente ou usar seu e-mail. Se já criou uma conta com senha
            e ainda não validou o e-mail, entre com ela ou recupere seu acesso
            para validar antes de conectar o Google.
          </p>
          <button
            className="mt-5 min-h-12 rounded-xl bg-action px-5 font-bold text-white disabled:opacity-50"
            disabled={busy}
            onClick={() => {
              const c = readGoogleMemberContext();
              setBusy(true);
              void startGoogleMemberSignIn(c.returnTo, c.invitationCode).catch(
                () => setBusy(false),
              );
            }}
          >
            Tentar com Google novamente
          </button>
          <a
            href={googleMemberReturnHref(readGoogleMemberContext())}
            className="mt-4 block min-h-11 font-semibold underline"
          >
            Entrar com e-mail
          </a>
        </>
      ) : (
        <p role="status" className="mt-4">
          Aguarde enquanto confirmamos seu acesso à Vitale.
        </p>
      )}
    </section>
  );
}
