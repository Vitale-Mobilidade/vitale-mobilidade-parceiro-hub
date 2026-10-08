import { describe, expect, it } from "vitest";
import { quizFunnelStages, safeRate } from "./admin-growth";
import type { QuizFunnelMetrics } from "./admin-api";

const funnel: QuizFunnelMetrics = {
  since: "2026-09-01",
  coverageSince: "2026-09-26",
  abandonAfterMinutes: 30,
  pageVisitors: 527,
  started: 359,
  leadFormReached: 340,
  completed: 254,
  introAbandoned: 168,
  leadFormAbandoned: 86,
  steps: [359, 345, 341, 341, 341, 341, 341].map((reached, index) => ({
    step: index + 1,
    reached,
    advanced: [345, 341, 341, 341, 341, 341, 340][index],
    abandoned: [13, 4, 0, 0, 0, 0, 1][index],
  })),
  rates: {
    startRate: null,
    formRate: null,
    completionRate: null,
    formToCompletion: null,
  },
  uniqueLeads: 0,
  purchaseClicks: 0,
  identifiedClickers: 0,
};

describe("Admin Growth funnel", () => {
  it("constrói o funil comercial com as sete perguntas e perdas", () => {
    const stages = quizFunnelStages(funnel);
    expect(stages).toHaveLength(11);
    expect(stages[0]).toMatchObject({
      count: 527,
      previousCount: null,
      lost: null,
    });
    expect(stages[1]).toMatchObject({
      count: 359,
      previousCount: 527,
      lost: 168,
    });
    expect(stages[2].label).toContain("Uso principal");
    expect(stages[8].label).toContain("Experiência");
    expect(stages[9]).toMatchObject({
      count: 340,
      previousCount: 340,
      lost: 0,
    });
    expect(stages[10]).toMatchObject({
      count: 254,
      previousCount: 340,
      lost: 86,
    });
  });

  it("não inventa taxa quando não há denominador", () => {
    expect(safeRate(0, 0)).toBeNull();
    expect(safeRate(11, 10)).toBeNull();
    expect(safeRate(254, 527)).toBeCloseTo(0.48197);
  });
});
