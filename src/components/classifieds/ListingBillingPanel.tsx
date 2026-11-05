import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { checkoutClock, checkoutSecondsRemaining } from "@/lib/checkout-window";
import { useCallback, useEffect, useRef, useState } from "react";
import { Clock3, ExternalLink, LoaderCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listingBillingCall } from "@/lib/listing-billing-api";
import { type BillingOrderView } from "@/lib/listing-billing";
import { classifiedsError } from "@/lib/bike-classifieds";
import { classifiedsCall } from "@/lib/bike-classifieds-api";
import { safePaymentLink } from "@/lib/payment-url";
const button =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-action px-5 py-3 font-bold text-white disabled:opacity-50";
export function ListingBillingPanel({
  listingId,
  ready,
  locked,
  active,
  reason,
  contactConsent,
  onConsentChange,
  onChange,
  onLockChange,
  published = false,
}: {
  listingId: string;
  published?: boolean;
  ready: boolean;
  locked: boolean;
  active: boolean;
  reason: string;
  contactConsent: boolean;
  onConsentChange: (value: boolean) => void;
  onChange: () => Promise<void>;
  onLockChange: (v: boolean) => void;
}) {
  const [configured, setConfigured] = useState<boolean | null>(null),
    [order, setOrder] = useState<BillingOrderView | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirmCancel, setConfirmCancel] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [periods, setPeriods] = useState<
    Array<{ id: string; listingTitle: string; paidUntil: string | null }>
  >([]);
  const [periodsLoaded, setPeriodsLoaded] = useState(false),
    [periodsError, setPeriodsError] = useState(false),
    [periodRetry, setPeriodRetry] = useState(0);
  useEffect(() => {
    if (!active) return;
    let current = true;
    setPeriodsLoaded(false);
    setPeriodsError(false);
    void classifiedsCall("periods", { id: listingId })
      .then((value) => {
        const parsed = z
          .array(
            z.object({
              id: z.string().uuid(),
              listingTitle: z.string(),
              paidUntil: z.string().nullable(),
            }),
          )
          .parse(value);
        if (current) {
          setPeriods(parsed);
          setPeriodsLoaded(true);
        }
      })
      .catch(() => {
        if (current) {
          setPeriods([]);
          setPeriodsError(true);
        }
      });
    return () => {
      current = false;
    };
  }, [listingId, active, periodRetry]);
  const [now, setNow] = useState(Date.now);
  const clockOffset = useRef(0);
  const previous = useRef<string | undefined>(undefined),
    changed = useRef(onChange);
  useEffect(() => {
    changed.current = onChange;
  }, [onChange]);
  const status = order?.status,
    open = Boolean(
      order && !["cancelled", "failed", "expired"].includes(order.status),
    );
  useEffect(() => {
    onLockChange(busy || (open && status !== "active"));
  }, [busy, open, status, onLockChange]);
  useEffect(() => {
    if (status && ["cancelled", "failed", "expired"].includes(status))
      onConsentChange(false);
  }, [status, onConsentChange]);
  const apply = useCallback(
    async (data: Awaited<ReturnType<typeof listingBillingCall>>) => {
      if (data.serverNow && Number.isFinite(Date.parse(data.serverNow)))
        clockOffset.current = Date.parse(data.serverNow) - Date.now();
      setNow(Date.now());
      setConfigured(data.configured === true);
      setOrder(data.order);
      if (previous.current && previous.current !== data.order?.status)
        await changed.current();
      if (
        previous.current &&
        previous.current !== "active" &&
        data.order?.status === "active"
      )
        setPaymentConfirmed(true);
      previous.current = data.order?.status;
      setError((old) =>
        data.order?.status === "active" ||
        old.startsWith("A conexão está oscilando")
          ? ""
          : old,
      );
    },
    [],
  );
  async function refresh() {
    await apply(await listingBillingCall("status", listingId));
  }
  useEffect(() => {
    if (!active) return;
    let current = true,
      inFlight = false;
    const update = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const data = await listingBillingCall("status", listingId);
        if (current) await apply(data);
      } catch {
        if (current)
          setError(
            "A conexão está oscilando. Continuaremos verificando seu pagamento automaticamente.",
          );
      } finally {
        inFlight = false;
      }
    };
    void update();
    const focus = () => void update();
    window.addEventListener("focus", focus);
    const waiting =
      !status ||
      ["creating", "pending", "uncertain", "cancel_pending"].includes(status);
    const timer = waiting
      ? window.setInterval(() => {
          if (document.visibilityState === "visible") void update();
        }, 5000)
      : undefined;
    return () => {
      current = false;
      window.removeEventListener("focus", focus);
      if (timer) window.clearInterval(timer);
    };
  }, [listingId, active, status, apply]);
  const deadline = order?.checkoutExpiresAt;
  const remaining = checkoutSecondsRemaining(
    deadline,
    now + clockOffset.current,
  );
  useEffect(() => {
    if (!active || status !== "pending" || !deadline) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active, status, deadline]);
  async function checkout() {
    const paymentTab = window.open("about:blank", "_blank");
    if (paymentTab) {
      paymentTab.opener = null;
      paymentTab.document.title = "Checkout Asaas";
      paymentTab.document.body.textContent =
        "Preparando seu checkout no Asaas…";
    }
    setBusy(true);
    setError("");
    try {
      const data = await listingBillingCall("checkout", listingId, {
        contactConsent,
        purchaseAccepted: contactConsent,
      });
      setOrder(data.order);
      await changed.current();
      if (data.order?.paymentUrl && safePaymentLink(data.order.paymentUrl)) {
        if (paymentTab && !paymentTab.closed)
          paymentTab.location.replace(data.order.paymentUrl);
        else
          setError(
            "O checkout está pronto. Use o botão Seguir para pagamento de R$150 para abrir uma nova aba.",
          );
      } else
        setError(
          "Estamos conferindo a solicitação. A confirmação aparecerá automaticamente nesta página.",
        );
    } catch (e) {
      if (paymentTab && !paymentTab.closed) {
        try {
          if (paymentTab.location.href === "about:blank") paymentTab.close();
        } catch {
          /* The payer may have navigated their new tab. */
        }
      }
      setError(e instanceof Error ? e.message : "Não foi possível continuar.");
      setPeriodRetry((n) => n + 1);
      await refresh().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    setBusy(true);
    setError("");
    try {
      await listingBillingCall("cancel", listingId);
      await refresh();
      await changed.current();
    } catch {
      setError(
        "Ainda não recebemos a confirmação do encerramento. Continuaremos acompanhando automaticamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="mt-6 rounded-2xl border border-line bg-white p-5"
      aria-labelledby="listing-billing-title"
      data-heatmap-private
    >
      <Dialog open={paymentConfirmed} onOpenChange={setPaymentConfirmed}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Parabéns! Pagamento confirmado 🎉
            </DialogTitle>
            <DialogDescription>
              {published
                ? "Sua bike já está na vitrine da Vitale Mobilidade. Agora é hora de compartilhar seu anúncio!"
                : "Seu período de 90 dias está garantido. Revise e publique o anúncio para começar a exposição."}
            </DialogDescription>
          </DialogHeader>
          {published ? (
            <a href={`/venda-sua-bike/${listingId}`} className={button}>
              Ver meu anúncio
            </a>
          ) : (
            <button
              className={button}
              onClick={() => setPaymentConfirmed(false)}
            >
              Continuar para publicar
            </button>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar este pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O checkout pendente será encerrado e seu rascunho continuará
              salvo. Se você já pagou, aguarde a confirmação automática antes de
              cancelar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar pagamento</AlertDialogCancel>
            <AlertDialogAction onClick={() => void cancel()}>
              Cancelar pagamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <h4 id="listing-billing-title" className="text-xl font-bold text-ink">
        R$150 para anunciar por 90 dias
      </h4>
      <p className="mt-2 text-sm text-muted-foreground">
        Pagamento único por Pix ou cartão, diretamente no Asaas em uma nova aba.
        Os 90 dias corridos começam na primeira publicação após a confirmação.
        Pausar ou editar mantém o vencimento original. Não há renovação
        automática.
      </p>
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-red-900">
          {error}
        </p>
      )}
      {(!open || (status === "active" && ready && !order?.hold)) && (
        <label
          className="mt-5 flex items-start gap-3 text-sm"
          data-testid="publication-consent"
        >
          <input
            type="checkbox"
            checked={contactConsent}
            disabled={busy || locked}
            onChange={(e) => onConsentChange(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0"
          />
          <span>
            Confirmo as informações e fotos da bike e autorizo meu nome, foto de
            perfil e WhatsApp verificado neste anúncio para receber contatos de
            compradores.
            {status !== "active" &&
              " Aceito o pagamento único de R$150 por 90 dias de exibição, sem renovação automática."}
          </span>
        </label>
      )}
      {busy && !open && (
        <p role="status" className="mt-4 flex items-center gap-2 text-sm">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          Preparando seu pagamento…
        </p>
      )}
      {open && order ? (
        <div className="mt-5 space-y-4">
          <p role="status" className="rounded-xl bg-surface p-4 font-semibold">
            {status === "active"
              ? "Pagamento confirmado"
              : status === "cancel_pending"
                ? "Cancelando checkout pendente"
                : status === "uncertain"
                  ? "Conferindo a solicitação com o Asaas"
                  : "Aguardando pagamento no Asaas"}
          </p>
          {status === "pending" && remaining !== null && (
            <div
              className="rounded-xl border border-line bg-surface p-4"
              data-testid="payment-countdown"
            >
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Clock3 className="h-5 w-5" aria-hidden="true" />
                Tempo para concluir o pagamento
              </p>
              <p
                role="timer"
                aria-label="Tempo restante para pagar"
                aria-live="off"
                className="mt-2 text-3xl font-bold tabular-nums text-ink"
              >
                {checkoutClock(remaining)}
              </p>
              {remaining === 0 && (
                <p className="mt-2 text-sm">
                  O prazo deste checkout terminou. Se já pagou, aguarde a
                  confirmação; estamos verificando.
                </p>
              )}
            </div>
          )}
          {["creating", "pending", "uncertain", "cancel_pending"].includes(
            status ?? "",
          ) && (
            <p
              role="status"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <LoaderCircle
                className="h-4 w-4 animate-spin"
                aria-hidden="true"
              />
              Verificando o pagamento automaticamente. A confirmação aparecerá
              aqui.
            </p>
          )}
          {order.paidUntil && (
            <p className="text-sm">
              Exibição até{" "}
              {new Date(order.paidUntil).toLocaleDateString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}
              .
            </p>
          )}
          {status === "active" && !order.paidUntil && !order.hold && (
            <p className="text-sm">
              Pagamento recebido. Revise o anúncio e publique para iniciar os 90
              dias.
            </p>
          )}
          {status === "active" && ready && !order.hold && (
            <button
              className={button}
              disabled={busy || locked || !contactConsent}
              onClick={() => {
                setBusy(true);
                setError("");
                void classifiedsCall("publish", {
                  id: listingId,
                  contactConsent,
                })
                  .then(() => changed.current())
                  .then(refresh)
                  .catch(() =>
                    setError(
                      "Não foi possível publicar. Confira a ficha e a validação do seu perfil.",
                    ),
                  )
                  .finally(() => setBusy(false));
              }}
            >
              {busy
                ? "Publicando…"
                : order.paidUntil
                  ? "Republicar no período pago"
                  : "Publicar meu anúncio"}
            </button>
          )}
          {order.hold && (
            <p className="text-sm text-red-900">
              A publicação está suspensa por uma atualização no pagamento.
            </p>
          )}
          {status === "pending" &&
            (remaining === null || remaining > 0) &&
            order.paymentUrl &&
            safePaymentLink(order.paymentUrl) && (
              <a
                href={order.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${button} flex w-full sm:ml-auto sm:w-auto`}
              >
                <ExternalLink className="h-5 w-5" aria-hidden="true" />
                Seguir para pagamento de R$150
              </a>
            )}
          {status === "cancel_pending" && (
            <p className="text-sm text-muted-foreground">
              Estamos encerrando o checkout pendente. Aguarde a confirmação
              antes de iniciar outro pagamento.
            </p>
          )}
          {status !== "cancel_pending" && status !== "active" && (
            <button
              disabled={busy || locked}
              className="block min-h-11 text-sm text-muted-foreground underline"
              onClick={() => setConfirmCancel(true)}
            >
              Cancelar pagamento pendente
            </button>
          )}
        </div>
      ) : (
        <>
          {status === "cancelled" && (
            <p role="status" className="mt-4 text-sm text-action">
              Checkout encerrado. Seu rascunho continua salvo.
            </p>
          )}
          {status === "expired" && (
            <p role="status" className="mt-4 text-sm">
              Os 90 dias terminaram. Para anunciar novamente, faça um novo
              pagamento único de R$150.
            </p>
          )}
          {configured === null && (
            <p role="status" className="mt-4 text-sm text-muted-foreground">
              Carregando opções de pagamento…
            </p>
          )}
          {configured === false && (
            <p role="status" className="mt-4 rounded-xl bg-surface p-4 text-sm">
              O checkout está temporariamente indisponível. Seu rascunho
              continua salvo.
            </p>
          )}
          {reason && (
            <p className="mt-4 text-sm text-muted-foreground">{reason}</p>
          )}
          {periods.length > 0 && (
            <div className="mt-5 rounded-xl bg-emerald-50 p-4">
              <p className="font-bold">
                Você já tem um período pago disponível
              </p>
              <p className="mt-2 text-sm">
                Use-o nesta bike sem nova cobrança. A anterior permanece fora do
                ar e a data final é mantida.
              </p>
              {periods.map((period) => (
                <button
                  key={period.id}
                  type="button"
                  className={`${button} mt-3`}
                  disabled={busy || locked || !ready || !contactConsent}
                  onClick={() => {
                    setBusy(true);
                    setError("");
                    void classifiedsCall("claim_period", {
                      id: listingId,
                      orderId: period.id,
                    })
                      .then(() =>
                        classifiedsCall("publish", {
                          id: listingId,
                          contactConsent: true,
                        }),
                      )
                      .then(() => changed.current())
                      .then(refresh)
                      .catch((e) =>
                        setError(
                          classifiedsError(e) ||
                            "Não foi possível usar o período. Confira se a bike anterior está desativada e tente novamente.",
                        ),
                      )
                      .finally(() => setBusy(false));
                  }}
                >
                  Publicar no período pago
                  {period.paidUntil
                    ? ` até ${new Date(period.paidUntil).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
                    : " de 90 dias"}
                </button>
              ))}
            </div>
          )}
          {!periodsLoaded &&
            (periodsError ? (
              <div className="mt-4">
                <p role="alert" className="text-sm">
                  Não foi possível conferir seus períodos pagos. Tente novamente
                  para evitar uma cobrança desnecessária.
                </p>
                <button
                  type="button"
                  className="min-h-11 text-action underline"
                  onClick={() => setPeriodRetry((n) => n + 1)}
                >
                  Conferir meus períodos
                </button>
              </div>
            ) : (
              <p role="status" className="mt-4 text-sm">
                Conferindo seus períodos pagos…
              </p>
            ))}
          <button
            type="button"
            disabled={
              busy ||
              locked ||
              !ready ||
              !contactConsent ||
              !configured ||
              !periodsLoaded ||
              periods.length > 0
            }
            className={`${button} mt-5 flex w-full sm:ml-auto sm:w-auto`}
            onClick={() => void checkout()}
          >
            {busy ? "Abrindo checkout…" : "Seguir para pagamento de R$150"}
          </button>
        </>
      )}
    </section>
  );
}
