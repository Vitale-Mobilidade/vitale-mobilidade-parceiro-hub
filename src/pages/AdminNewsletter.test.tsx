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
      queryKey[2] === "people"
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
            audience: { total: 30, eligible: 28, legacy: 1, suppressed: 1 },
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
  });
});
