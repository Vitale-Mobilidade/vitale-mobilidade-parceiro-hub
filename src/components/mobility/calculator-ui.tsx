import { Link } from "@tanstack/react-router";
import { Bike, ExternalLink, LineChart, Mountain, Users } from "lucide-react";
import { BikeMedia } from "@/components/site/site-ui";
import { Button } from "@/components/ui/button";
import { trackAffiliateClick, type AffiliatePosition } from "@/lib/affiliate-analytics";
import { BUDGET_PRESETS } from "@/lib/mobility/config";
import { brl, decimal, type BudgetMode } from "@/lib/mobility/format";
import type { ProjectionResult } from "@/lib/mobility/projection-engine";
import type { RecommendedBike } from "@/lib/mobility/recommendation-engine";

export function NumberField({
  name,
  label,
  value,
  onChange,
  onBlur,
  suffix,
  help,
  error,
  step = "0.01",
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  suffix: string;
  help?: string;
  error?: string | null;
  step?: string;
}) {
  const helpId = `${name}-help`;
  const errorId = `${name}-error`;
  return (
    <div>
      <label htmlFor={name} className="text-sm font-bold text-ink">{label}</label>
      <div className={`mt-1 flex min-h-12 items-center gap-2 rounded-md bg-background px-3 ring-1 focus-within:ring-2 ${error ? "ring-destructive focus-within:ring-destructive" : "ring-line focus-within:ring-action"}`}>
        <input
          id={name}
          name={name}
          type="number"
          inputMode="decimal"
          min="0"
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={[help ? helpId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined}
          className="h-12 min-w-0 flex-1 bg-transparent text-base text-ink outline-none"
        />
        <span className="shrink-0 text-xs text-muted-foreground">{suffix}</span>
      </div>
      {help && <p id={helpId} className="mt-1 text-xs leading-relaxed text-muted-foreground">{help}</p>}
      {error && <p id={errorId} className="mt-1 text-xs font-semibold text-destructive">{error}</p>}
    </div>
  );
}

export function Metric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={`min-w-0 rounded-md p-4 ${emphasis ? "bg-mint/25" : "bg-surface ring-1 ring-line"}`}>
      <dt className="text-xs font-semibold leading-snug text-muted-foreground">{label}</dt>
      <dd className={`mt-1 break-words font-black text-ink ${emphasis ? "text-2xl sm:text-3xl" : "text-xl"}`}>{value}</dd>
    </div>
  );
}

export function BudgetSelector({
  mode,
  onModeChange,
  custom,
  onCustomChange,
  onTouched,
  error,
}: {
  mode: BudgetMode;
  onModeChange: (mode: BudgetMode) => void;
  custom: string;
  onCustomChange: (value: string) => void;
  onTouched: () => void;
  error?: string | null;
}) {
  const option = (value: BudgetMode, label: string) => (
    <Button
      key={value}
      type="button"
      variant={mode === value ? "default" : "outline"}
      aria-pressed={mode === value}
      onClick={() => { onModeChange(value); onTouched(); }}
      className={mode === value ? "min-h-11 bg-action" : "min-h-11 border-line"}
    >
      {label}
    </Button>
  );
  return (
    <fieldset>
      <legend className="text-sm font-bold text-ink">Orçamento da bike <span className="font-normal text-muted-foreground">(opcional)</span></legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {option("none", "Sem limite")}
        {BUDGET_PRESETS.map((amount) => option(String(amount) as `${number}`, `Até ${brl(amount)}`))}
        {option("custom", "Outro valor")}
      </div>
      {mode === "custom" && (
        <div className="mt-3 max-w-xs">
          <NumberField name="customBudget" label="Outro orçamento máximo" value={custom} onChange={onCustomChange} onBlur={onTouched} suffix="R$" error={error} />
        </div>
      )}
    </fieldset>
  );
}

export function PassengerToggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-md bg-surface px-4 py-3 ring-1 ring-line">
      <span className="flex items-center gap-3 text-sm font-bold text-ink"><Users className="h-5 w-5 text-action" aria-hidden="true" /> Preciso levar garupa</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-[var(--color-action,currentColor)]" />
    </label>
  );
}

export function HillsToggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-md bg-surface px-4 py-3 ring-1 ring-line">
      <span className="flex items-center gap-3 text-sm font-bold text-ink"><Mountain className="h-5 w-5 text-action" aria-hidden="true" /> Meu trajeto tem muitas subidas</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-[var(--color-action,currentColor)]" />
    </label>
  );
}

export function BikeResultCard({
  bike,
  selected,
  onSelect,
  projection,
  position,
}: {
  bike: RecommendedBike;
  selected: boolean;
  onSelect: () => void;
  /** Omitido em ferramentas sem dado monetário (ex.: tempo): sem payback nem seleção para projeção. */
  projection?: ProjectionResult;
  position: AffiliatePosition;
}) {
  const selectable = projection !== undefined;
  return (
    <article className={`overflow-hidden rounded-lg bg-card ring-2 ${selectable && selected ? "ring-action" : "ring-line"}`}>
      {selectable ? (
        <button type="button" onClick={onSelect} aria-pressed={selected} className="grid min-h-12 w-full grid-cols-[112px_minmax(0,1fr)] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-inset sm:grid-cols-[150px_minmax(0,1fr)]">
        <BikeMedia src={bike.image} name={bike.name} className="h-full min-h-36" />
        <span className="p-4">
          {selectable && <span className="text-xs font-bold text-action">{selected ? "Opção selecionada" : "Selecionar para projeção"}</span>}
          <strong className="mt-1 block text-lg text-ink">{bike.name}</strong>
          <span className="mt-1 block text-xl font-black text-ink">{brl(bike.price)}</span>
          <span className="mt-1 block text-xs text-muted-foreground">Oferta atual registrada pela Vitale no Mercado Livre.</span>
          <span className="mt-2 block text-sm text-ink">
            {bike.autonomyKm} km de autonomia{bike.capacity ? ` · ${bike.capacity} pessoa${bike.capacity > 1 ? "s" : ""}` : ""}
          </span>
        </span>
        </button>
      ) : (
        <div className="grid w-full grid-cols-[112px_minmax(0,1fr)] sm:grid-cols-[150px_minmax(0,1fr)]">
        <BikeMedia src={bike.image} name={bike.name} className="h-full min-h-36" />
        <span className="p-4">
          {selectable && <span className="text-xs font-bold text-action">{selected ? "Opção selecionada" : "Selecionar para projeção"}</span>}
          <strong className="mt-1 block text-lg text-ink">{bike.name}</strong>
          <span className="mt-1 block text-xl font-black text-ink">{brl(bike.price)}</span>
          <span className="mt-1 block text-xs text-muted-foreground">Oferta atual registrada pela Vitale no Mercado Livre.</span>
          <span className="mt-2 block text-sm text-ink">
            {bike.autonomyKm} km de autonomia{bike.capacity ? ` · ${bike.capacity} pessoa${bike.capacity > 1 ? "s" : ""}` : ""}
          </span>
        </span>
        </div>
      )}
      <div className="border-t border-line p-4">
        <p className="text-sm text-ink">{bike.reason}</p>
        {typeof bike.budgetRemaining === "number" && (
          <p className="mt-1 text-xs text-muted-foreground">
            {bike.budgetRemaining > 0 ? `${brl(bike.budgetRemaining)} abaixo do seu teto de preço.` : "No limite do seu teto de preço."}
          </p>
        )}
        {projection?.ok && (
          <div className="mt-3 rounded-md bg-surface p-3 text-sm ring-1 ring-line">
            <p className="font-bold text-ink">
              {projection.paybackMonths === null
                ? "Sem retorno financeiro positivo neste cenário"
                : `Retorno estimado em ${decimal(projection.paybackMonths)} meses`}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              {projection.points.map((point) => (
                <span key={point.months}>
                  <strong className="block text-ink">{point.months}m</strong>
                  {brl(point.netBalance)}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button asChild variant="outline" className="min-h-11 border-line text-action">
            <Link to="/bikes/$slug" params={{ slug: bike.slug }}><Bike aria-hidden="true" /> Conhecer a bike</Link>
          </Button>
          {bike.monitored && (
            <Button asChild variant="outline" className="min-h-11 border-line text-action">
              <Link to="/radar/$bikeId" params={{ bikeId: bike.bikeId }}><LineChart aria-hidden="true" /> Ver preço e histórico</Link>
            </Button>
          )}
          <Button asChild className="min-h-11 bg-action text-primary-foreground hover:bg-action/90 sm:col-span-2">
            <a
              href={bike.link}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => trackAffiliateClick({ bike_id: bike.bikeId, position })}
            >
              Ver oferta no Mercado Livre <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
}

/** Explica o que realmente filtra a seleção e oferece o Quiz como refinamento opcional (sem bloco genérico). */
export function RecommendationFooter({ budgetInformed, eligibleCount, hillsRequested = false }: { budgetInformed: boolean; eligibleCount: number; hillsRequested?: boolean }) {
  return (
    <div className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
      <p>
        {eligibleCount} bike{eligibleCount === 1 ? "" : "s"} com oferta atual {eligibleCount === 1 ? "atende" : "atendem"} aos filtros. As sugestões só mudam quando distância, garupa, subidas ou teto de preço mudam — o gasto informado não altera quais bikes cabem no trajeto.
        {!budgetInformed && " Sem teto de preço, mostramos só a opção econômica provisória — não é uma recomendação completa. Escolha um teto de orçamento acima para ver se existe uma alternativa com bem mais autonomia dentro dele."}
        {hillsRequested && " Com subidas marcado, só entram bikes que o catálogo do Quiz marca como indicadas para subidas; modelos sem essa marcação ficam de fora mesmo que possam servir. A marcação é editorial, não um teste de desempenho."}
      </p>
      <p>
        <Link to="/escolherbike" className="inline-flex min-h-11 items-center font-bold text-action underline-offset-4 hover:underline">
          Quer considerar peso, terreno e tipo de uso? Refine no Quiz
        </Link>
      </p>
    </div>
  );
}
