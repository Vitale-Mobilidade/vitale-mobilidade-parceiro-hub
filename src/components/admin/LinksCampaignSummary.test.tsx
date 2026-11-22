import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LinksCampaignSummary } from "./LinksCampaignSummary";

let result: Record<string, unknown>;
vi.mock("@tanstack/react-query", () => ({ useQuery: () => result }));
vi.mock("@/lib/admin-api", () => ({ adminCall: vi.fn() }));
const render = () =>
  renderToStaticMarkup(
    <LinksCampaignSummary startDate="2026-11-01" endDate="2026-11-22" />,
  );
describe("resumo da bio em Campanhas", () => {
  beforeEach(() => {
    result = {
      data: { views: 1234, days: [{ date: "2026-11-20", views: 1234 }] },
      isPending: false,
      isError: false,
    };
  });
  it("mostra acessos da bio e distingue visualizações de pessoas", () => {
    const html = render();
    expect(html).toContain("1.234");
    expect(html).toContain("Link da bio · /links");
    expect(html).toContain("fora de Growth");
    expect(html).toContain("incluindo visitas repetidas");
  });
  it("diferencia ausência de acesso, carregamento e erro", () => {
    result = { data: { views: 0, days: [] } };
    expect(render()).toContain("Nenhum acesso registrado");
    result = { isPending: true };
    expect(render()).toContain("Carregando acessos");
    result = { isError: true };
    expect(render()).toContain("Medição indisponível");
    expect(render()).not.toContain("Nenhum acesso registrado");
  });
});
