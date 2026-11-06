import { Link } from "@/lib/router-compat";
import { BellRing, Heart, LineChart, LoaderCircle } from "lucide-react";
import { formatBRL } from "@/lib/price-tracker";
import {
  radarUseLine,
  shortDiagnosis,
  type RadarEntry,
} from "@/lib/radar-rankings";
import { useRadarBase } from "@/lib/radar-base";

interface Props {
  entry: RadarEntry;
  highlight?: boolean;
  favorite?: {
    saved: boolean;
    busy: boolean;
    disabled: boolean;
    error?: string;
    onToggle: () => void;
  };
  onPriceAlert?: () => void;
}

export function RadarBikeCard({
  entry,
  highlight = false,
  favorite,
  onPriceAlert,
}: Props) {
  const base = useRadarBase();
  const savings =
    entry.savingsAbs !== null && entry.savingsAbs > 0 ? entry.savingsAbs : null;
  const useLine = radarUseLine(entry);

  return (
    <article
      id={`bike-${entry.id}`}
      className={`group relative flex h-full scroll-mt-28 flex-col overflow-hidden rounded-3xl border bg-card text-card-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl ${
        highlight ? "border-primary/30" : "border-border/60"
      }`}
    >
      <Link
        to={`${base}/${entry.id}`}
        className="flex flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-action"
      >
        <div
          className={`flex items-center justify-center overflow-hidden bg-surface ${highlight ? "h-64" : "h-52"}`}
        >
          {entry.image ? (
            <img
              src={entry.image}
              alt={`Bike elétrica ${entry.name}`}
              width={640}
              height={480}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            <span className="text-xs text-muted-foreground">
              Imagem indisponível
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          {/* Sem selo de classificação na listagem do Radar: só leitura factual. */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-base font-semibold leading-tight">
              {entry.name}
            </h3>
          </div>
          {useLine && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              Boa para: {useLine}
            </p>
          )}
          <ul className="mt-3 flex flex-wrap gap-1.5 text-xs text-ink">
            {[
              entry.autonomyKm && entry.autonomyKm > 0
                ? `Autonomia: ${entry.autonomyKm} km`
                : null,
              entry.capacity && entry.capacity > 0
                ? `Capacidade: ${entry.capacity} pessoa(s)`
                : null,
              entry.category ? entry.category : null,
            ]
              .filter((value): value is string => Boolean(value))
              .slice(0, 3)
              .map((value) => (
                <li key={value} className="rounded-md bg-surface px-2 py-1">
                  {value}
                </li>
              ))}
          </ul>

          <p className="mt-3 text-3xl font-bold tracking-tight text-primary">
            {formatBRL(entry.currentPrice)}
          </p>
          {savings !== null && (
            <p className="text-sm font-medium text-action">
              {formatBRL(savings)} abaixo do típico (
              {Math.abs(entry.savingsPct ?? 0).toFixed(1)}%)
            </p>
          )}
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {shortDiagnosis(entry)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Preço típico do período: {formatBRL(entry.metrics.typicalPrice)}
          </p>

          <div className="mt-auto space-y-2 pt-4">
            <span className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-action px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity group-hover:opacity-90">
              <LineChart className="h-4 w-4" aria-hidden="true" /> Ver bike e
              histórico
            </span>
          </div>
        </div>
      </Link>
      <div className="space-y-2 px-5 pb-5">
        <div className="flex items-center gap-2">
          {onPriceAlert && (
            <button
              type="button"
              onClick={onPriceAlert}
              aria-label={`Cadastrar alerta de preço para ${entry.name}`}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border border-action bg-mint/20 px-3 py-2 text-sm font-semibold text-action hover:bg-mint/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
            >
              <BellRing className="h-4 w-4 shrink-0" aria-hidden="true" />{" "}
              Alerta de preço
            </button>
          )}
          {favorite && (
            <button
              type="button"
              aria-label={`${favorite.saved ? "Remover dos favoritos" : "Favoritar"}: ${entry.name}`}
              title={
                favorite.saved
                  ? "Remover dos favoritos"
                  : "Salvar nos favoritos — requer login"
              }
              aria-pressed={favorite.saved}
              aria-busy={favorite.busy}
              disabled={favorite.disabled || favorite.busy}
              onClick={favorite.onToggle}
              className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 disabled:opacity-50 ${favorite.saved ? "border-action bg-action text-primary-foreground" : "border-line text-action hover:bg-mint/20"}`}
            >
              {favorite.busy ? (
                <LoaderCircle
                  className="h-5 w-5 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <Heart
                  className="h-5 w-5"
                  fill={favorite.saved ? "currentColor" : "none"}
                  aria-hidden="true"
                />
              )}
            </button>
          )}
        </div>
        {favorite?.error && (
          <p role="alert" className="text-xs text-destructive">
            {favorite.error}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Status: oferta atual registrada no Radar. Preço e disponibilidade
          podem mudar.
        </p>
      </div>
    </article>
  );
}
