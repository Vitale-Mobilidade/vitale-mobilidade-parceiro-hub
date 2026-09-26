import { describe, expect, it } from "vitest";
import { composeArticleFlow } from "./article-flow";
import { layoutArticle } from "../../supabase/functions/_shared/editorial-automation";
import type { ArticleBlock } from "../../supabase/functions/_shared/editorial-contract";

const sections = (count: number): ArticleBlock[] => Array.from({ length: count }, (_, index) => ({ type: "text", heading: `Seção ${index + 1}`, text: `Análise ${index + 1}` }));

describe("ritmo do artigo", () => {
  it("intercala Radar, Quiz e economia sem mudar a sequência do texto já publicado", () => {
    const old = [...sections(8), { type: "radar", bikeId: "v9_max" } as ArticleBlock, { type: "quiz" } as ArticleBlock];
    const flow = composeArticleFlow(old, true);
    expect(flow.filter(item => item.kind === "block").map(item => item.kind === "block" ? item.block.heading : "")).toEqual(sections(8).map(s => s.heading));
    const kinds = flow.map(item => item.kind);
    expect(kinds.filter(kind => kind === "radar")).toHaveLength(1);
    expect(kinds.filter(kind => kind === "quiz")).toHaveLength(1);
    expect(kinds.indexOf("radar")).toBeGreaterThan(0);
    expect(kinds.indexOf("quiz")).toBeLessThan(kinds.length - 1);
    expect(kinds).toContain("economy");
  });

  it("não cria preview de preço se não há Bike ligada", () => {
    expect(composeArticleFlow(sections(3), false).map(item => item.kind)).not.toContain("radar");
  });

  it("gera os próximos blocos de decisão durante o artigo, com vídeo complementar", () => {
    const blocks = layoutArticle({ sections: sections(8), videoId: "abcdefghijk", bikeId: "v9_max",
      relatedBikeIds: ["v9_pro"], contentType: "comparison", offerBikeIds: new Set(["v9_max", "v9_pro"]), hasFaq: true });
    const firstFaq = blocks.findIndex(block => block.type === "faq");
    expect(blocks.findIndex(block => block.type === "video")).toBeLessThan(firstFaq);
    expect(blocks.findIndex(block => block.type === "radar")).toBeLessThan(firstFaq);
    expect(blocks.findIndex(block => block.type === "quiz")).toBeLessThan(firstFaq);
    expect(blocks.findIndex(block => block.type === "comparator")).toBeLessThan(blocks.findIndex(block => block.type === "radar"));
  });
});
