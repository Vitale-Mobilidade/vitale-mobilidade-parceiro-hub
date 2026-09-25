import { Link } from "@/lib/router-compat";
import { LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/price-tracker";
import { shortDiagnosis, type RadarEntry } from "@/lib/radar-rankings";
import { useRadarBase } from "@/lib/radar-base";

interface Props {
  entry: RadarEntry;
  highlight?: boolean;
}

export function RadarBikeCard({ entry, highlight = false }: Props) {
  const base = useRadarBase();
  const savings = entry.savingsAbs !== null && entry.savingsAbs > 0 ? entry.savingsAbs : null;

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-3xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl ${
        highlight ? "border-primary/30" : "border-border/60"
      }`}
    >
      <Link
        to={`${base}/${entry.id}`}
        aria-label={`Ver bike e histórico da ${entry.name}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className={`flex items-center justify-center overflow-hidden bg-surface ${highlight ? "h-64" : "h-52"}`}>
          {entry.image ? (
            <img
              src={entry.image}
              alt={`Bike elétrica ${entry.name}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            <span className="text-xs text-muted-foreground">Imagem indisponível</span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        {/* Sem selo de classificação na listagem do Radar: só leitura factual. */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-base font-semibold leading-tight">
            <Link to={`${base}/${entry.id}`} className="hover:text-primary focus-visible:outline-none">
              {entry.name}
            </Link>
          </h3>
        </div>
        {entry.perfilIndicado ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">Boa para… {entry.perfilIndicado}</p> : entry.shortDescription && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{entry.shortDescription}</p>}
        <ul className="mt-3 flex flex-wrap gap-1.5 text-xs text-ink">
          {[
            entry.autonomyKm && entry.autonomyKm > 0 ? `Autonomia: ${entry.autonomyKm} km` : null,
            entry.capacity && entry.capacity > 0 ? `Capacidade: ${entry.capacity} pessoa(s)` : null,
            entry.category ? entry.category : null,
          ].filter((value): value is string => Boolean(value)).slice(0, 3).map(value => <li key={value} className="rounded-md bg-surface px-2 py-1">{value}</li>)}
        </ul>

        <p className="mt-3 text-3xl font-bold tracking-tight text-primary">{formatBRL(entry.currentPrice)}</p>
        {savings !== null && (
          <p className="text-sm font-medium text-primary">
            {formatBRL(savings)} abaixo do típico ({Math.abs(entry.savingsPct ?? 0).toFixed(1)}%)
          </p>
        )}
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{shortDiagnosis(entry)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Preço típico do período: {formatBRL(entry.metrics.typicalPrice)}
        </p>

        <div className="mt-auto space-y-2 pt-4">
          <div>
            <Button asChild className="min-h-12 w-full bg-action text-primary-foreground hover:opacity-90">
              <Link to={`${base}/${entry.id}`}>
                <LineChart className="mr-2 h-4 w-4" aria-hidden="true" /> Ver bike e histórico
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Status: oferta atual registrada no Radar. Preço e disponibilidade podem mudar.</p>
        </div>
      </div>
    </article>
  );
}
