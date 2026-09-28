import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminNewArticlePage } from "../pages/AdminEditorial";

const state = vi.hoisted(() => ({ articles: [] as { id: string; video_id: string }[] }));
vi.mock("@/components/admin/AdminShell", () => ({
  AdminShell: ({ children }: { children: (role: string) => React.ReactNode }) => children("admin"),
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("@tanstack/react-query", () => ({
  keepPreviousData: vi.fn(),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data:
      queryKey[1] === "bikes"
        ? {
            bikes: [
              { bike_id: "gt20", name: "GT20" },
              { bike_id: "v9", name: "V9 Max" },
            ],
          }
        : {
            articles: state.articles,
            videos: [
              {
                youtube_id: "abcDEFG1234",
                title: "Título salvo que não deve aparecer",
                transcript: "Transcrição salva que não deve aparecer",
              },
            ],
          },
  }),
}));
vi.mock("@/lib/videos.functions", () => ({ getSheetVideoCatalog: vi.fn(), safeVideos: vi.fn() }));
vi.mock("@/lib/bikes-discovery.functions", () => ({ getBikesDiscovery: vi.fn() }));
vi.mock("@/lib/editorial.functions", () => ({ getPublishedArticles: vi.fn() }));

function render() {
  return renderToStaticMarkup(<AdminNewArticlePage initialVideoId="abcDEFG1234" />);
}
describe("formulário Criar artigo", () => {
  it("um link conhecido mostra aviso, sem importar título/transcrição salvos", () => {
    state.articles = [{ id: "existing", video_id: "abcDEFG1234" }];
    const html = render();
    expect(html).toContain("Já existe um artigo deste vídeo");
    expect(html).toContain("Abrir artigo existente");
    expect(html).not.toContain("Título salvo");
    expect(html).not.toContain("Transcrição salva");
    expect(html).toMatch(/<textarea[^>]*><\/textarea>/);
  });
  it("conhecer só o vídeo não significa que já existe artigo", () => {
    state.articles = [];
    expect(render()).not.toContain("Já existe um artigo");
  });
  it("campos aparecem em ordem, bikes já listadas e capa desmarcada", () => {
    const html = render();
    const labels = ["Link do vídeo", "Título", "Bikes", "Transcrição", "Gerar uma nova imagem de capa"];
    const positions = labels.map((label) => html.indexOf(label));
    expect(
      positions.every((position, index) => position >= 0 && (index === 0 || position > positions[index - 1])),
    ).toBe(true);
    expect(html).toContain("GT20");
    expect(html).toContain("V9 Max");
    expect(html).not.toContain("checked");
    expect(html).not.toContain("Escolher vídeo");
    expect(html).not.toContain("Colar link");
    expect(html).not.toMatch(/id="article-bike-search"[^>]*required/);
  });
});
