import { SiteHeader, SiteFooter } from "@/components/site/site-ui";

export function editorialHeaders({
  loaderData,
}: {
  loaderData?: { ok?: boolean };
}) {
  return loaderData?.ok === false
    ? {
        "Retry-After": "120",
        "Cache-Control": "no-store",
        "X-Vitale-Editorial-Unavailable": "1",
      }
    : undefined;
}

export function EditorialUnavailable() {
  return (
    <div>
      <SiteHeader />
      <main className="responsive-container py-16">
        <h1 className="text-3xl font-bold">
          Conteúdo temporariamente indisponível
        </h1>
        <p className="mt-4">
          Tente novamente em instantes. Os artigos continuam publicados.
        </p>
        <a
          className="mt-6 inline-block min-h-11 font-semibold underline"
          href="/"
        >
          Voltar ao início
        </a>
      </main>
      <SiteFooter />
    </div>
  );
}
