import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Bike, BusFront, CarFront, Clock3, KeyRound, PackageCheck, Route as RouteIcon, Sparkles, Wrench, type LucideIcon } from "lucide-react";
import { QuizBanner, OffersBanner } from "@/components/site/DecisionBanners";
import heroAsset from "@/assets/ferramentas-hero.png.asset.json";
import { SiteHeader, SiteFooter } from "@/components/site/site-ui";
import { canonicalUrl, pageHead } from "@/lib/seo";
import { GROUP_LABELS, MOBILITY_TOOLS, type ToolGroup, type ToolSlug } from "@/lib/mobility/tools-registry";

/*
 * Hub canônico das sete Ferramentas de Mobilidade oficiais. Lista só o que existe e funciona.
 * As antigas /calculadoras/* seguem acessíveis como legado noindex, fora deste hub.
 */
export const Route = createFileRoute("/ferramentas/")({
  head: () => {
    const base = pageHead({
      path: "/ferramentas",
      title: "Ferramentas de mobilidade: custo, renda e tempo com bike elétrica | Vitale Mobilidade",
      description:
        "Sete simulações gratuitas: carro, moto, aplicativos, transporte público, veículo alugado, meta de entregas e economia de tempo, com bikes reais e ofertas atuais.",
      ogTitle: "Ferramentas de mobilidade da Vitale",
      ogDescription: "Compare custo, renda e tempo com bike elétrica usando seus números e bikes reais com oferta atual.",
    });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Ferramentas de mobilidade da Vitale",
            itemListElement: MOBILITY_TOOLS.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.title, url: canonicalUrl(t.path) })),
          }),
        },
      ],
    };
  },
  component: FerramentasPage,
});

const ICONS: Record<ToolSlug, LucideIcon> = {
  "carro-vs-bike": CarFront,
  "moto-vs-bike": Bike,
  "aplicativos-vs-bike": RouteIcon,
  "transporte-publico-vs-bike": BusFront,
  "veiculo-alugado-vs-bike-propria": KeyRound,
  "meta-entregas": PackageCheck,
  "economia-de-tempo": Clock3,
};

const GROUPS: ToolGroup[] = ["economia", "renda", "tempo"];

const FLOW = [
  { Icon: Wrench, title: "Ferramenta", text: "Simule seu cenário com seus números. Nada é enviado nem guardado." },
  { Icon: Bike, title: "Bikes", text: "Até duas bikes com oferta atual e autonomia para a sua distância, com o impacto de cada uma." },
  { Icon: BarChart3, title: "Radar", text: "Confira o histórico de preço da bike antes de decidir." },
  { Icon: Sparkles, title: "Quiz", text: "Confirme qual bike combina com o seu perfil de uso." },
];

function FerramentasPage() {
  return <div className="min-h-screen bg-surface"><SiteHeader /><main>
    <section className="relative isolate overflow-hidden bg-ink text-ink-foreground">
      <img src={heroAsset.url} alt="Mulher de capacete ao lado de uma bicicleta elétrica na orla ao pôr do sol" fetchPriority="high" decoding="async" width={1672} height={941} className="absolute inset-0 -z-10 h-full w-full object-cover object-[65%_center] max-md:object-[66%_center]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/75 to-ink/20 max-md:bg-gradient-to-t max-md:from-ink max-md:via-ink/75 max-md:to-ink/25" aria-hidden="true" />
      <div className="responsive-container flex min-h-[480px] flex-col justify-end py-14 sm:min-h-[520px] sm:justify-center sm:py-20">
        <p className="text-xs font-bold tracking-[0.2em] text-mint">FERRAMENTAS</p>
        <h1 className="entry-h1 mt-3 max-w-3xl">Ferramentas para decidir se a bike elétrica compensa para você</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-foreground/90">Sete simulações sobre custo, renda e tempo. Você informa seus números e vê o resultado na hora, com bikes reais que têm oferta atual.</p>
      </div>
    </section>
    <div className="responsive-container space-y-12 py-12 sm:py-16">
      <section aria-labelledby="fluxo" className="rounded-3xl bg-card p-6 ring-1 ring-line sm:p-8">
        <h2 id="fluxo" className="section-h2 text-ink">Como as ferramentas levam à decisão</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW.map(({ Icon, title, text }, i) => <li key={title} className="rounded-xl bg-surface p-4">
            <span className="flex items-center gap-2 font-bold text-ink"><span className="text-sm text-action">{i + 1}.</span><Icon className="h-5 w-5 text-action" aria-hidden="true" />{title}</span>
            <p className="mt-2 text-sm text-muted-foreground">{text}</p>
          </li>)}
        </ol>
      </section>
      {GROUPS.map(group => <section key={group} aria-labelledby={`grupo-${group}`}>
        <h2 id={`grupo-${group}`} className="section-h2 text-ink">{GROUP_LABELS[group].title}</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">{GROUP_LABELS[group].text}</p>
        <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {MOBILITY_TOOLS.filter(tool => tool.group === group).map(({ slug, title, path, cta, question, body }) => {
            const Icon = ICONS[slug];
            return <li key={slug} className="flex h-full min-w-0 flex-col rounded-3xl bg-card p-6 ring-1 ring-line">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-mint/25 text-action"><Icon className="h-6 w-6" aria-hidden="true" /></span>
              <h3 className="mt-4 text-lg font-bold text-ink">{title}</h3>
              <p className="mt-1 text-sm font-semibold text-action">{question}</p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              <Link to={path} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-action px-5 text-center font-bold text-primary-foreground hover:opacity-90 focus-visible:ring-2 focus-visible:ring-action">{cta} <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></Link>
            </li>;
          })}
        </ul>
      </section>)}
      <QuizBanner />
      <Link to="/radar" className="inline-flex min-h-11 items-center gap-2 font-bold text-action hover:underline"><BarChart3 className="h-4 w-4" aria-hidden="true" /> Já tem uma bike em mente? Veja o preço no Radar <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      <OffersBanner />
    </div>
  </main><SiteFooter /></div>;
}
