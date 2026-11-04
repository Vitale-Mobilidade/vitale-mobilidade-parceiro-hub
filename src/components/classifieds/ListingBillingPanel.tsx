import { useEffect, useRef, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
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
  onChange,
  onLockChange,
}: {
  listingId: string;
  ready: boolean;
  locked: boolean;
  active: boolean;
  reason: string;
  contactConsent: boolean;
  onChange: () => Promise<void>;
  onLockChange: (v: boolean) => void;
}) {
  const [configured, setConfigured] = useState<boolean | null>(null),
    [order, setOrder] = useState<BillingOrderView | null>(null),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirmCancel, setConfirmCancel] = useState(false);
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
      setAccepted(false);
  }, [status]);
  async function refresh() {
    const data = await listingBillingCall("status", listingId);
    setConfigured(data.configured === true);
    setOrder(data.order);
    if (previous.current && previous.current !== data.order?.status)
      await changed.current();
    previous.current = data.order?.status;
  }
  useEffect(() => {
    if (!active) return;
    let current = true;
    const update = () =>
      void listingBillingCall("status", listingId)
        .then((data) => {
          if (!current) return;
          setConfigured(data.configured === true);
          setOrder(data.order);
          if (previous.current && previous.current !== data.order?.status)
            void changed.current();
          previous.current = data.order?.status;
        })
        .catch(() => {
          if (current)
            setError("Não foi possível atualizar o pagamento agora.");
        });
    update();
    window.addEventListener("focus", update);
    const timer = window.setInterval(() => {
      if (window.document.visibilityState === "visible") update();
    }, 15000);
    return () => {
      current = false;
      window.removeEventListener("focus", update);
      window.clearInterval(timer);
    };
  }, [listingId, active]);
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
        purchaseAccepted: accepted,
      });
      setOrder(data.order);
      await changed.current();
      if (data.order?.paymentUrl && safePaymentLink(data.order.paymentUrl)) {
        if (paymentTab && !paymentTab.closed)
          paymentTab.location.replace(data.order.paymentUrl);
        else
          setError(
            "O checkout está pronto. Use o botão Continuar pagamento no Asaas para abrir uma nova aba.",
          );
      } else
        setError(
          "A solicitação está sendo conferida. Atualize o status antes de tentar novamente.",
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
        "Não foi possível confirmar o encerramento agora. Atualize o status; o pedido continuará sendo processado.",
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
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar este pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O checkout pendente será encerrado e seu rascunho continuará
              salvo. Se você já pagou, atualize o status antes de continuar.
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
            order.paymentUrl &&
            safePaymentLink(order.paymentUrl) && (
              <a
                href={order.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={button}
              >
                <ExternalLink className="h-5 w-5" aria-hidden="true" />
                Continuar pagamento no Asaas
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
          <label className="mt-5 flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0"
            />
            <span>
              Quero pagar R$150 uma única vez para exibir este anúncio por 90
              dias. Vou conferir e concluir o pagamento no Asaas.
            </span>
          </label>
          <button
            type="button"
            disabled={
              busy ||
              locked ||
              !ready ||
              !contactConsent ||
              !accepted ||
              !configured
            }
            className={`${button} mt-5 flex w-full sm:ml-auto sm:w-auto`}
            onClick={() => void checkout()}
          >
            {busy ? "Abrindo checkout…" : "Seguir para pagamento de R$150"}
          </button>
        </>
      )}
      <button
        type="button"
        className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-action underline"
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
    </section>
  );
}
