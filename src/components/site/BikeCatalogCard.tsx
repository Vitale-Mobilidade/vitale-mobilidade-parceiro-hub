import { Link } from "@tanstack/react-router";
import { ArrowRight, LineChart, Youtube } from "lucide-react";
import { BikeMedia, PriceStatus } from "@/components/site/site-ui";
import { formatBRL } from "@/lib/price-tracker";
import type { DiscoveryBike } from "@/lib/bikes-discovery.functions";

/** Card de descoberta: dados reais, fonte do preço explícita, sem link direto ao Mercado Livre. */
export function BikeCatalogCard({ bike }: { bike: DiscoveryBike }) {
  const specs = [bike.autonomy, bike.capacity].filter(Boolean).join(" · ");
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-line transition hover:shadow-lg hover:ring-action">
      <BikeMedia src={bike.image} name={bike.name} className="aspect-[4/3] w-full" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        {bike.radar && <PriceStatus classification={bike.radar.classification} />}
        <h3 className="line-clamp-2 text-lg font-bold leading-snug text-ink">{bike.name}</h3>
        {specs && <p className="text-sm text-muted-foreground">{specs}</p>}
        <div className="mt-1">
          {bike.radar ? (
            <>
              <p className="text-xl font-black text-ink">{formatBRL(bike.radar.currentPrice)}</p>
              <p className="text-xs text-muted-foreground">Preço registrado pelo Radar Vitale</p>
            </>
          ) : bike.sheetPrice ? (
            <>
              <p className="text-xl font-black text-ink">{formatBRL(bike.sheetPrice)}</p>
              <p className="text-xs text-muted-foreground">Preço de referência cadastrado (não monitorado)</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Preço não informado</p>
          )}
        </div>
        {bike.videoCount !== null && bike.videoCount > 0 && (
          <p className="inline-flex items-center gap-1 text-xs font-semibold text-ink">
            <Youtube className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
            {bike.videoCount} {bike.videoCount === 1 ? "vídeo" : "vídeos"} no canal
          </p>
        )}
        <div className="mt-auto flex flex-col gap-2 pt-3">
          <Link
            to="/bikes/$slug"
            params={{ slug: bike.slug }}
            className="inline-flex h-11 items-center justify-center gap-1 rounded-xl bg-ink px-4 text-sm font-bold text-ink-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            Conhecer a bike <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          {bike.radar && (
            <Link
              to="/acompanhamento/$bikeId"
              params={{ bikeId: bike.bikeId }}
              className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-line px-4 text-sm font-semibold text-ink hover:border-action hover:text-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
            >
              <LineChart className="h-4 w-4" aria-hidden="true" /> Analisar preço no Radar
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
