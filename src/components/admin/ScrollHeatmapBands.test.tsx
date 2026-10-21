import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ScrollHeatmapBands } from "./ScrollHeatmapBands";
import { scrollMilestones } from "@/lib/heatmap-scroll";
import type { ElementBin } from "../../../supabase/functions/_shared/heatmap-elements";
const bins: ElementBin[] = [
  { kind: "view", target: "", x: 0, y: 0, count: 20 },
  ...[25, 50, 75, 100].map((y, i) => ({
    kind: "scroll" as const,
    target: "",
    x: 0,
    y,
    count: [20, 15, 8, 2][i],
  })),
];
describe("scroll reach bands", () => {
  it("renders all four page quarters, counts and correct sample shares", () => {
    const html = renderToStaticMarkup(<ScrollHeatmapBands bins={bins} />);
    for (const depth of [25, 50, 75, 100])
      expect(html).toContain(`data-scroll-depth="${depth}"`);
    expect(html).toContain("75% da página · 8 entradas amostradas");
    expect(html).toContain("40% das entradas amostradas");
    expect(html).toContain("top:75%");
    expect(html).toContain("pointer-events:none");
    expect(scrollMilestones(bins).map((x) => x.share)).toEqual([
      1, 0.75, 0.4, 0.1,
    ]);
  });
  it("does not invent shares for missing or inconsistent exposure coverage", () => {
    expect(scrollMilestones([]).every((x) => x.share === null)).toBe(true);
    expect(
      scrollMilestones([
        { kind: "view", target: "", x: 0, y: 0, count: 1 },
        { kind: "scroll", target: "", x: 0, y: 25, count: 2 },
      ])[0].share,
    ).toBeNull();
  });
});
