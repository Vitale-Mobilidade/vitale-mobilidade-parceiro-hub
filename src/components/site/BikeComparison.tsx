import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ExternalLink, LineChart, X } from "lucide-react";
import { BikeMedia } from "@/components/site/site-ui";
import { VideoCards } from "@/components/site/VideoCards";
import { formatBRL } from "@/lib/price-tracker";
import { trackAffiliateClick } from "@/lib/affiliate-analytics";
import { trackCompare } from "@/lib/bike-compare";
import { safeVideos, type VideoCard } from "@/lib/videos.functions";
import type { DiscoveryBike } from "@/lib/bikes-discovery.functions";

/** Barra contextual discreta: 1 bike → pede a segunda; 2 → botão Comparar bikes. */
export function CompareBar({ selected, onRemove, onOpen }: { selected: DiscoveryBike[]; onRemove: (id: string) => void; onOpen: () => void }) {
  if (!selected.length) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 shadow-2xl backdrop-blur" role="region" aria-label="Comparação de bikes">
      <div className="responsive-container flex flex-wrap items-center gap-2 py-3 pr-20 lg:pr-4">
        <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
          {selected.map((b) => (
            <li key={b.bikeId} className="inline-flex max-w-full items-center gap-1 rounded-full bg-surface py-1 pl-3 pr-1 text-sm font-semibold text-ink ring-1 ring-line">
              <span className="truncate">{b.name}</span>
              <button type="button" onClick={() => onRemove(b.bikeId)} aria-label={`Remover ${b.name} da comparação`} className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        {selected.length === 1 ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">1 bike selecionada. Escolha mais uma para comparar.</p>
        ) : (
          <button type="button" onClick={onOpen} className="inline-flex h-11 items-center rounded-xl bg-action px-5 text-sm font-bold text-primary-foreground hover:opacity-90">
            Comparar bikes
          </button>
        )}
      </div>
    </div>
  );
}

const NA = "Não informado";

/** Comparação de exatamente 2 bikes, só com dados existentes. Nunca declara vencedora. */
export function BikeComparison({ pair, onClose }: { pair: [DiscoveryBike, DiscoveryBike]; onClose: () => void }) {
  const ids = pair.map((b) => b.bikeId);
  const [videos, setVideos] = useState<VideoCard[][]>([[], []]);
  useEffect(() => {
    let on = true;
    Promise.all(ids.map((bikeId) => safeVideos({ bikeId, limit: 20 }))).then((l) => on && setVideos(l));
    return () => { on = false; };
  }, [ids.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const shared = videos[0].filter((v) => videos[1].some((w) => w.videoId === v.videoId));
  const own = videos.map((list) => list.filter((v) => !shared.some((s) => s.videoId === v.videoId)).slice(0, 2));

  // Destaques objetivos apenas quando os dados existem e diferem.
  const highlight = (vals: (number | null)[], mode: "min" | "max") => {
    if (vals.some((v) => v === null) || vals[0] === vals[1]) return -1;
    return mode === "min" ? (vals[0]! < vals[1]! ? 0 : 1) : (vals[0]! > vals[1]! ? 0 : 1);
  };
  const priceHi = highlight(pair.map((b) => (b.link ? b.sheetPrice : null)), "min");
  const kmHi = highlight(pair.map((b) => b.autonomyKm), "max");
  const capHi = highlight(pair.map((b) => b.capacityPeople), "max");
  const tag = (t: string) => <span className="ml-2 inline-block rounded-full bg-mint/30 px-2 py-0.5 text-[11px] font-bold text-ink">{t}</span>;

  const rows: { label: string; value: (b: DiscoveryBike, i: number) => React.ReactNode }[] = [
    { label: "Preço atual", value: (b, i) => (b.sheetPrice !== null && b.link ? <><strong>{formatBRL(b.sheetPrice)}</strong>{i === priceHi && tag("Menor preço")}</> : "Sem oferta no momento") },
    { label: "Preço típico (Radar)", value: (b) => (b.radar?.typicalPrice ? formatBRL(b.radar.typicalPrice) : b.radar ? "Histórico em formação" : "Não monitorada") },
    { label: "Menor preço registrado", value: (b) => (b.radar?.allTimeMin ? formatBRL(b.radar.allTimeMin) : NA) },
    { label: "Autonomia declarada", value: (b, i) => (b.autonomy ? <>{b.autonomy}{i === kmHi && tag("Maior autonomia")}</> : NA) },
    { label: "Capacidade", value: (b, i) => (b.capacity ? <>{b.capacity}{i === capHi && tag("Maior capacidade")}</> : NA) },
    { label: "Categoria / uso", value: (b) => b.category ?? NA },
  ];

  return (
    <section id="comparacao" aria-labelledby="comparacao-h" className="scroll-mt-24 rounded-3xl bg-card p-4 shadow-xl ring-1 ring-line sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-action">Comparação</p>
          <h2 id="comparacao-h" className="section-h2 text-ink">{pair[0].name} × {pair[1].name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Diferenças lado a lado. A escolha é sua.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar comparação" className="grid h-11 w-11 shrink-0 place-items-center rounded-full ring-1 ring-line hover:bg-muted">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {pair.map((b) => (
          <div key={b.bikeId} className="min-w-0">
            <BikeMedia src={b.image} name={b.name} className="aspect-[4/3] w-full rounded-2xl" />
            <p className="mt-2 line-clamp-2 font-bold text-ink">{b.name}</p>
            <p className="text-xs text-muted-foreground">{b.link && b.sheetPrice !== null ? "Com oferta atual" : "Sem oferta no momento"}{b.radar ? " · Monitorada no Radar" : ""}</p>
          </div>
        ))}
      </div>

      {/* Linhas de atributo: legível no celular, sem tabela horizontal. */}
      <dl className="mt-5 divide-y divide-line rounded-2xl ring-1 ring-line">
        {rows.map((r) => (
          <div key={r.label} className="p-3">
            <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{r.label}</dt>
            <dd className="mt-1 grid grid-cols-2 gap-3 text-sm text-ink">
              {pair.map((b, i) => <span key={b.bikeId} className="min-w-0">{r.value(b, i)}</span>)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">Preço e disponibilidade vêm da oferta atual registrada pela Vitale e podem mudar.</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {pair.map((b) => (
          <div key={b.bikeId} className="flex flex-col gap-2">
            <Link to="/bikes/$slug" params={{ slug: b.slug }} onClick={() => trackCompare("comparison_bike_clicked", { bike_id: b.bikeId, target: "detail" })}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-ink px-3 text-center text-sm font-bold text-ink-foreground hover:opacity-90">Conhecer a bike</Link>
            {b.radar && (
              <Link to="/radar/$bikeId" params={{ bikeId: b.bikeId }} onClick={() => trackCompare("comparison_bike_clicked", { bike_id: b.bikeId, target: "radar" })}
                className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl px-3 text-center text-sm font-bold text-action ring-1 ring-line hover:ring-action">
                <LineChart className="h-4 w-4 shrink-0" aria-hidden="true" /> Ver preço e histórico
              </Link>
            )}
            {b.link && b.sheetPrice !== null && (
              <a href={b.link} target="_blank" rel="noopener noreferrer sponsored"
                onClick={() => { trackAffiliateClick({ bike_id: b.bikeId, position: "bikes_comparison" }); trackCompare("comparison_bike_clicked", { bike_id: b.bikeId, target: "mercado_livre" }); }}
                className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-action px-3 text-center text-sm font-bold text-primary-foreground hover:opacity-90">
                Ver oferta no Mercado Livre <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
              </a>
            )}
          </div>
        ))}
      </div>

      {shared.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-black text-ink">Conteúdos que comparam esses modelos</h3>
          <VideoCards videos={shared.slice(0, 4)} className="mt-4" />
        </div>
      )}
      {own.some((l) => l.length) && (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {pair.map((b, i) => own[i].length > 0 && (
            <div key={b.bikeId}>
              <h3 className="text-lg font-black text-ink">Testes da {b.name}</h3>
              <VideoCards videos={own[i]} className="mt-3" />
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-3 rounded-2xl bg-mint/20 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-lg font-black text-ink">Ainda em dúvida entre as duas?</p>
          <p className="mt-1 text-sm text-ink/75">Faça o Quiz da Vitale e veja quais modelos combinam com seu perfil.</p>
        </div>
        <Link to="/escolherbike" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-ink px-5 font-bold text-ink-foreground hover:opacity-90">Fazer o Quiz</Link>
      </div>
    </section>
  );
}
