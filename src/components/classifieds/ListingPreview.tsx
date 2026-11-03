import { useState } from "react";
import { Bike, CheckCircle2, MapPin, MessageCircle } from "lucide-react";
import {
  BATTERIES,
  CONDITIONS,
  type BikeListing,
  type PublicBikeListing,
} from "@/lib/bike-classifieds";
import { formatBRL } from "@/lib/price-tracker";
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
  const facts = [
    ["Marca", listing.brand],
    ["Modelo", listing.model],
    ["Ano", listing.modelYear ?? "Não informado"],
    [
      "Quilometragem",
      listing.mileageKm === null
        ? "Não informada"
        : `${listing.mileageKm.toLocaleString("pt-BR")} km`,
    ],
    ["Estado de conservação", CONDITIONS[listing.condition]],
    ["Bateria", BATTERIES[listing.battery]],
    ["Nota fiscal", listing.invoice ? "Sim" : "Não"],
  ];
  return (
    <div>
      {preview && (
        <p className="mb-5 rounded-lg bg-amber-50 p-4 text-amber-950">
          Prévia privada. Este anúncio ainda não está disponível na vitrine.
        </p>
      )}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <div>
          {image?.url ? (
            <img
              src={image.url}
              alt={`${listing.title} — foto ${selected + 1}`}
              width={1200}
              height={900}
              className="aspect-[4/3] w-full rounded-2xl bg-surface object-contain"
            />
          ) : (
            <div className="grid aspect-[4/3] place-items-center rounded-2xl bg-surface">
              <Bike className="h-20 w-20 text-action" aria-hidden="true" />
              <span>Adicione as fotos da sua bike</span>
            </div>
          )}
          {images.length > 1 && (
            <div
              className="mt-3 flex flex-wrap gap-3"
              role="group"
              aria-label="Fotos da bicicleta"
            >
              {images.map((photo, index) => (
                <button
                  key={photo.id}
                  aria-label={`Ver foto ${index + 1}`}
                  aria-pressed={index === selected}
                  onClick={() => setSelected(index)}
                  className={`h-20 w-20 overflow-hidden rounded-lg border-2 ${selected === index ? "border-action" : "border-line"}`}
                >
                  <img
                    src={photo.url}
                    alt=""
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-line p-6">
          <p className="text-sm font-semibold text-action">
            Bike da comunidade
          </p>
          <h1 className="mt-3 text-3xl font-bold text-ink">{listing.title}</h1>
          <p className="mt-4 text-4xl font-bold text-ink">
            {formatBRL(listing.priceCents / 100)}
          </p>
          <p className="mt-4 flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-5 w-5" aria-hidden="true" />
            {listing.city || "Sua cidade"}
            {listing.state ? `, ${listing.state}` : ""}
          </p>
          {seller && (
            <div className="mt-6 border-t border-line pt-5">
              <div className="flex items-center gap-3">
                {seller.avatarUrl && (
                  <img
                    src={seller.avatarUrl}
                    alt=""
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="font-bold">{seller.sellerName}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-action">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    E-mail e celular validados
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                A validação confirma os contatos do anunciante. Confira a bike e
                os documentos com ele.
              </p>
              <a
                href={`https://wa.me/${seller.whatsapp}?text=${encodeURIComponent(`Olá! Vi seu anúncio ${listing.title} na Vitale Mobilidade.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-action px-4 font-bold text-white"
              >
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                Conversar com o vendedor
              </a>
            </div>
          )}
        </div>
      </div>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <h2 className="text-2xl font-bold text-ink">Sobre esta bike</h2>
          <p className="mt-4 whitespace-pre-wrap break-words leading-relaxed">
            {listing.description || "A descrição aparecerá aqui."}
          </p>
          {listing.maintenance && (
            <>
              <h2 className="mt-8 text-xl font-bold text-ink">
                Manutenção e pontos de atenção
              </h2>
              <p className="mt-3 whitespace-pre-wrap break-words leading-relaxed">
                {listing.maintenance}
              </p>
            </>
          )}
        </section>
        <dl className="rounded-xl bg-surface p-5">
          {facts.map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between gap-4 border-b border-line py-3 last:border-0"
            >
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
