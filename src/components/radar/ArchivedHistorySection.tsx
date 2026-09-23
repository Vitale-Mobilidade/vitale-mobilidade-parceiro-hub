import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { BikeMedia, SectionHeading } from "@/components/site/site-ui";
import { formatBRL, formatDateBR } from "@/lib/price-tracker";
import type { RadarBase } from "@/lib/radar-base";

export interface ArchivedBike {
  id: string;
  name: string;
  image: string | null;
  lastObservedAt: string | null;
  lastObservedPrice: number | null;
  observations: number;
}

/** Aceita apenas itens sem oferta atual e com observação real registrada. */
export function parseArchived(raw: unknown[]): ArchivedBike[] {
  return raw
    .map((item) => {
      const x = item as Record<string, unknown>;
      const id = typeof x.id === "string" ? x.id : "";
      const name = typeof x.name === "string" ? x.name.trim() : "";
      const observations = typeof x.observations === "number" ? x.observations : 0;
      // Guarda local: quem tem oferta atual válida nunca é tratado como arquivado.
      const hasOffer =
        x.hasCurrentOffer === true &&
        typeof x.currentPrice === "number" &&
        x.currentPrice > 0 &&
        typeof x.link === "string" &&
        x.link !== "";
      if (!id || !name || observations <= 0 || hasOffer) return null;
      return {
        id,
        name,
        image: typeof x.image === "string" && /^https:\/\/[^\s"<>]+$/.test(x.image) ? x.image : null,
        lastObservedAt: typeof x.lastObservedAt === "string" ? x.lastObservedAt : null,
        lastObservedPrice:
          typeof x.lastObservedPrice === "number" && Number.isFinite(x.lastObservedPrice) && x.lastObservedPrice > 0
            ? x.lastObservedPrice
            : null,
        observations,
      } satisfies ArchivedBike;
    })
    .filter((b): b is ArchivedBike => b !== null)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/**
 * Histórico arquivado: bikes sem oferta atual no Mercado Livre.
 * Sem preço atual, sem farol, sem CTA de compra e sem alerta de preço —
 * apenas o que já foi registrado, com data.
 */
export function ArchivedHistorySection({ bikes, base }: { bikes: ArchivedBike[]; base: RadarBase }) {
  if (bikes.length === 0) return null;
  return (
    <section aria-labelledby="arquivado" className="mt-12">
      <SectionHeading
        id="arquivado"
        title={`Histórico arquivado (${bikes.length})`}
        sub="Modelos sem oferta ativa no momento. Mantemos o histórico já registrado; não há preço atual nem link de compra."
      />
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {bikes.map((b) => (
          <li key={b.id}>
            <Link
              to={`${base}/$bikeId` as const}
              params={{ bikeId: b.id }}
              className="flex h-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:border-action/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
            >
              <BikeMedia src={b.image} name={b.name} className="h-14 w-16 shrink-0 rounded-lg" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink">{b.name}</span>
                <span className="block text-sm text-muted-foreground">Link indisponível no momento</span>
                {b.lastObservedAt && (
                  <span className="block text-sm text-muted-foreground">
                    Último preço registrado em {formatDateBR(b.lastObservedAt)}
                    {b.lastObservedPrice !== null && `: ${formatBRL(b.lastObservedPrice)}`}
                  </span>
                )}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
