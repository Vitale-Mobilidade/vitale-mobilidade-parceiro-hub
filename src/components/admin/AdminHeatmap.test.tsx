import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LegacyHeatmap as AdminHeatmap } from "./AdminHeatmap";
import { HEATMAP_LAYOUT } from "../../../supabase/functions/_shared/heatmap";
function render(bins: unknown[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(["admin", "heatmap", "/", "mobile", 30], {
    bins,
    layout: HEATMAP_LAYOUT,
    sample: 0.25,
  });
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <AdminHeatmap />
    </QueryClientProvider>,
  );
}
describe("heatmap admin presentation", () => {
  it("labels missing coverage without inventing totals", () => {
    expect(render([])).toContain("Sem cobertura");
  });
  it("renders sampled counts and accessible cell table without implying individual funnels", () => {
    const html = render([
      { kind: "view", x: 0, y: 0, action: "other", count: 10 },
      { kind: "click", x: 2, y: 3, action: "radar", count: 4 },
      { kind: "scroll", x: 0, y: 50, action: "other", count: 5 },
    ]);
    expect(html).toContain("10 entradas amostradas");
    expect(html).toContain("4 cliques");
    expect(html).toContain("Contagens por célula");
    expect(html).toContain("sem pessoas únicas");
    expect(html).not.toContain("iframe");
  });
});
