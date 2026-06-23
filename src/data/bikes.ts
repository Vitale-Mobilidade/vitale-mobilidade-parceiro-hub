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
    fullDescription: "A Bike Elétrica Panda FT-03 1000W da Portal do Eletrônico foi desenvolvida para quem busca força, estabilidade e autonomia no dia a dia. Ideal para deslocamento urbano, trabalho e mobilidade diária e economia em relação a moto ou carro. Motor 1000W com excelente torque, velocidade máxima de até 32 km/h, autonomia média de 45 a 55 km, suporta até 120 kg, quadro em liga de alumínio, freios hidráulicos dianteiro e traseiro, aro 20 e carregamento em 6 a 7 horas.",
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
    fullDescription: "A Bicicleta Elétrica V20 Mini é a escolha ideal para quem busca mobilidade urbana com estilo, potência e tecnologia. Motor 750W, velocidade máxima 32 km/h, autonomia até 45 km, bateria lítio 48V 13Ah, freios duplo hidráulicos, suspensão hidráulica, pneus 16x4 (FAT), câmbio Shimano 7 marchas, display colorido, suporta até 150 kg, app Android/iOS, NFC, alarme integrado e Bluetooth.",
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
    fullDescription: "Lançamento 2026 – Bicicleta Elétrica V9 MAX 1000W. Veículo autopropelido, não precisa de CNH nem emplacamento. Motor 1000W, bateria 48V 15.6Ah, velocidade máxima até 48 km/h, autonomia até 60 km, suporta até 150 kg, aro 20, 7 marchas, freios hidráulicos, iluminação LED com setas, alarme integrado, cartão NFC e trava na roda dianteira.",
    image: v9max,
    linkVitale: "https://meli.la/28oofDZ",
    linkMeta: "https://meli.la/18kFW7J",
    affiliateLink: "https://meli.la/28oofDZ",
    internalPrice: 8999,
    capacity: 2,
    weightSupportKg: 150,
    autonomyKm: 50,
    bestFor: ["urbano", "locomocao_diaria"],
    strengths: ["Motor 1000W", "Autonomia até 60 km", "Suporta 2 pessoas", "Freios hidráulicos", "Alarme integrado", "Chave NFC", "Setas dianteiras e traseiras"],
    budgetTiers: ["8000_10000"],
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
    fullDescription: "Lançamento 2026 – Bicicleta Elétrica V40 PRO 1000W. Veículo autopropelido. Motor 1000W, bateria 48V 18Ah, velocidade máxima 48 km/h, autonomia 60 km, peso 42 kg, capacidade máxima 150 kg, aro 20, marchas Shimano, freios hidráulicos, trava na roda, cartão NFC, controle do alarme e pedal de apoio para garupa.",
    image: v40pro,
    linkVitale: "https://meli.la/2UmQri6",
    linkMeta: "https://meli.la/17iRssR",
    affiliateLink: "https://meli.la/2UmQri6",
    internalPrice: 7371,
    capacity: 2,
    weightSupportKg: 150,
    autonomyKm: 50,
    bestFor: ["urbano", "misto", "subidas"],
    strengths: ["Motor 1000W", "Autonomia até 60 km", "Bateria 48V 18Ah", "Freios hidráulicos", "Marchas Shimano", "NFC, alarme e trava", "Pedal de apoio para garupa"],
    budgetTiers: ["7000_8000"],
    diferencial: "Modelo completo com bateria maior, tecnologia e segurança",
    perfilIndicado: "Uso urbano, passeio, garupa e quem quer uma bike mais completa",
  },
  {
    id: "v8_pro",
    name: "V8 Pro",
    shortDescription: "Bike elétrica 1000W robusta com suspensão dianteira e traseira, freios hidráulicos e cabos internos. Conforto, estabilidade e ótimo desempenho urbano.",
    fullDescription: "V8 PRO Panda – bicicleta elétrica com suspensão traseira dupla, quadro em aço carbono, cabos internos, motor 1000W (pico) com cubo traseiro 48V, autonomia 45 a 50 km por carga, velocidade 32 km/h (até 50 km/h com pedal assistido), bateria 48V 15Ah, freios hidráulicos a óleo, 5 níveis de pedal assistido, pneus 20x4.0, alarme integrado, cartão NFC, trava de segurança na roda e suporta até 120 kg.",
    image: v8pro,
    linkVitale: "https://meli.la/2aNm5oD",
    linkMeta: "https://meli.la/23wK89m",
    affiliateLink: "https://meli.la/2aNm5oD",
    internalPrice: 7700,
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
    fullDescription: "Bicicleta Elétrica OUXI GT20 – motor 1000W, bateria íon de lítio removível 48V 15Ah, pedal assistido + acelerador removível, freios hidráulicos, suspensão dianteira e traseira, pneus Fat Tire 20x4.0, câmbio Shimano 7 velocidades, painel digital com limitador, alarme com controle remoto, velocidade limitada a 32 km/h, autonomia até 50 km, quadro em aço carbono e suporta até 150 kg.",
    image: gt20,
    linkVitale: "https://meli.la/2mTotmX",
    linkMeta: "https://meli.la/11bjzGC",
    affiliateLink: "https://meli.la/2mTotmX",
    internalPrice: 7469,
    capacity: 2,
    weightSupportKg: 150,
    autonomyKm: 50,
    bestFor: ["lazer", "passeio", "off_road"],
    strengths: ["Motor 1000W", "Autonomia até 50 km", "Freios hidráulicos", "Suspensão dianteira e traseira", "Pneus fat 20 x 4", "Câmbio Shimano", "Pedal assistido + acelerador"],
    budgetTiers: ["7000_8000"],
    diferencial: "Versatilidade para cidade, lazer e terrenos irregulares",
    perfilIndicado: "Uso urbano, lazer, trajetos mistos e terrenos irregulares",
  },
  {
    id: "v29_pro",
    name: "V29 Pro",
    shortDescription: "Lançamento 2026 – bike elétrica 1000W com bateria dupla 48V 15.6Ah cada, autonomia de até 120 km e estrutura completa para garupa. Iluminação LED com setas e acionamento NFC.",
    fullDescription: "Lançamento 2026 – Bicicleta Elétrica V29 PRO 1000W bateria dupla. Veículo autopropelido. Motor 1000W, duas baterias 48V 15.6Ah cada, velocidade máxima 32 km/h, autonomia até 120 km, peso 47,2 kg, capacidade máxima 150 kg, aro 20, marchas Shimano, freios hidráulicos, farol de LED com setas, alarme integrado, acionamento via NFC, trava de segurança na roda dianteira e pedal de apoio para garupa.",
    image: v29pro,
    linkVitale: "https://meli.la/1LP5i2E",
    linkMeta: "https://meli.la/1Y7gKuw",
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
    linkVitale: "https://meli.la/1xCFCbh",
    linkMeta: "https://meli.la/1vWYKsq",
    affiliateLink: "https://meli.la/1xCFCbh",
    internalPrice: 10378,
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
    internalPrice: 4999,
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
