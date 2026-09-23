import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { BikeMedia } from "@/components/site/site-ui";
import type { CatalogBike } from "@/lib/editorial-bikes";

export function BikeCatalogCard({ bike }: { bike: CatalogBike }) {
  return (
    <Link
      to="/bikes/$slug"
      params={{ slug: bike.slug }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-action"
    >
      <BikeMedia src={bike.image} name={bike.name} className="aspect-[4/3] w-full" />
      <div className="flex flex-1 flex-col p-4">
        <h2 className="line-clamp-2 font-bold text-ink">{bike.name}</h2>
        {(bike.autonomy || bike.capacity) && (
          <p className="mt-1 text-sm text-muted-foreground">
            {[bike.autonomy, bike.capacity].filter(Boolean).join(" · ")}
          </p>
        )}
        <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold text-ink group-hover:text-action">
          Ver modelo <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
