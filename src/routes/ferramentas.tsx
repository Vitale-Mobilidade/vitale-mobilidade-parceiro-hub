import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Calculator, Sparkles, Wallet, CarFront, BusFront, Bike, Clock3, Timer, Route as RouteIcon, TrendingUp } from "lucide-react";
import { QuizBanner, OffersBanner } from "@/components/site/DecisionBanners";
import heroAsset from "@/assets/ferramentas-hero.png.asset.json";
import { SiteHeader, SiteFooter } from "@/components/site/site-ui";
import { pageHead } from "@/lib/seo";

/*
 * Hub de ferramentas de decisão. Só lista fluxos que existem hoje (Quiz, Radar, catálogo).
 * Não mostra produtos "em construção": se ainda não existe, não aparece como promessa.
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
    key: "calculadora",
    icon: Calculator,
    title: "Calculadora de economia",
    to: "/calculadoras/economia" as const,
    cta: "Simular minha economia",
    question: "Vale a pena trocar meu transporte por uma bike?",
    body: "Informe seu gasto mensal e sua rotina para ver a estimativa na hora, além de até duas bikes compatíveis e suas projeções de custo.",
  },
  {
    key: "custo-anual",
    icon: Wallet,
    title: "Custo anual de mobilidade",
    to: "/calculadoras/custo-anual-mobilidade" as const,
    cta: "Ver meu gasto anual",
    question: "Quanto eu realmente gasto por ano para me locomover?",
    body: "Some carro ou moto, aplicativos, transporte público e estacionamento e veja na hora seu custo mensal e anual, e quanto disso você acredita poder trocar por bike.",
  },
  {
    key: "payback",
    icon: TrendingUp,
    title: "Calculadora de payback",
    to: "/calculadoras/payback" as const,
    cta: "Ver em quanto tempo se paga",
    question: "Em quanto tempo a bike se paga?",
    body: "Informe o gasto que a bike evitaria e sua rotina para ver o prazo de retorno e o saldo em 12, 24 e 36 meses de até duas bikes reais com oferta atual.",
  },
  {
    key: "uber-vs-bike",
    icon: RouteIcon,
    title: "Uber/99 vs bike",
    to: "/calculadoras/uber-vs-bike" as const,
    cta: "Comparar com meu gasto em apps",
    question: "Uber/99 ou bike: qual sai mais barato?",
    body: "Informe seu gasto mensal com corridas por app e sua rotina para ver a economia líquida mensal e anual e o custo acumulado de até duas bikes reais com oferta atual.",
  },
  {
    key: "carro-vs-bike",
    icon: CarFront,
    title: "Carro vs bike",
    to: "/calculadoras/carro-vs-bike" as const,
    cta: "Comparar com meu carro",
    question: "Carro ou bike: quanto custa cada um no trajeto?",
    body: "Informe o gasto variável do carro nesses trajetos e sua rotina para ver a economia líquida estimada, o payback e o custo acumulado de até duas bikes reais.",
  },
  {
    key: "transporte-publico-vs-bike",
    icon: BusFront,
    title: "Transporte público vs bike",
    to: "/calculadoras/transporte-publico-vs-bike" as const,
    cta: "Comparar com minhas viagens",
    question: "Transporte público ou bike: o que compensa no mês?",
    body: "Informe gasto, tempo e distância só das viagens que pensa em trocar para ver economia, tempo por ano e o custo acumulado de até duas bikes reais.",
  },
  {
    key: "moto-vs-bike",
    icon: Bike,
    title: "Moto vs bike",
    to: "/calculadoras/moto-vs-bike" as const,
    cta: "Comparar com minha moto",
    question: "Moto ou bike elétrica no trajeto?",
    body: "Informe o gasto variável da moto nesses trajetos e sua rotina para ver a economia líquida estimada, o payback e o custo acumulado de até duas bikes reais.",
  },
  {
    key: "tempo-no-transito",
    icon: Clock3,
    title: "Tempo no trânsito",
    to: "/calculadoras/tempo-no-transito" as const,
    cta: "Ver meu tempo no trajeto",
    question: "Quanto tempo passo no trânsito por ano?",
    body: "Informe seus minutos de trajeto hoje e sua estimativa de bike para ver horas e dias por ano e a projeção em 1, 3 e 5 anos.",
  },
  {
    key: "tempo-recuperado",
    icon: Timer,
    title: "Tempo recuperado",
    to: "/calculadoras/tempo-recuperado" as const,
    cta: "Ver quanto tempo recupero",
    question: "Quanto tempo a bike devolve por ano?",
    body: "Compare seu tempo diário de trajeto com sua estimativa de bike e veja as horas recuperadas, ou adicionais, por mês, ano, 3 e 5 anos.",
  },
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

];

const GROUPS = [
  { title: "Economizar dinheiro", keys: ["calculadora", "custo-anual", "payback"] },
  { title: "Comparar transportes", keys: ["uber-vs-bike", "carro-vs-bike", "transporte-publico-vs-bike", "moto-vs-bike"] },
  { title: "Ganhar tempo", keys: ["tempo-no-transito", "tempo-recuperado"] },
  { title: "Escolher a bike", keys: ["radar", "quiz"] },
] as const;

function FerramentasPage() {
  return <div className="min-h-screen bg-surface"><SiteHeader /><main>
    <section className="relative isolate overflow-hidden bg-ink text-ink-foreground">
      <img src={heroAsset.url} alt="Mulher de capacete ao lado de uma bicicleta elétrica na orla ao pôr do sol" fetchPriority="high" decoding="async" width={1672} height={941} className="absolute inset-0 -z-10 h-full w-full object-cover object-[65%_center] max-md:object-[66%_center]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/75 to-ink/20 max-md:bg-gradient-to-t max-md:from-ink max-md:via-ink/75 max-md:to-ink/25" aria-hidden="true" />
      <div className="responsive-container flex min-h-[480px] flex-col justify-end py-14 sm:min-h-[520px] sm:justify-center sm:py-20">
        <p className="text-xs font-bold tracking-[0.2em] text-mint">FERRAMENTAS</p>
        <h1 className="entry-h1 mt-3 max-w-3xl">Ferramentas para decidir qual bike elétrica comprar</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-foreground/90">Reunimos aqui o que já está no ar e funciona com dados reais. Cada ferramenta responde a uma dúvida diferente do caminho de compra.</p>
      </div>
    </section>
    <div className="responsive-container space-y-12 py-12 sm:py-16">
      {GROUPS.map(group => <section key={group.title} aria-label={group.title}>
        <h2 className="section-h2 text-ink">{group.title}</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {TOOLS.filter(tool => (group.keys as readonly string[]).includes(tool.key)).map(({ key, icon: Icon, title, to, cta, question, body }) =>
            <li key={key} className="flex h-full min-w-0 flex-col rounded-3xl bg-card p-6 ring-1 ring-line">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-mint/25 text-action"><Icon className="h-6 w-6" aria-hidden="true" /></span>
              <h3 className="mt-4 text-lg font-bold text-ink">{title}</h3>
              <p className="mt-1 text-sm font-semibold text-action">{question}</p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              <Link to={to} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-action px-5 text-center font-bold text-primary-foreground hover:opacity-90 focus-visible:ring-2 focus-visible:ring-action">{cta} <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></Link>
            </li>)}
        </ul>
      </section>)}
      <section aria-labelledby="caminho" className="rounded-3xl bg-card p-6 ring-1 ring-line sm:p-8">
        <h2 id="caminho" className="section-h2 text-ink">Um caminho para decidir</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { label: "Entenda seus custos", to: "/calculadoras/custo-anual-mobilidade" as const, Icon: Wallet },
            { label: "Explore bikes e preços", to: "/radar" as const, Icon: BarChart3 },
            { label: "Confirme seu perfil no Quiz", to: "/escolherbike" as const, Icon: Sparkles },
          ].map(({ label, to, Icon }, i) => <li key={label}><Link to={to} className="flex h-full min-h-20 items-center gap-3 rounded-xl bg-surface p-4 font-semibold text-ink hover:text-action focus-visible:ring-2 focus-visible:ring-action"><span className="text-sm font-bold text-action">{i + 1}.</span><Icon className="h-5 w-5 shrink-0 text-action" aria-hidden="true" />{label}<ArrowRight className="ml-auto h-4 w-4 shrink-0" aria-hidden="true" /></Link></li>)}
        </ol>
      </section>
      <QuizBanner /><OffersBanner />
    </div>
  </main><SiteFooter /></div>;
}
