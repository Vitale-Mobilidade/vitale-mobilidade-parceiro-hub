import { useEffect, useState, type FormEvent } from "react";
import { identityCall } from "@/lib/member-community-api";
import { supabase } from "@/integrations/supabase/client";
import {
  memberIdentitySchema,
  memberPhone,
  type MemberIdentity,
} from "@/lib/member-identity";
import { memberError } from "@/lib/member-community";
const field = "mt-2 min-h-11 w-full rounded-lg border border-line bg-white p-3";
const button =
  "mt-3 min-h-11 rounded-lg bg-ink px-4 py-3 font-bold text-white disabled:opacity-50";
export function IdentityPanel({ email }: { email: string }) {
  const [identity, setIdentity] = useState<MemberIdentity | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [codes, setCodes] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    void identityCall("status")
      .then((data) => {
        if (active) {
          setIdentity(memberIdentitySchema.parse(data));
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(memberError(e));
      });
    return () => {
      active = false;
    };
  }, [retry]);
  async function requestCode(channel: "email" | "phone") {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const canonical = channel === "phone" ? memberPhone(phone) : undefined;
      if (channel === "phone" && (!canonical || !consent))
        throw new Error("invalid_phone");
      const { data, error } = await supabase.functions.invoke(
        "member-identity-code",
        {
          body: {
            channel,
            ...(canonical ? { phone: canonical, consent } : {}),
          },
        },
      );
      if (error) throw new Error("identity_delivery_unavailable");
      if (data?.ok !== true)
        throw new Error(String(data?.error ?? "identity_delivery_unavailable"));
      setSent((old) => ({ ...old, [channel]: true }));
      setCodes((old) => ({ ...old, [channel]: "" }));
      setMessage(
        channel === "email"
          ? "Enviamos um código para seu e-mail. Ele vale por dez minutos."
          : "Enviamos um código pelo WhatsApp. Ele vale por dez minutos.",
      );
    } catch (e) {
      setError(
        e instanceof Error && e.message === "identity_delivery_unavailable"
          ? "Não foi possível enviar o código agora. Tente novamente em instantes."
          : memberError(e),
      );
    } finally {
      setBusy(false);
    }
  }
  async function verify(event: FormEvent, channel: "email" | "phone") {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await identityCall("verify", { channel, code: codes[channel] ?? "" });
      setIdentity(memberIdentitySchema.parse(await identityCall("status")));
      window.dispatchEvent(new Event("vitale-profile-updated"));
      setSent((old) => ({ ...old, [channel]: false }));
      setCodes((old) => ({ ...old, [channel]: "" }));
      setMessage(
        channel === "email" ? "E-mail validado." : "Celular validado.",
      );
    } catch (e) {
      setError(memberError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-labelledby="identity-title"
      className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-8"
      data-heatmap-private
    >
      <h2 id="identity-title" className="text-2xl font-bold text-ink">
        Valide seu acesso
      </h2>
      <p className="mt-3 text-muted-foreground">
        Confirme seu e-mail e celular para comentar, curtir e anunciar.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-red-800">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-4 text-emerald-900">
          {message}
        </p>
      )}
      {!identity ? (
        <button
          className={button}
          disabled={busy}
          onClick={() => setRetry((n) => n + 1)}
        >
          Atualizar validação
        </button>
      ) : (
        <>
          {identity.canInteract && (
            <p role="status" className="mt-4 font-semibold text-emerald-900">
              E-mail e celular validados. Você já pode comentar nos artigos.
            </p>
          )}
          {(["email", "phone"] as const).map((channel) => {
            const verified =
              channel === "email"
                ? identity.emailVerified
                : identity.phoneVerified;
            return (
              <div key={channel} className="mt-6 border-t border-line pt-5">
                <h3 className="font-bold">
                  {channel === "email" ? "E-mail" : "Celular"}:{" "}
                  {verified ? "validado" : "pendente"}
                </h3>
                {channel === "email" ? (
                  <p className="mt-2 break-all text-sm">{email}</p>
                ) : verified ? (
                  <p className="mt-2 text-sm">{identity.phoneMasked}</p>
                ) : (
                  <>
                    <label
                      className="mt-3 block text-sm font-semibold"
                      htmlFor="identity-phone"
                    >
                      Celular com DDD
                    </label>
                    <input
                      id="identity-phone"
                      type="tel"
                      autoComplete="tel"
                      className={field}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      maxLength={22}
                    />
                    <label className="mt-3 flex items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1 h-5 w-5 shrink-0"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                      />
                      <span>
                        Aceito receber um código no WhatsApp para validar meu
                        celular.
                      </span>
                    </label>
                  </>
                )}
                {!verified && (
                  <>
                    <button
                      type="button"
                      className={button}
                      disabled={
                        busy ||
                        (channel === "phone" &&
                          (!consent || !memberPhone(phone)))
                      }
                      onClick={() => void requestCode(channel)}
                    >
                      {sent[channel]
                        ? "Reenviar código"
                        : channel === "email"
                          ? "Enviar código por e-mail"
                          : "Enviar código pelo WhatsApp"}
                    </button>
                    {sent[channel] && (
                      <form
                        onSubmit={(event) => void verify(event, channel)}
                        className="mt-4"
                      >
                        <label
                          className="block text-sm font-semibold"
                          htmlFor={`identity-code-${channel}`}
                        >
                          Código recebido{" "}
                          {channel === "email" ? "por e-mail" : "no WhatsApp"}
                        </label>
                        <input
                          id={`identity-code-${channel}`}
                          className={field}
                          value={codes[channel] ?? ""}
                          onChange={(e) =>
                            setCodes((old) => ({
                              ...old,
                              [channel]: e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 6),
                            }))
                          }
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          pattern="[0-9]{6}"
                          maxLength={6}
                          required
                        />
                        <button
                          className={button}
                          disabled={
                            busy || !/^\d{6}$/.test(codes[channel] ?? "")
                          }
                        >
                          Validar {channel === "email" ? "e-mail" : "celular"}
                        </button>
                      </form>
                    )}
                  </>
                )}
              </div>
            );
          })}
          <p className="mt-5 text-sm text-muted-foreground">
            Seu celular só será divulgado em anúncios se você autorizar na
            publicação. Os códigos servem apenas para validar seu acesso, sem
            autorizar mensagens de marketing pelo WhatsApp.
          </p>
        </>
      )}
    </section>
  );
}
