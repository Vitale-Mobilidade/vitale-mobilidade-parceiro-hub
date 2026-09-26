import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { setChatOpen } from "@/lib/lucas-chat-bus";

const SCRIPT_SRC =
  "https://smixxobbszyxqauysvor.supabase.co/functions/v1/web-widget?k=2badd062-4693-4490-a5c2-23aea788fee4";

type HotPipeApi = { open?: () => void; close?: () => void };

declare global {
  interface Window {
    hotpipeWidget?: HotPipeApi;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadHotPipeScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (window.hotpipeWidget) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-hotpipe="true"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("load")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.dataset.hotpipe = "true";
    s.addEventListener("load", () => resolve(), { once: true });
    s.addEventListener("error", () => {
      scriptPromise = null;
      reject(new Error("load"));
    }, { once: true });
    document.body.appendChild(s);
  });
  return scriptPromise;
}

/** Esconde o botão próprio do fornecedor para haver um único launcher. */
function hideVendorButton() {
  if (typeof document === "undefined") return;
  if (document.getElementById("hotpipe-hide-vendor-btn")) return;
  const style = document.createElement("style");
  style.id = "hotpipe-hide-vendor-btn";
  style.textContent = ".hp-btn{display:none !important;}";
  document.head.appendChild(style);
}

/**
 * Preenche o campo do widget como RASCUNHO (sem enviar) e foca.
 * Risco residual: depende dos seletores DOM do fornecedor (.hp-form input).
 */
function prefillDraft(question: string) {
  const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    ".hp-form input, .hp-form textarea",
  );
  if (!input) return;
  input.value = question;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.focus();
}

interface HotPipeWidgetProps {
  /** Pergunta a deixar como rascunho ao abrir (ex.: resultado do Quiz). */
  draftQuestion?: string;
}

/**
 * Launcher flutuante do HotPipe. O script externo só é carregado após o
 * primeiro clique (nunca durante o render inicial / SSR).
 */
export function HotPipeWidget({ draftQuestion }: HotPipeWidgetProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  const prefillTimerRef = useRef<number | null>(null);

  // Oculta o botão do fornecedor já na montagem, antes de qualquer carga,
  // para evitar botão duplicado transitório.
  useEffect(() => {
    hideVendorButton();
  }, []);

  // Desmontagem: cancela prefill pendente e fecha o widget mesmo que o
  // estado local ainda não tenha refletido um open() concluído.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (prefillTimerRef.current !== null) {
        window.clearTimeout(prefillTimerRef.current);
        prefillTimerRef.current = null;
      }
      try { window.hotpipeWidget?.close?.(); } catch {}
      setChatOpen(false);
    };
  }, []);

  // Sincroniza o fechamento pelo botão próprio do fornecedor (.hp-close).
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.(".hp-close")) {
        setOpen(false);
        setChatOpen(false);
      }
    };
    document.addEventListener("click", onDocClick, true);
    return () => document.removeEventListener("click", onDocClick, true);
  }, [open]);

  const handleOpen = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await loadHotPipeScript();
      // Se desmontou durante a carga, não abre nem toca em estado.
      if (!mountedRef.current) return;
      window.hotpipeWidget?.open?.();
      if (!mountedRef.current) {
        try { window.hotpipeWidget?.close?.(); } catch {}
        return;
      }
      setOpen(true);
      setChatOpen(true);
      if (draftQuestion) {
        // Aguarda o widget montar o formulário no DOM; cancelado na desmontagem.
        prefillTimerRef.current = window.setTimeout(() => {
          prefillTimerRef.current = null;
          if (!mountedRef.current) return;
          prefillDraft(draftQuestion);
        }, 300);
      }
    } catch {
      if (!mountedRef.current) return;
      setError("Não foi possível carregar o assistente agora. Tente novamente.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [draftQuestion]);

  const handleClose = useCallback(() => {
    try { window.hotpipeWidget?.close?.(); } catch {}
    setOpen(false);
    setChatOpen(false);
  }, []);

  return (
    <div className="fixed bottom-5 right-4 z-50 flex flex-col items-end gap-2 sm:right-5">
      {error && (
        <div
          role="alert"
          className="max-w-xs rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-xl"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={handleOpen}
            className="mt-2 font-semibold text-action underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            Tentar novamente
          </button>
        </div>
      )}
      {open ? (
        <button
          type="button"
          onClick={handleClose}
          aria-label="Fechar Assistente Vitale"
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-action px-5 font-bold text-primary-foreground shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
        >
          <X className="h-5 w-5" aria-hidden="true" />
          <span className="max-sm:sr-only">Fechar</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          disabled={loading}
          aria-label="Abrir Assistente Vitale"
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-action px-5 font-bold text-primary-foreground shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 disabled:opacity-70"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          <span className="max-sm:sr-only">
            {loading ? "Carregando…" : "Assistente Vitale"}
          </span>
        </button>
      )}
    </div>
  );
}
