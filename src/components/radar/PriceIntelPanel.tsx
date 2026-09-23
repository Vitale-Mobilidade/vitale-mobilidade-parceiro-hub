import { useId } from "react";
import { DailyPriceChart } from "@/components/radar/DailyPriceChart";
import { formatBRL, formatDateBR, formatDateTimeBR, CLASSIFICATION_LABEL } from "@/lib/price-tracker";
import {
  rangePosition,
  DAILY_WINDOWS,
  WINDOW_LABEL,
  type DailyMetrics,
  type DailyWindow,
} from "@/lib/price-daily";

interface Props {
  currentPrice: number;
  metrics: DailyMetrics;
  window: DailyWindow;
  onWindowChange: (w: DailyWindow) => void;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
}

/**
 * Painel único de inteligência de preço do Radar (detalhe da bike).
 * Não calcula nada: consome `dailyMetrics` (classification, faixas, série)
 * como única fonte de verdade. Cor nunca é a única comunicação — há sempre
 * rótulo textual e `aria-label` descrevendo o estado.
 */
export function PriceIntelPanel({
  currentPrice,
  metrics,
  window,
  onWindowChange,
  firstObservedAt,
  lastObservedAt,
}: Props) {
  const headingId = useId();
  const { minPrice, maxPrice, p25, p75, typicalPrice, classification, distinctPrices } = metrics;
  const forming = classification === "forming";

  // Faixa só existe com dois preços distintos e amplitude real.
  const hasRange = minPrice !== null && maxPrice !== null && maxPrice > minPrice && distinctPrices >= 2;

  const pos = hasRange ? rangePosition(currentPrice, minPrice, maxPrice) : null;
  const bandStart = hasRange ? (rangePosition(p25 ?? minPrice, minPrice, maxPrice) ?? 0) : 0;
  const bandEnd = hasRange ? (rangePosition(p75 ?? maxPrice, minPrice, maxPrice) ?? 1) : 1;

  const diff = typicalPrice === null ? null : typicalPrice - currentPrice;

  // Leitura DESCRITIVA. Com histórico curto/descontínuo não qualificamos barato/caro
  // e não exibimos selo prescritivo — os registros existentes são a base validada pelo time.
  const verdict = forming
    ? "Comparação baseada nos registros disponíveis até agora para esta bike."
    : classification === "lowest"
      ? "É o menor preço que já registramos para esta bike."
      : classification === "good"
        ? `Está ${formatBRL(Math.abs(diff ?? 0))} abaixo do preço típico do período.`
        : classification === "typical"
          ? "Está dentro da faixa de preço mais comum do período."
          : `Está ${formatBRL(Math.abs(diff ?? 0))} acima do preço típico do período.`;

  const verdictTone =
    classification === "above"
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : classification === "typical"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : "bg-mint/20 text-ink border-mint/40";

  const markerTone =
    classification === "above"
      ? "bg-destructive"
      : classification === "typical"
        ? "bg-amber-500"
        : "bg-action";

  const markerLabel = `Preço atual ${formatBRL(currentPrice)} — ${CLASSIFICATION_LABEL[classification]}`;

  return (
    <section
      aria-labelledby={headingId}
      className="mt-8 overflow-hidden rounded-2xl border border-line bg-card"
    >
      {/* Diagnóstico */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 id={headingId} className="text-lg font-bold text-ink">
            Preço atual e registros da Vitale
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Preço de hoje comparado aos preços que registramos ({WINDOW_LABEL[String(window)]}).
          </p>
        </div>
        {/* Selo só quando a leitura é conclusiva; nunca um selo grande para histórico curto. */}
        {!forming && (
          <p className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${verdictTone}`}>
            {CLASSIFICATION_LABEL[classification]}
          </p>
        )}
      </div>

      <div className="px-4 py-4 sm:px-6">
        <p className="text-base font-medium text-ink">{verdict}</p>

        {/* Escala verde/amarelo/vermelho: referência visual sobre os registros reais. */}
        {hasRange ? (
          <div className="mt-4">
            <div
              className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={
                forming
                  ? `Preço atual ${formatBRL(currentPrice)} na escala dos registros: menor ${formatBRL(minPrice)}, mediana ${formatBRL(typicalPrice)}, maior ${formatBRL(maxPrice)}. Referência visual, sem classificação.`
                  : `${markerLabel}. Faixa habitual de ${formatBRL(p25)} a ${formatBRL(p75)}, entre ${formatBRL(minPrice)} e ${formatBRL(maxPrice)}.`
              }
            >
              <div className="absolute inset-y-0 left-0 bg-action/70" style={{ width: `${bandStart * 100}%` }} />
              <div
                className="absolute inset-y-0 bg-amber-400/80"
                style={{ left: `${bandStart * 100}%`, width: `${Math.max(bandEnd - bandStart, 0.02) * 100}%` }}
              />
              <div className="absolute inset-y-0 right-0 bg-destructive/70" style={{ left: `${bandEnd * 100}%` }} />
              {pos !== null && (
                <span
                  className={`absolute top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card ${forming ? "bg-ink" : markerTone}`}
                  style={{ left: `${pos * 100}%` }}
                  aria-hidden="true"
                />
              )}
            </div>

            <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>
                {forming ? "Menor registrado" : "Baixo preço"}
                <span className="block font-bold text-ink">{formatBRL(minPrice)}</span>
              </span>
              <span className="text-center">
                {forming ? "Mediana dos registros" : "Faixa habitual"}
                <span className="block font-bold text-ink">
                  {forming ? formatBRL(typicalPrice) : `${formatBRL(p25)} – ${formatBRL(p75)}`}
                </span>
              </span>
              <span className="text-right">
                {forming ? "Maior registrado" : "Preço alto"}
                <span className="block font-bold text-ink">{formatBRL(maxPrice)}</span>
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Até agora registramos um único preço nesse período, então não há faixa para comparar.
          </p>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          Dados usados nesta janela: {metrics.verifiedDays} dia(s) confirmados e {metrics.reconstructedDays}{" "}
          reconstruído(s), em {metrics.expectedDays} dia(s) do período
          {metrics.firstDay && ` · a partir de ${formatDateBR(metrics.firstDay)}`}
          {firstObservedAt && ` · acompanhando desde ${formatDateBR(firstObservedAt)}`}
          {` · última verificação em ${formatDateTimeBR(metrics.lastVerifiedAt ?? lastObservedAt)}`}
        </p>
        {forming && (
          <p className="mt-1 text-xs text-muted-foreground">
            Ainda em formação porque o período precisa de pelo menos 14 dias confirmados, 80% de cobertura e mais de um
            preço distinto. No período “Tudo” você vê toda a série já registrada.
          </p>
        )}
      </div>

      {/* Histórico */}
      <div className="border-t border-line px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-ink">Histórico de preços</h3>
          <div className="inline-flex flex-wrap rounded-lg border border-line p-0.5" role="group" aria-label="Período do gráfico">
            {DAILY_WINDOWS.map((w) => (
              <button
                key={String(w)}
                type="button"
                onClick={() => onWindowChange(w)}
                aria-pressed={window === w}
                className={`min-h-9 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action ${
                  window === w ? "bg-action text-primary-foreground" : "text-muted-foreground hover:bg-surface"
                }`}
              >
                {WINDOW_LABEL[String(w)]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <DailyPriceChart series={metrics.series} compact />
        </div>

        <details className="mt-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action">
            Como lemos esses números
          </summary>
          <p className="mt-2">
            Ponto cheio: dia verificado. Ponto vazado: dia reconstruído do histórico. Espaços vazios são dias sem
            verificação — nunca repetimos um preço que não confirmamos.
          </p>
          <p className="mt-2">
            O preço típico é a mediana dos fechamentos diários do período e a faixa habitual vai do percentil 25 ao 75.
            Com menos de 14 dias verificados, cobertura abaixo de 80% ou apenas um preço, dizemos honestamente que o
            histórico ainda está em formação.
          </p>
        </details>
      </div>
    </section>
  );
}
