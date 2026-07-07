import { useCallback, useEffect, useRef, useState } from "react";
import { MessagesSquare, X } from "lucide-react";
import { LucasChatPanel } from "./LucasChatPanel";
import type { SDRContext } from "./types";

const INVITE_DELAY_MS = 5000;
const AUTO_OPEN_DELAY_DESKTOP_MS = 15000;
const AUTO_OPEN_DELAY_MOBILE_MS = 20000;
const SESSION_FLAG_PREFIX = "sdr_lucas_session_";

interface Props {
  ctx: SDRContext;
  /** Handler que reaproveita o fluxo de compra existente (mesmo lead, mesmo tracking). */
  onBuyLink: (bikeId: string, source: "sdr_chat") => void;
  /** Envia evento de tracking para o quiz-track (mesmo lead). */
  onEvent: (name: string, payload?: Record<string, any>) => void;
  /** Se o CTA de compra sticky mobile está visível, sobe o botão. */
  liftedAboveStickyBar?: boolean;
  /** Sinaliza que o usuário clicou em "Comprar aqui" — cancela auto-open. */
  buyClicked?: boolean;
}

function isMobile() {
  if (typeof window === "undefined") return false;
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
}

function sessionKey(leadId: string | null, kind: string) {
  return `${SESSION_FLAG_PREFIX}${leadId ?? "anon"}_${kind}`;
}

function readFlag(leadId: string | null, kind: string) {
  if (typeof window === "undefined") return false;
  try { return sessionStorage.getItem(sessionKey(leadId, kind)) === "true"; } catch { return false; }
}
function writeFlag(leadId: string | null, kind: string) {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem(sessionKey(leadId, kind), "true"); } catch {}
}

export function LucasSDRWidget({ ctx, onBuyLink, onEvent, liftedAboveStickyBar, buyClicked }: Props) {
  const [open, setOpen] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteDismissed, setInviteDismissed] = useState(() => readFlag(ctx.leadId, "invite_dismissed"));
  const [autoOpenBlocked, setAutoOpenBlocked] = useState(() =>
    readFlag(ctx.leadId, "auto_opened") || readFlag(ctx.leadId, "closed") || readFlag(ctx.leadId, "opened_manually"),
  );
  const inviteViewedRef = useRef(false);

  // Bubble aparece 5s após montar
  useEffect(() => {
    if (inviteDismissed) return;
    const t = window.setTimeout(() => {
      setShowInvite(true);
      if (!inviteViewedRef.current) {
        inviteViewedRef.current = true;
        onEvent("sdr_invite_viewed");
      }
    }, INVITE_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [inviteDismissed, onEvent]);

  // Auto-open agendado
  useEffect(() => {
    if (autoOpenBlocked || open) return;
    const delay = isMobile() ? AUTO_OPEN_DELAY_MOBILE_MS : AUTO_OPEN_DELAY_DESKTOP_MS;
    onEvent("sdr_auto_open_scheduled", { delay_ms: delay });
    const t = window.setTimeout(() => {
      if (buyClicked) { onEvent("sdr_auto_open_cancelled", { reason: "buy_clicked" }); return; }
      if (readFlag(ctx.leadId, "closed") || readFlag(ctx.leadId, "opened_manually")) {
        onEvent("sdr_auto_open_cancelled", { reason: "user_action" });
        return;
      }
      // Não abre se um input estiver em foco
      const active = document.activeElement as HTMLElement | null;
      const focusedInput = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");
      if (focusedInput) { onEvent("sdr_auto_open_cancelled", { reason: "input_focused" }); return; }
      writeFlag(ctx.leadId, "auto_opened");
      setAutoOpenBlocked(true);
      setOpen(true);
      onEvent("sdr_auto_opened");
    }, delay);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenBlocked, buyClicked, ctx.leadId]);

  // Cancela auto-open se comprou
  useEffect(() => {
    if (buyClicked && !autoOpenBlocked) {
      setAutoOpenBlocked(true);
      onEvent("sdr_auto_open_cancelled", { reason: "buy_clicked" });
    }
  }, [buyClicked, autoOpenBlocked, onEvent]);

  const openChat = useCallback((source: "invite" | "button") => {
    writeFlag(ctx.leadId, "opened_manually");
    setAutoOpenBlocked(true);
    setOpen(true);
    setShowInvite(false);
    onEvent("sdr_opened_manually", { source });
  }, [ctx.leadId, onEvent]);

  const closeChat = useCallback(() => {
    setOpen(false);
    writeFlag(ctx.leadId, "closed");
    onEvent("sdr_closed_by_user");
  }, [ctx.leadId, onEvent]);

  const dismissInvite = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowInvite(false);
    setInviteDismissed(true);
    writeFlag(ctx.leadId, "invite_dismissed");
  }, [ctx.leadId]);

  const handleBuyLink = useCallback((bikeId: string) => {
    onEvent("sdr_link_sent", { bike_for_link: bikeId });
    onBuyLink(bikeId, "sdr_chat");
    onEvent("sdr_purchase_link_clicked", { bike_for_link: bikeId });
  }, [onBuyLink, onEvent]);

  const mobileBottom = liftedAboveStickyBar ? "104px" : "18px";

  return (
    <>
      {/* Botão flutuante */}
      <div
        className="fixed right-4 sm:right-6 z-[60]"
        style={{ bottom: mobileBottom }}
      >
        <style>{`
          @media (min-width: 1024px) { .lucas-sdr-fab { bottom: 24px !important; right: 24px !important; } }
        `}</style>
        <div className="lucas-sdr-fab flex flex-col items-end gap-2">
          {showInvite && !open && (
            <div className="relative bg-white rounded-2xl shadow-lg border border-black/5 pl-4 pr-8 py-2.5 max-w-[260px]">
              <button
                type="button"
                onClick={() => openChat("invite")}
                className="flex flex-col items-start text-left"
                aria-label="Abrir chat com o Lucas"
              >
                <span className="text-[13px] font-semibold text-foreground leading-tight">Ainda em dúvida?</span>
                <span className="text-[13px] text-foreground/80 leading-tight">
                  Fale com o Lucas e entenda qual bike faz mais sentido para você.
                </span>
              </button>
              <button
                type="button"
                onClick={dismissInvite}
                aria-label="Fechar convite"
                className="absolute top-1 right-1 flex items-center justify-center rounded-full hover:bg-gray-100"
                style={{ width: 22, height: 22 }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {!open && (
            <button
              type="button"
              onClick={() => openChat("button")}
              aria-label="Falar com o Lucas, assistente virtual"
              className="flex items-center gap-2 pl-3 pr-4 h-14 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 bg-primary text-primary-foreground font-semibold"
            >
              <span className="h-9 w-9 rounded-full bg-white/25 flex items-center justify-center">
                <MessagesSquare className="h-5 w-5" />
              </span>
              <span className="text-[14px] leading-tight text-left">
                Falar com o<br />Lucas
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Painel */}
      {open && (
        <>
          {/* Overlay só em mobile */}
          <div
            className="fixed inset-0 z-[70] bg-black/30 sm:hidden"
            onClick={closeChat}
            aria-hidden="true"
          />
          <div
            className="fixed z-[75] left-2 right-2 bottom-2 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[400px]"
            style={{ maxWidth: "calc(100vw - 16px)" }}
          >
            <LucasChatPanel
              ctx={ctx}
              onClose={closeChat}
              onBuyLink={handleBuyLink}
              onEvent={onEvent}
            />
          </div>
        </>
      )}
    </>
  );
}

export default LucasSDRWidget;
