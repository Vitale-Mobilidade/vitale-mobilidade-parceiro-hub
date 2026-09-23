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
    for (const id of ["/", "/escolherbike", "/acompanhamento/", "/acompanhamento/$bikeId", "/radar/", "/radar/$bikeId", "/painel-bikes"]) {
      const route = (router.routesById as unknown as Record<string, { options: { component?: unknown } }>)[id];
      expect(route, id).toBeDefined();
      expect(route.options.component, id).toBeDefined();
    }
  });
});
