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
import { useEffect, useRef, useState } from "react";
import { CreditCard, QrCode, ExternalLink, RefreshCw } from "lucide-react";
import { listingBillingCall } from "@/lib/listing-billing-api";
import { type BillingOrderView } from "@/lib/listing-billing";
import { classifiedsCall } from "@/lib/bike-classifieds-api";
import { safePaymentLink } from "@/lib/payment-url";
const button =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-action px-5 py-3 font-bold text-white disabled:opacity-50";
export function ListingBillingPanel({
  listingId,
  ready,
  contactConsent,
  locked,
  onChange,
  onLockChange,
}: {
  listingId: string;
  ready: boolean;
  contactConsent: boolean;
  locked: boolean;
  onChange: () => Promise<void>;
  onLockChange: (value: boolean) => void;
}) {
  const [configured, setConfigured] = useState(false);
  const [order, setOrder] = useState<BillingOrderView | null>(null);
  const [method, setMethod] = useState<"card" | "pix_automatic">("card");
  const [document, setDocument] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const previousStatus = useRef<string | undefined>(undefined);
  const changed = useRef(onChange);
  const orderStatus = order?.status;
  useEffect(() => {
    onLockChange(
      busy ||
        Boolean(orderStatus && !["cancelled", "failed"].includes(orderStatus)),
    );
  }, [busy, orderStatus, onLockChange]);
  useEffect(() => {
    if (orderStatus && ["cancelled", "failed"].includes(orderStatus)) {
      setAccepted(false);
      setDocument("");
    }
  }, [orderStatus]);
  useEffect(() => {
    changed.current = onChange;
  }, [onChange]);
  async function refresh() {
    const data = await listingBillingCall("status", listingId);
    setConfigured(data.configured === true);
    setOrder(data.order);
    if (previousStatus.current && previousStatus.current !== data.order?.status)
      await changed.current();
    previousStatus.current = data.order?.status;
  }
  useEffect(() => {
    let active = true;
    void listingBillingCall("status", listingId)
      .then((data) => {
        if (active) {
          setConfigured(data.configured === true);
          setOrder(data.order);
          previousStatus.current = data.order?.status;
        }
      })
      .catch(() => {
        if (active)
          setError("Não foi possível carregar as opções de pagamento.");
      });
    return () => {
      active = false;
    };
  }, [listingId]);
  useEffect(() => {
    if (
      !order ||
      !["creating", "pending", "uncertain", "cancel_pending"].includes(
        order.status,
      )
    )
      return;
    const until = Date.now() + 180000;
    const timer = window.setInterval(() => {
      if (Date.now() > until) {
        window.clearInterval(timer);
        return;
      }
      if (window.document.visibilityState === "visible")
        void refresh().catch(() => {});
    }, 10000);
    return () => window.clearInterval(timer);
    // Status polling reads our database; it never recreates or recharges a subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, order?.id, order?.status]);
  async function checkout() {
    setBusy(true);
    setError("");
    try {
      const data = await listingBillingCall("checkout", listingId, {
        method,
        document,
        contactConsent,
        monthlyAccepted: accepted,
      });
      setOrder(data.order);
      previousStatus.current = data.order?.status;
      await changed.current();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível continuar.");
      await refresh().catch(() => {});
    } finally {
      setDocument("");
      setBusy(false);
    }
  }
  async function cancel() {
    setBusy(true);
    setError("");
    try {
      await classifiedsCall("withdraw", { id: listingId });
      await listingBillingCall("cancel", listingId);
      await refresh();
      await changed.current();
    } catch {
      setError(
        "Não foi possível confirmar o encerramento agora. Atualize o status para conferir; o pedido de cancelamento continua sendo processado.",
      );
    } finally {
      setBusy(false);
    }
  }
  const open = order && !["cancelled", "failed"].includes(order.status);
  return (
    <section
      className="mt-6 rounded-2xl border border-line bg-white p-5"
      aria-labelledby="listing-billing-title"
      data-heatmap-private
    >
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Encerrar assinatura deste anúncio?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A bike sairá da vitrine e solicitaremos o encerramento das
              próximas cobranças mensais. Para anunciar novamente, será
              necessário contratar uma nova assinatura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter anúncio</AlertDialogCancel>
            <AlertDialogAction onClick={() => void cancel()}>
              Encerrar assinatura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <h4 id="listing-billing-title" className="text-xl font-bold text-ink">
        R$150 por mês por anúncio
      </h4>
      <p className="mt-2 text-sm text-muted-foreground">
        O anúncio fica ativo durante o período pago. A renovação é mensal. Ao
        desativar ou marcar a bike como vendida, a renovação será encerrada.
      </p>
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-red-900">
          {error}
        </p>
      )}
      {open ? (
        <div className="mt-5 space-y-4">
          <p
            role="status"
            className="rounded-xl bg-surface p-4 font-semibold text-ink"
          >
            {order.status === "active"
              ? "Pagamento confirmado"
              : order.status === "cancel_pending"
                ? "Encerramento da assinatura em andamento"
                : order.status === "uncertain"
                  ? "Conferindo a solicitação com o Asaas"
                  : "Aguardando a confirmação do pagamento"}
          </p>
          {order.paidUntil && (
            <p className="text-sm">
              Período pago até{" "}
              {new Date(order.paidUntil).toLocaleDateString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}
              .
            </p>
          )}
          {order.method === "pix_automatic" &&
            order.renewalStatus === "REFUSED" && (
              <p className="text-sm text-amber-900">
                O Pix Automático não foi autorizado. Um pagamento já recebido
                continua válido para o período atual, mas os próximos débitos
                não estão habilitados.
              </p>
            )}
          {order.hold && (
            <p className="text-sm text-red-900">
              A publicação está suspensa por uma atualização no pagamento.
            </p>
          )}
          {order.status === "pending" &&
            order.paymentUrl &&
            safePaymentLink(order.paymentUrl) && (
              <a
                href={order.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={button}
              >
                <ExternalLink className="h-5 w-5" aria-hidden="true" />
                Pagar com cartão no Asaas
              </a>
            )}
          {order.status === "pending" &&
            order.pixPayload &&
            (!order.qrExpiresAt ||
              Date.parse(order.qrExpiresAt) > Date.now()) && (
              <div className="rounded-xl bg-surface p-4">
                <p className="font-semibold">
                  Pague e autorize o Pix Automático
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  No aplicativo do seu banco, confira a cobrança inicial de
                  R$150 e a autorização dos próximos débitos mensais de R$150.
                </p>
                {order.pixImage && /^[A-Za-z0-9+/=]+$/.test(order.pixImage) && (
                  <img
                    src={`data:image/png;base64,${order.pixImage}`}
                    alt="QR Code do Pix Automático do anúncio"
                    width={256}
                    height={256}
                    className="mx-auto my-4 max-w-full bg-white p-3"
                  />
                )}
                <button
                  className={button}
                  disabled={busy}
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(order.pixPayload!)
                      .then(() => setCopied(true))
                      .catch(() =>
                        setError(
                          "Não foi possível copiar. Selecione o código abaixo.",
                        ),
                      )
                  }
                >
                  {copied ? "Código copiado" : "Copiar código Pix"}
                </button>
                <label className="mt-3 block text-sm">
                  Pix Copia e Cola
                  <textarea
                    className="mt-2 w-full rounded-lg border border-line p-3 text-xs"
                    value={order.pixPayload}
                    readOnly
                  />
                </label>
              </div>
            )}
          {order.status === "cancel_pending" && (
            <p className="text-sm text-muted-foreground">
              A bike já saiu da vitrine. A confirmação do cancelamento aparecerá
              aqui quando o Asaas concluir o pedido.
            </p>
          )}
          <div className="flex flex-wrap gap-4">
            <button
              className="inline-flex min-h-11 items-center gap-2 font-semibold text-action underline"
              disabled={busy}
              onClick={() =>
                void refresh().catch(() =>
                  setError("Não foi possível atualizar agora."),
                )
              }
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Atualizar pagamento
            </button>
            {order.status !== "cancel_pending" && (
              <button
                className="min-h-11 text-sm text-muted-foreground underline"
                disabled={busy || locked}
                onClick={() => setConfirmCancel(true)}
              >
                Encerrar assinatura e retirar anúncio
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {order?.status === "cancelled" && (
            <p role="status" className="mt-4 text-sm text-action">
              Assinatura encerrada. Uma nova contratação exige seu aceite
              novamente.
            </p>
          )}
          {!configured && (
            <p role="status" className="mt-4 rounded-lg bg-surface p-3 text-sm">
              O pagamento está em preparação. Você já pode guardar e revisar seu
              rascunho.
            </p>
          )}
          <div
            role="group"
            aria-label="Forma de pagamento"
            className="mt-5 grid gap-3 sm:grid-cols-2"
          >
            {(
              [
                ["card", "Cartão de crédito"],
                ["pix_automatic", "Pix Automático"],
              ] as const
            ).map(([key, label]) => (
              <button
                type="button"
                key={key}
                disabled={busy}
                onClick={() => setMethod(key)}
                aria-pressed={method === key}
                className={`flex min-h-14 items-center gap-2 rounded-xl border p-4 font-semibold ${method === key ? "border-action bg-surface text-action" : "border-line"}`}
              >
                {key === "card" ? (
                  <CreditCard className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <QrCode className="h-5 w-5" aria-hidden="true" />
                )}
                {label}
              </button>
            ))}
          </div>
          <label
            className="mt-5 block text-sm font-semibold"
            htmlFor={`billing-document-${listingId}`}
          >
            CPF ou CNPJ do pagador
            <input
              id={`billing-document-${listingId}`}
              inputMode="numeric"
              autoComplete="off"
              maxLength={18}
              value={document}
              onChange={(e) => setDocument(e.target.value)}
              className="mt-2 block min-h-12 w-full rounded-xl border border-line p-3"
            />
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            Usado pelo Asaas para cadastrar o pagador. Os dados do cartão serão
            preenchidos somente na página do Asaas.
          </p>
          <label className="mt-5 flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>
              Autorizo a assinatura de R$150 por mês para este anúncio enquanto
              estiver ativo. Entendo que a renovação será encerrada quando eu
              desativar o anúncio ou marcar a bike como vendida.
            </span>
          </label>
          <button
            type="button"
            className={`${button} mt-5 w-full`}
            disabled={
              busy ||
              locked ||
              !ready ||
              !contactConsent ||
              !accepted ||
              !configured ||
              document.replace(/\D/g, "").length < 11
            }
            onClick={() => void checkout()}
          >
            {busy
              ? "Preparando…"
              : method === "card"
                ? "Continuar no Asaas — R$150/mês"
                : "Gerar Pix Automático — R$150/mês"}
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            O anúncio será liberado após a confirmação do pagamento. Abrir o
            checkout ou voltar ao site não confirma a cobrança.
          </p>
        </>
      )}
    </section>
  );
}
