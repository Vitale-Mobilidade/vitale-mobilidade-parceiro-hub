import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { CatalogBike } from "@/lib/editorial-bikes";
import { formatBRL } from "@/lib/price-tracker";

const NOT_INFORMED = "Não informado";

/** Compara atributos publicados sem declarar um vencedor ou usar preço histórico como oferta. */
export function BikeHubComparison({ bike, alternatives }: { bike: CatalogBike; alternatives: CatalogBike[] }) {
  const sorted = [...alternatives].sort((a, b) => {
    const capacityA = a.capacity === bike.capacity ? 0 : 1;
    const capacityB = b.capacity === bike.capacity ? 0 : 1;
    if (capacityA !== capacityB) return capacityA - capacityB;
    const distanceA = bike.sheetPrice !== null && a.sheetPrice !== null ? Math.abs(a.sheetPrice - bike.sheetPrice) : Infinity;
    const distanceB = bike.sheetPrice !== null && b.sheetPrice !== null ? Math.abs(b.sheetPrice - bike.sheetPrice) : Infinity;
    return distanceA - distanceB || a.name.localeCompare(b.name, "pt-BR");
  });
  const [selectedId, setSelectedId] = useState(sorted[0]?.bikeId ?? "");
  const other = sorted.find((candidate) => candidate.bikeId === selectedId) ?? sorted[0];
  if (!other) return null;

  const rows = [
    { label: "Preço da oferta atual", value: (item: CatalogBike) => item.link && item.sheetPrice !== null ? formatBRL(item.sheetPrice) : "Sem oferta atual" },
    { label: "Autonomia declarada", value: (item: CatalogBike) => item.autonomy ?? NOT_INFORMED },
    { label: "Capacidade", value: (item: CatalogBike) => item.capacity ?? NOT_INFORMED },
    { label: "Categoria", value: (item: CatalogBike) => item.category ?? NOT_INFORMED },
  ];

  return (
    <section aria-labelledby="comparar-bike" className="mt-12 scroll-mt-24">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="comparar-bike" className="border-l-4 border-action pl-3 text-2xl font-bold text-ink">Compare com outra bike</h2>
          <p className="mt-2 text-sm text-muted-foreground">Dados publicados lado a lado. Escolha outro modelo para ver as diferenças.</p>
        </div>
        <div className="w-full sm:w-72">
          <label htmlFor="outra-bike" className="mb-1 block text-sm font-semibold text-ink">Outra bike</label>
          <select id="outra-bike" value={other.bikeId} onChange={(event) => setSelectedId(event.target.value)} className="min-h-11 w-full rounded-xl border border-line bg-card px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action">
            {sorted.map((candidate) => <option key={candidate.bikeId} value={candidate.bikeId}>{candidate.name}</option>)}
          </select>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground sm:hidden">Deslize a tabela para ver os dois modelos.</p>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-line bg-card sm:mt-5" role="region" aria-label="Tabela de comparação de bikes" tabIndex={0}>
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <caption className="sr-only">Comparação entre {bike.name} e {other.name}</caption>
          <thead className="bg-surface text-ink">
            <tr><th scope="col" className="w-1/3 p-4">Atributo</th><th scope="col" className="w-1/3 p-4">{bike.name}</th><th scope="col" className="w-1/3 p-4">{other.name}</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => <tr key={row.label}><th scope="row" className="p-4 font-semibold text-ink">{row.label}</th><td className="p-4 text-ink">{row.value(bike)}</td><td className="p-4 text-ink">{row.value(other)}</td></tr>)}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Preços e disponibilidade podem mudar; confirme a oferta na página de cada bike.</p>
      <Link to="/radar/$bikeId" params={{ bikeId: other.bikeId }} className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-action hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action">
        Conhecer {other.name} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
