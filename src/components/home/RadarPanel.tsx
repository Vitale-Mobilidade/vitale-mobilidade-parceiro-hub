import { Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3 } from "lucide-react";
import { BikeMedia } from "@/components/site/site-ui";
import { formatBRL } from "@/lib/price-tracker";
import type { HomeCard } from "@/lib/home-cards.functions";

export function RadarPanel({
  total,
  card,
  headingId = "radar-home",
}: {
  total: number;
  card?: HomeCard;
  headingId?: string;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className="relative flex flex-col overflow-hidden rounded-3xl bg-vt-dark p-6 text-ink-foreground sm:p-8"
    >
      {/* Decoração abstrata (não é dado) */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 text-mint/15"
        viewBox="0 0 200 200"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="100" cy="100" r="30" />
        <circle cx="100" cy="100" r="60" />
        <circle cx="100" cy="100" r="90" />
        <path d="M100 100 L180 60" strokeWidth="3" />
      </svg>
      <div className="relative flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-mint text-mint-foreground">
          <BarChart3 className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="text-xs font-bold tracking-[0.2em] text-mint">
          RADAR DE PREÇOS
        </p>
      </div>
      <h2 id={headingId} className="section-h2 relative mt-4">
        O preço de hoje está bom?
      </h2>
      <p className="relative mt-2 max-w-md text-ink-foreground/80">
        {total > 0 ? (
          <>
            <strong className="text-mint">{total} bikes</strong> monitoradas.
            Veja o preço atual e a classificação do Radar antes de comprar.
          </>
        ) : (
          "Veja o preço atual e a classificação do Radar antes de comprar."
        )}
      </p>
      {card && (
        <Link
          to="/radar/$bikeId"
          params={{ bikeId: card.id }}
          className="relative mt-6 grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-4 rounded-xl border border-ink-foreground/15 bg-ink-foreground/5 p-4 hover:bg-ink-foreground/10"
        >
          <BikeMedia
            src={card.image}
            name={card.name}
            className="h-28 rounded-lg"
          />
          <span className="min-w-0">
            <strong className="block text-lg">{card.name}</strong>
            <span className="mt-1 block text-2xl font-extrabold text-mint">
              {formatBRL(card.currentPrice)}
            </span>
            <span className="mt-2 inline-flex items-center gap-1 text-sm">
              Ver preço e histórico{" "}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </span>
        </Link>
      )}
      <Link
        to="/radar"
        className="relative mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-mint px-6 text-lg font-bold text-mint-foreground shadow-lg hover:opacity-90 sm:w-fit"
      >
        Explorar Radar de preços{" "}
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Link>
    </section>
  );
}
