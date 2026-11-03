import { ArrowRight, Bike, MapPin } from "lucide-react";
import { formatBRL } from "@/lib/price-tracker";
import { CONDITIONS, type PublicBikeListing } from "@/lib/bike-classifieds";
export function ClassifiedCard({ listing }: { listing: PublicBikeListing }) {
  const cover = listing.images[0];
  return (
    <article className="group overflow-hidden rounded-2xl border border-line bg-white transition hover:border-action hover:shadow-md">
      <a
        href={`/venda-sua-bike/${listing.id}`}
        className="block focus-visible:outline-action"
      >
        {cover?.url ? (
          <img
            src={cover.url}
            alt={listing.title}
            width={640}
            height={480}
            loading="lazy"
            decoding="async"
            className="aspect-[4/3] w-full object-cover"
          />
        ) : (
          <div className="grid aspect-[4/3] place-items-center bg-surface">
            <Bike className="h-16 w-16 text-action" aria-hidden="true" />
            <span className="sr-only">Foto indisponível</span>
          </div>
        )}
        <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-action">
            {CONDITIONS[listing.condition]} ·{" "}
            {listing.mileageKm?.toLocaleString("pt-BR")} km
          </p>
          <h3 className="mt-2 text-xl font-bold text-ink group-hover:text-action">
            {listing.title}
          </h3>
          <p className="mt-3 text-2xl font-bold text-ink">
            {formatBRL(listing.priceCents / 100)}
          </p>
          <p className="mt-3 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {listing.city}, {listing.state}
          </p>
        </div>
      </a>
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
          : "Os primeiros anúncios da comunidade chegam em breve. A área está em teste com uma conta convidada."}
      </p>
      <a
        href={unavailable ? "/venda-sua-bike" : "/conta/anuncios"}
        className="mt-5 inline-flex min-h-11 items-center gap-2 font-bold text-action underline"
      >
        {unavailable ? "Tentar novamente" : "Acessar meus anúncios"}
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
