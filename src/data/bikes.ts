import ft03 from "@/assets/bikes/ft03.jpg";
import v9max from "@/assets/bikes/v9-max.jpg";
import v10max from "@/assets/bikes/v10-max.jpg";
import v40pro from "@/assets/bikes/v40-pro.jpg";
import v8pro from "@/assets/bikes/v8-pro.jpg";
import v8pros from "@/assets/bikes/v8-pro-s.jpg";
import gt20 from "@/assets/bikes/gt20.jpg";
import gt2000 from "@/assets/bikes/gt2000.jpg";

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
    shortDescription: "Bike elétrica 1000W, até 60 km de autonomia, ideal para uso urbano individual.",
    image: ft03,
    affiliateLink: "https://meli.la/1uzrUcC",
    internalPrice: 6620,
    capacity: 1,
    autonomyKm: 60,
    bestFor: ["urbano", "locomocao_diaria"],
    strengths: ["Motor 1000W", "Autonomia até 60 km", "Freios hidráulicos", "Quadro em alumínio"],
    budgetTiers: ["ate_7000"],
    diferencial: "Custo-benefício para uso urbano individual",
    perfilIndicado: "Locomoção diária, plano",
  },
  {
    id: "v9_max",
    name: "V9 Max",
    shortDescription: "Bike elétrica 1000W com tecnologia, alarme e NFC, para até 2 pessoas.",
    image: v9max,
    affiliateLink: "https://meli.la/1pnKeKT",
    internalPrice: 6692,
    capacity: 2,
    autonomyKm: 50,
    bestFor: ["urbano", "locomocao_diaria"],
    strengths: ["Motor 1000W", "Autonomia até 50 km", "Alarme + NFC", "Suporta 2 pessoas"],
    budgetTiers: ["ate_7000", "7000_8000"],
    diferencial: "Tecnologia, segurança e garupa",
    perfilIndicado: "Locomoção diária, plano ou misto",
  },
  {
    id: "v10_max",
    name: "V10 Max",
    shortDescription: "Bike elétrica 1000W com Shimano, boa em subidas, para até 2 pessoas.",
    image: v10max,
    affiliateLink: "https://meli.la/24A8tp5",
    internalPrice: 6998,
    capacity: 2,
    autonomyKm: 50,
    bestFor: ["urbano", "locomocao_diaria", "misto"],
    strengths: ["Motor 1000W", "Autonomia até 50 km", "Marchas Shimano", "Pedal de garupa"],
    budgetTiers: ["7000_8000", "8000_10000"],
    diferencial: "Equilíbrio entre potência e conforto",
    perfilIndicado: "Trajetos mistos com algumas subidas",
  },
  {
    id: "v40_pro",
    name: "V40 Pro",
    shortDescription: "Bike 1000W premium, bateria 48V 18Ah, NFC, alarme, ideal para subidas.",
    image: v40pro,
    affiliateLink: "https://meli.la/32KAToh",
    internalPrice: 8091,
    capacity: 2,
    autonomyKm: 50,
    bestFor: ["urbano", "misto", "subidas"],
    strengths: ["Motor 1000W", "Autonomia até 50 km", "Trava + NFC + Alarme", "Ótima em subidas"],
    budgetTiers: ["8000_10000", "acima_10000"],
    diferencial: "Versão mais completa para uso exigente",
    perfilIndicado: "Uso intenso, subidas e mais conforto",
  },
  {
    id: "v8_pro",
    name: "V8 Pro",
    shortDescription: "Bike 1000W Fat Tire com suspensão, alarme e NFC, robusta e confortável.",
    image: v8pro,
    affiliateLink: "https://meli.la/1Arqegn",
    internalPrice: 8018,
    capacity: 2,
    autonomyKm: 50,
    bestFor: ["urbano", "lazer", "locomocao_diaria"],
    strengths: ["Motor 1000W", "Autonomia até 50 km", "Pneus Fat Tire 20x4.0", "Suspensão dianteira/traseira"],
    budgetTiers: ["8000_10000"],
    diferencial: "Robustez, conforto e estilo",
    perfilIndicado: "Quem valoriza estabilidade e design",
  },
  {
    id: "v8_pro_s",
    name: "V8 Pro S",
    shortDescription: "Bike 1000W com 2 baterias, até 120 km de autonomia. Para quem roda muito.",
    image: v8pros,
    affiliateLink: "https://meli.la/2PRbRTw",
    internalPrice: 9303,
    capacity: 2,
    autonomyKm: 120,
    bestFor: ["trabalho", "delivery", "longa_distancia"],
    strengths: ["Motor 1000W", "DUAS baterias — até 120 km de autonomia", "Boa para quem roda muito ou trabalha", "Suspensão e Fat Tire"],
    budgetTiers: ["8000_10000", "acima_10000"],
    diferencial: "Autonomia máxima para uso profissional",
    perfilIndicado: "Trabalho, delivery e mais de 40 km/dia",
  },
  {
    id: "gt20",
    name: "GT20",
    shortDescription: "Bike 1000W Fat Tire versátil, ideal para lazer, terra, areia e asfalto.",
    image: gt20,
    affiliateLink: "https://meli.la/1tGC5CD",
    internalPrice: 9320,
    capacity: 2,
    autonomyKm: 50,
    bestFor: ["lazer", "passeio", "off_road"],
    strengths: ["Motor 1000W", "Autonomia até 50 km", "Câmbio Shimano 7v", "Asfalto, terra e areia"],
    budgetTiers: ["8000_10000", "acima_10000"],
    diferencial: "Versatilidade para lazer e aventura",
    perfilIndicado: "Lazer, passeio e terrenos variados",
  },
  {
    id: "gt2000",
    name: "GT2000",
    shortDescription: "Bike 1000W com bateria 30Ah, aro 24, alta performance e autonomia.",
    image: gt2000,
    affiliateLink: "https://meli.la/1rSknG4",
    internalPrice: 10976,
    capacity: 1,
    autonomyKm: 60,
    bestFor: ["performance", "longa_distancia"],
    strengths: ["Motor 1000W", "Autonomia até 60 km", "Bateria 30Ah, aro 24", "Até 50 km/h"],
    budgetTiers: ["acima_10000"],
    diferencial: "Performance e autonomia prolongada",
    perfilIndicado: "Quem quer força e bateria grande",
  },
];
