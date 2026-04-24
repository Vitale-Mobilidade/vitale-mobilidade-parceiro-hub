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
  capacity: 1 | 2;
  autonomyKm: number;
  bestFor: string[];
  strengths: string[];
  budgetTiers: BudgetTier[];
  diferencial: string;
  perfilIndicado: string;
}

export const BIKES: Bike[] = [
  {
    id: "ft03",
    name: "FT03",
    shortDescription: "Bike elétrica 1000W, até 60 km de autonomia, ideal para uso urbano individual.",
    image: ft03,
    affiliateLink: "https://www.mercadolivre.com.br/social/alfa13sport?matt_word=vitalemobilidade&matt_tool=99482017&forceInApp=true&ref=BKFhZTTQ%2FY%2FWzMJRZ%2B8iIRbgA3%2FnmBLZwDi76FO3pc79F%2FskplwfHo13q6ngj80ruD7HawbwSq21CJFAEtp7N2zDb5TIggeDJeuy3%2BeSwjKpBCuXPNTsPzDPfRsMfkoPIbSV0FTeemArPzXwiRziSMq26lpIDMZ08x2c2wQ8gDBhX5Bg%2BsEBqtMdk4MB6LhzQ%2BSz9AAQc38E7Txtdg%3D%3D",
    capacity: 1,
    autonomyKm: 55,
    bestFor: ["urbano", "locomocao_diaria"],
    strengths: ["Motor 1000W", "Autonomia até 55 km", "Freios hidráulicos", "Quadro em alumínio"],
    budgetTiers: ["ate_7000"],
    diferencial: "Custo-benefício para uso urbano individual",
    perfilIndicado: "Locomoção diária, plano",
  },
  {
    id: "v9_max",
    name: "V9 Max",
    shortDescription: "Bike elétrica 1000W com tecnologia, alarme e NFC, para até 2 pessoas.",
    image: v9max,
    affiliateLink: "https://www.mercadolivre.com.br/social/alfa13sport?matt_word=vitalemobilidade&matt_tool=99482017&forceInApp=true&ref=BNz0SxKw3sBTfZp9WCFFVnjN%2BcGzRVaySfnz11luycpmVaYXJKWeA7pg9GDoJv7%2BoPDodyk7Et%2FFYGy8mvIcaP6QAjVZyL9QbPYUk0sn6DMUsrMxgOVHvsrdky%2Fy43vnSL5ZPrNnRIeLk62meZqcCnqpLYTZYIm%2F%2Fnav%2BCXItt7N2NJ2lEMAl17jtHmSXwuGZCBmz97dQ1Xe29%2F3RZA1AW8R9VkpPVj9KPE0nC8FxJVCgz1Y",
    capacity: 2,
    autonomyKm: 60,
    bestFor: ["urbano", "locomocao_diaria"],
    strengths: ["Motor 1000W", "Bateria 48V 15.6Ah", "Alarme + NFC", "Suporta 150 kg"],
    budgetTiers: ["7000_8000"],
    diferencial: "Tecnologia, segurança e garupa",
    perfilIndicado: "Locomoção diária, plano ou misto",
  },
  {
    id: "v10_max",
    name: "V10 Max",
    shortDescription: "Bike elétrica 1000W com Shimano, boa em subidas, para até 2 pessoas.",
    image: v10max,
    affiliateLink: "https://www.mercadolivre.com.br/social/alfa13sport?matt_word=vitalemobilidade&matt_tool=99482017&forceInApp=true&ref=BPv9zdezlFqZv%2FBp7C6k4C2ffM%2Bo%2BkXFXYrprhbxopfuJuERw7wUd4dvFP%2FuAjyiMgb1LzSbKJjwnLLtckocViTxOf1Ww7%2FLq0kDt9%2FqjN%2F%2F7huh9A81c1Ta5jr1sWlhH9fiDbUC%2BXyONLXMB61DIjRzATD93v8pUvoz8Hhz27lFoHke7icGQ5aAFB37tQRBJ1w0rA%3D%3D",
    capacity: 2,
    autonomyKm: 60,
    bestFor: ["urbano", "locomocao_diaria", "misto"],
    strengths: ["Motor 1000W", "Marchas Shimano", "Pedal de garupa", "Bom em subidas"],
    budgetTiers: ["7000_8000", "8000_10000"],
    diferencial: "Equilíbrio entre potência e conforto",
    perfilIndicado: "Trajetos mistos com algumas subidas",
  },
  {
    id: "v40_pro",
    name: "V40 Pro",
    shortDescription: "Bike 1000W premium, bateria 48V 18Ah, NFC, alarme, ideal para subidas.",
    image: v40pro,
    affiliateLink: "https://www.mercadolivre.com.br/social/alfa13sport?matt_word=vitalemobilidade&matt_tool=99482017&forceInApp=true&ref=BL%2BXE3i4VnAofPjj2UGQEejkeyK7b4NffBr7mJS5WA45Wm6U61uAFBE5iE9gkSXcioLCAyCT3YrKAgB9WbFe%2BC3CwGm4phl6TAvXIpQgI%2BuYsh2tb0gBbtb5oOGg3BpNa86kAmbeKFhaXJ5xf02UaM860yiLv90wZDIZ4dIp%2BOd%2FN%2Fnd3CpM0wGdKNYFx20qM02e48rqCzi2YhJU%2Bw%3D%3D",
    capacity: 2,
    autonomyKm: 60,
    bestFor: ["urbano", "misto", "subidas"],
    strengths: ["Motor 1000W", "Bateria 48V 18Ah", "Trava + NFC + Alarme", "Ótima em subidas"],
    budgetTiers: ["8000_10000", "acima_10000"],
    diferencial: "Versão mais completa para uso exigente",
    perfilIndicado: "Uso intenso, subidas e mais conforto",
  },
  {
    id: "v8_pro",
    name: "V8 Pro",
    shortDescription: "Bike 1000W Fat Tire com suspensão, alarme e NFC, robusta e confortável.",
    image: v8pro,
    affiliateLink: "https://www.mercadolivre.com.br/social/alfa13sport?matt_word=vitalemobilidade&matt_tool=99482017&forceInApp=true&ref=BP45YqYDuQwTJAwVWwddSfUe1YCgwRKoc3Nr9kiMO1R5YEQGpvbUVI5W6StlKJRnqbY4%2Fj4suu8OmoZVJ6Bc1sEaR2TfzumxN%2BXwJByH37ObUCW5RLyn5x91D2xgVJslaW6GFOE%2FSE%2BuB8wL0T8NY%2BknI5VFfSPm4VJlABSwdwYR5VEQb5uf0pdBiRpip8dn%2F9%2BPHzzGYl60Y3%2F%2BsQ%3D%3D",
    capacity: 2,
    autonomyKm: 50,
    bestFor: ["urbano", "lazer", "locomocao_diaria"],
    strengths: ["Motor 1000W", "Pneus Fat Tire 20x4.0", "Suspensão dianteira/traseira", "Alarme + NFC"],
    budgetTiers: ["7000_8000", "8000_10000"],
    diferencial: "Robustez, conforto e estilo",
    perfilIndicado: "Quem valoriza estabilidade e design",
  },
  {
    id: "v8_pro_s",
    name: "V8 Pro S",
    shortDescription: "Bike 1000W com 2 baterias, até 120 km de autonomia. Para quem roda muito.",
    image: v8pros,
    affiliateLink: "https://www.mercadolivre.com.br/social/alfa13sport?matt_word=vitalemobilidade&matt_tool=99482017&forceInApp=true&ref=BFpWsOt4pPpKBl9HgzBBjvtgHa0Fss%2FreplGVsEehfprMNnpiIfRXJBvFiftU6SgwVdM7eb8JdrwmxESfZvAON4G00fMl%2BMliN3eU%2FvHlaW1kfq39SRzSOAghwK9ES3x6KEadtVXy8ufEECLLW26zu8FV10XfsMUuOJID3mdmCYIC7uuGOwPMVgc031AzrJYwMrM%2B4sTrkXBCBqQ9wW78k0x8uE%2BNOLFqJHOKm8Mb0l7GrFD",
    capacity: 2,
    autonomyKm: 120,
    bestFor: ["trabalho", "delivery", "longa_distancia"],
    strengths: ["Motor 1000W", "DUAS baterias", "Até 120 km de autonomia", "Suspensão e Fat Tire"],
    budgetTiers: ["acima_10000"],
    diferencial: "Autonomia máxima para uso profissional",
    perfilIndicado: "Trabalho, delivery e mais de 40 km/dia",
  },
  {
    id: "gt20",
    name: "GT20",
    shortDescription: "Bike 1000W Fat Tire versátil, ideal para lazer, terra, areia e asfalto.",
    image: gt20,
    affiliateLink: "https://www.mercadolivre.com.br/social/alfa13sport?matt_word=vitalemobilidade&matt_tool=99482017&forceInApp=true&ref=BPY5ph0PNxDbi4vMGO%2Fkyt0bvrYu4wsame8%2FMeLcK961RLGrNGch3mCCp0bCk47iL2wFJuz5LrKcvUd4qyBN%2BSo3LAb7voc3k4A9rAMFddkqvvkpsSYxuU1lNtKbbcdNqwv01g%2BLVigER1aBlC92uUxNS5Mb%2BeXvNFNkyZo8H4zqdWWJmzinS7sKMmv06CNCWVZzZWODSOlE3TZRsQ%3D%3D",
    capacity: 2,
    autonomyKm: 50,
    bestFor: ["lazer", "passeio", "off_road"],
    strengths: ["Motor 1000W", "Câmbio Shimano 7v", "Fat Tire 20x4.0", "Asfalto, terra e areia"],
    budgetTiers: ["8000_10000"],
    diferencial: "Versatilidade para lazer e aventura",
    perfilIndicado: "Lazer, passeio e terrenos variados",
  },
  {
    id: "gt2000",
    name: "GT2000",
    shortDescription: "Bike 1000W com bateria 30Ah, aro 24, alta performance e autonomia.",
    image: gt2000,
    affiliateLink: "https://www.mercadolivre.com.br/social/alfa13sport?matt_word=vitalemobilidade&matt_tool=99482017&forceInApp=true&ref=BKI5oNOn4if2OiT3qPtW2ckCZNPJMycP83iziU0ymnCwqUrtTedWSOL3iVE4gJIwxbliJitKidezYsyPJNEdISx%2FiU5Iu5irqMmg%2FSdy8etk4If%2F%2FWmgE5hIsritK12wYU65XhQNlgotgWwrUavmIp2xBPi8MHA6v6ZBJVRXkguD%2F8GMa0tieQrM5v3MH4IilBeQsIuAwQXoS1Yijg%3D%3D",
    capacity: 1,
    autonomyKm: 90,
    bestFor: ["performance", "longa_distancia"],
    strengths: ["Motor 1000W", "Bateria 30Ah", "Aro 24, até 50 km/h", "Suporta 150 kg"],
    budgetTiers: ["8000_10000", "acima_10000"],
    diferencial: "Performance e autonomia prolongada",
    perfilIndicado: "Quem quer força e bateria grande",
  },
];
