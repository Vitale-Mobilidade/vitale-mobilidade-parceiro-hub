import { useEffect, useState, type FormEvent } from "react";
import { identityCall } from "@/lib/member-community-api";
import {
  requestMemberIdentityCode,
  type IdentityDelivery,
} from "@/lib/member-identity-delivery";
import {
  memberIdentitySchema,
  memberPhone,
  type MemberIdentity,
} from "@/lib/member-identity";
import { memberError } from "@/lib/member-community";
const field = "mt-2 min-h-11 w-full rounded-lg border border-line bg-white p-3";
const button =
  "mt-3 min-h-11 rounded-lg bg-ink px-4 py-3 font-bold text-white disabled:opacity-50";
export function IdentityPanel({
  email,
  embedded = false,
  initialPhone = "",
  initialDelivery,
  onVerified,
}: {
  email: string;
  embedded?: boolean;
  initialPhone?: string;
  initialDelivery?: IdentityDelivery;
  onVerified?: () => void;
}) {
  const [identity, setIdentity] = useState<MemberIdentity | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [phone, setPhone] = useState(initialPhone);
  const [consent, setConsent] = useState(Boolean(initialPhone));
  const [sent, setSent] = useState<Record<string, boolean>>({
    email: initialDelivery?.email.ok === true,
    phone: initialDelivery?.phone.ok === true,
  });
  const [deliveryErrors, setDeliveryErrors] = useState<Record<string, boolean>>(
    {
      email: initialDelivery?.email.ok === false,
      phone: initialDelivery?.phone.ok === false,
    },
  );
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
      await requestMemberIdentityCode(channel, phone, consent);
      setDeliveryErrors((old) => ({ ...old, [channel]: false }));
      setSent((old) => ({ ...old, [channel]: true }));
      setCodes((old) => ({ ...old, [channel]: "" }));
      setMessage(
        channel === "email"
          ? "Enviamos um código para seu e-mail. Ele vale por dez minutos."
          : "Enviamos um código pelo WhatsApp. Ele vale por dez minutos.",
      );
    } catch (e) {
      setDeliveryErrors((old) => ({ ...old, [channel]: true }));
      setError(
        e instanceof Error && e.message === "identity_delivery_unavailable"
          ? "Não foi possível confirmar o envio agora. Se o código já chegou, digite-o abaixo."
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
      const verified = memberIdentitySchema.parse(await identityCall("status"));
      setIdentity(verified);
      if (verified.emailVerified && verified.phoneVerified) onVerified?.();
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
      className={
        embedded
          ? "mt-7 border-t border-line pt-6"
          : "mt-8 rounded-2xl border border-line bg-white p-5 sm:p-8"
      }
      data-heatmap-private
    >
      <h2 id="identity-title" className="text-2xl font-bold text-ink">
        E-mail e WhatsApp
      </h2>
      <p className="mt-3 text-muted-foreground">
        Confirme seus contatos para curtir, comentar e publicar anúncios.
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
                {channel === "phone" && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Quem se interessar pela sua bike poderá tocar em “Conversar
                    pelo WhatsApp” no anúncio. A conversa abre diretamente neste
                    número, com uma mensagem sobre a bike. Por isso, confirme um
                    WhatsApp que você usa.
                  </p>
                )}
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
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setSent((old) => ({ ...old, phone: false }));
                        setCodes((old) => ({ ...old, phone: "" }));
                      }}
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
                    {sent[channel] && (
                      <p role="status" className="mt-3 text-sm text-action">
                        Código enviado{" "}
                        {channel === "email" ? "por e-mail" : "pelo WhatsApp"}.
                        Digite abaixo; ele vale por dez minutos.
                      </p>
                    )}
                    {deliveryErrors[channel] && (
                      <p role="alert" className="mt-3 text-sm text-red-800">
                        A confirmação do envio não chegou a tempo. Se você
                        recebeu o código, pode digitá-lo abaixo. Aguarde antes
                        de pedir outro.
                      </p>
                    )}
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
                        disabled={busy || !/^\d{6}$/.test(codes[channel] ?? "")}
                      >
                        Validar {channel === "email" ? "e-mail" : "celular"}
                      </button>
                    </form>
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
