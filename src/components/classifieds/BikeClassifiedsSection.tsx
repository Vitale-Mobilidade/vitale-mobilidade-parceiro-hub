import { ArrowRight, Bike, MapPin } from "lucide-react";
import { formatBRL } from "@/lib/price-tracker";
import { memberLoginHref } from "@/lib/member-community";
import {
  CONDITIONS,
  type BikeListing,
  type PublicBikeListing,
} from "@/lib/bike-classifieds";
/** Same image frame, typography, fact chips and action placement as RadarBikeCard. */
export function ClassifiedCard({
  listing,
  preview = false,
}: {
  listing: BikeListing | PublicBikeListing;
  preview?: boolean;
}) {
  const cover = listing.images.find((i) => i.status === "ready");
  const CardLink = preview ? "div" : "a";
  return (
    <article className="h-full">
      <CardLink
        href={preview ? undefined : `/venda-sua-bike/${listing.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-card text-card-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
      >
        <div className="flex h-52 items-center justify-center overflow-hidden bg-surface">
          {cover?.url ? (
            <img
              src={cover.url}
              alt={listing.title || "Sua bike"}
              width={640}
              height={480}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="grid place-items-center gap-2 text-muted-foreground">
              <Bike className="h-12 w-12" aria-hidden="true" />
              <span className="text-sm">
                {preview ? "Adicione a foto de capa" : "Foto indisponível"}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-5">
          {listing.sellerType === "channel" && (
            <span className="mb-3 w-fit rounded-full bg-surface px-3 py-1 text-xs font-bold text-action">
              Bike do canal Vitale Mobilidade
            </span>
          )}
          <h3 className="line-clamp-2 text-base font-semibold leading-tight">
            {listing.title.trim() || "O título da sua bike"}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {[listing.brand, listing.model].filter(Boolean).join(" · ") ||
              "Marca e modelo"}
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5 text-xs text-ink">
            {[
              CONDITIONS[listing.condition],
              listing.mileageKm !== null
                ? `${listing.mileageKm.toLocaleString("pt-BR")} km`
                : null,
              listing.modelYear,
            ]
              .filter((v) => v !== null)
              .map((v) => (
                <li key={String(v)} className="rounded-md bg-surface px-2 py-1">
                  {v}
                </li>
              ))}
          </ul>
          <p className="mt-3 text-3xl font-bold tracking-tight text-primary">
            {listing.priceCents > 0
              ? formatBRL(listing.priceCents / 100)
              : "Preço a informar"}
          </p>
          <p className="mt-3 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {listing.city || "Sua cidade"}
            {listing.state ? `, ${listing.state}` : ""}
          </p>
          <div className="mt-auto pt-4">
            <span className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-action px-4 py-2 text-sm font-medium text-primary-foreground group-hover:opacity-90">
              <Bike className="h-4 w-4" aria-hidden="true" />
              Ver bike e anúncio
            </span>
          </div>
        </div>
      </CardLink>
    </article>
  );
}

export function ClassifiedsEmpty({
  unavailable = false,
}: {
  unavailable?: boolean;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-action/30 bg-surface p-7 sm:p-10">
      <Bike className="h-10 w-10 text-action" aria-hidden="true" />
      <h3 className="mt-4 text-xl font-bold text-ink">
        {unavailable
          ? "Não foi possível carregar os anúncios"
          : "As próximas histórias começam aqui"}
      </h3>
      <p className="mt-2 max-w-xl text-muted-foreground">
        {unavailable
          ? "Tente recarregar a página em alguns instantes."
          : "Ainda não há bikes anunciadas. A sua pode encontrar um novo caminho por aqui."}
      </p>
      <a
        href={
          unavailable ? "/venda-sua-bike" : memberLoginHref("/conta/anuncios")
        }
        className="mt-5 inline-flex min-h-11 items-center gap-2 font-bold text-action underline"
      >
        {unavailable ? "Tentar novamente" : "Quer vender sua bike aqui?"}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </a>
    </div>
  );
}
export function BikeClassifiedsSection({
  items,
  unavailable = false,
}: {
  items: PublicBikeListing[];
  unavailable?: boolean;
}) {
  return (
    <section aria-labelledby="classificados-home">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-action">
            De ciclista para ciclista
          </p>
          <h2
            id="classificados-home"
            className="mt-2 text-2xl font-bold text-ink sm:text-3xl"
          >
            Venda sua bike aqui
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Uma nova bike para você. Um novo caminho para a sua.
          </p>
        </div>
        <a
          href="/venda-sua-bike"
          className="inline-flex min-h-11 items-center gap-2 font-semibold text-action underline"
        >
          Ver todas as bikes
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
      {items.length ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 3).map((l) => (
            <ClassifiedCard key={l.id} listing={l} />
          ))}
        </div>
      ) : (
        <ClassifiedsEmpty unavailable={unavailable} />
      )}
    </section>
  );
}
