import { describe, expect, it } from "vitest";
import { curateNewsletter, newsletterCategory } from "./newsletter-curation";
const now = new Date("2026-10-07T22:00:00Z"),
  since = new Date("2026-10-04T13:00:00Z");
const a = (title: string, contentType: string, day = "07") => ({
  title,
  contentType,
  publishedAt: `2026-10-${day}T12:00:00Z`,
});
const v = (title: string, day = "07") => ({
  title,
  date: `2026-10-${day}`,
  videoId: title,
});
describe("newsletter editorial diversity", () => {
  it("avoids four comparative items even when those are the newest", () => {
    const selected = curateNewsletter(
      [
        a("S20 ou V9: qual escolher", "comparison"),
        a("S20 vs V20", "comparison"),
        a("Como planejar a recarga", "guide", "05"),
      ],
      [
        v("S20 vs V20"),
        v("V9 vs S20"),
        v("VL20: TESTE NA PRÁTICA", "02"),
        v("GT2000 por MENOS de R$9.400", "06"),
      ],
      since,
      now,
    );
    expect(selected.articles).toHaveLength(2);
    expect(selected.videos).toHaveLength(2);
    const categories = [...selected.articles, ...selected.videos].map((x) =>
      newsletterCategory(
        x.title,
        "contentType" in x ? x.contentType : undefined,
      ),
    );
    expect(new Set(categories).size).toBe(4);
    expect(categories.filter((x) => x === "comparison")).toHaveLength(1);
  });
  it("does not rename a presentation as a practical test or pad scarce content", () => {
    expect(newsletterCategory("Conheça a V9 Max", "test")).toBe("review");
    const selected = curateNewsletter(
      [a("S20 vs V9", "comparison"), a("S20 vs V20", "comparison")],
      [v("V9 vs S20")],
      since,
      now,
    );
    expect(selected.articles).toHaveLength(1);
    expect(selected.videos).toHaveLength(0);
  });
  it("excludes titles used in preceding independent editions", () => {
    const selected = curateNewsletter(
      [a("S20 vs V9", "comparison"), a("Como planejar recarga", "guide", "05")],
      [
        v("VL20 TESTE NA PRATICA", "02"),
        v("GT2000 por MENOS de R$9.400", "06"),
      ],
      since,
      now,
      ["S20 vs V9", "VL20 TESTE NA PRATICA"],
    );
    expect(selected.articles.map((x) => x.title)).toEqual([
      "Como planejar recarga",
    ]);
    expect(selected.videos.map((x) => x.title)).toEqual([
      "GT2000 por MENOS de R$9.400",
    ]);
  });
});
