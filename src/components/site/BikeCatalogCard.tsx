import { Link } from "@tanstack/react-router";
import { ArrowRight, Youtube } from "lucide-react";
import { BikeMedia, PriceStatus } from "@/components/site/site-ui";
import { formatBRL } from "@/lib/price-tracker";
import type { DiscoveryBike } from "@/lib/bikes-discovery.functions";

/**
 * Card de descoberta: o card inteiro é um único link para /bikes/$slug.
 * Classificação do Radar é apenas selo informativo (sem outro destino);
 * o acesso ao Radar fica no detalhe da bike. Sem link direto ao Mercado Livre.
 */
export function BikeCatalogCard({ bike }: { bike: DiscoveryBike }) {
  const specs = [bike.autonomy, bike.capacity].filter(Boolean).join(" · ");
  return (
    <Link
      to="/bikes/$slug"
      params={{ slug: bike.slug }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-line transition hover:shadow-lg hover:ring-2 hover:ring-action focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action"
    >
      <BikeMedia src={bike.image} name={bike.name} className="aspect-[4/3] w-full" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        {bike.radar && <PriceStatus classification={bike.radar.classification} />}
        <h3 className="line-clamp-2 text-lg font-bold leading-snug text-ink group-hover:text-action">{bike.name}</h3>
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
        <span className="mt-auto pt-3" aria-hidden="true">
          <span className="inline-flex h-11 w-full items-center justify-center gap-1 rounded-xl bg-ink px-4 text-sm font-bold text-ink-foreground transition group-hover:bg-action">
            Conhecer a bike <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </span>
      </div>
    </Link>
  );
}
