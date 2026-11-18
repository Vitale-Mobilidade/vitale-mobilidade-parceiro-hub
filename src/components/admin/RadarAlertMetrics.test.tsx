import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RadarAlertMetrics } from "./RadarAlertMetrics";
describe("Radar lifecycle indicators", () => {
  it("does not turn unavailable delivery into zero delivered", () => {
    const html = renderToStaticMarkup(
      <RadarAlertMetrics
        overview={{
          local: null,
          remote: { available: false, counts: {}, checkedAt: null },
        }}
      />,
    );
    expect(html).toContain("Nenhum total remoto foi estimado");
    expect(html).toContain("—");
  });
  it("keeps global local registrations separate from confirmed WhatsApp delivery", () => {
    const html = renderToStaticMarkup(
      <RadarAlertMetrics
        overview={{
          local: {
            totalAlerts: 59,
            people: 45,
            activeRegistrations: 59,
            recent7d: 10,
            daily: [{ day: "2026-11-18", registrations: 4 }],
            export: { failed: 10, pending: 4, oldestPending: null },
            email: {},
          },
          remote: {
            available: true,
            counts: {
              sent: 23,
              receipt_delivered: 19,
              receipt_read: 2,
              uncertain: 12,
            },
            checkedAt: null,
          },
        }}
      />,
    );
    expect(html).toContain("23");
    expect(html).toContain("21");
    expect(html).toContain("Pessoas cadastradas");
    expect(html).toContain("Avisos de preço enviados");
    expect(html).toContain("21 com entrega confirmada");
    expect(html).not.toContain("resultado incerto");
    expect(html).not.toContain("Cadastros ativos no site");
    expect(html).toMatch(/<details[^>]*><summary[^>]*>Ver pendências de envio/);
    expect(html).toContain("12 sem confirmação de envio");
    expect(html).toContain("Cadastros diários no fuso America/Sao_Paulo");
    expect(html).toContain("2026-11-18");
  });
});
