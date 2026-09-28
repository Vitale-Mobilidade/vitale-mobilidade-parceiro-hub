import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminArticleEditorPage } from "../pages/AdminEditorial";

const state = vi.hoisted(() => ({
  hook: 0,
  editing: false,
  published: false,
  query: {} as Record<string, unknown>,
  result: { data: null as { image: string | null } | null, isPending: false, isError: false },
}));
const id = "f06f0a1c-c59f-483c-a1c8-28255c6b4755";
const storedUrl = `https://test.invalid/functions/v1/bike-image?type=editorial-cover&id=${id}&file=fae22d43-8bf8-4c97-aac8-5dfb5cc59c85`;
const article = {
  id,
  revision: 3,
  status: "draft",
  title: "Assunto do artigo",
  summary: "Introdução",
  slug: "assunto-do-artigo",
  og_image_url: storedUrl,
  blocks: [
    { type: "text", heading: "Tema", text: "Texto útil." },
    { type: "text", text: "Conclusão." },
  ],
  faq: [],
  video_id: "abcDEFG1234",
  primary_bike_id: null,
  related_bike_ids: [],
  related_article_ids: [],
  validation_errors: [],
  foundation_required: false,
};
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => {
      const hook = state.hook++;
      return actual.useState(
        hook === 0
          ? { ...article, status: state.published ? "published" : "draft" }
          : hook === 2
            ? [
                { bikeId: "v9_max", name: "V9 Max" },
                { bikeId: "ft03", name: "FT03" },
              ]
            : hook === 5 && state.editing
              ? {
                  title: article.title,
                  summary: article.summary,
                  body: "Texto",
                  slug: article.slug,
                  ogImageUrl: storedUrl,
                  seoTitle: "Título",
                  metaDescription: "Descrição",
                  primaryBikeId: "v9_max",
                  relatedBikeIds: "",
                  indexable: true,
                }
              : initial,
      );
    },
  };
});
vi.mock("@/components/admin/AdminShell", () => ({
  AdminShell: ({ children }: { children: (role: string) => React.ReactNode }) => children("admin"),
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("@tanstack/react-query", () => ({
  keepPreviousData: vi.fn(),
  useQueryClient: () => ({ invalidateQueries: vi.fn(), setQueryData: vi.fn() }),
  useQuery: (options: Record<string, unknown>) => {
    state.query = options;
    return { ...state.result, refetch: vi.fn() };
  },
}));
vi.mock("@/lib/videos.functions", () => ({ getSheetVideoCatalog: vi.fn(), safeVideos: vi.fn() }));
vi.mock("@/lib/bikes-discovery.functions", () => ({ getBikesDiscovery: vi.fn() }));
vi.mock("@/lib/editorial.functions", () => ({ getPublishedArticles: vi.fn() }));
const call = vi.hoisted(() => vi.fn().mockResolvedValue({ image: "data:image/jpeg;base64,fixture" }));
vi.mock("@/lib/admin-api", () => ({ adminCall: call, adminStream: vi.fn(), funnelPct: vi.fn() }));

beforeEach(() => {
  state.hook = 0;
  state.editing = false;
  state.published = false;
  state.result = { data: null, isPending: false, isError: false };
  call.mockClear();
});
const render = () => renderToStaticMarkup(<AdminArticleEditorPage id={id} />);

describe("prévia administrativa de capa salva", () => {
  it("reabertura lê a capa pela API autenticada, sem gerar ou reaplicar", async () => {
    state.result.data = { image: "data:image/jpeg;base64,fixture" };
    const html = render();
    expect(html).toContain('src="data:image/jpeg;base64,fixture"');
    expect(html).not.toContain(storedUrl.replace(/&/g, "&amp;"));
    expect(state.query.enabled).toBe(true);
    expect(state.query.queryKey).toEqual(["admin", "article-cover-preview", id, storedUrl]);
    await (state.query.queryFn as () => Promise<unknown>)();
    expect(call).toHaveBeenCalledExactlyOnceWith("cover-preview", { id });
  });
  it("mostra carregamento sem tentar carregar a URL pública do rascunho", () => {
    state.result.isPending = true;
    const html = render();
    expect(html).toContain("Carregando capa salva");
    expect(html).not.toContain(storedUrl.replace(/&/g, "&amp;"));
  });
  it("falha de leitura oferece tentar carregar sem gerar outra imagem", () => {
    state.result.isError = true;
    const html = render();
    expect(html).toContain("Não foi possível carregar a capa salva");
    expect(html).toContain("Tentar carregar novamente");
    expect(call).not.toHaveBeenCalled();
  });
});

describe("edição e regeneração por bikes", () => {
  it("lista por nome visível fora das configurações avançadas e marca associação salva", () => {
    state.editing = true;
    const html = render();
    expect(html).toContain('aria-label="Buscar bikes do artigo"');
    expect(html).toContain("V9 Max");
    expect(html).toContain("FT03");
    expect(html).toContain('checked=""');
    expect(html.indexOf("Buscar bikes do artigo")).toBeLessThan(html.indexOf("Corpo do artigo"));
    expect(html).not.toContain("Bike principal (ID)");
    expect(html).not.toContain("Bikes relacionadas (IDs)");
    expect(html).toContain("Salve as bikes e demais alterações antes de regenerar");
  });
  it("permite regenerar publicado quando não existem alterações por salvar", () => {
    state.published = true;
    const html = render();
    const button = html.match(/<button[^>]*>Regenerar artigo<\/button>/)?.[0];
    expect(button).toBeDefined();
    expect(button).not.toContain('disabled=""');
    expect(html).not.toContain("Mude para Rascunho para regenerar");
  });
});
