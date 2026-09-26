/**
 * Registro único das sete Ferramentas de Mobilidade oficiais (/ferramentas/*).
 * Hub, sitemap, metadata e "ferramentas relacionadas" leem daqui: nenhuma lista paralela.
 */
import { canonicalUrl, pageHead, serializeJsonLd, SITE_NAME } from "@/lib/seo";

export const TOOL_SLUGS = [
  "carro-vs-bike",
  "moto-vs-bike",
  "aplicativos-vs-bike",
  "transporte-publico-vs-bike",
  "veiculo-alugado-vs-bike-propria",
  "meta-entregas",
  "economia-de-tempo",
] as const;

export type ToolSlug = (typeof TOOL_SLUGS)[number];
export type ToolGroup = "economia" | "renda" | "tempo";
export type ToolPath = `/ferramentas/${ToolSlug}`;

export type ToolMeta = {
  slug: ToolSlug;
  path: ToolPath;
  group: ToolGroup;
  /** Nome curto do card. */
  title: string;
  /** Dúvida que a ferramenta responde. */
  question: string;
  cta: string;
  body: string;
  eyebrow: string;
  h1: string;
  intro: string;
  seoTitle: string;
  seoDescription: string;
  related: [ToolSlug, ToolSlug];
};

export const GROUP_LABELS: Record<ToolGroup, { title: string; text: string }> = {
  economia: { title: "Economia", text: "Compare o que você gasta hoje para se locomover com o custo de ter e usar uma bike elétrica." },
  renda: { title: "Renda", text: "Para quem trabalha com entregas: custo operacional e metas simuladas com o preço real das bikes." },
  tempo: { title: "Tempo", text: "Quanto do seu dia volta para você quando o trajeto é feito de bike." },
};

export const MOBILITY_TOOLS: ToolMeta[] = [
  {
    slug: "carro-vs-bike",
    path: "/ferramentas/carro-vs-bike",
    group: "economia",
    title: "Carro vs bike",
    question: "Quanto o meu carro custa por mês de verdade?",
    cta: "Comparar com meu carro",
    body: "Combustível, manutenção, IPVA, seguro, parcelas restantes e custo de oportunidade contra o custo de operar uma bike real.",
    eyebrow: "CARRO VS BIKE",
    h1: "Carro ou bike elétrica: quanto custa cada um por mês?",
    intro: "Informe os custos do seu carro, quitado ou financiado. A simulação soma o custo mensal real e compara com a operação de até duas bikes com oferta atual, incluindo em quanto tempo cada uma se paga.",
    seoTitle: "Carro vs bike elétrica: custo mensal real e payback | Vitale Mobilidade",
    seoDescription: "Simule o custo mensal do seu carro (combustível, IPVA, seguro, parcelas e custo de oportunidade) contra bikes elétricas reais com oferta atual.",
    related: ["moto-vs-bike", "economia-de-tempo"],
  },
  {
    slug: "moto-vs-bike",
    path: "/ferramentas/moto-vs-bike",
    group: "economia",
    title: "Moto vs bike",
    question: "A moto ainda compensa no meu dia a dia?",
    cta: "Comparar com minha moto",
    body: "Custo mensal da moto, com parcelas só enquanto existirem, contra a operação de bikes com autonomia para a sua quilometragem.",
    eyebrow: "MOTO VS BIKE",
    h1: "Moto ou bike elétrica: quanto custa cada uma por mês?",
    intro: "Informe os custos da sua moto, quitada ou financiada. A simulação mostra o custo mensal, a economia e o payback de até duas bikes com autonomia compatível com a sua rotina.",
    seoTitle: "Moto vs bike elétrica: custo mensal e payback | Vitale Mobilidade",
    seoDescription: "Compare o custo mensal da sua moto com bikes elétricas reais com oferta atual: economia mensal, anual, em 3 anos e payback.",
    related: ["carro-vs-bike", "veiculo-alugado-vs-bike-propria"],
  },
  {
    slug: "aplicativos-vs-bike",
    path: "/ferramentas/aplicativos-vs-bike",
    group: "economia",
    title: "Aplicativos vs bike",
    question: "Quanto dos meus gastos com Uber e 99 uma bike cobriria?",
    cta: "Comparar com meus apps",
    body: "Some Uber, 99 e outros apps e veja a economia mensal, anual e o payback de bikes reais.",
    eyebrow: "APLICATIVOS VS BIKE",
    h1: "Uber, 99 ou bike elétrica: o que sai mais barato?",
    intro: "Informe quanto gasta por mês com aplicativos de transporte nos trajetos que faria de bike. A simulação compara com a operação de até duas bikes reais e mostra em quantos meses cada uma se paga.",
    seoTitle: "Uber e 99 vs bike elétrica: economia e payback | Vitale Mobilidade",
    seoDescription: "Simule quanto você deixaria de gastar com Uber, 99 e outros apps usando uma bike elétrica real, com payback por modelo.",
    related: ["transporte-publico-vs-bike", "economia-de-tempo"],
  },
  {
    slug: "transporte-publico-vs-bike",
    path: "/ferramentas/transporte-publico-vs-bike",
    group: "economia",
    title: "Transporte público vs bike",
    question: "Ônibus, metrô e trem ou bike: o que compensa?",
    cta: "Comparar com minhas passagens",
    body: "Informe o gasto mensal ou o detalhe diário por modal e veja gasto anual, payback e economia depois que a bike se paga.",
    eyebrow: "TRANSPORTE PÚBLICO VS BIKE",
    h1: "Transporte público ou bike elétrica: o que compensa?",
    intro: "Informe o gasto total do mês ou o valor diário de ônibus, metrô e trem. A simulação mostra o gasto anual, em quanto tempo uma bike real se paga e quanto sobra depois disso.",
    seoTitle: "Transporte público vs bike elétrica: payback | Vitale Mobilidade",
    seoDescription: "Compare seu gasto com ônibus, metrô e trem com bikes elétricas reais com oferta atual: gasto anual, payback e economia depois do payback.",
    related: ["aplicativos-vs-bike", "economia-de-tempo"],
  },
  {
    slug: "veiculo-alugado-vs-bike-propria",
    path: "/ferramentas/veiculo-alugado-vs-bike-propria",
    group: "renda",
    title: "Veículo alugado vs bike própria",
    question: "Quanto do meu custo para trabalhar some com uma bike própria?",
    cta: "Calcular meu custo operacional",
    body: "Para quem trabalha com moto ou bicicleta alugada: aluguel, combustível e outros custos contra o custo de operar uma bike própria.",
    eyebrow: "VEÍCULO ALUGADO VS BIKE PRÓPRIA",
    h1: "Veículo alugado ou bike própria: quanto custa trabalhar?",
    intro: "Para entregadores e profissionais de rua. Informe o aluguel e os custos diários de hoje para ver a redução do custo operacional com uma bike elétrica própria e em quanto tempo ela se paga.",
    seoTitle: "Moto alugada vs bike elétrica própria: custo operacional | Vitale Mobilidade",
    seoDescription: "Simule a redução do custo operacional ao trocar moto ou bicicleta alugada por uma bike elétrica própria, com payback por modelo real.",
    related: ["meta-entregas", "moto-vs-bike"],
  },
  {
    slug: "meta-entregas",
    path: "/ferramentas/meta-entregas",
    group: "renda",
    title: "Meta de entregas",
    question: "Quantas entregas preciso fazer para bater minha meta?",
    cta: "Simular minha meta",
    body: "Entregas por dia e por mês, receita, custos e resultado líquido simulados, e quantos dias de trabalho equivalem ao preço de cada bike.",
    eyebrow: "META DE ENTREGAS",
    h1: "Quantas entregas por dia para bater sua meta com bike elétrica?",
    intro: "Informe sua meta diária, o valor médio por entrega e seus custos. A simulação calcula as entregas necessárias, o resultado líquido do mês e quantos dias de trabalho equivalem ao preço de cada bike. É uma simulação, não uma promessa de renda.",
    seoTitle: "Meta de entregas com bike elétrica: simulação | Vitale Mobilidade",
    seoDescription: "Simule quantas entregas por dia você precisa para sua meta, o resultado líquido do mês e em quantos dias uma bike elétrica real se paga.",
    related: ["veiculo-alugado-vs-bike-propria", "economia-de-tempo"],
  },
  {
    slug: "economia-de-tempo",
    path: "/ferramentas/economia-de-tempo",
    group: "tempo",
    title: "Economia de tempo",
    question: "Quanto tempo a bike devolve por ano?",
    cta: "Ver meu tempo recuperado",
    body: "Tempo de ida e volta hoje contra o tempo de bike, informado ou estimado pela distância, em horas por semana, mês, ano e dias completos.",
    eyebrow: "ECONOMIA DE TEMPO",
    h1: "Quanto tempo você recupera indo de bike elétrica?",
    intro: "Informe quanto tempo leva para ir e voltar e a distância do trajeto. Se não souber o tempo de bike, estimamos pela distância a 18 km/h e deixamos essa premissa à vista.",
    seoTitle: "Economia de tempo com bike elétrica: horas por ano | Vitale Mobilidade",
    seoDescription: "Calcule quantas horas por semana, mês e ano você recupera fazendo o trajeto de bike elétrica, e o equivalente em dias completos.",
    related: ["carro-vs-bike", "transporte-publico-vs-bike"],
  },
];

export function getTool(slug: ToolSlug): ToolMeta {
  const tool = MOBILITY_TOOLS.find((t) => t.slug === slug);
  if (!tool) throw new Error(`Ferramenta desconhecida: ${slug}`);
  return tool;
}

export const TOOL_PATHS: ToolPath[] = MOBILITY_TOOLS.map((t) => t.path);

/** head() de uma ferramenta: title/description/canonical/OG/Twitter + WebApplication e BreadcrumbList. */
export function toolHead(slug: ToolSlug) {
  const tool = getTool(slug);
  const url = canonicalUrl(tool.path);
  const base = pageHead({
    path: tool.path,
    title: tool.seoTitle,
    description: tool.seoDescription,
    ogTitle: tool.h1,
    ogDescription: tool.seoDescription,
    image: {
      url: canonicalUrl("/og/vitale-ferramentas-1200x630.jpg"),
      width: 1200,
      height: 630,
      type: "image/jpeg",
      alt: `${tool.title} — ferramenta gratuita da Vitale Mobilidade`,
    },
  });
  return {
    ...base,
    scripts: [
      {
        type: "application/ld+json",
        children: serializeJsonLd({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: tool.title,
          description: tool.seoDescription,
          url,
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          inLanguage: "pt-BR",
          isAccessibleForFree: true,
          offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
          publisher: { "@type": "Organization", name: SITE_NAME },
        }),
      },
      {
        type: "application/ld+json",
        children: serializeJsonLd({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Ferramentas", item: canonicalUrl("/ferramentas") },
            { "@type": "ListItem", position: 2, name: tool.title, item: url },
          ],
        }),
      },
    ],
  };
}
