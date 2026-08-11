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
import ouxiGt20ProAsset from "@/assets/bikes/ouxi-gt20-pro.png.asset.json";
import d50CrossAsset from "@/assets/bikes/d50-cross.png.asset.json";

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
    linkVitale: "https://meli.la/2BLHybP",
    linkMeta: "https://meli.la/2BLHybP",
    affiliateLink: "https://meli.la/2BLHybP",
    internalPrice: 6133,
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
    fullDescription: "A V20 Mini da Inow é uma bike elétrica compacta pensada para pessoas de menor estatura (aprox. 1,55m–1,75m) ou quem valoriza apoiar os pés inteiros no chão. Para usuários muito altos a ergonomia fica apertada mesmo no banco no máximo. Motor 750W no cubo traseiro, bateria removível 48V 13Ah. Apesar de menor potência que modelos 1000W, tem resposta esperta e enfrenta subidas urbanas. Autonomia até 40 km conforme peso, subidas, assistência e condução. Bateria pode ser carregada removida ou na bike; carregador bivolt, sem efeito memória. Três níveis de assistência: nível 1 ~10 km/h, nível 2 ~15 km/h, nível 3 ~32 km/h. Pedal assistido por sensor de giro — basta girar levemente que o motor ajuda. Acelerador de meio punho com pequeno atraso; piloto automático após alguns segundos em velocidade estável, desativado ao frear. Câmbio Shimano 7 marchas. Freios hidráulicos de entrada com boa resposta; upgrade possível no futuro. Pneus fat aro 16 — rodas pequenas facilitam para pessoas mais baixas. Suspensão dupla dianteira + amortecedor traseiro; confortável mesmo com aro menor. Área traseira com apoio para os pés do garupa, mas espaço limitado — duas pessoas menores podem eventualmente usar, mas NÃO é confortável para dois adultos, principalmente se alto ou pesado. Painel pequeno com boa visibilidade de dia (velocidade, assistência, bateria em 5 barras ~20% cada, trip, média, máxima). Seta traseira não aparece no painel. Equipamentos: NFC para ligar, alarme sonoro, buzina, farol dianteiro, lanterna traseira com seta sequencial, paralamas, protetor de corrente. NÃO tem seta dianteira. Recomendada para usuários mais baixos que querem bike completa, compacta, confortável, acessível e fácil de controlar — cidade, faculdade, trabalho e trajetos curtos/médios. Pontos de atenção: espaço reduzido de garupa e ergonomia limitada para pessoas muito altas.",
    image: v20mini,
    linkVitale: "https://meli.la/2RBcChy",
    linkMeta: "https://meli.la/2RBcChy",
    affiliateLink: "https://meli.la/2RBcChy",
    internalPrice: 5713,
    capacity: 2,
    weightSupportKg: 150,
    autonomyKm: 40,
    bestFor: ["urbano", "locomocao_diaria"],
    strengths: ["Motor 750W", "Autonomia até 40 km", "Freios hidráulicos duplos", "Pneus fat 16 x 4", "NFC, alarme, app e Bluetooth", "Display colorido", "Boa para pessoas mais baixas"],
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
    linkVitale: "https://meli.la/2zwJe51",
    linkMeta: "https://meli.la/2zwJe51",
    affiliateLink: "https://meli.la/2zwJe51",
    internalPrice: 6537,
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
    fullDescription: "Lançamento 2026 – Bicicleta Elétrica V10 MAX 1000W. Veículo autopropelido. Motor 1000W, bateria 48V 15.6Ah, velocidade máxima 48 km/h, autonomia até 50 km, peso montada 37,1 kg, capacidade máxima 150 kg, aro 20, marchas Shimano, freios hidráulicos, excelente desempenho em subidas e pedal de apoio para garupa.",
    image: v10max,
    linkVitale: "https://meli.la/1jAmJne",
    linkMeta: "https://meli.la/1jAmJne",
    affiliateLink: "https://meli.la/1jAmJne",
    internalPrice: 10136,
    capacity: 2,
    weightSupportKg: 150,
    autonomyKm: 50,
    bestFor: ["urbano", "locomocao_diaria", "misto"],
    strengths: ["Motor 1000W", "Autonomia até 50 km", "Marchas Shimano", "Freios hidráulicos", "Pedal de apoio para garupa", "Boa em subidas"],
    budgetTiers: ["8000_10000"],
    diferencial: "Equilíbrio entre potência, conforto e uso com garupa",
    perfilIndicado: "Locomoção diária, passeio, garupa e trajetos urbanos mistos",
  },
  {
    id: "v40_pro",
    name: "V40 Pro",
    shortDescription: "Lançamento 2026 – bike elétrica 1000W completa com bateria 48V 18Ah, trava na roda, NFC, alarme e pedal de apoio para garupa. Conforto, segurança e desempenho superiores.",
    fullDescription: "A V40 Pro da Inow usa motor 1000W no cubo traseiro e bateria removível 48V 18Ah. Conjunto muito parecido com o da V9 Max, mas a bateria é ~15% maior — vantagem em autonomia (realista até 50 km conforme peso, relevo, garupa, condução). Velocidade final indicada próxima de 48 km/h. Apesar da bateria maior, potência e resposta permanecem próximas da V9 Max. A V8 Pro normalmente entrega torque e velocidade final ligeiramente superiores; a V40 Pro se destaca pela autonomia. Cinco níveis de assistência, pedal assistido, acelerador, câmbio Shimano 7 marchas e piloto automático em algumas configurações. Freios hidráulicos, suspensão dianteira e traseira. Conforto semelhante ao da V9 Max. Pneus fat com estabilidade e absorção. Banco alongado para duas pessoas — formato pode variar por versão; boa opção para garupa, mas o espaço/conforto real depende da altura dos dois usuários. Painel semelhante aos demais modelos Inow (velocidade, assistência, bateria, trip); visibilidade razoável de dia; setas não aparecem no display. Bike completa: NFC, alarme sonoro, buzina, trava dianteira, farol, lanterna, setas, paralamas dianteiro e traseiro, protetor de corrente e apoio para o passageiro. Iluminação forte para uso urbano. Indicada para quem quer bike completa, bateria maior, boa autonomia, conforto e possibilidade de garupa. Vs V9 Max: principal vantagem é a bateria 18Ah; principal desvantagem costuma ser o preço superior conforme a oferta.",
    image: v40pro,
    linkVitale: "https://meli.la/2YSVbMJ",
    linkMeta: "https://meli.la/2YSVbMJ",
    affiliateLink: "https://meli.la/2YSVbMJ",
    internalPrice: 6983,
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
    linkVitale: "https://meli.la/1pnSAqo",
    linkMeta: "https://meli.la/1pnSAqo",
    affiliateLink: "https://meli.la/1pnSAqo",
    internalPrice: 7185,
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
    linkVitale: "https://meli.la/2mTotmX",
    linkMeta: "https://meli.la/2mTotmX",
    affiliateLink: "https://meli.la/2mTotmX",
    internalPrice: 6627,
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
    id: "ouxi_gt20_pro",
    name: "Ouxi GT20 Pro (Panda GT20 Pro)",
    shortDescription: "Pneu off-road, motor 1000W, freios hidráulicos, suspensão dianteira e traseira e pneus Fat Tire 20 x 4.0. Ideal para quem quer potência, conforto e versatilidade em vias urbanas e terrenos irregulares.",
    fullDescription: "A Bicicleta Elétrica Panda GT20 Pro (Ouxi GT20 Pro) é a escolha ideal para quem busca potência, conforto e versatilidade. Design moderno e estrutura robusta, equipada com motor de 1000W, freios hidráulicos, suspensão dianteira e traseira e pneus Fat Tire aro 20, oferece excelente desempenho tanto em vias urbanas quanto em terrenos irregulares. Conta com sistema de pedal assistido e acelerador removível, permitindo que você pedale normalmente ou utilize a assistência elétrica conforme sua necessidade. Uma bicicleta elétrica potente, segura e confortável, ideal para o dia a dia, momentos de lazer e aventuras ao ar livre. Câmbio Shimano de 7 velocidades. Alarme com controle remoto. Painel digital com limitador de velocidade. Indicada para uso urbano e deslocamentos diários, trilhas, estradas de terra e terrenos irregulares, praias, dunas e áreas de lazer. Onde se destaca: asfalto e ciclovias, trilhas e estradas de terra, terrenos com areia ou obstáculos, percursos urbanos e áreas de lazer. Não exige CNH.",
    image: ouxiGt20ProAsset.url,
    linkVitale: "https://meli.la/2rQZDRo",
    linkMeta: "https://meli.la/2rQZDRo",
    affiliateLink: "https://meli.la/2rQZDRo",
    internalPrice: 6984,
    capacity: 2,
    weightSupportKg: 150,
    autonomyKm: 50,
    bestFor: ["urbano", "lazer", "passeio", "off_road"],
    strengths: ["Motor 1000W", "Autonomia até 50 km", "Freios hidráulicos", "Suspensão dianteira e traseira", "Pneus Fat Tire 20 x 4.0", "Câmbio Shimano 7 velocidades", "Pedal assistido + acelerador removível", "Alarme com controle remoto"],
    budgetTiers: ["ate_7000"],
    diferencial: "Pneu off-road, motor forte e suspensão completa para urbano e trilhas leves",
    perfilIndicado: "Uso urbano, lazer, trilhas, praia/dunas e quem quer mobilidade elétrica sem CNH",
  },
  {
    id: "v29_pro",
    name: "V29 Pro",
    shortDescription: "Lançamento 2026 – bike elétrica 1000W com bateria dupla 48V 15.6Ah cada, autonomia de até 120 km e estrutura completa para garupa. Iluminação LED com setas e acionamento NFC.",
    fullDescription: "A V29 Pro é uma bike elétrica 1000W com motor no cubo traseiro e DUAS baterias removíveis 48V 15,6Ah cada (capacidade combinada >31Ah). Autonomia estimada 80–100 km em uso moderado (varia com peso, relevo, garupa, assistência, velocidade, uso do acelerador). Indicada principalmente para quem roda longas distâncias: entregadores, vendedores, profissionais externos, quem mora longe do trabalho. As duas baterias ficam instaladas — reduz a necessidade de parar para recarregar. Motor com boa força e desempenho urbano. Pedal assistido, diferentes níveis de assistência e acelerador. Câmbio 7 marchas, ajuda em subidas e trajetos longos. Freios hidráulicos com boa capacidade. Suspensão dianteira e traseira MUITO CONFORTÁVEL — no comparativo do Lucas, empatou com a V35 e ficou ligeiramente acima da V8 Pro S. Pneus fat ~4 polegadas: estabilidade e absorção. Banco BIPARTIDO: parte traseira é uma almofada sobre estrutura tipo bagageiro. Transporta duas pessoas, mas a almofada ultrapassa parcialmente o eixo da roda — atenção ao peso e distribuição. Entre V29 Pro, V35 e V8 Pro S, o Lucas considera a V29 Pro a MENOS CONFORTÁVEL para dois adultos. Em compensação, o banco bipartido é extremamente versátil: almofada removível para instalar baú de entregas, suporte de carga ou cadeirinha infantil — pode ser mais funcional que banco inteiriço para certos profissionais e famílias. Farol dianteiro/traseiro com boa iluminação, setas dianteiras (separadas do facho, bem visíveis) e traseiras sequenciais em vermelho (menos claras para outros veículos). Tem NFC, alarme, buzina, paralamas, protetor de corrente e apoio para o passageiro. Painel com velocidade, bateria, assistência, distância; visibilidade pode ser limitada sob sol forte dependendo do lote. Excelente para quem prioriza autonomia, versatilidade e uso profissional. Diferencial: alternar facilmente entre garupa, cadeirinha e baú. Para dois adultos com frequência, V8 Pro S e V35 têm bancos mais adequados.",
    image: v29pro,
    linkVitale: "https://meli.la/1LP5i2E",
    linkMeta: "https://meli.la/1LP5i2E",
    affiliateLink: "https://meli.la/1LP5i2E",
    internalPrice: 9899,
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
    fullDescription: "A V35 da Inow é uma bike elétrica 1000W com motor no cubo traseiro e DUAS baterias removíveis, desenvolvida para usuários que percorrem longas distâncias. Autonomia estimada 80–100 km em condições favoráveis (varia com peso, relevo, garupa, assistência, velocidade). Construção robusta e visual diferenciado, boa qualidade de acabamento — Lucas destaca a estética. Diferentes níveis de assistência, pedal assistido e acelerador. Câmbio 7 marchas — ciclista contribui com o motor e adapta ao terreno. Freios hidráulicos, boa segurança para bike pesada e rápida. Suspensão é um dos DESTAQUES — no comparativo com V29 Pro e V8 Pro S, ficou empatada com V29 Pro como a mais confortável, absorvendo melhor que a V8 Pro S na configuração original. Pneus fat 4\" com estabilidade e conforto, mais segurança em pisos irregulares (aumenta peso e resistência ao rolamento). Banco INTEIRIÇO e alongado para duas pessoas — mais adequado que o bipartido da V29 Pro para garupa, porém um pouco menor que o da V8 Pro S. Para dois usuários altos pode ficar apertado. No comparativo do Lucas, a V35 ficou em segundo lugar para garupa: atrás da V8 Pro S e à frente da V29 Pro. Farol dianteiro/traseiro de boa iluminação, setas dianteiras (separadas do farol, bem visíveis) e traseiras sequenciais em vermelho (menos perceptíveis por outros veículos). Tem NFC, alarme, buzina, paralamas dianteiro e traseiro, protetor de corrente e apoio para garupa. Painel com velocidade, bateria, assistência, trip; visualização sob sol forte pode não ser ideal (comum nos painéis coloridos). Indicada para quem quer grande autonomia, bom conforto de suspensão, acabamento superior e capacidade para duas pessoas — longos deslocamentos, lazer, garupa e uso profissional. Atenção: peso elevado das duas baterias e banco pode ficar curto para dois adultos altos.",
    image: v35,
    linkVitale: "https://meli.la/1fAggCx",
    linkMeta: "https://meli.la/1fAggCx",
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
    fullDescription: "A Ouxi V8 Pro S usa a mesma base estrutural da V8 Pro, mas acrescenta DUAS baterias removíveis 48V 15Ah cada (~30Ah combinada). Autonomia estimada 80–100 km em condições favoráveis (menos com garupa, peso alto, muitas subidas, velocidade alta e uso constante do acelerador). Motor 1000W no cubo traseiro, desempenho forte, aceleração boa e velocidade final semelhante à V8 Pro convencional. Entre as bikes de duas baterias analisadas pelo Lucas, a V8 Pro S se destaca pelo EQUILÍBRIO entre desempenho, autonomia e conforto para duas pessoas. Câmbio Shimano 7 marchas, pedal assistido com diferentes níveis e acelerador. Características do acelerador e painel podem variar por lote. Suspensão dianteira e traseira dupla — no comparativo com V29 Pro e V35, essas duas são um pouco mais confortáveis em suspensão, mas a V8 Pro S continua sendo confortável (pode ser melhorada com amortecedores diferentes se quiser condução ainda mais macia). Pneus fat ~4\" para estabilidade, aderência e absorção. Banco INTEIRIÇO e alongado é um dos principais diferenciais — entre V29 Pro, V35 e V8 Pro S, Lucas considera a V8 Pro S a MELHOR para dois adultos: banco longo integrado à geometria. Farol dianteiro/traseiro de boa intensidade; setas dianteiras separadas do facho, fáceis de identificar; traseira sequencial em vermelho como a lanterna (reduz visibilidade). Costuma oferecer NFC, alarme, paralamas dianteiro e traseiro, protetor de corrente, buzina e apoio para os pés do passageiro. Conjunto voltado para quem roda muito e precisa de bike completa. Indicada especialmente para entregadores, vendedores, profissionais de longas distâncias e quem precisa levar garupa com frequência. Ponto forte: banco muito confortável para dois adultos + motor forte + autonomia elevada. Atenção: peso maior das duas baterias e investimento superior ao da V8 Pro convencional.",
    image: v8pros,
    linkVitale: "https://meli.la/14FNcw3",
    linkMeta: "https://meli.la/14FNcw3",
    affiliateLink: "https://meli.la/14FNcw3",
    internalPrice: 8656,
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
    fullDescription: "A Bicicleta Elétrica WANSHIDA GT2000 é opção para quem busca potência e performance. Motor 1000W, velocidade até 50 km/h, experiência de ciclismo ágil e emocionante. Bateria íon de lítio 30Ah para autonomia prolongada. Suporta até 150 kg, aro 24 para condução suave em diversos terrenos, peso ~37 kg. Autonomia até 60 km, capacidade individual. Ideal para deslocamentos diários ou aventuras de fim de semana. Garantia: 3 meses. Atenção — o produto vai pré-montado em caixa de papelão; para montar é preciso instalar rodas, freios, guidão, cestinha, ligação das baterias e alguns componentes elétricos. Recomenda-se fortemente que a montagem seja feita por um profissional para não perder a garantia. A correta montagem é essencial para a segurança. Antes do primeiro uso, carregue por pelo menos 8 horas.",
    image: gt2000,
    linkVitale: "https://meli.la/17m3pC8",
    linkMeta: "https://meli.la/17m3pC8",
    affiliateLink: "https://meli.la/17m3pC8",
    internalPrice: 10019,
    capacity: 1,
    weightSupportKg: 150,
    autonomyKm: 60,
    bestFor: ["performance", "longa_distancia"],
    strengths: ["Motor 1000W", "Autonomia até 60 km", "Bateria 30Ah", "Aro 24", "Suporta até 150 kg", "Velocidade até 50 km/h"],
    budgetTiers: ["8000_10000"],
    diferencial: "Aro maior, bateria forte e proposta robusta para uso individual",
    perfilIndicado: "Quem quer uma elétrica maior, forte e com boa presença na rua",
  },
  {
    id: "v20_pro",
    name: "V20 Pro",
    shortDescription: "Bike elétrica 1000W estilo street com banco extensor para garupa, bateria 48V 15.6Ah, freios hidráulicos e farol LED com setas. Robusta e com forte presença visual.",
    fullDescription: "A V20 Pro da Inow é uma bike elétrica versátil, desenvolvida para locomoção urbana, trabalho, transporte de carga leve e uso familiar. Motor 1000W no cubo traseiro e bateria removível 48V 15,6Ah. Desempenho semelhante ao da V9 Max e V40 Pro: boa força em subidas, aceleração adequada e velocidade final próxima de 48 km/h. Autonomia realista 40–50 km (algumas divulgações informam até 60 km, considerando condutor leve, terreno plano, assistência baixa e boa contribuição nos pedais). Peso elevado, garupa, subidas e uso constante no máximo reduzem a autonomia. Cinco níveis de assistência + nível zero (bike convencional). Pedal assistido por sensor de giro. Acelerador de meio punho e piloto automático (mantém velocidade após alguns segundos de aceleração constante). Câmbio Shimano 7 marchas. Freios hidráulicos com boa resposta. Suspensão dupla dianteira e um amortecedor traseiro — mesmo com um único amortecedor traseiro, considerada confortável e bem acertada para uso urbano. PRINCIPAL DIFERENCIAL: banco BIPARTIDO. A parte traseira funciona como bagageiro com almofada removível — transporta segunda pessoa, instala cadeirinha infantil ou remove a almofada para colocar baú de trabalho. Interessante para pais/mães, entregadores, vendedores e quem transporta equipamentos. Apesar de comportar duas pessoas e ter apoio para os pés, NÃO oferece o mesmo conforto para dois adultos que a V9 Max — banco traseiro fica parcialmente além do eixo da roda, exigindo cuidado com distribuição de peso. Para garupa frequente a V9 Max tende a ser mais equilibrada; para baú/cadeirinha, a V20 Pro é mais versátil. Painel semelhante ao da V9 Max (velocidade, assistência, bateria em 10 barras, trip, hodômetro, tensão). Visibilidade aceitável, grafismo pouco atraente e seta não aparece no display. Equipamentos: NFC, alarme sonoro, trava dianteira, buzina forte, farol, lanterna, setas, paralamas dianteiro e traseiro, protetor de corrente. Alarme sonoro (não trava fisicamente a roda). Recomendada para quem precisa de flexibilidade — deslocamento diário, uso familiar, trabalho, delivery e transporte de pequenos volumes. Diferencial: transformar a área traseira conforme a necessidade. Atenção: conforto inferior para dois adultos vs banco inteiriço e distribuição de peso no banco traseiro.",
    image: v20ProAsset.url,
    linkVitale: "https://meli.la/2Wypscv",
    linkMeta: "https://meli.la/2Wypscv",
    affiliateLink: "https://meli.la/2Wypscv",
    internalPrice: 6199,
    capacity: 2,
    weightSupportKg: 150,
    autonomyKm: 50,
    bestFor: ["urbano", "lazer", "locomocao_diaria"],
    strengths: ["Motor 1000W", "Bateria 48V 15.6Ah", "Autonomia até 60 km", "Freios hidráulicos", "Marchas Shimano", "Banco extensor para garupa", "Farol LED com setas"],
    budgetTiers: ["ate_7000"],
    diferencial: "Visual estilo street com banco extensor e ótima estrutura para garupa",
    perfilIndicado: "Uso urbano, lazer e quem quer presença visual com garupa confortável",
  },
  {
    id: "s8",
    name: "S8",
    shortDescription: "Bike elétrica Honeywhale S8 450W aro 26, bateria removível 42V 15Ah, freios a disco e suspensão dianteira. Custo-benefício para mobilidade urbana e lazer.",
    fullDescription: "HONEYWHALE S8 – motor 450W (nominal 350W), 3 modos de condução, transmissão mecânica de 7 marchas, bateria removível 42V 15Ah certificada UL2849, autonomia até 50 km, velocidade até 35 km/h, suspensão dianteira, pneus 26\", freios a disco dianteiro e traseiro, tela LCD, farol LED, quadro em aço carbono e suporta até 120 kg.",
    image: honeywhaleS8Asset.url,
    linkVitale: "https://meli.la/1GmkEAA",
    linkMeta: "https://meli.la/1GmkEAA",
    affiliateLink: "https://meli.la/1GmkEAA",
    internalPrice: 4586,
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
    linkVitale: "https://meli.la/16LyJTc",
    linkMeta: "https://meli.la/16LyJTc",
    affiliateLink: "https://meli.la/16LyJTc",
    internalPrice: 4999,
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
    fullDescription: "HONEYWHALE F6 PRO-S – bicicleta elétrica dobrável, motor 500W nominal (pico 900W), bateria removível 48V 10.4Ah, autonomia até 40 km, velocidade até 45 km/h, pneus 20\", 3 modos de condução, câmbio 7 marchas no modo pedal, suspensão dianteira tipo garfo, freios a disco dianteiros e traseiros, tela LCD, quadro em liga de alumínio e suporta até 120 kg.",
    image: f6ProSAsset.url,
    linkVitale: "https://meli.la/2GWkYvG",
    linkMeta: "https://meli.la/2GWkYvG",
    affiliateLink: "https://meli.la/2GWkYvG",
    internalPrice: 5999,
    capacity: 1,
    weightSupportKg: 120,
    autonomyKm: 40,
    bestFor: ["urbano", "locomocao_diaria", "lazer"],
    strengths: ["Motor pico 900W", "Autonomia até 40 km", "Quadro dobrável em alumínio", "Câmbio 7 marchas", "Suspensão dianteira", "Freios a disco", "Velocidade até 45 km/h"],
    budgetTiers: ["ate_7000"],
    diferencial: "Dobrável em alumínio mais leve, com 7 marchas e boa velocidade",
    perfilIndicado: "Uso urbano, lazer e quem quer uma dobrável leve, prática e com bom desempenho",
  },
  {
    id: "v8_ultra",
    name: "V8 Ultra",
    shortDescription: "Transforme seus deslocamentos com a poderosa Bicicleta Elétrica Ouxi V8Ultra! Motor de 1000W e bateria lítio removível de alta capacidade. Perfeita para o dia a dia na cidade, trabalho ou lazer.",
    fullDescription: "Bicicleta Elétrica Ouxi V8 Ultra — motor 1000W e bateria de lítio removível de alta capacidade. Autonomia até 50 km em modo assistido, recarga em 6–7 horas, fácil de retirar para carregar em casa ou no trabalho. Três modos: puro elétrico (sem pedalar), assistido ao pedal e pedal tradicional — dispensa CNH conforme legislação vigente. Freios hidráulicos de alta performance para parada segura em alta velocidade ou condições molhadas. Suspensão dianteira escondida absorve impactos em ruas irregulares. Cesta frontal inclusa para compras/mochila. Chassi em aço reforçado, suporta até 120 kg (algumas descrições apontam até 150 kg — priorize 120 kg como referência conservadora). Velocidade máxima 50 km/h (chega limitada a 32 km/h — desbloqueio via atendimento). Aro 20\" (98-406), peso ~45 kg, dimensões 139x28x88 cm. Design moderno preto. Acompanha: bike completa, bateria 48V 15Ah removível, carregador universal (100-240V), cesta frontal e manual. FAQ: não precisa de CNH; autonomia até 50 km em modo assistido varia com peso/terreno/velocidade; bateria removível facilita carregamento; estrutura em aço com freios hidráulicos e suspensão para conforto e segurança.",
    image: v8UltraAsset.url,
    linkVitale: "https://meli.la/2FYMmKk",
    linkMeta: "https://meli.la/2FYMmKk",
    affiliateLink: "https://meli.la/2FYMmKk",
    internalPrice: 7282,
    capacity: 2,
    weightSupportKg: 150,
    autonomyKm: 50,
    bestFor: ["urbano", "locomocao_diaria", "lazer"],
    strengths: ["Motor 1000W", "Autonomia até 50 km", "Bateria lítio 48V 15Ah removível", "Freios hidráulicos", "Suspensão dianteira escondida", "Cesta frontal inclusa", "Três modos de pilotagem", "SEM necessidade de CNH"],
    budgetTiers: ["7000_8000"],
    diferencial: "Motor 1000W, autonomia até 80km e três modos de pilotagem sem necessidade de CNH",
    perfilIndicado: "Uso urbano, trabalho ou lazer – economia, praticidade e diversão",
  },
  {
    id: "coswheel_gt20",
    name: "Coswheel GT20",
    shortDescription: "Bike elétrica premium estilo moto com motor 1500W, bateria 48V 20Ah certificada UL, pneus fat 20 x 4 e suspensão dupla. Alto desempenho, visual imponente e autonomia de longo alcance.",
    fullDescription: "A Coswheel GT20 é uma bike elétrica de categoria SUPERIOR, com componentes mais robustos e desempenho próximo ao de uma pequena motocicleta elétrica. Motor 1000W (algumas versões 1500W) e bateria removível 48V 20Ah — grande capacidade, autonomia próxima de 60 km (pode chegar a 130–150 km em condições ideais em versões maiores). Motor com aceleração forte e velocidade final elevada — no teste, painel marcou ~60 km/h (mais alto com roda suspensa). Bike rápida, indicada para usuários experientes ou quem quer desempenho acima da média. Cinco níveis de assistência, pedal assistido e acelerador de meio punho. Pedal assistido relativamente progressivo. Acelerador de meio punho pode exigir adaptação — pode ser substituído por acelerador de dedo ou punho completo. Câmbio Shimano 7 marchas (seletor não é dos preferidos do Lucas, mas cumpre a função). Freios com fluido DOT 3 ou DOT 4 (semelhante a motocicletas) — capacidade de frenagem é um dos DESTAQUES do teste: freia com muita força, transmite segurança compatível com a velocidade que alcança. Suspensão dianteira dupla e traseira com amortecimento próprio — considerado EXTREMAMENTE CONFORTÁVEL, um dos modelos mais confortáveis testados pelo Lucas, absorvendo buracos, valetas e irregularidades com facilidade. Pneus largos, construção robusta. Apesar da estrutura maior, passa bem entre carros e é estável no trânsito. Lucas (1,84 m) considerou a ergonomia confortável. Painel com velocidade, bateria, assistência; pode exigir ajuste de posição para não atrapalhar a retirada da bateria. Visibilidade sob sol forte não é das melhores. Setas não aparecem no painel. Farol dianteiro e traseiro LED com boa iluminação, setas dianteiras e traseiras, BUZINA FORTE (percebida por pedestres e veículos), chave de ignição, chave separada para bateria e diversos componentes de segurança. A bike exige que a CHAVE PERMANEÇA GIRADA para funcionar (comportamento de motocicleta) — pode não agradar a todos. Não acompanha necessariamente retrovisores (recomendados pela velocidade e tipo de uso). Indicada para quem quer alto desempenho, conforto, componentes robustos, bateria grande e experiência próxima de uma motocicleta elétrica. NÃO é alternativa direta a bikes de entrada — faixa de preço e construção superiores. Atenção: preço elevado, velocidade que exige responsabilidade, acelerador de meio punho e painel com visibilidade limitada sob sol.",
    image: coswheelGt20,
    linkVitale: "https://meli.la/1iJUgGx",
    linkMeta: "https://meli.la/1iJUgGx",
    affiliateLink: "https://meli.la/1iJUgGx",
    internalPrice: 15811,
    capacity: 1,
    weightSupportKg: 165,
    autonomyKm: 60,
    bestFor: ["premium", "performance"],
    strengths: ["Motor 1500W", "Autonomia até 150 km", "Bateria 48V 20Ah UL", "Pneus fat 20 x 4", "Freios hidráulicos", "Suspensão dupla", "Visual premium"],
    budgetTiers: ["acima_10000"],
    diferencial: "Visual premium, motor 1500W e construção exclusiva",
    perfilIndicado: "Quem busca uma elétrica premium, forte, com visual diferenciado e maior presença",
  },
  {
    id: "d50_cross",
    name: "D50 Cross",
    shortDescription: "Bike elétrica cross 1000W com aro 22, pneus cravados, suspensão dupla e freios hidráulicos. Conforto e desempenho no asfalto, na terra e em pisos irregulares.",
    fullDescription: "A D50 Cross é uma bicicleta elétrica de perfil aventureiro, desenvolvida para quem busca conforto, estabilidade e desempenho tanto no asfalto quanto em estradas de terra, cascalho e pisos irregulares. Equipada com motor de 1000W, bateria de 48V 15,6Ah e suspensão dupla, entrega velocidade de até 48 km/h e excelente capacidade para vencer subidas, mantendo uma condução confortável graças ao aro 22 e aos pneus com cravos. Seu conjunto prioriza segurança e praticidade, com freios hidráulicos a disco, iluminação em LED de alta intensidade, setas dianteiras e traseiras independentes, piloto automático e acelerador de meio punho. Compartilha diversos componentes com outros modelos da Inow, como V40 Pro e V9 Max, facilitando futuras manutenções e reposição de peças. É uma bicicleta indicada para uma pessoa, ideal para deslocamentos urbanos, condomínios, chácaras e trajetos mistos. Para quem utiliza exclusivamente no asfalto, existe a possibilidade de substituir os pneus cravados por pneus lisos, tornando a pedalada ainda mais eficiente. Principais destaques: motor de 1000W no cubo traseiro; velocidade máxima aproximada de 48 km/h; bateria 48V 15,6Ah; autonomia semelhante aos modelos V20 Pro e V9 Max; aro 22, proporcionando mais conforto e estabilidade; pneus com cravos para terrenos mistos; suspensão dianteira e traseira; freios hidráulicos a disco; farol LED potente; setas dianteiras e traseiras independentes; piloto automático (Cruise Control); acelerador de meio punho; pedal assistido com sensor de giro; câmbio Shimano de 7 marchas; paralamas dianteiro e traseiro; estrutura para apenas um ocupante. Perfil ideal: indicada para quem procura uma bicicleta elétrica confortável, robusta e versátil, capaz de enfrentar ruas esburacadas, terra batida e pequenos trechos off road sem abrir mão de um excelente desempenho na cidade. É uma das poucas opções nacionais com proposta verdadeiramente \"cross\" na faixa de preço da V40 Pro, sendo uma alternativa interessante para quem deseja mais conforto e capacidade em terrenos irregulares.",
    image: d50CrossAsset.url,
    linkVitale: "https://meli.la/2suYUvX",
    linkMeta: "https://meli.la/2suYUvX",
    affiliateLink: "https://meli.la/2suYUvX",
    internalPrice: 7617,
    capacity: 1,
    weightSupportKg: 120,
    autonomyKm: 50,
    bestFor: ["misto", "off_road", "urbano", "subidas"],
    strengths: ["Motor 1000W", "Bateria 48V 15,6Ah", "Autonomia até 50 km", "Aro 22 com pneus cravados", "Suspensão dianteira e traseira", "Freios hidráulicos a disco", "Setas independentes e farol LED", "Piloto automático", "Câmbio Shimano 7 marchas"],
    budgetTiers: ["7000_8000"],
    diferencial: "Proposta cross real: aro 22 e pneus cravados para terra, cascalho e piso irregular",
    perfilIndicado: "Uma pessoa, trajetos mistos urbanos e off road leve, condomínios e chácaras",
  },
];

// ---------- Link sanitization / validation ----------

const MELI_LINK_RE = /^https:\/\/meli\.la\/[A-Za-z0-9]+$/;

/** Remove espaços, quebras de linha, tabs e caracteres invisíveis do link. */
export function sanitizeMeliLink(url: string): string {
  if (!url) return "";
  return url
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\r\n\t]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

/** Sanitiza e valida contra ^https:\/\/meli\.la\/[A-Za-z0-9]+$ — loga erro se inválido. */
export function sanitizeAndValidateMeliLink(url: string, ctx = ""): string {
  const clean = sanitizeMeliLink(url);
  if (!MELI_LINK_RE.test(clean)) {
    console.error(`[bikes] Link Mercado Livre inválido${ctx ? ` (${ctx})` : ""}: "${url}"`);
    return clean;
  }
  return clean;
}

// Sanitiza no boot para garantir que nenhum link chegue à UI/webhook com sujeira.
for (const b of BIKES) {
  b.linkVitale = sanitizeAndValidateMeliLink(b.linkVitale, `${b.id}.linkVitale`);
  b.linkMeta = sanitizeAndValidateMeliLink(b.linkMeta, `${b.id}.linkMeta`);
  b.affiliateLink = sanitizeAndValidateMeliLink(b.affiliateLink, `${b.id}.affiliateLink`);
}

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
  const vitale = sanitizeMeliLink(bike.linkVitale || bike.affiliateLink || "");
  const metaLink = sanitizeMeliLink(bike.linkMeta || "");

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
