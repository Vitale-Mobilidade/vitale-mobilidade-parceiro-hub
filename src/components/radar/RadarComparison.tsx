import { GitCompareArrows } from "lucide-react";
import { BikeComparison } from "@/components/site/BikeComparison";
import { COMPARE_MAX, trackCompare } from "@/lib/bike-compare";
import type { DiscoveryBike } from "@/lib/bikes-discovery.functions";

type Props = {
  bikes: DiscoveryBike[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
};

/** Comparação é uma função do Radar e usa bikeId estável no estado da URL. */
export function RadarComparison({
  bikes,
  selectedIds,
  onSelectionChange,
}: Props) {
  const selected = selectedIds
    .map((id) => bikes.find((bike) => bike.bikeId === id))
    .filter((bike): bike is DiscoveryBike => Boolean(bike));

  const changeSlot = (slot: number, bikeId: string) => {
    const next = [...selectedIds];
    const previous = next[slot];
    if (!bikeId) next.splice(slot, 1);
    else next[slot] = bikeId;
    const normalized = [...new Set(next.filter(Boolean))].slice(0, COMPARE_MAX);
    if (previous && previous !== bikeId)
      trackCompare("bike_compare_removed", { bike_id: previous });
    if (bikeId && previous !== bikeId)
      trackCompare("bike_compare_added", { bike_id: bikeId });
    onSelectionChange(normalized);
  };

  if (!bikes.length) return null;

  return (
    <section
      id="comparar"
      aria-labelledby="comparar-radar"
      className="responsive-container scroll-mt-24 pt-10"
    >
      <div className="rounded-3xl bg-surface p-5 ring-1 ring-line sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-mint/30 text-action">
            <GitCompareArrows className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-action">
              Comparador do Radar
            </p>
            <h2
              id="comparar-radar"
              className="text-2xl font-black tracking-tight text-ink"
            >
              Compare dois modelos lado a lado
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha até duas bikes. A comparação fica salva na URL para você
              retomar ou compartilhar.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[0, 1].map((slot) => (
            <div key={slot}>
              <label
                htmlFor={`compare-bike-${slot}`}
                className="mb-1.5 block text-sm font-bold text-ink"
              >
                {slot === 0 ? "Primeira bike" : "Segunda bike"}
              </label>
              <select
                id={`compare-bike-${slot}`}
                value={selectedIds[slot] ?? ""}
                onChange={(event) => changeSlot(slot, event.target.value)}
                className="h-12 w-full rounded-xl border border-line bg-background px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
              >
                <option value="">Selecione um modelo</option>
                {bikes.map((bike) => (
                  <option
                    key={bike.bikeId}
                    value={bike.bikeId}
                    disabled={selectedIds.some(
                      (id, index) => index !== slot && id === bike.bikeId,
                    )}
                  >
                    {bike.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {selected.length === 1 && (
          <p
            className="mt-4 text-sm font-medium text-muted-foreground"
            aria-live="polite"
          >
            Agora escolha a segunda bike para abrir a comparação.
          </p>
        )}
      </div>

      {selected.length === COMPARE_MAX && (
        <div className="mt-6">
          <BikeComparison
            pair={[selected[0], selected[1]]}
            onClose={() => onSelectionChange([])}
          />
        </div>
      )}
    </section>
  );
}
