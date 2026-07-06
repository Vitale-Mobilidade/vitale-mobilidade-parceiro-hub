import ft03 from "@/assets/bikes/ft03.jpg";
import v9max from "@/assets/bikes/v9-max.jpg";
import v10max from "@/assets/bikes/v10-max.jpg";
import v40pro from "@/assets/bikes/v40-pro.jpg";
import v8pro from "@/assets/bikes/v8-pro.jpg";
import v8pros from "@/assets/bikes/v8-pro-s.jpg";
import gt20 from "@/assets/bikes/gt20.jpg";
import gt2000 from "@/assets/bikes/gt2000.jpg";
import v29pro from "@/assets/bikes/v29-pro.jpg";
import v35 from "@/assets/bikes/v35.jpg";
import v20mini from "@/assets/bikes/v20-mini.jpg";
import coswheelGt20 from "@/assets/bikes/coswheel-gt20.png";
import v20ProAsset from "@/assets/bikes/v20-pro.png.asset.json";
import honeywhaleS8Asset from "@/assets/bikes/honeywhale-s8.png.asset.json";
import honeywhaleBw02Asset from "@/assets/bikes/honeywhale-bw02.png.asset.json";
import f6ProSAsset from "@/assets/bikes/f6-pro-s.png.asset.json";
import v8UltraAsset from "@/assets/bikes/v8-ultra.png.asset.json";

export type BudgetTier = "ate_7000" | "7000_8000" | "8000_10000" | "acima_10000";

export interface Bike {
  id: string;
  name: string;
  shortDescription: string;
  /** Descrição completa do produto (usada para conteúdo extenso/SEO). */
  fullDescription?: string;
  image: string;
  /**
   * Link de afiliado padrão (Vitale) — mantido como alias de linkVitale
   * para retrocompatibilidade com o restante do código.
   */
  affiliateLink: string;
  /** Link para tráfego orgânico, YouTube, Google, Instagram orgânico, direto, indicações etc. */
  linkVitale: string;
  /** Link para tráfego pago da Meta Ads (Facebook/Instagram). */
  linkMeta: string;
  /** Preço interno (NÃO exibir na interface) — usado apenas pela engine */
  internalPrice: number;
  capacity: 1 | 2;
  /** Peso suportado em kg */
  weightSupportKg: number;
  autonomyKm: number;
  bestFor: string[];
  strengths: string[];
  budgetTiers: BudgetTier[];
  diferencial: string;
  perfilIndicado: string;
}

/** Limite máximo de preço por faixa de orçamento (uso interno) */
export const BUDGET_MAX_PRICE: Record<BudgetTier, number> = {
  ate_7000: 7000,
  "7000_8000": 8000,
  "8000_10000": 10000,
  acima_10000: 999999,
};

export const BIKES: Bike[] = [
  {
    id: "ft03",
    name: "FT03",
    shortDescription: "Bike elétrica 1000W para uso urbano individual. Motor forte, freios hidráulicos, quadro de alumínio e excelente custo-benefício para quem quer economia no dia a dia.",
    fullDescription: "A FT03 da Mangosteen é uma bicicleta elétrica de proposta funcional, forte e focada principalmente em uso individual. Motor 1000W no cubo traseiro e bateria removível 48V 18Ah. Entrega torque forte, aceleração agressiva e bom desempenho em subidas, inclusive com bateria já abaixo da carga máxima. Autonomia pode chegar próxima de 60 km em condições favoráveis (varia com peso, relevo, assistência, velocidade e uso do acelerador). É de marcha única, sem câmbio; no teste do Lucas as marchas não fizeram falta em subidas fortes. Pedal assistido progressivo, sem entregar toda potência instantaneamente. Em velocidades maiores pode-se sentir pedalando em falso pela relação única. Freios hidráulicos com fluido DOT, com frenagem forte e segura — um dos principais destaques. Suspensão dupla dianteira e um amortecedor traseiro; conforto bom em asfalto irregular, comparável ou até superior à V9 Max e V40 Pro em algumas situações. Pneus largos, guidão estreito que facilita passar entre carros — bike ágil, estreita, ótima ciclística para deslocamento, entregas e uso profissional. Banco curto, geometria para uma pessoa: NÃO recomendada para garupa frequente. Acessórios mais simples: farol dianteiro, lanterna traseira, paralamas e protetor de corrente. NÃO tem setas dianteiras/traseiras, NFC, alarme nem trava dianteira. Menos itens eletrônicos = menos manutenção — pode ser positivo para trabalho e delivery. Painel compacto, boa visibilidade de dia; pode haver pequeno atraso na leitura de velocidade ao soltar o acelerador. Algumas unidades entram em proteção momentânea que exige tocar o freio para reativar o acelerador (é sistema de segurança, não defeito). Ideal para quem quer potência, bateria grande, conforto, frenagem forte e custo-benefício para uso individual, trabalho e delivery. Limite principal: não serve para garupa e tem menos itens de segurança/conveniência que modelos mais completos.",
    image: ft03,
    linkVitale: "https://meli.la/2rxARqN",
    linkMeta: "https://meli.la/1Bu3eju",
    affiliateLink: "https://meli.la/2rxARqN",
    internalPrice: 6343,
    capacity: 1,
    weightSupportKg: 120,
    autonomyKm: 60,
    bestFor: ["urbano", "locomocao_diaria"],
    strengths: ["Motor 1000W com bom torque", "Autonomia até 60 km", "Freios hidráulicos dianteiro e traseiro", "Quadro em liga de alumínio", "Aro 20 com estabilidade e agilidade"],
    budgetTiers: ["ate_7000"],
    diferencial: "Custo-benefício para uso urbano individual",
    perfilIndicado: "Uso urbano, primeira bike elétrica e locomoção diária individual",
  },
  {
    id: "v20_mini",
    name: "V20 Mini",
    shortDescription: "Bike elétrica compacta 750W com design moderno, pneus fat 16 x 4, suspensão e freios hidráulicos duplos. Ideal para mobilidade urbana com estilo, tecnologia e segurança.",
    fullDescription: "A V20 Mini da Inow é uma bike elétrica compacta pensada para pessoas de menor estatura (aprox. 1,55m–1,75m) ou quem valoriza apoiar os pés inteiros no chão. Para usuários muito altos a ergonomia fica apertada mesmo no banco no máximo. Motor 750W no cubo traseiro, bateria removível 48V 13Ah. Apesar de menor potência que modelos 1000W, tem resposta esperta e enfrenta subidas urbanas. Autonomia realista 40–50 km conforme peso, subidas, assistência e condução. Bateria pode ser carregada removida ou na bike; carregador bivolt, sem efeito memória. Três níveis de assistência: nível 1 ~10 km/h, nível 2 ~15 km/h, nível 3 ~32 km/h. Pedal assistido por sensor de giro — basta girar levemente que o motor ajuda. Acelerador de meio punho com pequeno atraso; piloto automático após alguns segundos em velocidade estável, desativado ao frear. Câmbio Shimano 7 marchas. Freios hidráulicos de entrada com boa resposta; upgrade possível no futuro. Pneus fat aro 16 — rodas pequenas facilitam para pessoas mais baixas. Suspensão dupla dianteira + amortecedor traseiro; confortável mesmo com aro menor. Área traseira com apoio para os pés do garupa, mas espaço limitado — duas pessoas menores podem eventualmente usar, mas NÃO é confortável para dois adultos, principalmente se alto ou pesado. Painel pequeno com boa visibilidade de dia (velocidade, assistência, bateria em 5 barras ~20% cada, trip, média, máxima). Seta traseira não aparece no painel. Equipamentos: NFC para ligar, alarme sonoro, buzina, farol dianteiro, lanterna traseira com seta sequencial, paralamas, protetor de corrente. NÃO tem seta dianteira. Recomendada para usuários mais baixos que querem bike completa, compacta, confortável, acessível e fácil de controlar — cidade, faculdade, trabalho e trajetos curtos/médios. Pontos de atenção: espaço reduzido de garupa e ergonomia limitada para pessoas muito altas.",
    image: v20mini,
    linkVitale: "https://meli.la/1rLmRDG",
    linkMeta: "https://meli.la/1bsy2pe",
    affiliateLink: "https://meli.la/1rLmRDG",
    internalPrice: 5916,
    capacity: 2,
    weightSupportKg: 150,
    autonomyKm: 40,
    bestFor: ["urbano", "locomocao_diaria"],
    strengths: ["Motor 750W", "Autonomia até 45 km", "Freios hidráulicos duplos", "Pneus fat 16 x 4", "NFC, alarme, app e Bluetooth", "Display colorido", "Boa para pessoas mais baixas"],
    budgetTiers: ["ate_7000"],
    diferencial: "Compacta, acessível e tecnológica",
    perfilIndicado: "Uso urbano, trajetos curtos, pessoas mais baixas e quem quer uma elétrica moderna e completa",
  },
  {
    id: "v9_max",
    name: "V9 Max",
    shortDescription: "Bike elétrica 1000W urbana com garupa, NFC, alarme, setas e estrutura robusta. Lançamento 2026 com bom desempenho e preço competitivo.",
    fullDescription: "A V9 Max é uma bike elétrica 1000W com motor no cubo traseiro e bateria removível 48V 15,6Ah. Autonomia realista 40–50 km (anúncios divulgam até 60 km). Peso, garupa, subidas, modo de assistência e uso do acelerador influenciam diretamente. Desempenho equilibrado, boa força urbana, velocidade final indicada no painel próxima de 48 km/h. Não é tão rápida/forte quanto a FT03 ou a V8 Pro, mas atende bem deslocamento diário, lazer, trabalho e uso com passageiro. Cinco níveis de assistência, pedal assistido por sensor de giro, acelerador. Câmbio Shimano 7 marchas. Piloto automático mantém a velocidade após alguns segundos, desativado ao frear. Freios hidráulicos com boa capacidade. Suspensão dianteira e traseira confortável para uso urbano — conforto semelhante ao da V40 Pro (compartilham boa parte da estrutura). Pneus fat largos, estabilidade e absorção. Ciclística estável e segura, inclusive com garupa. Banco inteiriço bastante alongado projetado para duas pessoas — o Lucas considera a V9 Max MELHOR que a V20 Pro para dois adultos, banco de ~70–75 cm integrado à geometria. Tem apoio para os pés do passageiro, carga total ~150 kg. Painel com boa visibilidade de dia, inclusive sob sol (diferente de muitos painéis coloridos): velocidade, assistência, bateria, trip. Ponto negativo: seta não aparece no painel, mesmo tendo setas externas. Equipamentos completos: NFC, alarme sonoro, trava na roda dianteira, buzina, farol, lanterna, setas, paralamas, protetor de corrente. Recomendada para quem quer bike completa, confortável, com espaço real para garupa e boa disponibilidade de peças e acessórios — deslocamento urbano, lazer e transporte de duas pessoas. Vs V40 Pro: perde em capacidade de bateria (15,6Ah vs 18Ah), mas costuma ter preço mais competitivo e desempenho muito parecido.",
    image: v9max,
    linkVitale: "https://meli.la/24CEhyq",
    linkMeta: "https://meli.la/18kFW7J",
    affiliateLink: "https://meli.la/24CEhyq",
    internalPrice: 6678,
    capacity: 2,
    weightSupportKg: 150,
    autonomyKm: 50,
    bestFor: ["urbano", "locomocao_diaria"],
    strengths: ["Motor 1000W", "Autonomia até 60 km", "Suporta 2 pessoas", "Freios hidráulicos", "Alarme integrado", "Chave NFC", "Setas dianteiras e traseiras"],
    budgetTiers: ["ate_7000"],
    diferencial: "Boa estrutura com garupa e preço competitivo",
    perfilIndicado: "Locomoção diária, passeio, garupa e uso urbano",
  },
  {
    id: "v10_max",
    name: "V10 Max",
    shortDescription: "Lançamento 2026 – bike elétrica 1000W com motor forte, garupa, marchas Shimano e excelente desempenho em subidas. Ideal para quem busca potência e praticidade.",
    fullDescription: "Lançamento 2026 – Bicicleta Elétrica V10 MAX 1000W. Veículo autopropelido. Motor 1000W, bateria 48V 15.6Ah, velocidade máxima 48 km/h, autonomia 60 km, peso montada 37,1 kg, capacidade máxima 150 kg, aro 20, marchas Shimano, freios hidráulicos, excelente desempenho em subidas e pedal de apoio para garupa.",
    image: v10max,
    linkVitale: "https://meli.la/1jAmJne",
    linkMeta: "https://meli.la/1wj6UXm",
    affiliateLink: "https://meli.la/1jAmJne",
    internalPrice: 10136,
    capacity: 2,
    weightSupportKg: 150,
    autonomyKm: 50,
    bestFor: ["urbano", "locomocao_diaria", "misto"],
    strengths: ["Motor 1000W", "Autonomia até 60 km", "Marchas Shimano", "Freios hidráulicos", "Pedal de apoio para garupa", "Boa em subidas"],
    budgetTiers: ["8000_10000"],
    diferencial: "Equilíbrio entre potência, conforto e uso com garupa",
    perfilIndicado: "Locomoção diária, passeio, garupa e trajetos urbanos mistos",
  },
  {
    id: "v40_pro",
    name: "V40 Pro",
    shortDescription: "Lançamento 2026 – bike elétrica 1000W completa com bateria 48V 18Ah, trava na roda, NFC, alarme e pedal de apoio para garupa. Conforto, segurança e desempenho superiores.",
    fullDescription: "A V40 Pro da Inow usa motor 1000W no cubo traseiro e bateria removível 48V 18Ah. Conjunto muito parecido com o da V9 Max, mas a bateria é ~15% maior — vantagem em autonomia (realista 50–60 km conforme peso, relevo, garupa, condução). Velocidade final indicada próxima de 48 km/h. Apesar da bateria maior, potência e resposta permanecem próximas da V9 Max. A V8 Pro normalmente entrega torque e velocidade final ligeiramente superiores; a V40 Pro se destaca pela autonomia. Cinco níveis de assistência, pedal assistido, acelerador, câmbio Shimano 7 marchas e piloto automático em algumas configurações. Freios hidráulicos, suspensão dianteira e traseira. Conforto semelhante ao da V9 Max. Pneus fat com estabilidade e absorção. Banco alongado para duas pessoas — formato pode variar por versão; boa opção para garupa, mas o espaço/conforto real depende da altura dos dois usuários. Painel semelhante aos demais modelos Inow (velocidade, assistência, bateria, trip); visibilidade razoável de dia; setas não aparecem no display. Bike completa: NFC, alarme sonoro, buzina, trava dianteira, farol, lanterna, setas, paralamas dianteiro e traseiro, protetor de corrente e apoio para o passageiro. Iluminação forte para uso urbano. Indicada para quem quer bike completa, bateria maior, boa autonomia, conforto e possibilidade de garupa. Vs V9 Max: principal vantagem é a bateria 18Ah; principal desvantagem costuma ser o preço superior conforme a oferta.",
    image: v40pro,
    linkVitale: "https://meli.la/31qxfPv",
    linkMeta: "https://meli.la/17iRssR",
    affiliateLink: "https://meli.la/31qxfPv",
    internalPrice: 6999,
    capacity: 2,
    weightSupportKg: 150,
    autonomyKm: 50,
    bestFor: ["urbano", "misto", "subidas"],
    strengths: ["Motor 1000W", "Autonomia até 60 km", "Bateria 48V 18Ah", "Freios hidráulicos", "Marchas Shimano", "NFC, alarme e trava", "Pedal de apoio para garupa"],
    budgetTiers: ["ate_7000"],
    diferencial: "Modelo completo com bateria maior, tecnologia e segurança",
    perfilIndicado: "Uso urbano, passeio, garupa e quem quer uma bike mais completa",
  },
  {
    id: "v8_pro",
    name: "V8 Pro",
    shortDescription: "Bike elétrica 1000W robusta com suspensão dianteira e traseira, freios hidráulicos e cabos internos. Conforto, estabilidade e ótimo desempenho urbano.",
    fullDescription: "A Ouxi V8 Pro é uma bike elétrica 1000W conhecida pelo bom desempenho, banco longo e estrutura adequada para duas pessoas. Motor no cubo traseiro com torque forte, aceleração rápida e velocidade final próxima de 50 km/h. Segundo o Lucas, o motor tem resposta MAIS FORTE do que o da V9 Max e da V40 Pro, mesmo todos sendo 1000W. Bateria removível 48V 15Ah. Autonomia realista 40–50 km (varia com peso, garupa, subidas, velocidade, assistência, uso do acelerador). Bateria um pouco menor que a da V9 Max (15,6Ah) e significativamente menor que a da V40 Pro (18Ah). Cinco níveis de assistência com velocidades progressivas — no teste: modo 1 ~16 km/h, 2 ~23 km/h, 4 ~41 km/h, 5 ~50 km/h. Pedal assistido atua junto com o acelerador. Acelerador pode ser de dedo, meio punho ou outra configuração conforme unidade (Lucas prefere o de dedo). Câmbio Shimano 7 marchas. Freios hidráulicos, suspensão dianteira e traseira dupla — considerada de entrada mas entrega bom conforto/estabilidade. Ciclística firme e previsível, agradável tanto sozinho quanto com passageiro. Banco alongado e bem dimensionado para duas pessoas, com apoio para os pés — entre V8 Pro, V40 Pro e V9 Max é uma das MELHORES para garupa pelo comprimento e conforto. Pneus fat contribuem para estabilidade e conforto. Paralamas, protetor de corrente e, dependendo do lote, pode acompanhar bagageiro/estrutura dianteira para bolsa ou capa de chuva. Painel varia por versão (colorido ou preto e branco). Colorido é visualmente completo (trip, tensão, tempo, assistência), mas difícil sob sol forte. Ponto positivo: indicação das setas APARECE no painel, diferente de vários concorrentes. Farol, lanterna, setas dianteiras e traseiras, buzina — bike completa para uso urbano. Setas dianteiras são diferencial de segurança. Indicada para quem valoriza desempenho, torque, velocidade, capacidade para garupa e boa ciclística. Vs V40 Pro/V9 Max: perde em capacidade de bateria para a V40 Pro, mas normalmente entrega motor mais forte e velocidade final ligeiramente superior.",
    image: v8pro,
    linkVitale: "https://meli.la/2U3yt8C",
    linkMeta: "https://meli.la/23wK89m",
    affiliateLink: "https://meli.la/2U3yt8C",
    internalPrice: 7555,
    capacity: 2,
    weightSupportKg: 120,
    autonomyKm: 50,
    bestFor: ["urbano", "lazer", "locomocao_diaria"],
    strengths: ["Motor 1000W", "Autonomia até 50 km", "Freios hidráulicos", "Suspensão dianteira e traseira", "Pneus fat 20 x 4", "Cabos internos", "Alarme e trava"],
    budgetTiers: ["7000_8000"],
    diferencial: "Visual robusto com dupla suspensão e acabamento refinado",
    perfilIndicado: "Locomoção diária, passeio e uso urbano com mais conforto",
  },
  {
    id: "ouxi_gt20",
    name: "Ouxi GT20",
    shortDescription: "Bike elétrica 1000W com pneus fat, suspensão dupla, freios hidráulicos e versatilidade para cidade, lazer e terrenos irregulares. Pedal assistido e acelerador removível.",
    fullDescription: "A Bicicleta Elétrica OUXI GT20 é opção robusta e moderna para quem busca potência, conforto e versatilidade. Motor 1000W, freios hidráulicos, suspensão dianteira e traseira, pneus Fat Tire 20 x 4.0 — bom desempenho urbano e em terrenos irregulares. Bateria íon de lítio removível 48V 15Ah. Autonomia média até 50 km (varia por peso, terreno, uso). Câmbio Shimano 7 velocidades. Sistema de pedal assistido + acelerador removível — usa como bike normal ou com assistência elétrica. Alarme com controle remoto, painel digital com limitador de velocidade (32 km/h de fábrica, velocidade máxima 32 km/h). Quadro em aço carbono, peso ~35 kg, suporta até 150 kg. Indicada para uso urbano e deslocamentos diários, trilhas, estradas de terra e terrenos irregulares, praia/dunas e lazer. Não exige CNH. Onde se destaca: asfalto, ciclovias, trilhas, terra, areia, obstáculos e percursos urbanos. Envio pré-montado e revisado — selim, pedais, guidão e roda dianteira seguem desmontados; instalação e regulagens finais devem ser feitas por oficina especializada por envolverem ajustes de segurança (alinhamento, apertos, transmissão e freios). Recomenda-se fortemente revisão final por mecânico especializado antes do uso.",
    image: gt20,
    linkVitale: "https://meli.la/26cmu5e",
    linkMeta: "https://meli.la/11bjzGC",
    affiliateLink: "https://meli.la/26cmu5e",
    internalPrice: 6999,
    capacity: 2,
    weightSupportKg: 150,
    autonomyKm: 50,
    bestFor: ["lazer", "passeio", "off_road"],
    strengths: ["Motor 1000W", "Autonomia até 50 km", "Freios hidráulicos", "Suspensão dianteira e traseira", "Pneus fat 20 x 4", "Câmbio Shimano", "Pedal assistido + acelerador"],
    budgetTiers: ["ate_7000"],
    diferencial: "Versatilidade para cidade, lazer e terrenos irregulares",
    perfilIndicado: "Uso urbano, lazer, trajetos mistos e terrenos irregulares",
  },
  {
    id: "v29_pro",
    name: "V29 Pro",
    shortDescription: "Lançamento 2026 – bike elétrica 1000W com bateria dupla 48V 15.6Ah cada, autonomia de até 120 km e estrutura completa para garupa. Iluminação LED com setas e acionamento NFC.",
    fullDescription: "Lançamento 2026 – Bicicleta Elétrica V29 PRO 1000W bateria dupla. Veículo autopropelido. Motor 1000W, duas baterias 48V 15.6Ah cada, velocidade máxima 32 km/h, autonomia até 120 km, peso 47,2 kg, capacidade máxima 150 kg, aro 20, marchas Shimano, freios hidráulicos, farol de LED com setas, alarme integrado, acionamento via NFC, trava de segurança na roda dianteira e pedal de apoio para garupa.",
    image: v29pro,
    linkVitale: "https://meli.la/2erz1iV",
    linkMeta: "https://meli.la/1Y7gKuw",
    affiliateLink: "https://meli.la/2erz1iV",
    internalPrice: 8147,
    capacity: 2,
    weightSupportKg: 150,
    autonomyKm: 100,
    bestFor: ["trabalho", "delivery", "longa_distancia", "locomocao_diaria"],
    strengths: ["Motor 1000W", "Duas baterias 48V 15.6Ah", "Autonomia até 120 km", "Freios hidráulicos", "Suporta 2 pessoas", "Iluminação LED com setas", "Acionamento NFC"],
    budgetTiers: ["8000_10000"],
    diferencial: "Bateria dupla com autonomia estendida e segurança completa",
    perfilIndicado: "Quem roda bastante, usa com garupa e quer mais autonomia",
  },
  {
    id: "v35",
    name: "V35",
    shortDescription: "Bike elétrica 1000W com duas baterias 48V 15.6Ah, autonomia de até 120 km, estrutura robusta e cesto central. Conforto, praticidade e desempenho para uso intenso.",
    fullDescription: "Bicicleta Elétrica V35 Inow 1000W com duas baterias. Veículo autopropelido. Motor 1000W, duas baterias 48V 15.6Ah, velocidade máxima 32 km/h, autonomia até 120 km, peso montada 44 kg, capacidade máxima 150 kg, aro 20, marchas Shimano, freios hidráulicos, cesto central, excelente desempenho em subidas e pedal de apoio para garupa.",
    image: v35,
    linkVitale: "https://meli.la/1fAggCx",
    linkMeta: "https://meli.la/2PzeAL4",
    affiliateLink: "https://meli.la/1fAggCx",
    internalPrice: 8190,
    capacity: 2,
    weightSupportKg: 150,
    autonomyKm: 100,
    bestFor: ["trabalho", "delivery", "longa_distancia", "urbano"],
    strengths: ["Motor 1000W", "Duas baterias 48V 15.6Ah", "Autonomia até 120 km", "Freios hidráulicos", "Cesto central", "Suporta 2 pessoas"],
    budgetTiers: ["8000_10000"],
    diferencial: "Duas baterias com cesto central e boa estrutura urbana",
    perfilIndicado: "Deslocamentos longos, uso urbano intenso e quem quer mais praticidade",
  },
  {
    id: "v8_pro_s",
    name: "V8 Pro S",
    shortDescription: "Bike elétrica 1000W com duas baterias 48V 15Ah, suspensão traseira dupla e autonomia estendida. Indicada para quem roda bastante e precisa de mais alcance e conforto.",
    fullDescription: "V8 PRO-S Panda – bicicleta elétrica com suspensão traseira dupla, quadro em aço carbono, cabos internos, motor 1000W (pico), velocidade 32 km/h (até 50 km/h com pedal assistido), bateria 48V 15Ah de lítio, autonomia de 40 a 60 km por bateria, freios hidráulicos a óleo, 5 níveis de pedal assistido, pneus 20x4.0, cartão NFC, alarme integrado com controle remoto, trava de segurança na roda e suporta até 120 kg.",
    image: v8pros,
    linkVitale: "https://meli.la/14FNcw3",
    linkMeta: "https://meli.la/2hzcknr",
    affiliateLink: "https://meli.la/14FNcw3",
    internalPrice: 8924,
    capacity: 2,
    weightSupportKg: 120,
    autonomyKm: 100,
    bestFor: ["trabalho", "delivery", "longa_distancia"],
    strengths: ["Motor 1000W", "Duas baterias 48V 15Ah", "Autonomia até 120 km", "Freios hidráulicos", "Suspensão dianteira e traseira", "Pneus fat 20 x 4", "Cartão NFC"],
    budgetTiers: ["8000_10000"],
    diferencial: "Duas baterias e mais autonomia para rotina pesada",
    perfilIndicado: "Trabalho, delivery, deslocamentos longos e uso intenso",
  },
  {
    id: "gt2000",
    name: "GT2000",
    shortDescription: "Bike elétrica 1000W de aro 24 com bateria de 30Ah, velocidade de até 50 km/h e proposta robusta. Presença forte, conforto e autonomia para quem quer se destacar.",
    fullDescription: "Bicicleta Elétrica WANSHIDA GT2000 – motor 1000W, bateria íon de lítio 30Ah, velocidade até 50 km/h, autonomia até 60 km, aro 24, peso 37 kg, suporta até 150 kg. Combina robustez e conforto, ideal para deslocamentos diários ou aventuras nos finais de semana.",
    image: gt2000,
    linkVitale: "https://meli.la/2PgtQC7",
    linkMeta: "https://meli.la/1vWYKsq",
    affiliateLink: "https://meli.la/2PgtQC7",
    internalPrice: 10399,
    capacity: 1,
    weightSupportKg: 150,
    autonomyKm: 60,
    bestFor: ["performance", "longa_distancia"],
    strengths: ["Motor 1000W", "Autonomia até 60 km", "Bateria 30Ah", "Aro 24", "Suporta até 150 kg", "Velocidade até 50 km/h"],
    budgetTiers: ["acima_10000"],
    diferencial: "Aro maior, bateria forte e proposta robusta para uso individual",
    perfilIndicado: "Quem quer uma elétrica maior, forte e com boa presença na rua",
  },
  {
    id: "v20_pro",
    name: "V20 Pro",
    shortDescription: "Bike elétrica 1000W estilo street com banco extensor para garupa, bateria 48V 15.6Ah, freios hidráulicos e farol LED com setas. Robusta e com forte presença visual.",
    fullDescription: "V20 Brake PRO – motor 1000W, bateria 48V 15.6Ah, velocidade máxima 48 km/h (desbloqueada, com redução da autonomia), autonomia até 60 km, peso montada 40 kg, capacidade máxima 150 kg, aro 20, marchas Shimano, freios hidráulicos, farol de LED com setas, banco extensor, excelente desempenho em subidas e pedal de apoio para garupa.",
    image: v20ProAsset.url,
    linkVitale: "https://meli.la/13SrJyM",
    linkMeta: "https://meli.la/1qacL3U",
    affiliateLink: "https://meli.la/13SrJyM",
    internalPrice: 7543,
    capacity: 2,
    weightSupportKg: 150,
    autonomyKm: 50,
    bestFor: ["urbano", "lazer", "locomocao_diaria"],
    strengths: ["Motor 1000W", "Bateria 48V 15.6Ah", "Autonomia até 60 km", "Freios hidráulicos", "Marchas Shimano", "Banco extensor para garupa", "Farol LED com setas"],
    budgetTiers: ["7000_8000"],
    diferencial: "Visual estilo street com banco extensor e ótima estrutura para garupa",
    perfilIndicado: "Uso urbano, lazer e quem quer presença visual com garupa confortável",
  },
  {
    id: "s8",
    name: "S8",
    shortDescription: "Bike elétrica Honeywhale S8 450W aro 26, bateria removível 42V 15Ah, freios a disco e suspensão dianteira. Custo-benefício para mobilidade urbana e lazer.",
    fullDescription: "HONEYWHALE S8 – motor 450W (nominal 350W), 3 modos de condução, transmissão mecânica de 7 marchas, bateria removível 42V 15Ah certificada UL2849, autonomia até 50 km, velocidade até 35 km/h, suspensão dianteira, pneus 26\", freios a disco dianteiro e traseiro, tela LCD, farol LED, quadro em aço carbono e suporta até 120 kg.",
    image: honeywhaleS8Asset.url,
    linkVitale: "https://meli.la/1CMkDBZ",
    linkMeta: "https://meli.la/2ptPSat",
    affiliateLink: "https://meli.la/1CMkDBZ",
    internalPrice: 4839,
    capacity: 1,
    weightSupportKg: 120,
    autonomyKm: 50,
    bestFor: ["urbano", "lazer", "locomocao_diaria"],
    strengths: ["Motor 450W eficiente", "Autonomia até 50 km", "Bateria removível 42V 15Ah UL2849", "Freios a disco", "Suspensão dianteira", "Aro 26", "7 marchas mecânicas"],
    budgetTiers: ["ate_7000"],
    diferencial: "Aro 26 estilo MTB com ótimo custo-benefício e bateria certificada",
    perfilIndicado: "Primeira bike elétrica, uso urbano leve, lazer e quem quer entrada acessível",
  },
  {
    id: "bw02",
    name: "BW02",
    shortDescription: "Bike elétrica Honeywhale BW02 dobrável aro 20 com motor 500W (pico 790W), bateria removível 48V 10.4Ah e freios a disco. Compacta e prática para transporte.",
    fullDescription: "HONEYWHALE BW02 – bicicleta elétrica dobrável, motor 500W (pico até 790W), bateria removível 48V 10.4Ah, autonomia até 45 km, velocidade até 40 km/h, pneus 20\", 3 modos de condução (pedal, assistido, totalmente elétrico), freios a disco dianteiros e traseiros, painel LCD, quadro em aço de alto carbono, IPX5 e suporta até 120 kg.",
    image: honeywhaleBw02Asset.url,
    linkVitale: "https://meli.la/2Xs1JWQ",
    linkMeta: "https://meli.la/2WdSoSu",
    affiliateLink: "https://meli.la/2Xs1JWQ",
    internalPrice: 5756,
    capacity: 1,
    weightSupportKg: 120,
    autonomyKm: 40,
    bestFor: ["urbano", "locomocao_diaria"],
    strengths: ["Motor 500W (pico 790W)", "Autonomia até 45 km", "Bateria removível 48V 10.4Ah", "Quadro dobrável", "Freios a disco", "3 modos de condução", "IPX5"],
    budgetTiers: ["ate_7000"],
    diferencial: "Dobrável e compacta, fácil de transportar e guardar",
    perfilIndicado: "Quem precisa de uma elétrica dobrável para apartamento, carro ou transporte público",
  },
  {
    id: "f6_pro_s",
    name: "F6 Pro S",
    shortDescription: "Bike elétrica Honeywhale F6 Pro S dobrável aro 20 com motor 900W de pico, bateria removível 48V 10.4Ah e quadro em liga de alumínio. Leve, prática e veloz.",
    fullDescription: "HONEYWHALE F6 PRO-S – bicicleta elétrica dobrável, motor 500W nominal (pico 900W), bateria removível 48V 10.4Ah, autonomia até 50 km, velocidade até 45 km/h, pneus 20\", 3 modos de condução, câmbio 7 marchas no modo pedal, suspensão dianteira tipo garfo, freios a disco dianteiros e traseiros, tela LCD, quadro em liga de alumínio e suporta até 120 kg.",
    image: f6ProSAsset.url,
    linkVitale: "https://meli.la/2GWkYvG",
    linkMeta: "https://meli.la/27Nb3zp",
    affiliateLink: "https://meli.la/2GWkYvG",
    internalPrice: 5819,
    capacity: 1,
    weightSupportKg: 120,
    autonomyKm: 40,
    bestFor: ["urbano", "locomocao_diaria", "lazer"],
    strengths: ["Motor pico 900W", "Autonomia até 50 km", "Quadro dobrável em alumínio", "Câmbio 7 marchas", "Suspensão dianteira", "Freios a disco", "Velocidade até 45 km/h"],
    budgetTiers: ["ate_7000"],
    diferencial: "Dobrável em alumínio mais leve, com 7 marchas e boa velocidade",
    perfilIndicado: "Uso urbano, lazer e quem quer uma dobrável leve, prática e com bom desempenho",
  },
  {
    id: "v8_ultra",
    name: "V8 Ultra",
    shortDescription: "Transforme seus deslocamentos com a poderosa Bicicleta Elétrica Ouxi V8Ultra! Motor de 1000W e bateria lítio removível de alta capacidade. Perfeita para o dia a dia na cidade, trabalho ou lazer.",
    fullDescription: "Transforme seus deslocamentos com a poderosa Bicicleta Elétrica Ouxi V8Ultra! Com motor de 1000W e bateria lítio removível de alta capacidade, essa bike elétrica oferece liberdade total: vá mais longe, suba ladeiras com facilidade e chegue sem cansar. Perfeita para o dia a dia na cidade, trabalho ou lazer – economia, praticidade e diversão em um só produto! Potência e liberdade total com a Bicicleta Elétrica Ouxi V8Ultra – SEM necessidade de CNH! Motor de 1000W, autonomia de até 80km e três modos de pilotagem (puro elétrico, assistido e pedal tradicional) – tudo para transformar seus deslocamentos urbanos em algo prático, econômico e divertido. Design robusto, conforto premium e praticidade que cabe no seu dia a dia! Motor ultra potente de 1000W: aceleração rápida, força para subidas e desempenho consistente em qualquer terreno. Bateria lítio 48V 15Ah removível: autonomia real de 70-80km, recarga completa em apenas 6-7 horas e fácil de retirar para carregar em casa ou no trabalho. Três modos de uso inteligentes: puro elétrico (sem pedalar), assistência ao pedal ou modo tradicional – adapta-se perfeitamente ao seu estilo e dispensa CNH conforme legislação vigente. Freios hidráulicos de alta performance: parada segura e precisa, mesmo em alta velocidade ou condições molhadas. Suspensão dianteira escondida: absorve impactos para uma pilotagem suave e confortável em ruas irregulares. Cesta frontal inclusa: leve compras, mochila ou objetos do dia a dia com praticidade. Chassi em aço reforçado: suporta até 120kg com total estabilidade e durabilidade. Velocidade máxima de 50km/h: ágil no trânsito urbano com segurança e controle. Design moderno na cor preta: visual agressivo e discreto que chama atenção.",
    image: v8UltraAsset.url,
    linkVitale: "https://meli.la/2keMDer",
    linkMeta: "https://meli.la/2fQre72",
    affiliateLink: "https://meli.la/2keMDer",
    internalPrice: 7655,
    capacity: 2,
    weightSupportKg: 150,
    autonomyKm: 50,
    bestFor: ["urbano", "locomocao_diaria", "lazer"],
    strengths: ["Motor 1000W", "Autonomia até 80 km", "Bateria lítio 48V 15Ah removível", "Freios hidráulicos", "Suspensão dianteira escondida", "Cesta frontal inclusa", "Três modos de pilotagem", "SEM necessidade de CNH"],
    budgetTiers: ["7000_8000"],
    diferencial: "Motor 1000W, autonomia até 80km e três modos de pilotagem sem necessidade de CNH",
    perfilIndicado: "Uso urbano, trabalho ou lazer – economia, praticidade e diversão",
  },
  {
    id: "coswheel_gt20",
    name: "Coswheel GT20",
    shortDescription: "Bike elétrica premium estilo moto com motor 1500W, bateria 48V 20Ah certificada UL, pneus fat 20 x 4 e suspensão dupla. Alto desempenho, visual imponente e autonomia de longo alcance.",
    fullDescription: "Coswheel GT20 – motocicleta elétrica para adultos com motor 1500W e controlador 20A, torque de 80 Nm, bateria removível 48V 20Ah certificada UL com BMS, autonomia 130 a 150 km, pneus fat 20x4.0, freios a disco hidráulicos dianteiro e traseiro, suspensão dupla, marchas Shimano 7 velocidades, faróis olho de anjo, setas dianteiras e traseiras, luz de freio LED e tela LCD grande.",
    image: coswheelGt20,
    linkVitale: "https://meli.la/1VNfe6A",
    linkMeta: "https://meli.la/1XWY65V",
    affiliateLink: "https://meli.la/1VNfe6A",
    internalPrice: 20900,
    capacity: 1,
    weightSupportKg: 165,
    autonomyKm: 60,
    bestFor: ["premium", "performance"],
    strengths: ["Motor 1500W", "Autonomia até 150 km", "Bateria 48V 20Ah UL", "Pneus fat 20 x 4", "Freios hidráulicos", "Suspensão dupla", "Visual premium"],
    budgetTiers: ["acima_10000"],
    diferencial: "Visual premium, motor 1500W e construção exclusiva",
    perfilIndicado: "Quem busca uma elétrica premium, forte, com visual diferenciado e maior presença",
  },
];

// ---------- Meta vs Vitale link resolution ----------

const META_UTM_TOKENS = /(^|[^a-z])(meta|facebook|fb|instagram|ig)([^a-z]|$)/i;

/**
 * Decide se o tráfego veio da Meta Ads (Facebook/Instagram pago)
 * com base em UTMs, traffic_origin e fbclid. Case-insensitive.
 */
export function isMetaTraffic(tracking: {
  utm_source?: string | null;
  traffic_origin?: string | null;
  fbclid?: string | null;
} | null | undefined): boolean {
  if (!tracking) return false;
  const utm = (tracking.utm_source ?? "").toString().toLowerCase().trim();
  if (utm && META_UTM_TOKENS.test(utm)) return true;
  const origin = (tracking.traffic_origin ?? "").toString().toLowerCase().trim();
  if (origin === "meta" || origin === "meta_referral") return true;
  const fbclid = (tracking.fbclid ?? "").toString().trim();
  if (fbclid.length > 0) return true;
  return false;
}

/**
 * Retorna { url, group } com o link de compra correto para a bike,
 * conforme a origem do tráfego. Faz fallback seguro entre os dois links.
 */
export function getPurchaseLink(
  bike: Pick<Bike, "linkVitale" | "linkMeta" | "affiliateLink" | "name" | "id">,
  tracking: { utm_source?: string | null; traffic_origin?: string | null; fbclid?: string | null } | null | undefined,
): { url: string; group: "meta" | "vitale" } {
  const meta = isMetaTraffic(tracking);
  const vitale = bike.linkVitale || bike.affiliateLink || "";
  const metaLink = bike.linkMeta || "";

  if (meta) {
    if (metaLink) return { url: metaLink, group: "meta" };
    if (vitale) {
      console.warn("[purchase-link] linkMeta ausente — fallback para linkVitale", bike.id);
      return { url: vitale, group: "vitale" };
    }
    console.error("[purchase-link] Nenhum link disponível para a bike", bike.id);
    return { url: "", group: "meta" };
  }
  if (vitale) return { url: vitale, group: "vitale" };
  if (metaLink) {
    console.warn("[purchase-link] linkVitale ausente — fallback para linkMeta", bike.id);
    return { url: metaLink, group: "meta" };
  }
  console.error("[purchase-link] Nenhum link disponível para a bike", bike.id);
  return { url: "", group: "vitale" };
}
