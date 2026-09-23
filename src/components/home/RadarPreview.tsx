import { Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3 } from "lucide-react";
import { CLASSIFICATION_LABEL, formatBRL } from "@/lib/price-tracker";
import type { HomeRadarItem } from "@/lib/home-cards.functions";

/** Preview compacto do Radar: só dados reais já classificados pela regra do Radar. */
export function RadarPreview({ items, className = "" }: { items: HomeRadarItem[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="radar-preview" className={className}>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 id="radar-preview" className="flex items-center gap-2 text-lg font-bold sm:text-xl">
            <BarChart3 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            Radar de preços
          </h2>
          <Link to="/radar" className="shrink-0 text-sm font-semibold text-primary hover:underline">
            Ver todas
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-border">
          {items.map((i) => (
            <li key={i.id}>
              <Link
                to="/radar/$bikeId"
                params={{ bikeId: i.id }}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 hover:text-primary"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{i.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {CLASSIFICATION_LABEL[i.classification]}
                    {i.typicalPrice !== null && ` · típico ${formatBRL(i.typicalPrice)}`}
                  </span>
                </span>
                <span className="flex items-center gap-1 font-bold text-primary">
                  {formatBRL(i.currentPrice)}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
