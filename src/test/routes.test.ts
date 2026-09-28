import { describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter, isRedirect } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { routeTree } from "@/routeTree.gen";
import { attributionPayload, captureQuizAttribution } from "@/lib/quiz-attribution";
import { legacyRedirect } from "@/lib/legacy-redirects";

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
    ["/quiz", "/quiz"],
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

  it("rota antiga redireciona para a Home sem loader; Quiz tem metadata nova", () => {
    const router = makeRouter();
    const old = router.routesById["/escolherbike"];
    expect(old.options.loader).toBeUndefined();
    const beforeLoad = old.options.beforeLoad!;
    try {
      beforeLoad({ location: { searchStr: "?utm_source=yt" } } as never);
      expect.fail("A rota antiga deveria redirecionar");
    } catch (result) {
      expect(isRedirect(result)).toBe(true);
      expect((result as { options: unknown }).options).toMatchObject({
        href: "/?utm_source=yt",
        statusCode: 301,
      });
    }
    const quiz = router.routesById["/quiz"];
    expect(quiz.options.loader).toBeTypeOf("function");
    const head = quiz.options.head!({} as never) as {
      links: Array<Record<string, string>>;
      meta: Array<Record<string, string>>;
    };
    expect(head.links).toContainEqual({
      rel: "canonical",
      href: "https://vitalemobilidade.com/quiz",
    });
    expect(head.meta).toContainEqual({
      property: "og:url",
      content: "https://vitalemobilidade.com/quiz",
    });
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
    for (const id of [
      "/",
      "/quiz",
      "/radar/",
      "/radar/$bikeId",
      "/painel-bikes",
      "/admin/",
      "/admin/growth",
      "/admin/videos",
      "/conteudos/",
      "/ferramentas/",
      "/ferramentas/meta-entregas",
      "/ferramentas/economia-de-tempo",
    ]) {
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
    const legacy = makeRouter().routesById["/calculadoras/economia" as never] as unknown as {
      options: { head: () => { meta: Array<Record<string, string>> } };
    };
    expect(legacy.options.head().meta).toContainEqual({
      name: "robots",
      content: "noindex, follow",
    });
  });
});

describe("campanha na entrada pública até o payload do Quiz", () => {
  it("QR antigo → Home → Radar → Quiz preserva cinco UTMs sem query interna", () => {
    const values = new Map<string, string>();
    const sessionStorage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
    };
    const query =
      "?UTM_Source=Video&utm_medium=QR&utm_campaign=Lancamento&utm_content=Bike%2BTeste&utm_term=uso%20diario&x=1&x=2";
    const destination = legacyRedirect("/escolherbike", query)!;
    const entry = new URL(destination, "https://vitalemobilidade.com").href;
    const location = new URL(entry);
    vi.stubGlobal("window", { location, sessionStorage });
    try {
      const beforeLoad = makeRouter().routesById["__root__"].options.beforeLoad!;
      beforeLoad({} as never);
      location.href = "https://vitalemobilidade.com/radar";
      beforeLoad({} as never);
      location.href = "https://vitalemobilidade.com/quiz";
      beforeLoad({} as never);
      expect(attributionPayload(captureQuizAttribution())).toEqual({
        utm_source: "Video",
        utm_medium: "QR",
        utm_campaign: "Lancamento",
        utm_content: "Bike+Teste",
        utm_term: "uso diario",
        traffic_origin: "Video",
        source_url: entry,
      });
      // Outra entrada de campanha substitui todo o conjunto, sem mesclar.
      location.href = "https://vitalemobilidade.com/?utm_source=Outra";
      beforeLoad({} as never);
      location.href = "https://vitalemobilidade.com/quiz";
      expect(attributionPayload(captureQuizAttribution())).toMatchObject({
        utm_source: "Outra",
        traffic_origin: "Outra",
        utm_campaign: null,
        utm_content: null,
      });
      // Uma nova sessão/aba não herda a campanha.
      values.clear();
      beforeLoad({} as never);
      expect(attributionPayload(captureQuizAttribution()).traffic_origin).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("não registra URL administrativa e não usa browser no SSR", () => {
    const setItem = vi.fn();
    const beforeLoad = makeRouter().routesById["__root__"].options.beforeLoad!;
    vi.stubGlobal("window", {
      location: new URL("https://vitalemobilidade.com/admin?utm_source=Admin"),
      sessionStorage: { getItem: () => null, setItem },
    });
    try {
      beforeLoad({} as never);
      expect(setItem).not.toHaveBeenCalled();
      vi.stubGlobal("window", undefined);
      expect(() => beforeLoad({} as never)).not.toThrow();
      expect(captureQuizAttribution().source_url).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
