import { formatBRL } from "@/lib/price-tracker";
import { rangePosition, type DailyMetrics } from "@/lib/price-daily";

interface Props {
  currentPrice: number;
  metrics: DailyMetrics;
}

/** Leitura visual: menor preço, faixa típica P25–P75 e onde está o preço de hoje. */
export function PriceRangeBar({ currentPrice, metrics }: Props) {
  const { minPrice, maxPrice, p25, p75, typicalPrice, classification, distinctPrices } = metrics;
  const forming = classification === "forming";

  // Só escondemos a régua quando não há faixa real: um único preço registrado.
  if (minPrice === null || maxPrice === null || maxPrice <= minPrice || distinctPrices < 2) {
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/30 p-6">
        <h2 className="text-lg font-semibold">O preço atual está bom?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Histórico em formação. Até agora registramos um único preço para esta bike, então ainda não dá para comparar —
          seguimos acompanhando.
        </p>
      </div>
    );
  }

  const pos = rangePosition(currentPrice, minPrice, maxPrice) ?? 0;
  const bandStart = rangePosition(p25 ?? minPrice, minPrice, maxPrice) ?? 0;
  const bandEnd = rangePosition(p75 ?? maxPrice, minPrice, maxPrice) ?? 1;
  const diff = (typicalPrice ?? currentPrice) - currentPrice;

  const tone = forming
    ? "text-foreground"
    : classification === "above"
      ? "text-destructive"
      : classification === "typical"
        ? "text-amber-700"
        : "text-primary";
  const markerTone = forming
    ? "bg-foreground"
    : classification === "above"
      ? "bg-destructive"
      : classification === "typical"
        ? "bg-amber-500"
        : "bg-primary";

  return (
    <section className="rounded-2xl border border-border/60 bg-white p-6 shadow-sm" aria-label="Leitura do preço atual">
      <h2 className="text-lg font-semibold">O preço atual está bom?</h2>
      <p className={`mt-1 text-base font-medium ${tone}`}>
        {diff > 0
          ? `Hoje está ${formatBRL(Math.abs(diff))} abaixo do preço típico.`
          : diff < 0
            ? `Hoje está ${formatBRL(Math.abs(diff))} acima do preço típico.`
            : "Hoje está exatamente no preço típico."}
      </p>

      <div className="mt-6">
        <div className="relative h-3 w-full rounded-full bg-muted">
          <div
            className="absolute inset-y-0 rounded-full bg-amber-200"
            style={{ left: `${bandStart * 100}%`, width: `${Math.max(bandEnd - bandStart, 0.02) * 100}%` }}
            aria-hidden="true"
          />
          <div
            className={`absolute top-1/2 h-6 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${markerTone}`}
            style={{ left: `${pos * 100}%` }}
            aria-hidden="true"
          />
        </div>
        <div className="mt-3 flex justify-between text-xs text-muted-foreground">
          <span>
            Menor
            <span className="block font-semibold text-foreground">{formatBRL(minPrice)}</span>
          </span>
          <span className="text-center">
            Faixa típica
            <span className="block font-semibold text-foreground">
              {formatBRL(p25)} – {formatBRL(p75)}
            </span>
          </span>
          <span className="text-right">
            Maior
            <span className="block font-semibold text-foreground">{formatBRL(maxPrice)}</span>
          </span>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Cobertura do período: {metrics.verifiedDays} de {metrics.expectedDays} dias verificados.
      </p>
    </section>
  );
}
