import { describe, expect, it } from "vitest";
import { fitTitle, wrapTitle } from "@/lib/cover-compose";

const measure = (s: string) => s.length * 10;

describe("composição do título da capa", () => {
  it("quebra por palavras sem cortar texto", () => {
    expect(wrapTitle("Bike elétrica para subir ladeira", measure, 200, 3)).toEqual(["Bike elétrica para", "subir ladeira"]);
  });
  it("recusa quando não cabe e nunca trunca", () => {
    expect(wrapTitle("a ".repeat(80), measure, 50, 2)).toBeNull();
    expect(wrapTitle("Supercalifragilístico", measure, 100, 3)).toBeNull();
  });
  it("reduz a fonte até caber mantendo o título exato", () => {
    const title = "Qual bike elétrica escolher para 30 km por dia na cidade";
    const fit = fitTitle(title, (s, size) => s.length * size * 0.55, 1152);
    expect(fit).not.toBeNull();
    expect(fit!.lines.join(" ")).toBe(title);
    expect(fit!.lines.length).toBeLessThanOrEqual(3);
  });
});
