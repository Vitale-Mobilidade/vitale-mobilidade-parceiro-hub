import { useId } from "react";
import { DailyPriceChart } from "@/components/radar/DailyPriceChart";
import { formatBRL, formatDateBR, formatDateTimeBR } from "@/lib/price-tracker";
import {
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
  const { p25, p75, typicalPrice, classification } = metrics;
  const forming = classification === "forming";

  // A régua usa os extremos registrados desta janela (minPrice/maxPrice), a mesma base
  // dos rótulos "menor/maior registrado" — incluindo registros reconstruídos sinalizados.
  const scaleMin = metrics.minPrice;
  const scaleMax = metrics.maxPrice;
  const hasHistory = scaleMin !== null && scaleMax !== null && scaleMax > scaleMin;
  const span = hasHistory ? scaleMax - scaleMin : 0;
  const position = (value: number) => span > 0 && scaleMin !== null
    ? Math.min(100, Math.max(0, ((value - scaleMin) / span) * 100)) : 50;
  const currentPosition = position(currentPrice);
  const hasQuantileBands = !forming && p25 !== null && p75 !== null && p25 < p75;
  const showBands = hasHistory;
  // Com amostra ainda em formação, as cores indicam apenas posição na escala
  // observada (terços), sem classificar o preço como bom ou caro.
  const lowerBand = hasQuantileBands ? position(p25) : 100 / 3;
  const typicalBand = hasQuantileBands ? Math.max(0, position(p75) - lowerBand) : 100 / 3;

  const diff = typicalPrice === null ? null : typicalPrice - currentPrice;

  // Leitura FACTUAL e neutra: nenhum selo de avaliação ("bom preço", "oportunidade"),
  // apenas comparação numérica com os registros validados manualmente pelo time.
  const verdict = forming
    ? "Comparação baseada nos registros disponíveis até agora para esta bike."
    : classification === "lowest"
      ? "É o menor valor registrado por nós para esta bike no período acompanhado."
      : classification === "good"
        ? `Está ${formatBRL(Math.abs(diff ?? 0))} abaixo do preço típico do período.`
        : classification === "typical"
          ? "Está dentro da faixa de preço mais comum do período."
          : `Está ${formatBRL(Math.abs(diff ?? 0))} acima do preço típico do período.`;

  return (
    <section
      aria-labelledby={headingId}
      className="mt-5 overflow-hidden rounded-2xl border border-line bg-card"
    >
      {/* Diagnóstico */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h2 id={headingId} className="text-lg font-bold text-ink">
            Preço atual e registros da Vitale
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Preço de hoje comparado aos preços que registramos ({WINDOW_LABEL[String(window)]}).
          </p>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-2">
      <div className="px-4 py-4 sm:px-6 lg:border-r lg:border-line">
        <p className="text-base font-medium text-ink">{verdict}</p>

        {/* O pin mostra o preço de hoje; os extremos dos registros permanecem rotulados abaixo. */}
        <div className="mt-4">
            <div
              className="relative pt-[94px]"
              role="img"
              aria-label={`Preço atual ${formatBRL(currentPrice)}.${hasHistory ? ` Régua de ${formatBRL(scaleMin)} a ${formatBRL(scaleMax)} nos registros da janela.` : " Sem histórico para posicionar a régua."}${hasQuantileBands ? ` Faixa inferior até ${formatBRL(p25)}; faixa habitual de ${formatBRL(p25)} a ${formatBRL(p75)}; faixa superior acima de ${formatBRL(p75)}.` : ""}`}
            >
              <span className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `clamp(54px, ${currentPosition}%, calc(100% - 54px))` }} aria-hidden="true">
                <span className="flex w-[108px] flex-col items-center rounded-xl border border-line bg-logo-surface px-2 pb-1.5 pt-1 shadow-md">
                  <img src="/vitale-bike-price-pin.png" alt="" width={200} height={200} className="h-10 w-10 object-contain mix-blend-multiply" />
                  <span className="text-xs font-extrabold leading-none text-ink">{formatBRL(currentPrice)}</span>
                  <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Preço hoje</span>
                </span>
              </span>
              <span className="absolute top-[78px] h-0 w-0 -translate-x-1/2 border-x-[7px] border-t-[8px] border-x-transparent border-t-logo-surface" style={{ left: `clamp(7px, ${currentPosition}%, calc(100% - 7px))` }} aria-hidden="true" />
              {showBands ? (
                <span className="flex h-3 overflow-hidden rounded-full ring-1 ring-line" aria-hidden="true">
                  <span className="bg-emerald-500" style={{ width: `${lowerBand}%` }} />
                  <span className="bg-amber-400" style={{ width: `${typicalBand}%` }} />
                  <span className="flex-1 bg-rose-400" />
                </span>
              ) : <span className="block h-3 rounded-full bg-surface ring-1 ring-line" aria-hidden="true" />}
              <span className="absolute bottom-0 h-3 w-1.5 -translate-x-1/2 rounded-full bg-action ring-2 ring-card" style={{ left: `${currentPosition}%` }} aria-hidden="true" />
            </div>
             <div className="mt-1 flex justify-between text-xs font-medium text-muted-foreground"><span>{hasHistory ? formatBRL(scaleMin) : "—"}</span><span>{hasHistory ? formatBRL(scaleMax) : "—"}</span></div>
            {hasQuantileBands && <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-ink" aria-label="Legenda das faixas de preço">
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />Abaixo da faixa habitual</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />Faixa habitual</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" aria-hidden="true" />Acima da faixa habitual</span>
            </div>}
            {showBands && !hasQuantileBands && <p className="mt-2 text-xs text-muted-foreground">Cores mostram apenas a posição na escala observada; ainda não há dados suficientes para avaliar se o preço está bom ou caro.</p>}
             {hasHistory ? <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>
                Menor registrado
                 <span className="block font-bold text-ink">{formatBRL(scaleMin)}</span>
              </span>
              <span className="text-center">
                {forming ? "Mediana dos registros" : "Faixa habitual"}
                <span className="block font-bold text-ink">
                  {forming ? formatBRL(typicalPrice) : `${formatBRL(p25)} – ${formatBRL(p75)}`}
                </span>
              </span>
              <span className="text-right">
                Maior registrado
                 <span className="block font-bold text-ink">{formatBRL(scaleMax)}</span>
              </span>
            </div> : <p className="mt-2 text-xs text-muted-foreground">Ainda não há registros suficientes nesse período para comparar preços.</p>}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Registros disponíveis nesta janela: {metrics.verifiedDays + metrics.reconstructedDays} dia(s), em {metrics.expectedDays} dia(s) do período
          {metrics.firstDay && ` · a partir de ${formatDateBR(metrics.firstDay)}`}
          {firstObservedAt && ` · acompanhando desde ${formatDateBR(firstObservedAt)}`}
          {` · última verificação em ${formatDateTimeBR(metrics.lastVerifiedAt ?? lastObservedAt)}`}
        </p>
        {forming && (
          <p className="mt-1 text-xs text-muted-foreground">
            Como a sequência de dias ainda é curta ou tem intervalos, não qualificamos se o preço está barato ou caro.
          </p>
        )}
      </div>

      {/* Histórico */}
      <div className="border-t border-line px-4 py-4 sm:px-6 lg:border-t-0">
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
             A linha em degraus muda apenas na data de um novo preço disponível; entre registros pode haver dias sem verificação.
             O trecho horizontal é uma ligação visual, não uma nova leitura nem a confirmação do preço nesses dias.
          </p>
          <p className="mt-2">
            O preço típico é a mediana dos fechamentos diários do período e a faixa habitual vai do percentil 25 ao 75.
            Quando a sequência de dias do período ainda é curta ou tem intervalos, mostramos os valores registrados como
            referência e não qualificamos o preço — os registros continuam sendo os que a Vitale acompanha.
          </p>
        </details>
      </div>
      </div>
    </section>
  );
}
