import { describe, it, expect } from "vitest";
import { mapCatalogRow } from "./bikes-repository.server";

const base = {
  bikeId: "v8_ultra",
  slug: "v8-ultra",
  name: "V8 Ultra",
  category: "Bike elétrica",
  autonomy: "Até 60km",
  capacity: "2 pessoas",
  description: "desc",
  image: "https://exemplo.com/a.png",
  price: 5999,
  link: "https://meli.la/abc123",
};

describe("leitura do catálogo (bikes + oferta atual)", () => {
  it("mantém a URL afiliada byte a byte e o preço do mesmo registro", () => {
    const b = mapCatalogRow(base)!;
    expect(b.link).toBe("https://meli.la/abc123");
    expect(b.sheetPrice).toBe(5999);
    expect(b.category).toBe("Bike elétrica");
    expect(b.autonomy).toBe("Até 60km");
  });

  it("sem oferta atual: nem link nem preço (mostra 'Link indisponível no momento')", () => {
    const b = mapCatalogRow({ ...base, price: null, link: null })!;
    expect(b.link).toBeNull();
    expect(b.sheetPrice).toBeNull();
    expect(b.name).toBe("V8 Ultra");
  });

  it("link fora do padrão oficial invalida também o preço (nada de par incoerente)", () => {
    const b = mapCatalogRow({ ...base, link: "https://mercadolivre.com.br/x" })!;
    expect(b.link).toBeNull();
    expect(b.sheetPrice).toBeNull();
  });

  it("preço ausente também anula o link: nunca há CTA sem preço da mesma oferta", () => {
    const b = mapCatalogRow({ ...base, price: null })!;
    expect(b.link).toBeNull();
    expect(b.sheetPrice).toBeNull();
    const zero = mapCatalogRow({ ...base, price: 0 })!;
    expect(zero.link).toBeNull();
    expect(zero.sheetPrice).toBeNull();
  });

  it("linha sem identidade válida é descartada", () => {
    expect(mapCatalogRow({ ...base, slug: "V8 Ultra" })).toBeNull();
    expect(mapCatalogRow({ ...base, bikeId: "" })).toBeNull();
  });
});
