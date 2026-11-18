import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RadarAlertMetrics } from "./RadarAlertMetrics";
import type { RadarAlertOverview } from "@/lib/price-alert-metrics";

const overview: RadarAlertOverview = {
  local: {
    totalAlerts: 60,
    people: 52,
    activeRegistrations: 60,
    recent7d: 18,
    daily: [{ day: "2026-11-18", registrations: 4 }],
    export: { failed: 10, pending: 4, oldestPending: null },
    email: { delivered: 1 },
  },
  remote: {
    available: true,
    counts: {
      active: 17,
      sent: 20,
      receipt_delivered: 7,
      receipt_read: 7,
      receipt_failed: 5,
      uncertain: 12,
      failed: 1,
      not_received: 10,
    },
    checkedAt: null,
  },
  reconciliation: {
    total: 60,
    waiting: 17,
    delivered: 14,
    inDelivery: 1,
    needsAttention: 28,
    closed: 0,
    issues: {
      notTracking: 10,
      unconfirmed: 12,
      sendFailed: 1,
      deliveryFailed: 5,
    },
  },
};
function textOf(value: RadarAlertOverview) {
  return renderToStaticMarkup(<RadarAlertMetrics overview={value} />).replace(
    /<[^>]*>/g,
    "",
  );
}

describe("Radar lifecycle indicators", () => {
  it("shows the complete 60-alert partition and keeps people outside the sum", () => {
    const text = textOf(overview);
    expect(text).toContain("60 alertas cadastrados");
    expect(text).toContain("De 52 pessoas");
    expect(text).toContain(
      "17 aguardando preço + 14 entregues + 1 em andamento + 28 com pendências = 60 alertas",
    );
    expect(text).not.toContain("20 com entrega");
    expect(text).toContain("10 cadastros ainda sem acompanhamento confirmado");
    expect(text).toContain("12 envios que precisam de conferência");
    expect(text).toContain("5 avisos enviados que não chegaram");
    expect(text).not.toContain("resultado incerto");
  });
  it("does not guess the missing remainder when a full reconciliation is unavailable", () => {
    const html = renderToStaticMarkup(
      <RadarAlertMetrics overview={{ ...overview, reconciliation: null }} />,
    );
    expect(html).toContain("Nenhum total de situação foi estimado");
    expect(html.match(/>—</g)).toHaveLength(4);
    expect(html).not.toContain('aria-label="Conferência do total de alertas"');
  });
  it("includes closed alerts in the equation when present", () => {
    const text = textOf({
      ...overview,
      local: { ...overview.local!, totalAlerts: 62 },
      reconciliation: { ...overview.reconciliation!, total: 62, closed: 2 },
    });
    expect(text).toContain("+ 2 encerrados = 62 alertas");
  });
  it("preserves the accessible calendar and unavailable-state warning", () => {
    const html = renderToStaticMarkup(
      <RadarAlertMetrics overview={overview} />,
    );
    expect(html).toContain("Cadastros diários no fuso America/Sao_Paulo");
    expect(html).toContain("2026-11-18");
    expect(
      textOf({
        local: null,
        remote: { available: false, counts: {}, checkedAt: null },
      }),
    ).toContain("Nenhum total de situação foi estimado");
  });
});
