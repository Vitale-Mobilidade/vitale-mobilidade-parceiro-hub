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

export type BudgetTier = "ate_7000" | "7000_8000" | "8000_10000" | "acima_10000";

export interface Bike {
  id: string;
  name: string;
  shortDescription: string;
  image: string;
  affiliateLink: string;
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
    image: ft03,
    affiliateLink: "https://meli.la/2K4MCXZ",
    internalPrice: 6299,
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
    image: v20mini,
    affiliateLink: "https://meli.la/2PzxMD6",
    internalPrice: 6200,
    capacity: 2,
    weightSupportKg: 150,
    autonomyKm: 50,
    bestFor: ["urbano", "locomocao_diaria"],
    strengths: ["Motor 750W", "Autonomia até 50 km", "Freios hidráulicos duplos", "Pneus fat 16 x 4", "NFC, alarme, app e Bluetooth", "Display colorido", "Boa para pessoas mais baixas"],
    budgetTiers: ["ate_7000"],
    diferencial: "Compacta, acessível e tecnológica",
    perfilIndicado: "Uso urbano, trajetos curtos, pessoas mais baixas e quem quer uma elétrica moderna e completa",
  },
  {
    id: "v9_max",
    name: "V9 Max",
    shortDescription: "Bike elétrica 1000W urbana com garupa, NFC, alarme, setas e estrutura robusta. Lançamento 2026 com bom desempenho e preço competitivo.",
    image: v9max,
    affiliateLink: "https://meli.la/2FsbUdT",
    internalPrice: 7799,
    capacity: 2,
    weightSupportKg: 150,
    autonomyKm: 50,
    bestFor: ["urbano", "locomocao_diaria"],
    strengths: ["Motor 1000W", "Autonomia até 60 km", "Suporta 2 pessoas", "Freios hidráulicos", "Alarme integrado", "Chave NFC", "Setas dianteiras e traseiras"],
    budgetTiers: ["7000_8000"],
    diferencial: "Boa estrutura com garupa e preço competitivo",
    perfilIndicado: "Locomoção diária, passeio, garupa e uso urbano",
  },
  {
    id: "v10_max",
    name: "V10 Max",
    shortDescription: "Lançamento 2026 – bike elétrica 1000W com motor forte, garupa, marchas Shimano e excelente desempenho em subidas. Ideal para quem busca potência e praticidade.",
    image: v10max,
    affiliateLink: "https://meli.la/2cXBuJS",
    internalPrice: 7461,
    capacity: 2,
    weightSupportKg: 150,
    autonomyKm: 50,
    bestFor: ["urbano", "locomocao_diaria", "misto"],
    strengths: ["Motor 1000W", "Autonomia até 60 km", "Marchas Shimano", "Freios hidráulicos", "Pedal de apoio para garupa", "Boa em subidas"],
    budgetTiers: ["7000_8000"],
    diferencial: "Equilíbrio entre potência, conforto e uso com garupa",
    perfilIndicado: "Locomoção diária, passeio, garupa e trajetos urbanos mistos",
  },
  {
    id: "v40_pro",
    name: "V40 Pro",
    shortDescription: "Lançamento 2026 – bike elétrica 1000W completa com bateria 48V 18Ah, trava na roda, NFC, alarme e pedal de apoio para garupa. Conforto, segurança e desempenho superiores.",
    image: v40pro,
    affiliateLink: "https://meli.la/2YSVbMJ",
    internalPrice: 7844,
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
    image: v8pro,
    affiliateLink: "https://meli.la/2U3yt8C",
    internalPrice: 7999,
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
    image: gt20,
    affiliateLink: "https://meli.la/1gdXKsi",
    internalPrice: 8177,
    capacity: 2,
    weightSupportKg: 150,
    autonomyKm: 50,
    bestFor: ["lazer", "passeio", "off_road"],
    strengths: ["Motor 1000W", "Autonomia até 50 km", "Freios hidráulicos", "Suspensão dianteira e traseira", "Pneus fat 20 x 4", "Câmbio Shimano", "Pedal assistido + acelerador"],
    budgetTiers: ["8000_10000"],
    diferencial: "Versatilidade para cidade, lazer e terrenos irregulares",
    perfilIndicado: "Uso urbano, lazer, trajetos mistos e terrenos irregulares",
  },
  {
    id: "v29_pro",
    name: "V29 Pro",
    shortDescription: "Lançamento 2026 – bike elétrica 1000W com bateria dupla 48V 15.6Ah cada, autonomia de até 120 km e estrutura completa para garupa. Iluminação LED com setas e acionamento NFC.",
    image: v29pro,
    affiliateLink: "https://meli.la/1F4DVDp",
    internalPrice: 8633,
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
    image: v35,
    affiliateLink: "https://meli.la/23VTgCa",
    internalPrice: 11990,
    capacity: 2,
    weightSupportKg: 150,
    autonomyKm: 100,
    bestFor: ["trabalho", "delivery", "longa_distancia", "urbano"],
    strengths: ["Motor 1000W", "Duas baterias 48V 15.6Ah", "Autonomia até 120 km", "Freios hidráulicos", "Cesto central", "Suporta 2 pessoas"],
    budgetTiers: ["acima_10000"],
    diferencial: "Duas baterias com cesto central e boa estrutura urbana",
    perfilIndicado: "Deslocamentos longos, uso urbano intenso e quem quer mais praticidade",
  },
  {
    id: "v8_pro_s",
    name: "V8 Pro S",
    shortDescription: "Bike elétrica 1000W com duas baterias 48V 15Ah, suspensão traseira dupla e autonomia estendida. Indicada para quem roda bastante e precisa de mais alcance e conforto.",
    image: v8pros,
    affiliateLink: "https://meli.la/2PRbRTw",
    internalPrice: 9303,
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
    image: gt2000,
    affiliateLink: "https://meli.la/2qiDb3C",
    internalPrice: 10670,
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
    id: "coswheel_gt20",
    name: "Coswheel GT20",
    shortDescription: "Bike elétrica premium estilo moto com motor 1500W, bateria 48V 20Ah certificada UL, pneus fat 20 x 4 e suspensão dupla. Alto desempenho, visual imponente e autonomia de longo alcance.",
    image: coswheelGt20,
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
