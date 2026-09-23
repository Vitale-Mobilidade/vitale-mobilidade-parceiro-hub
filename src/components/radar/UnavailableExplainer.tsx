import { useState } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { unavailableMessage } from "@/lib/radar-unavailable";

/**
 * Explicação acessível da indisponibilidade da oferta.
 * Abre por hover/foco no desktop e por toque/clique no mobile; fecha com Esc.
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
  const message = unavailableMessage(dateISO);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-destructive/40 px-3 text-sm font-semibold text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive ${className ?? ""}`}
        >
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-destructive" />
          {label}
          <Info className="h-4 w-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-w-xs text-sm leading-relaxed">
        {message}
      </PopoverContent>
    </Popover>
  );
}
