import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";
import { unavailableMessage } from "@/lib/radar-unavailable";

/**
 * Explicação acessível da indisponibilidade da oferta.
 *
 * Clique/toque é a interação autoritativa: abre e FICA aberto (fixado) até um
 * segundo clique, Esc ou clique fora. Hover/foco são apenas auxílio no desktop
 * e nunca fecham o que foi fixado por clique — por isso não usamos o toggle do
 * Radix, que competia com o hover e reabria/fechava no mesmo gesto.
 * A cor vermelha indica INDISPONIBILIDADE, não avaliação de preço.
 */
export function UnavailableExplainer({
  dateISO,
  className,
  label = "Por que não há oferta?",
}: {
  dateISO: string | null | undefined;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();
  const message = unavailableMessage(dateISO);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setPinned(false);
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setPinned(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className={`relative inline-block ${className ?? ""}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          // Clique/tap manda: alterna e fixa o estado.
          const next = !pinned || !open;
          setOpen(next);
          setPinned(next);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => {
          if (!pinned) setOpen(false);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (!pinned) setOpen(false);
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-destructive/40 px-3 text-sm font-semibold text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
      >
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-destructive" />
        {label}
        <Info className="h-4 w-4" aria-hidden="true" />
      </button>
      <span
        id={panelId}
        role="note"
        hidden={!open}
        className="absolute left-0 top-[calc(100%+0.5rem)] z-50 block w-72 max-w-[85vw] rounded-xl border border-line bg-card p-3 text-sm leading-relaxed text-ink shadow-lg"
      >
        {message}
      </span>
    </span>
  );
}
