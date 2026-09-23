import { useId, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { normalizeText } from "@/lib/price-daily";
import type { HomeSearchItem } from "@/lib/home-cards.functions";

/** Busca nas bikes reais do Radar; cada resultado abre /radar/{bikeId}. */
export function HomeSearch({ items, className = "" }: { items: HomeSearchItem[]; className?: string }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const id = useId();
  const results = useMemo(() => {
    const n = normalizeText(q.trim());
    if (!n) return items.slice(0, 8);
    return items.filter((i) => normalizeText(i.name).includes(n)).slice(0, 8);
  }, [q, items]);

  if (items.length === 0) return null;
  return (
    <div className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">Buscar bike no Radar</label>
      <div className="flex items-center gap-2 rounded-xl border border-ink-foreground/25 bg-ink px-3">
        <Search className="h-4 w-4 shrink-0 text-ink-foreground/80" aria-hidden="true" />
        <input
          id={id}
          type="search"
          value={q}
          placeholder="Buscar no Radar"
          autoComplete="off"
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="h-11 w-full min-w-0 bg-transparent text-sm text-ink-foreground placeholder:text-ink-foreground/70 focus:outline-none"
        />
      </div>
      {open && (
        <ul className="absolute right-0 z-50 mt-2 max-h-80 w-full min-w-64 overflow-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-xl">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Nenhuma bike encontrada.</li>
          ) : (
            results.map((r) => (
              <li key={r.id}>
                <Link
                  to="/radar/$bikeId"
                  params={{ bikeId: r.id }}
                  className="block rounded-lg px-3 py-2 text-sm hover:bg-muted"
                >
                  {r.name}
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
