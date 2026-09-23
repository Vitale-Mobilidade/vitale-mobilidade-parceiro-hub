import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Bike, Calculator, GitCompareArrows, Sparkles } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site/site-ui";
import { pageHead } from "@/lib/seo";

/*
 * Hub de ferramentas de decisão. Só lista fluxos que existem hoje (Quiz, Radar, catálogo).
 * Comparador e calculadora aparecem como contexto honesto, sem CTA, sem número inventado.
 * Não duplica lógica do Radar nem lê dados: é uma página de orientação.
 */

export const Route = createFileRoute("/ferramentas")({
  head: () =>
    pageHead({
      path: "/ferramentas",
      title: "Ferramentas para escolher sua bike elétrica | Vitale Mobilidade",
      description:
        "Quiz de perfil, Radar de preços e catálogo de modelos: as ferramentas da Vitale que já funcionam para decidir qual bike elétrica comprar.",
      ogTitle: "Ferramentas de decisão da Vitale Mobilidade",
      ogDescription: "Quiz de perfil, Radar de preços e catálogo de bikes elétricas com dados reais.",
    }),
  component: FerramentasPage,
});

const TOOLS = [
  {
    key: "quiz",
    icon: Sparkles,
    title: "Quiz de perfil",
    to: "/escolherbike" as const,
    cta: "Fazer o quiz",
    question: "Não sei por onde começar.",
    body: "Responda poucas perguntas sobre trajeto, peso e uso. No final você recebe os modelos que combinam com o seu perfil e o link direto do anúncio.",
  },
  {
    key: "radar",
    icon: BarChart3,
    title: "Radar de preços",
    to: "/radar" as const,
    cta: "Abrir o Radar",
    question: "Este preço está bom hoje?",
    body: "Histórico de preços observado pela Vitale, com a data de cada leitura e a classificação do momento. Serve para decidir se vale comprar agora ou esperar.",
  },
  {
    key: "bikes",
    icon: Bike,
    title: "Catálogo de bikes",
    to: "/bikes" as const,
    cta: "Ver os modelos",
    question: "Quais modelos devo considerar?",
    body: "Todos os modelos que acompanhamos, com autonomia, capacidade, descrição, vídeos reais e o preço da oferta atual quando existe.",
  },
];

function FerramentasPage() {
  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main>
        <section className="bg-ink text-ink-foreground">
          <div className="responsive-container py-14 sm:py-20">
            <p className="text-xs font-bold tracking-[0.2em] text-mint">FERRAMENTAS</p>
            <h1 className="entry-h1 mt-3 max-w-3xl">Ferramentas para decidir qual bike elétrica comprar</h1>
            <p className="mt-4 max-w-2xl text-lg text-ink-foreground/80">
              Reunimos aqui o que já está no ar e funciona com dados reais. Cada ferramenta responde a uma dúvida
              diferente do caminho de compra.
            </p>
          </div>
        </section>

        <div className="responsive-container space-y-12 py-12 sm:py-16">
          <section aria-labelledby="disponiveis">
            <h2 id="disponiveis" className="section-h2 text-ink">Disponíveis agora</h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-3">
              {TOOLS.map(({ key, icon: Icon, title, to, cta, question, body }) => (
                <li key={key} className="flex h-full flex-col rounded-3xl bg-card p-6 ring-1 ring-line">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-mint/25 text-action">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-ink">{title}</h3>
                  <p className="mt-1 text-sm font-semibold text-action">{question}</p>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                  <Link
                    to={to}
                    className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-action px-5 font-bold text-primary-foreground hover:opacity-90"
                  >
                    {cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="em-construcao" className="rounded-3xl bg-card p-6 ring-1 ring-line sm:p-8">
            <h2 id="em-construcao" className="section-h2 text-ink">Em construção</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Estas ferramentas ainda não existem. Preferimos avisar a publicar um resultado que não podemos sustentar
              com dado real.
            </p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              <li className="rounded-2xl bg-surface p-5 ring-1 ring-line">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <GitCompareArrows className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 font-bold text-ink">Comparador lado a lado</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enquanto não fica pronto, dá para comparar especificações e preços modelo a modelo no catálogo e no
                  Radar.
                </p>
              </li>
              <li className="rounded-2xl bg-surface p-5 ring-1 ring-line">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <Calculator className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 font-bold text-ink">Calculadora de economia</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  A ideia é estimar quanto você economiza trocando carro, aplicativo ou ônibus pela bike. Ainda não
                  publicamos nenhum número.
                </p>
              </li>
            </ul>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
