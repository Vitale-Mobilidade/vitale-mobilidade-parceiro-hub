import type { MouseEvent } from "react";
import type { CampaignBike } from "@/lib/offers-catalog";
import { OFFERS_GROUP_URL } from "@/lib/offers-group";
import {
  handleOffersGroupCta,
  openGroupInvite,
  trackGroupInvite,
  trackOffersGroupOffer,
} from "@/lib/offers-group-landing";

type Surface = "hero" | "grid";

/** Keep the direct anchor as fallback. A new context is created synchronously within the gesture. */
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
  const accessibleName = `Entrar no Grupo de Ofertas e abrir a oferta da ${bike.name} em outra aba`;

  function openOffer(event: MouseEvent<HTMLAnchorElement>) {
    if (
      !offer ||
      event.defaultPrevented ||
      !event.nativeEvent.isTrusted ||
      event.button !== 0
    )
      return;
    trackOffersGroupOffer(bike.id, position);
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    let tab: Window | null = null;
    try {
      // A noopener window.open() cannot distinguish a blocked popup from a success.
      // Open only a blank document, detach the opener, then follow a noreferrer anchor.
      tab = window.open("about:blank", "_blank");
      if (!tab || tab.closed) return;
      tab.opener = null;
      const product = tab.document.createElement("a");
      product.href = offer.href;
      product.rel = "noopener noreferrer";
      tab.document.body.append(product);
      product.click();
    } catch {
      tab?.close();
      return;
    }
    event.preventDefault();
    trackGroupInvite(position === "hero" ? "carousel" : position, () => {
      openGroupInvite(OFFERS_GROUP_URL);
    });
  }

  function recordMiddleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button === 1 &&
      event.nativeEvent.isTrusted &&
      !event.defaultPrevented
    ) {
      trackOffersGroupOffer(bike.id, position);
    }
  }

  const photo = bike.image ? (
    <img
      src={bike.image}
      alt={offer ? "" : bike.name}
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
      {offer ? (
        <a
          href={offer.href}
          rel="noopener noreferrer"
          aria-label={accessibleName}
          draggable={false}
          onClick={openOffer}
          onAuxClick={recordMiddleClick}
          className={tile}
        >
          {photo}
          {position === "hero" && (offer.savingsPct ?? 0) > 0 && (
            <span className="absolute top-2 left-2 rounded-lg bg-mint px-2.5 py-1.5 text-xs font-bold">
              {new Intl.NumberFormat("pt-BR", {
                maximumFractionDigits: 1,
              }).format(offer.savingsPct!)}
              % abaixo do preço típico
            </span>
          )}
        </a>
      ) : (
        <div className={tile}>{photo}</div>
      )}
      <div className="p-2">
        {position === "hero" ? (
          <h2 className="font-bold">{bike.name}</h2>
        ) : (
          <h3 className="font-bold">{bike.name}</h3>
        )}
        {offer ? (
          <>
            <p className="mt-1 text-xl font-bold">{price}</p>
            <a
              href={offer.href}
              rel="noopener noreferrer"
              aria-label={accessibleName}
              onClick={openOffer}
              onAuxClick={recordMiddleClick}
              className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg bg-ink px-4 font-bold text-white outline-ink focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Entrar no Grupo de Ofertas
            </a>
            {position === "hero" && (
              <p className="mt-2 text-xs text-ink/80">
                A oferta abre em outra aba. Nesta, você segue para o convite.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink/80">Oferta indisponível</p>
            <a
              href={OFFERS_GROUP_URL}
              rel="noreferrer"
              aria-label={`Entrar no Grupo de Ofertas pela ${bike.name}`}
              onClick={(event) => handleOffersGroupCta(event, "grid")}
              onAuxClick={(event) => handleOffersGroupCta(event, "grid")}
              className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg bg-ink px-4 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Entrar no Grupo de Ofertas
            </a>
          </>
        )}
      </div>
    </article>
  );
}
