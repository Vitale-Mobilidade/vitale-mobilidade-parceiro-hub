import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminRadarAlert } from "@/lib/admin-radar";
const state = vi.hoisted(() => ({ role: "admin" }));
vi.mock("@/components/admin/AdminShell", () => ({
  AdminShell: ({ children }: { children: (role: string) => ReactNode }) =>
    children(state.role),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    ...props
  }: {
    to: string;
    params?: Record<string, string>;
    children: ReactNode;
  }) => (
    <a {...props} href={params ? to.replace("$bikeId", params.bikeId) : to}>
      {children}
    </a>
  ),
}));
import AdminRadar, { RadarAlertRow } from "./AdminRadar";
import { RadarAudienceCard } from "@/components/admin/RadarAudienceCard";
const alert: AdminRadarAlert = {
  id: "fixture-1",
  personName: "Pessoa fictícia",
  phone: "+5511999990000",
  email: "pessoa@example.test",
  bikeId: "bw1",
  bikeName: "BW1",
  condition: "target",
  targetPrice: 4000,
  referencePrice: 6000,
  currentPrice: 4900,
  priceVerifiedAt: "2026-10-16T20:00:00Z",
  status: "active",
  consent: true,
  deliveryEnabled: false,
  createdAt: "2026-10-15T12:00:00Z",
  updatedAt: "2026-10-15T12:00:00Z",
};
beforeEach(() => {
  state.role = "admin";
});
function render() {
  const client = new QueryClient();
  client.setQueryData(
    ["admin", "radar-alerts", { page: 1, scope: "active", search: "" }],
    {
      items: [alert],
      page: 1,
      pageSize: 25,
      totalAlerts: 1,
      updatedAt: "2026-10-16T20:00:00Z",
    },
  );
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <AdminRadar />
    </QueryClientProvider>,
  );
}
describe("Radar admin people", () => {
  it("makes the overview card a real navigable link", () => {
    const html = renderToStaticMarkup(<RadarAudienceCard count={14} />);
    expect(html).toContain('href="/admin/radar"');
    expect(html).toContain("Ver pessoas, contatos e preços");
  });
  it("keeps contacts, bike, current and target prices visible and person expandable", () => {
    const html = render();
    expect(html).toContain("Pessoa fictícia");
    expect(html).toContain('href="https://wa.me/5511999990000"');
    expect(html).toContain('href="mailto:pessoa%40example.test"');
    expect(html).toContain('href="/radar/bw1"');
    expect(html).toContain("4.900,00");
    expect(html).toContain("4.000,00");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="radar-alert-fixture-1"');
    expect(html).not.toContain("6.000,00");
  });
  it.each(["operation", "content"])(
    "does not render any contact or query panel for %s",
    (role) => {
      state.role = role;
      const html = render();
      expect(html).toContain("Somente administradores");
      expect(html).not.toContain("pessoa@example.test");
      expect(html).not.toContain("+5511999990000");
      expect(html).not.toContain("<form");
    },
  );
  it("distinguishes no current offer and any price drop from a chosen target", () => {
    const html = renderToStaticMarkup(
      <RadarAlertRow
        alert={{
          ...alert,
          currentPrice: null,
          condition: "any_drop",
          targetPrice: null,
        }}
      />,
    );
    expect(html).toContain("Qualquer queda");
    expect(html).toContain("Sem oferta vigente válida");
    expect(html).not.toContain("6.000,00");
  });
  it("does not offer contact actions without consent", () => {
    const html = renderToStaticMarkup(
      <RadarAlertRow alert={{ ...alert, consent: false }} />,
    );
    expect(html).toContain("Sem autorização de contato");
    expect(html).not.toContain('href="https://wa.me');
    expect(html).not.toContain('href="mailto:');
  });
  it("does not imply a sent message when the target is reached", () => {
    const html = renderToStaticMarkup(
      <RadarAlertRow alert={{ ...alert, currentPrice: 3900 }} />,
    );
    expect(html).toContain("Preço desejado atingido");
    expect(html).not.toContain("mensagem enviada");
  });
});
