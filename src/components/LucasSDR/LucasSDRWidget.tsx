import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MessagesSquare, X } from "lucide-react";
import { LucasChatPanel } from "./LucasChatPanel";
import type { SDRContext } from "./types";
import { setChatOpen } from "@/lib/lucas-chat-bus";

const INVITE_DELAY_MS = 5000;
const AUTO_OPEN_DELAY_DESKTOP_MS = 15000;
const AUTO_OPEN_DELAY_MOBILE_MS = 20000;
const SESSION_FLAG_PREFIX = "sdr_lucas_session_";

interface Props {
  ctx: SDRContext;
  onBuyLink: (bikeId: string, source: "sdr_chat") => void;
  onEvent: (name: string, payload?: Record<string, any>) => void;
  /** Kept for API compatibility — não é mais usado para reposicionar verticalmente. */
  liftedAboveStickyBar?: boolean;
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

export function LucasSDRWidget({ ctx, onBuyLink, onEvent, buyClicked }: Props) {
  const [open, setOpen] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteDismissed, setInviteDismissed] = useState(() => readFlag(ctx.leadId, "invite_dismissed"));
  const [autoOpenBlocked, setAutoOpenBlocked] = useState(() =>
    readFlag(ctx.leadId, "auto_opened") || readFlag(ctx.leadId, "closed") || readFlag(ctx.leadId, "opened_manually"),
  );
  const inviteViewedRef = useRef(false);

  // Sincroniza estado global chat-aberto para outros overlays da página.
  useEffect(() => {
    setChatOpen(open);
    return () => { if (open) setChatOpen(false); };
  }, [open]);

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

  // Portal para o document.body — evita que transform/overflow em qualquer
  // ancestral influencie a posição `fixed` do botão / painel.
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (typeof document !== "undefined") setPortalTarget(document.body);
  }, []);

  // ---- Mobile visualViewport tracking (corrige teclado / URL bar) ----
  const [vv, setVv] = useState(() => ({
    height: typeof window !== "undefined" ? window.innerHeight : 800,
    offsetTop: 0,
    keyboardOpen: false,
  }));
  useEffect(() => {
    if (typeof window === "undefined") return;
    const viewport = window.visualViewport;
    const update = () => {
      const h = viewport?.height ?? window.innerHeight;
      const offsetTop = viewport?.offsetTop ?? 0;
      const keyboardOpen = window.innerHeight - h > 150;
      setVv({ height: h, offsetTop, keyboardOpen });
      document.documentElement.style.setProperty("--visual-viewport-height", `${h}px`);
      document.documentElement.style.setProperty("--visual-viewport-offset-top", `${offsetTop}px`);
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  // ---- Scroll lock (mobile only) enquanto o chat estiver aberto ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!open) return;
    if (!isMobile()) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  if (!portalTarget) return null;

  const fabStyle: React.CSSProperties = {
    position: "fixed",
    right: "max(12px, env(safe-area-inset-right))",
    bottom: "max(12px, env(safe-area-inset-bottom))",
    zIndex: 9998,
  };
  const inviteWrapStyle: React.CSSProperties = {
    position: "fixed",
    right: "max(12px, env(safe-area-inset-right))",
    bottom: "calc(max(12px, env(safe-area-inset-bottom)) + 68px)",
    zIndex: 9997,
    maxWidth: 260,
  };

  const mobileNow = typeof window !== "undefined" && window.innerWidth < 640;
  const panelStyle: React.CSSProperties = mobileNow
    ? vv.keyboardOpen
      ? {
          position: "fixed",
          left: 12,
          right: 12,
          top: `calc(${vv.offsetTop}px + 8px)`,
          bottom: "auto",
          maxHeight: `${Math.max(vv.height - 16, 280)}px`,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxSizing: "border-box",
        }
      : {
          position: "fixed",
          left: 12,
          right: 12,
          bottom: "max(12px, env(safe-area-inset-bottom))",
          maxHeight: "calc(100dvh - 24px)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxSizing: "border-box",
        }
    : {
        position: "fixed",
        right: 24,
        bottom: 24,
        left: "auto",
        top: "auto",
        width: 420,
        maxHeight: "calc(100vh - 48px)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
      };

  return createPortal(
    <>
      {!open && (
        <>
          {showInvite && (
            <div style={inviteWrapStyle}>
              <div className="relative bg-white rounded-2xl shadow-lg border border-black/5 pl-4 pr-8 py-2.5">
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
            </div>
          )}

          <div style={fabStyle}>
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
          </div>
        </>
      )}

      {open && (
        <>
          <div
            onClick={closeChat}
            aria-hidden="true"
            style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.35)" }}
          />
          <div style={panelStyle}>
            <LucasChatPanel
              ctx={ctx}
              onClose={closeChat}
              onBuyLink={handleBuyLink}
              onEvent={onEvent}
            />
          </div>
        </>
      )}
    </>,
    portalTarget,
  );
}

export default LucasSDRWidget;
