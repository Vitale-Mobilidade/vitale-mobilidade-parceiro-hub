import { useState } from "react";
import { Bike, CheckCircle2, MapPin, MessageCircle } from "lucide-react";
import { SectionHeading } from "@/components/site/site-ui";
import {
  listingWhatsAppHref,
  listingWhatsAppMessage,
  BATTERIES,
  CONDITIONS,
  type BikeListing,
  type PublicBikeListing,
} from "@/lib/bike-classifieds";
import { formatBRL } from "@/lib/price-tracker";
/** Follows AcompanhamentoBike: equal hero columns, contained image, title/price,
 * factual chips, action, specifications and description. No Radar price metrics. */
export function ListingPreview({
  listing,
  preview = false,
}: {
  listing: BikeListing | PublicBikeListing;
  preview?: boolean;
}) {
  const [selected, setSelected] = useState(0);
  const images = listing.images.filter((i) => i.status === "ready");
  const image = images[selected] ?? images[0];
  const seller = "sellerName" in listing ? listing : null;
  const title = listing.title.trim() || "O título da sua bike";
  const Title = preview ? "h2" : "h1";
  const facts = [
    ["Marca", listing.brand || "A informar"],
    ["Modelo", listing.model || "A informar"],
    ["Ano", listing.modelYear ?? "Não informado"],
    [
      "Quilometragem",
      listing.mileageKm === null
        ? "Não informada"
        : `${listing.mileageKm.toLocaleString("pt-BR")} km`,
    ],
    ["Conservação", CONDITIONS[listing.condition]],
    ["Bateria", BATTERIES[listing.battery]],
    ["Nota fiscal", listing.invoice ? "Sim" : "Não"],
  ];
  return (
    <div className="min-w-0 text-ink">
      {preview && (
        <p className="mb-5 rounded-xl bg-surface p-4 text-sm">
          Prévia do anúncio com os dados que você está preenchendo.
        </p>
      )}
      <header className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0">
          <div className="flex h-[240px] items-center justify-center overflow-hidden rounded-3xl border border-line bg-surface sm:h-[280px]">
            {image?.url ? (
              <img
                src={image.url}
                alt={`${title} — foto ${selected + 1}`}
                width={1200}
                height={900}
                decoding="async"
                className="h-full w-full object-contain p-4"
              />
            ) : (
              <div className="grid place-items-center gap-3 text-muted-foreground">
                <Bike className="h-16 w-16 text-action" aria-hidden="true" />
                <span>Adicione as fotos da sua bike</span>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div
              className="mt-3 flex flex-wrap gap-2"
              role="group"
              aria-label="Fotos da bicicleta"
            >
              {images.map((photo, index) => (
                <button
                  type="button"
                  key={photo.id}
                  aria-label={`Ver foto ${index + 1}`}
                  aria-pressed={photo.id === image?.id}
                  onClick={() => setSelected(index)}
                  className={`h-16 w-16 overflow-hidden rounded-xl border-2 sm:h-20 sm:w-20 ${photo.id === image?.id ? "border-action" : "border-line"}`}
                >
                  <img
                    src={photo.url}
                    alt=""
                    width={80}
                    height={80}
                    className="h-full w-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="inline-flex w-fit items-center rounded-full bg-surface px-3 py-1 text-xs font-bold text-muted-foreground">
            {listing.sellerType === "channel"
              ? "Bike do canal Vitale Mobilidade"
              : "Bike da comunidade"}
          </span>
          <Title className="mt-2 break-words text-3xl font-extrabold leading-tight tracking-tight text-ink md:text-4xl">
            {title}
          </Title>
          <p className="mt-3 text-4xl font-extrabold tracking-tight text-action md:text-5xl">
            {Number.isFinite(listing.priceCents) && listing.priceCents > 0
              ? formatBRL(listing.priceCents / 100)
              : "Preço a informar"}
          </p>
          <p className="mt-3 flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-5 w-5 shrink-0" aria-hidden="true" />
            {listing.city || "Sua cidade"}
            {listing.state ? `, ${listing.state}` : ""}
          </p>
          <ul className="mt-4 flex flex-wrap gap-2 text-sm">
            {[
              CONDITIONS[listing.condition],
              listing.mileageKm !== null
                ? `${listing.mileageKm.toLocaleString("pt-BR")} km`
                : null,
              listing.modelYear,
            ]
              .filter((v) => v !== null)
              .map((v) => (
                <li key={String(v)} className="rounded-lg bg-surface px-3 py-2">
                  {v}
                </li>
              ))}
          </ul>
          {seller ? (
            <div className="mt-5">
              <a
                href={listingWhatsAppHref(seller.whatsapp, listing)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-action px-4 font-bold text-primary-foreground hover:opacity-90"
              >
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                Conversar pelo WhatsApp
              </a>
              <div className="mt-4 flex items-center gap-3">
                {seller.avatarUrl && (
                  <img
                    src={seller.avatarUrl}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="font-semibold">{seller.sellerName}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-action">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    E-mail e celular validados
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Confira a bike e os documentos diretamente com o anunciante.
              </p>
            </div>
          ) : (
            <span className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-action px-4 font-bold text-primary-foreground">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              Conversar pelo WhatsApp
            </span>
          )}
          {preview && (
            <div className="mt-4 rounded-xl bg-surface p-4 text-sm">
              <p className="font-semibold">
                Mensagem que o comprador abre no WhatsApp
              </p>
              <p className="mt-2 break-words text-muted-foreground">
                {listingWhatsAppMessage(listing)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                O contato usa seu número validado. Esta prévia não envia
                mensagens.
              </p>
            </div>
          )}
        </div>
      </header>
      <section className="mt-10" aria-labelledby="listing-specifications">
        <SectionHeading
          id="listing-specifications"
          title="Informações da bike"
        />
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {facts.map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-line bg-surface p-4"
            >
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="mt-1 break-words font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="mt-10" aria-labelledby="listing-description">
        <SectionHeading id="listing-description" title={`Conheça a ${title}`} />
        <p className="mt-5 whitespace-pre-wrap break-words text-base leading-relaxed text-muted-foreground">
          {listing.description || "A descrição da sua bike aparecerá aqui."}
        </p>
        {listing.maintenance && (
          <>
            <h3 className="mt-7 text-xl font-bold text-ink">
              Manutenção e pontos de atenção
            </h3>
            <p className="mt-3 whitespace-pre-wrap break-words text-base leading-relaxed text-muted-foreground">
              {listing.maintenance}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
