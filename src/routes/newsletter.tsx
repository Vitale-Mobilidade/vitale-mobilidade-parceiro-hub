import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/site-ui";
import { canonicalUrl, pageHead } from "@/lib/seo";

const title = "Newsletter de bikes elétricas | Vitale Mobilidade";
const description = "Inscreva-se na newsletter gratuita da Vitale Mobilidade e receba artigos, vídeos, bikes em destaque e novidades do Radar de preços por e-mail.";

export const Route = createFileRoute("/newsletter")({
  head: () => ({
    ...pageHead({ path: "/newsletter", title, description }),
    scripts: [{ type: "application/ld+json", children: JSON.stringify({
      "@context": "https://schema.org", "@type": "WebPage",
      name: title, description, url: canonicalUrl("/newsletter"), inLanguage: "pt-BR",
      publisher: { "@type": "Organization", name: "Vitale Mobilidade", url: canonicalUrl("/") },
    }) }],
  }),
  component: NewsletterPage,
});

export function NewsletterPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="responsive-container py-10 sm:py-16">
        <div className="max-w-3xl">
          <p className="text-sm font-bold tracking-wide text-action">NEWSLETTER VITALE · GRATUITA</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Bikes elétricas e boas leituras no seu e-mail.</h1>
        </div>
        <div className="mt-6 max-w-3xl">
          <p className="text-lg leading-relaxed text-muted-foreground">Receba artigos, vídeos e destaques de bikes elétricas e do Radar de preços no seu e-mail.</p>
          <p className="mt-2 text-sm text-muted-foreground">É gratuito. Cancele quando quiser pelo link nos e-mails.</p>
        </div>
        <section aria-labelledby="newsletter-benefits" className="mt-12">
          <h2 id="newsletter-benefits" className="text-2xl font-bold text-ink">O que você vai receber?</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <div className="rounded-xl border border-line bg-card p-6"><h3 className="text-lg font-bold text-ink">Artigos e vídeos</h3><p className="mt-2 leading-relaxed text-muted-foreground">Leituras e vídeos da Vitale sobre bikes elétricas, comparativos e uso no dia a dia.</p><Link to="/conteudos" className="mt-3 inline-flex min-h-11 items-center font-semibold text-action underline underline-offset-4">Conheça os conteúdos</Link></div>
            <div className="rounded-xl border border-line bg-card p-6"><h3 className="text-lg font-bold text-ink">Bikes e Radar de preços</h3><p className="mt-2 leading-relaxed text-muted-foreground">Modelos em destaque e links para consultar os preços e o histórico registrado no Radar.</p><Link to="/radar" className="mt-3 inline-flex min-h-11 items-center font-semibold text-action underline underline-offset-4">Explore o Radar</Link></div>
            <div className="rounded-xl border border-line bg-card p-6"><h3 className="text-lg font-bold text-ink">Ferramentas para decidir</h3><p className="mt-2 leading-relaxed text-muted-foreground">Novidades das ferramentas para comparar custos e tempo nos seus deslocamentos.</p><Link to="/ferramentas" className="mt-3 inline-flex min-h-11 items-center font-semibold text-action underline underline-offset-4">Veja as ferramentas</Link></div>
          </div>
        </section>
        <section aria-labelledby="newsletter-questions" className="mt-12 max-w-3xl">
          <h2 id="newsletter-questions" className="text-2xl font-bold text-ink">Dúvidas sobre a inscrição</h2>
          <div className="mt-5 space-y-6 leading-relaxed">
            <div><h3 className="font-bold text-ink">A newsletter é gratuita?</h3><p className="mt-1 text-muted-foreground">Sim. Você informa seu nome e e-mail e autoriza o cadastro para receber a newsletter da Vitale.</p></div>
            <div><h3 className="font-bold text-ink">Preciso participar do grupo ou me inscrever no YouTube?</h3><p className="mt-1 text-muted-foreground">Não. O cadastro por e-mail é independente do canal no YouTube e do grupo de ofertas.</p></div>
            <div><h3 className="font-bold text-ink">Como cancelo a inscrição?</h3><p className="mt-1 text-muted-foreground">Use o link de descadastro presente nos e-mails. Saiba mais sobre o tratamento de seus dados na <a href="/privacidade" className="font-semibold text-action underline underline-offset-4">política de privacidade</a>.</p></div>
            <div><h3 className="font-bold text-ink">Os preços enviados continuam válidos?</h3><p className="mt-1 text-muted-foreground">Preços e disponibilidade podem mudar. Consulte o Radar e a oferta no destino antes de comprar.</p></div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
