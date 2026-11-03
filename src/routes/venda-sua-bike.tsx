import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/site-ui";
import {
  ClassifiedCard,
  ClassifiedsEmpty,
} from "@/components/classifieds/BikeClassifiedsSection";
import { getPublicBikeListings } from "@/lib/bike-classifieds.functions";
import { pageHead } from "@/lib/seo";
export const Route = createFileRoute("/venda-sua-bike")({
  validateSearch: (search: Record<string, unknown>) => ({
    pagina: Math.min(834, Math.max(1, Math.floor(Number(search.pagina) || 1))),
  }),
  loaderDeps: ({ search }) => ({ page: search.pagina }),
  loader: async ({ deps }) => {
    const [list, featured] = await Promise.all([
      getPublicBikeListings({
        data: { limit: 12, offset: (deps.page - 1) * 12 },
      }),
      getPublicBikeListings({ data: { limit: 3, offset: 0 } }),
    ]);
    return { list, featured };
  },
  headers: () => ({ "Cache-Control": "no-store" }),
  head: () =>
    pageHead({
      path: "/venda-sua-bike",
      title: "Venda sua bike aqui | Vitale Mobilidade",
      description:
        "Bikes anunciadas pela comunidade Vitale. Conheça as bicicletas disponíveis ou acesse sua área de anúncios.",
      robots: "noindex, follow",
    }),
  component: ClassifiedsPage,
});
function ClassifiedsPage() {
  const { list, featured } = Route.useLoaderData();
  const { pagina } = Route.useSearch();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="bg-ink py-12 text-white sm:py-16">
          <div className="responsive-container grid items-center gap-8 lg:grid-cols-[1fr_340px]">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-mint">
                Classificados da comunidade
              </p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                Venda sua bike aqui
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-white/80">
                Sua bike pode ser o começo da próxima história de alguém.
                Encontre bicicletas e converse diretamente com quem anuncia.
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/5 p-6">
              <p className="text-sm text-white/80">Valor por anúncio</p>
              <p className="mt-2 text-4xl font-bold">R$ 150</p>
              <p className="mt-3 text-sm text-white/80">
                Estamos em fase piloto. A criação está disponível somente para a
                conta convidada, com isenção neste teste.
              </p>
              <a
                href="/conta/anuncios"
                className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-mint px-5 font-bold text-mint-foreground"
              >
                Anuncie sua bike
              </a>
            </div>
          </div>
        </section>
        <div className="responsive-container space-y-12 py-12">
          {featured.items.length > 0 && (
            <section aria-labelledby="classificados-destaque">
              <h2
                id="classificados-destaque"
                className="text-2xl font-bold text-ink"
              >
                Bikes em destaque
              </h2>
              <p className="mt-2 text-muted-foreground">
                Os três anúncios mais recentes da comunidade.
              </p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {featured.items.map((l) => (
                  <ClassifiedCard key={l.id} listing={l} />
                ))}
              </div>
            </section>
          )}
          <section aria-labelledby="classificados-todos">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2
                id="classificados-todos"
                className="text-2xl font-bold text-ink"
              >
                Todas as bikes
              </h2>
              {list.ok && (
                <p className="text-sm text-muted-foreground">
                  {list.total}{" "}
                  {list.total === 1
                    ? "anúncio disponível"
                    : "anúncios disponíveis"}
                </p>
              )}
            </div>
            {list.items.length ? (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {list.items.map((l) => (
                  <ClassifiedCard key={l.id} listing={l} />
                ))}
              </div>
            ) : (
              <ClassifiedsEmpty unavailable={!list.ok} />
            )}
            {(pagina > 1 || list.total > pagina * 12) && (
              <nav
                aria-label="Páginas de anúncios"
                className="mt-8 flex items-center gap-5"
              >
                {pagina > 1 && (
                  <a
                    href={`/venda-sua-bike?pagina=${pagina - 1}`}
                    className="min-h-11 underline"
                  >
                    Anterior
                  </a>
                )}
                <span>Página {pagina}</span>
                {list.total > pagina * 12 && (
                  <a
                    href={`/venda-sua-bike?pagina=${pagina + 1}`}
                    className="min-h-11 underline"
                  >
                    Próxima
                  </a>
                )}
              </nav>
            )}
          </section>
          <aside className="rounded-xl bg-surface p-6 text-sm text-muted-foreground">
            Os anúncios são de responsabilidade dos vendedores. A Vitale oferece
            o espaço de divulgação; a negociação e o pagamento da bicicleta
            acontecem diretamente entre comprador e vendedor.
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
