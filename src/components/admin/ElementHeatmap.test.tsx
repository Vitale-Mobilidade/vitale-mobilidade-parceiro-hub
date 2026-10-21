import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ElementHeatmap } from "./ElementHeatmap";
describe("visual page reference", () => {
  it("always renders the real public page with scripts and interaction disabled, even with no clicks", () => {
    const q = new QueryClient();
    q.setQueryData(["admin", "heatmap-elements", "/", "mobile", 30, 0], {
      bins: [],
      viewport: 390,
      viewports: [],
      layout: "2026-10-elements-v2",
    });
    const html = renderToStaticMarkup(
      <QueryClientProvider client={q}>
        <ElementHeatmap />
      </QueryClientProvider>,
    );
    expect(html).toContain('src="/"');
    expect(html).toContain('sandbox="allow-same-origin"');
    expect(html).not.toContain("allow-scripts");
    expect(html).toContain("width:390px");
    expect(html).toContain("mesmo sem cliques");
    expect(html).toContain("Não é reprodução da sessão");
  });
});
