import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";
vi.mock("@/components/admin/AdminShell", () => ({
  AdminShell: ({ children }: { children: (role: string) => ReactNode }) =>
    children("admin"),
}));
vi.mock("@/components/admin/NewsletterDraftEditor", () => ({
  NewsletterDraftEditor: () => null,
}));
vi.mock("@/lib/newsletter-api", () => ({ newsletterCall: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data:
      queryKey[2] === "drafts"
        ? {
            drafts: [
              {
                id: "00000000-0000-4000-8000-000000000001",
                edition_day: "2099-10-19",
                content: {
                  subject: "Próxima edição preparada para visualizar",
                },
              },
              {
                id: "00000000-0000-4000-8000-000000000002",
                edition_day: "2020-10-19",
                content: {
                  subject: "Rascunho antigo não deve virar próxima edição",
                },
              },
            ],
          }
        : queryKey[2] === "campaign-reports"
          ? {
              "1": {
                available: true,
                sent: 29,
                delivered: 1,
                opened: 1,
                clicked: 0,
                openTracking: true,
                clickTracking: true,
              },
            }
          : queryKey[2] === "metrics"
            ? {
                days: [
                  { day: "2026-10-15", count: 1 },
                  { day: "2026-10-16", count: 2 },
                ],
                radarPeople: 3,
                radarAlerts: 4,
              }
            : queryKey[2] === "people"
              ? {
                  total: 30,
                  page: 0,
                  rows: [
                    {
                      id: "1",
                      person_name: "Pessoa de teste",
                      email: "teste@example.test",
                      created_at: "2026-10-08T12:00:00Z",
                      subscription_status: "eligible",
                      delivery_status: null,
                    },
                  ],
                }
              : {
                  settings: {
                    enabled: false,
                    from_email: "",
                    reply_to: "",
                    segments: {},
                  },
                  audience: {
                    total: 30,
                    eligible: 28,
                    legacy: 1,
                    suppressed: 1,
                  },
                  campaigns: [
                    {
                      id: "1",
                      edition_day: "2026-10-08",
                      segment: "general",
                      status: "sent",
                      recipients: 29,
                      delivered: 1,
                      failed: 1,
                    },
                  ],
                },
  }),
}));
import AdminNewsletter from "./AdminNewsletter";
describe("newsletter people view", () => {
  it("renders the general count, accessible KPI buttons, people and delivery filters", () => {
    const html = renderToStaticMarkup(<AdminNewsletter />);
    expect(html).toContain("Todos os cadastrados");
    expect(html).toContain("30 pessoas neste filtro");
    expect(html).toContain("teste@example.test");
    expect(html).toContain("Pessoa de teste");
    expect(html).toContain("Sem confirmação");
    expect(html).toContain("Entregues</button>");
    expect(html).toContain("Página 1");
    expect(html).toContain("Ver pessoas");
    expect(html).toContain("Enviados");
    expect(html).toContain("Abertos");
    expect(html).toContain("Com clique");
    expect(html).toContain("Quem abriu</button>");
    expect(html).toContain("Quem clicou</button>");
    expect(html).toContain("Visualizar edição enviada");
    expect(html).toContain("Próxima edição preparada para visualizar");
    expect(html).toContain("Visualizar conteúdo e HTML");
    expect(html).not.toContain("Rascunho antigo não deve virar próxima edição");
    expect(html).not.toContain("Abrir provedor de envio");
    expect(html).toContain("Passe o mouse");
    const table = html.split("<tbody>")[1].split("</tbody>")[0];
    expect(table.indexOf("16/10/2026")).toBeLessThan(
      table.indexOf("15/10/2026"),
    );
    expect(html).toContain("08/10/2026, 09:00");
    expect(html).toContain("Novas inscrições");
    expect(html).not.toContain("Aguardam novo aceite");
    expect(html).toContain("Configurações e preparação de edições");
  });
});
