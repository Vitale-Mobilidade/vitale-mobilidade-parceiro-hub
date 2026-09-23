import { describe, it, expect } from "vitest";
import { commercialBadge } from "@/lib/commercial-badge";

describe("selo comercial de /bikes/$slug", () => {
  it("sem oferta válida: indisponível, mesmo com histórico conclusivo", () => {
    const b = commercialBadge({ hasOffer: false, classification: "lowest" });
    expect(b.kind).toBe("unavailable");
    expect(b.label).toBe("Oferta indisponível");
  });

  it("histórico insuficiente vira selo neutro, nunca bom/mau", () => {
    expect(commercialBadge({ hasOffer: true, classification: "forming" }).label).toBe("Preço registrado");
    expect(commercialBadge({ hasOffer: true, classification: null }).kind).toBe("neutral");
  });

  it("mapeia os estados comerciais a partir da classificação já calculada", () => {
    expect(commercialBadge({ hasOffer: true, classification: "lowest" }).label).toBe("Menor preço registrado");
    expect(commercialBadge({ hasOffer: true, classification: "good" }).label).toBe("Oportunidade");
    expect(commercialBadge({ hasOffer: true, classification: "typical" }).label).toBe("Na faixa habitual");
    expect(commercialBadge({ hasOffer: true, classification: "above" }).label).toBe("Acima do habitual");
  });

  it("nunca gera 'Imperdível' automaticamente", () => {
    const all = (["lowest", "good", "typical", "above", "forming"] as const).map(
      (c) => commercialBadge({ hasOffer: true, classification: c }).label,
    );
    expect(all.some((l) => /imperd/i.test(l))).toBe(false);
  });
});
