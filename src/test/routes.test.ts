import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { routeTree } from "@/routeTree.gen";

function makeRouter(path = "/") {
  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    context: { queryClient: new QueryClient() },
  });
}

function leafId(path: string) {
  const matches = makeRouter(path).matchRoutes(path);
  return matches[matches.length - 1]?.routeId;
}

describe("fundação TanStack Start — rotas", () => {
  it.each([
    ["/", "/"],
    ["/escolherbike", "/escolherbike"],
    ["/grupodeofertas", "/grupodeofertas"],
    ["/acompanhamento", "/acompanhamento/"],
    ["/painel-bikes", "/painel-bikes"],
    ["/radar", "/radar/"],
    ["/admin", "/admin/"],
    ["/admin/growth", "/admin/growth"],
    ["/admin/videos", "/admin/videos"],
    ["/admin/conteudos", "/admin/conteudos/"],
    ["/conteudos", "/conteudos/"],
    ["/ferramentas", "/ferramentas/"],
    ["/ferramentas/carro-vs-bike", "/ferramentas/carro-vs-bike"],
    ["/ferramentas/moto-vs-bike", "/ferramentas/moto-vs-bike"],
    ["/ferramentas/aplicativos-vs-bike", "/ferramentas/aplicativos-vs-bike"],
    ["/ferramentas/transporte-publico-vs-bike", "/ferramentas/transporte-publico-vs-bike"],
    ["/ferramentas/veiculo-alugado-vs-bike-propria", "/ferramentas/veiculo-alugado-vs-bike-propria"],
    ["/ferramentas/meta-entregas", "/ferramentas/meta-entregas"],
    ["/ferramentas/economia-de-tempo", "/ferramentas/economia-de-tempo"],
    ["/calculadoras/economia", "/calculadoras/economia"],
  ])("%s resolve para a rota %s", (path, id) => {
    expect(leafId(path)).toBe(id);
  });

  it("/acompanhamento/$bikeId extrai o parâmetro", () => {
    const matches = makeRouter().matchRoutes("/acompanhamento/d50_cross");
    const leaf = matches[matches.length - 1];
    expect(leaf?.routeId).toBe("/acompanhamento/$bikeId");
    expect(leaf?.params).toMatchObject({ bikeId: "d50_cross" });
  });

  it("/radar/$bikeId extrai o parâmetro", () => {
    const matches = makeRouter().matchRoutes("/radar/d50_cross");
    const leaf = matches[matches.length - 1];
    expect(leaf?.routeId).toBe("/radar/$bikeId");
    expect(leaf?.params).toMatchObject({ bikeId: "d50_cross" });
  });

  it("caminho inexistente cai no 404 da raiz", () => {
    const matches = makeRouter().matchRoutes("/nao-existe");
    expect(matches.every((m) => m.routeId === "__root__")).toBe(true);
    const root = makeRouter().routesById["__root__"];
    expect(root.options.notFoundComponent).toBeTypeOf("function");
  });

  it("toda rota declarada tem componente", () => {
    const router = makeRouter();
    for (const id of ["/", "/escolherbike", "/radar/", "/radar/$bikeId", "/painel-bikes", "/admin/", "/admin/growth", "/admin/videos", "/conteudos/", "/ferramentas/", "/ferramentas/meta-entregas", "/ferramentas/economia-de-tempo"]) {
      const route = (router.routesById as unknown as Record<string, { options: { component?: unknown } }>)[id];
      expect(route, id).toBeDefined();
      expect(route.options.component, id).toBeDefined();
    }
  });

  it("hub oficial lista exatamente as sete ferramentas e o legado é noindex", async () => {
    const { MOBILITY_TOOLS, toolHead } = await import("@/lib/mobility/tools-registry");
    expect(MOBILITY_TOOLS).toHaveLength(7);
    for (const t of MOBILITY_TOOLS) {
      const head = toolHead(t.slug);
      expect(head.links[0].href).toBe(`https://vitalemobilidade.com${t.path}`);
      expect(head.meta.some((m) => m.name === "robots")).toBe(false);
    }
    const legacy = makeRouter().routesById["/calculadoras/economia" as never] as unknown as { options: { head: () => { meta: Array<Record<string, string>> } } };
    expect(legacy.options.head().meta).toContainEqual({ name: "robots", content: "noindex, follow" });
  });
});
