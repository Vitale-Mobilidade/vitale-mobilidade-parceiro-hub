/**
 * Contrato para futuros guias/artigos editoriais ligados a um modelo.
 * Ainda NÃO existe fonte de artigos: a página passa lista vazia e nada é renderizado
 * (sem cards fictícios nem promessa vazia visível).
 */
export type BikeGuide = {
  id: string;
  title: string;
  /** Rota interna real do artigo quando existir. */
  href: string;
  publishedAt: string | null;
  bikeIds: string[];
};

export function BikeGuides({ guides }: { guides: BikeGuide[] }) {
  if (!guides.length) return null;
  return (
    <section aria-labelledby="guias" className="mt-14">
      <h2 id="guias" className="text-2xl font-black text-ink">Guias sobre este modelo</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {guides.map((g) => (
          <li key={g.id}>
            <a href={g.href} className="block rounded-2xl bg-card p-4 font-bold text-ink ring-1 ring-line hover:ring-action">{g.title}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
