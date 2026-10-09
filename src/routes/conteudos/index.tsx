import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, ArrowRight, BookOpen, LineChart, Wrench } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site/site-ui";
import { QuizBanner } from "@/components/site/DecisionBanners";
import { getPublishedArticles } from "@/lib/editorial.functions";
import { getBikeCatalog } from "@/lib/editorial-bikes.functions";
import { formatDateBR } from "@/lib/price-tracker";
import { pageHead } from "@/lib/seo";
import { articleMatchesBike, articleMatchesSearch } from "@/lib/editorial-discovery";
import { editorialImageProps } from "@/lib/editorial-images";
import {
  editorialHeaders,
  EditorialUnavailable,
} from "@/lib/editorial-availability";
import { EDITORIAL_FORMATS, editorialFormat } from "@/lib/editorial-taxonomy";

export const Route = createFileRoute("/conteudos/")({
  loader: async () => {
    const [items, catalog] = await Promise.all([
      getPublishedArticles(),
      getBikeCatalog(),
    ]);
    if (!items)
      return {
        ok: false as const,
        items: [],
        bikeNames: {} as Record<string, string>,
      };
    return {
      ok: true as const,
      items: [...items].sort((a, b) =>
        (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
      ),
      bikeNames: Object.fromEntries(
        (catalog.ok ? catalog.bikes : []).map((bike) => [
          bike.bikeId,
          bike.name,
        ]),
      ),
    };
  },
  headers: editorialHeaders,
  head: ({ loaderData }) =>
    pageHead({
      path: "/conteudos",
      title: "Conteúdos e testes de bikes elétricas | Vitale Mobilidade",
      robots: loaderData?.ok === false ? "noindex, follow" : undefined,
      description:
        "Testes reais, guias e comparativos da Vitale para ajudar você a escolher sua bike elétrica.",
      image: {
        url: "https://vitalemobilidade.com/og/vitale-conteudos-20260930-1200x630.jpg",
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: "Conteúdos e testes de bicicletas elétricas da Vitale",
      },
    }),
  component: ContentIndex,
});

function ContentIndex() {
  const { ok, items, bikeNames } = Route.useLoaderData();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const [bikeId, setBikeId] = useState("");
  const availableBikes = useMemo(() => {
    const ids = new Set(items.flatMap((item) => [item.primaryBikeId, ...item.relatedBikeIds]).filter(Boolean));
    return [...ids].filter((id): id is string => typeof id === "string" && Boolean(bikeNames[id]))
      .map((id) => ({ id, name: bikeNames[id] }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [items, bikeNames]);
  const topics = useMemo(
    () =>
      EDITORIAL_FORMATS.filter((t) =>
        items.some(
          (item) => editorialFormat(item.contentType).value === t.value,
        ),
      ),
    [items],
  );
  const shown = useMemo(
    () =>
      items.filter((item) => {
        return (
          articleMatchesSearch(item, query, bikeNames) &&
          articleMatchesBike(item, bikeId) &&
          (!topic || editorialFormat(item.contentType).label === topic)
        );
      }),
    [items, bikeNames, query, topic, bikeId],
  );
  if (!ok) return <EditorialUnavailable />;
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="relative isolate overflow-hidden bg-ink text-ink-foreground">
          <picture>
            <source
              media="(max-width: 767px)"
              type="image/avif"
              srcSet="/vitale-hero-radar-2026-mobile-20260929.avif"
              width={600}
              height={909}
            />
            <source
              media="(max-width: 767px)"
              srcSet="/vitale-hero-radar-2026-mobile.webp"
              width={600}
              height={909}
            />
            <img
              src="/vitale-hero-radar-2026-1280.webp"
              width={1280}
              height={720}
              alt=""
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 -z-10 h-full w-full object-cover object-[70%_center]"
            />
          </picture>
          <div
            className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/90 to-ink/40 max-md:bg-ink/75"
            aria-hidden="true"
          />
          <div className="responsive-container py-16 sm:py-24">
            <p className="text-sm font-bold uppercase tracking-widest text-mint">
              Conteúdo Vitale
            </p>
            <h1 className="mt-3 max-w-2xl text-4xl font-extrabold sm:text-5xl">
              Conteúdos para escolher melhor
            </h1>
            <p className="mt-4 max-w-xl text-lg text-ink-foreground/90">
              Guias, comparativos e testes publicados pela Vitale para apoiar
              sua escolha.
            </p>
          </div>
        </section>
        <div className="responsive-container space-y-12 py-12">
          <section aria-labelledby="artigos">
            <h2 id="artigos" className="section-h2 text-ink">
              Artigos publicados
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
              <label
                htmlFor="buscar-artigos"
                className="mb-2 block text-sm font-semibold"
              >
                Buscar por título, resumo ou bike
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-4 focus-within:ring-2 focus-within:ring-action">
                <Search
                  className="h-5 w-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id="buscar-artigos"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Busque um artigo ou modelo de bike"
                  className="h-12 min-w-0 flex-1 bg-transparent outline-none"
                />
              </div>
              </div>
              <label htmlFor="filtrar-bike" className="block text-sm font-semibold">
                Bike
                <select id="filtrar-bike" value={bikeId} onChange={(e) => setBikeId(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-line bg-card px-3 font-normal focus-visible:ring-2 focus-visible:ring-action">
                  <option value="">Todas as bikes</option>
                  {availableBikes.map((bike) => <option key={bike.id} value={bike.id}>{bike.name}</option>)}
                </select>
              </label>
            </div>
            {topics.length > 0 && (
              <div
                className="mt-5 flex flex-wrap gap-2"
                aria-label="Filtrar artigos por assunto"
              >
                {["Todos", ...topics.map((t) => t.label)].map((label) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={topic === (label === "Todos" ? "" : label)}
                    onClick={() => setTopic(label === "Todos" ? "" : label)}
                    className={`min-h-11 rounded-full border px-4 text-sm focus-visible:ring-2 focus-visible:ring-action ${topic === (label === "Todos" ? "" : label) ? "border-action bg-action text-white" : "border-line bg-card"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <p role="status" className="mt-4 text-sm text-muted-foreground">
              {shown.length} {shown.length === 1 ? "artigo encontrado" : "artigos encontrados"}
              {(query || topic || bikeId) && <button type="button" onClick={() => { setQuery(""); setTopic(""); setBikeId(""); }} className="ml-3 font-semibold text-action underline">Limpar filtros</button>}
            </p>
            {shown.length ? (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((item) => (
                  <Link
                    key={item.slug}
                    to="/conteudos/$slug"
                    params={{ slug: item.slug }}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-card focus-visible:ring-2 focus-visible:ring-action hover:shadow-md"
                  >
                    {item.ogImageUrl ? (
                      <img
                        {...editorialImageProps(
                          item.ogImageUrl,
                          "(max-width: 640px) calc(100vw - 32px), (max-width: 1023px) 45vw, 384px",
                        )}
                        alt=""
                        width={320}
                        height={180}
                        sizes="(max-width: 640px) 100vw, 320px"
                        loading="lazy"
                        decoding="async"
                        className="aspect-video w-full object-cover"
                      />
                    ) : (
                      <div className="grid aspect-video place-items-center bg-surface">
                        <BookOpen
                          className="h-10 w-10 text-action"
                          aria-hidden="true"
                        />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-5">
                      {item.publishedAt && (
                        <time
                          dateTime={item.publishedAt}
                          className="text-xs text-muted-foreground"
                        >
                          {formatDateBR(item.publishedAt)}
                        </time>
                      )}
                      <h3 className="mt-2 text-xl font-bold text-ink group-hover:text-action">
                        {item.title}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                        {item.summary}
                      </p>
                      <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-action">
                        Ler artigo{" "}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-8 rounded-xl bg-surface p-6 text-muted-foreground">
                {items.length
                  ? "Nenhum artigo encontrado com esta busca e filtro."
                  : "Ainda não há conteúdos editoriais publicados."}
              </p>
            )}
          </section>
          <section aria-labelledby="proximos-conteudos">
            <h2 id="proximos-conteudos" className="section-h2 text-ink">
              Próximos passos
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Link
                to="/radar"
                className="flex items-center gap-4 rounded-2xl border border-line bg-card p-5 font-bold text-ink hover:border-action focus-visible:ring-2 focus-visible:ring-action"
              >
                <LineChart className="h-6 w-6 text-action" aria-hidden="true" />{" "}
                Radar de preços{" "}
                <ArrowRight className="ml-auto h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                to="/ferramentas"
                className="flex items-center gap-4 rounded-2xl border border-line bg-card p-5 font-bold text-ink hover:border-action focus-visible:ring-2 focus-visible:ring-action"
              >
                <Wrench className="h-6 w-6 text-action" aria-hidden="true" />{" "}
                Ferramentas{" "}
                <ArrowRight className="ml-auto h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          </section>
          <QuizBanner />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
