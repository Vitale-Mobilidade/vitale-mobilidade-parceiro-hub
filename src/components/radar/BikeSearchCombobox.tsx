import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CLASSIFICATION_LABEL } from "@/lib/price-tracker";
import { formatBRL } from "@/lib/price-tracker";
import { normalizeText } from "@/lib/price-daily";
import { CLASSIFICATION_COLOR, type RadarEntry } from "@/lib/radar-rankings";
import { trackRadar } from "@/lib/radar-analytics";

interface Props {
  entries: RadarEntry[];
  query: string;
  onQueryChange: (value: string) => void;
  onSeeAll?: () => void;
  /** Enquanto o catálogo carrega não dizemos que a bike não existe. */
  loading?: boolean;
}

/** Busca com autocomplete acessível: abre com todas as bikes elegíveis. */
export function BikeSearchCombobox({ entries, query, onQueryChange, onSeeAll, loading = false }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = "radar-bike-options";

  const q = normalizeText(query);
  const options = q ? entries.filter((e) => normalizeText(e.name).includes(q)) : entries;

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const select = (entry: RadarEntry) => {
    trackRadar("radar_search_selected", { bike_id: entry.id });
    setOpen(false);
    navigate(`/acompanhamento/${entry.id}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && options[active]) {
        e.preventDefault();
        select(options[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <label htmlFor="radar-busca" className="mb-2 block text-sm font-medium">
        Qual bike você quer acompanhar?
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          id="radar-busca"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? `radar-opt-${options[active].id}` : undefined}
          autoComplete="off"
          value={query}
          placeholder="Digite o nome da bike ou veja todas"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className="h-14 w-full rounded-2xl border border-border bg-white pl-12 pr-11 text-base shadow-sm transition focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        {query && (
          <button
            type="button"
            aria-label="Limpar busca"
            onClick={() => onQueryChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Bikes acompanhadas"
          className="absolute z-40 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-border bg-white p-2 shadow-xl"
        >
          {options.length === 0 && loading && (
            <li className="p-4 text-sm text-muted-foreground" aria-live="polite">
              Carregando bikes...
            </li>
          )}
          {options.length === 0 && !loading && (
            <li className="p-4 text-sm text-muted-foreground">
              Não encontramos essa bike no radar.{" "}
              <button
                type="button"
                className="font-medium text-primary underline"
                onClick={() => {
                  onQueryChange("");
                  onSeeAll?.();
                }}
              >
                Ver todas as bikes
              </button>
            </li>
          )}
          {options.map((entry, i) => (
            <li key={entry.id} id={`radar-opt-${entry.id}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => select(entry)}
                className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition ${
                  i === active ? "bg-green-50" : "hover:bg-muted/60"
                }`}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-green-50">
                  {entry.image ? (
                    <img src={entry.image} alt="" aria-hidden="true" loading="lazy" className="h-full w-full object-contain" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{entry.name}</span>
                  <span className="block text-sm font-semibold text-primary">{formatBRL(entry.currentPrice)}</span>
                </span>
                <Badge className={`shrink-0 border-0 text-[11px] ${CLASSIFICATION_COLOR[entry.metrics.classification]}`}>
                  {CLASSIFICATION_LABEL[entry.metrics.classification]}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
