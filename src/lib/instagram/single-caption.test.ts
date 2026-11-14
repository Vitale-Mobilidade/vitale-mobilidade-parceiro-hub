import { describe, expect, it } from "vitest";
import {
  INSTAGRAM_CAPTION_END,
  singleInstagramCaption,
} from "../../../supabase/functions/_shared/instagram-single-caption";
const original =
  "Aqui está a transcrição do teste da bateria e também a observação do freio e do conforto. Com a bicicleta no terreno plano o teste foi bom para percursos diários.";
const blocks = [
  {
    type: "text",
    heading: "Bateria",
    sourceExcerpt: "teste da bateria",
    text: "A bateria removível simplifica a recarga em apartamentos. Confira o módulo de ofertas da página para detalhes.",
  },
  {
    type: "text",
    heading: "Conforto",
    sourceExcerpt: "observação do freio e do conforto",
    text: "O garfo rígido transmite mais vibrações quando o piso está irregular.",
  },
  {
    type: "text",
    heading: "Veredito",
    sourceExcerpt: "terreno plano o teste foi bom",
    text: "O modelo faz mais sentido para trajetos curtos em ruas com bom pavimento.",
  },
  {
    type: "text",
    heading: "Invenção",
    sourceExcerpt: "afirmação que não consta da fonte",
    text: "A garantia é de cinquenta anos e cobre qualquer dano.",
  },
];
describe("Instagram single post caption", () => {
  it("keeps detail and verdict, omits unsupported sections and ends with exact CTA", () => {
    const text = singleInstagramCaption(
      "Uma elétrica de entrada voltada a deslocamentos urbanos.",
      blocks,
      original,
    );
    expect(text).toContain("recarga em apartamentos");
    expect(text).toContain("vibrações");
    expect(text).toContain("trajetos curtos");
    expect(text).not.toMatch(/garantia|módulo/);
    expect(text.endsWith(INSTAGRAM_CAPTION_END)).toBe(true);
    expect(text.split("link da Bio")).toHaveLength(2);
  });
  it("blocks captions without grounded detail", () =>
    expect(() =>
      singleInstagramCaption("", blocks, "texto diferente"),
    ).toThrow());
});
