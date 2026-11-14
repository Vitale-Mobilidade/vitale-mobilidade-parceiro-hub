import type { MouseEvent } from "react";
import type { CampaignBike } from "@/lib/offers-catalog";
import { OFFERS_GROUP_URL } from "@/lib/offers-group";
import { handleOffersGroupCta } from "@/lib/offers-group-landing";

type Surface = "hero" | "grid";

export function CampaignOfferCard({
  bike,
  position,
  price,
}: {
  bike: CampaignBike;
  position: Surface;
  price: string;
}) {
  const offer = bike.offer;
  const accessibleName = `Entrar no Grupo de Ofertas pela ${bike.name}`;
  function openInvite(event: MouseEvent<HTMLAnchorElement>) {
    handleOffersGroupCta(
      event,
      position === "hero" ? "carousel" : "grid",
      bike.id,
    );
  }

  const photo = bike.image ? (
    <img
      src={bike.image}
      alt=""
      width={480}
      height={320}
      loading={position === "hero" ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      className="h-full w-full object-contain p-3"
    />
  ) : (
    <span className="p-3 text-sm text-ink/75">Foto indisponível</span>
  );
  const tile =
    "relative flex h-44 w-full items-center justify-center rounded-xl bg-white outline-action focus-visible:outline-2 focus-visible:-outline-offset-4 sm:h-56";
  return (
    <article className="h-full rounded-2xl bg-logo-surface p-3 text-ink">
      <a
        href={OFFERS_GROUP_URL}
        rel="noreferrer"
        aria-label={accessibleName}
        draggable={false}
        onClick={openInvite}
        onAuxClick={openInvite}
        className={tile}
      >
        {photo}
        {position === "hero" && (offer?.savingsPct ?? 0) > 0 && (
          <span className="absolute top-2 left-2 rounded-lg bg-mint px-2.5 py-1.5 text-xs font-bold">
            {new Intl.NumberFormat("pt-BR", {
              maximumFractionDigits: 1,
            }).format(offer?.savingsPct!)}
            % abaixo do preço típico
          </span>
        )}
      </a>
      <div className="p-2">
        {position === "hero" ? (
          <h2 className="font-bold">{bike.name}</h2>
        ) : (
          <h3 className="font-bold">{bike.name}</h3>
        )}
        {offer ? (
          <p className="mt-1 text-xl font-bold">{price}</p>
        ) : (
          <p className="mt-2 text-sm text-ink/80">Oferta indisponível</p>
        )}
        <a
          href={OFFERS_GROUP_URL}
          rel="noreferrer"
          aria-label={accessibleName}
          onClick={openInvite}
          onAuxClick={openInvite}
          className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg bg-ink px-4 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Entrar no Grupo de Ofertas
        </a>
      </div>
    </article>
  );
}
