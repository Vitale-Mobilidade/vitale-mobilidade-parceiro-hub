import type { QuizFunnelMetrics } from "./admin-api";

export const QUIZ_STEP_LABELS = [
  "Uso principal",
  "Distância diária",
  "Tipo de trajeto",
  "Garupa ou carga",
  "Peso transportado",
  "Orçamento",
  "Experiência com bike elétrica",
] as const;

export type FunnelStage = {
  key: string;
  label: string;
  count: number;
  previousCount: number | null;
  lost: number | null;
};

export function quizFunnelStages(funnel: QuizFunnelMetrics): FunnelStage[] {
  const counts = [
    {
      key: "page",
      label: "Entraram na página do Quiz",
      count: funnel.pageVisitors,
    },
    { key: "started", label: "Iniciaram o Quiz", count: funnel.started },
    ...QUIZ_STEP_LABELS.map((label, index) => ({
      key: `question-${index + 1}`,
      label: `Pergunta ${index + 1} · ${label}`,
      count:
        funnel.steps.find((step) => step.step === index + 1)?.advanced ?? 0,
    })),
    {
      key: "lead-form",
      label: "Formulário de contato alcançado",
      count: funnel.leadFormReached,
    },
    {
      key: "completed",
      label: "Resultado com recomendações exibido",
      count: funnel.completed,
    },
  ];
  return counts.map((stage, index) => {
    const previousCount = index ? counts[index - 1].count : null;
    return {
      ...stage,
      previousCount,
      lost:
        previousCount == null ? null : Math.max(0, previousCount - stage.count),
    };
  });
}

export function safeRate(part: number, base: number): number | null {
  if (
    !Number.isFinite(part) ||
    !Number.isFinite(base) ||
    base <= 0 ||
    part < 0 ||
    part > base
  )
    return null;
  return part / base;
}
