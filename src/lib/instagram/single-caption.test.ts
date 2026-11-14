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
    expect(text).toContain("facilita carregar em apartamentos");
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

it("tells the FT07 story in a spoken register and keeps the conditions of the climb", () => {
  const caption = singleInstagramCaption(
    "A FT07 ficou mais interessante na janela comercial observada em novembro, especialmente para quem procura uma elétrica forte para ladeiras e asfalto deteriorado.",
    [
      {
        type: "text",
        heading: "Oportunidade de novembro",
        sourceExcerpt: "ficou mais barata no mês",
        text: "A FT07 apareceu em novembro em um patamar comercial consideravelmente inferior ao praticado pouco tempo antes.",
      },
      {
        type: "text",
        heading: "Ladeira na prática",
        sourceExcerpt: "marcou 27 aqui na subida",
        text: "Em uma subida forte, o painel indicou 27 km/h. No trecho mais exigente, a leitura variou entre 23 e 25 km/h, com ajuda leve nos pedais. O condutor tinha 76 kg, e a bateria não estava completamente carregada.",
      },
      {
        type: "text",
        heading: "Para quem faz mais sentido",
        sourceExcerpt: "se pegar chão de terra",
        text: "A oportunidade observada em novembro é mais coerente para quem enfrenta ladeiras fortes e estradas de terra.",
      },
      {
        type: "text",
        heading: "Painel e limitações",
        sourceExcerpt: "painel pequeno fica ruim de ver",
        text: "O painel é pequeno e tem visibilidade ruim durante o dia.",
      },
    ],
    "A bike ficou mais barata no mês. O painel marcou 27 aqui na subida. Pra mim faz sentido se pegar chão de terra. O painel pequeno fica ruim de ver.",
  );
  expect(caption).not.toMatch(/janela comercial|patamar comercial/);
  expect(caption.match(/preço de novembro/g)).toHaveLength(1);
  expect(caption).toContain("Na subida forte, o painel marcou 27 km/h.");
  expect(caption).toContain("23 e 25 km/h, com uma ajudinha no pedal");
  expect(caption).toContain("76 kg e a bateria não estava cheia");
  expect(caption).toContain("visibilidade ruim");
  expect(caption).toContain("Eu olharia pra ela se você encara");
  expect(caption.endsWith(INSTAGRAM_CAPTION_END)).toBe(true);
  expect(caption.length).toBeLessThanOrEqual(2200);
});
