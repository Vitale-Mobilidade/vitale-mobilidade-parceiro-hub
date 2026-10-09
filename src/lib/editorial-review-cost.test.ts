import { describe, expect, it } from "vitest";
import { approvedAssessment, repeatedReviewIssues, reviewInputKey, reviewPeers } from "../../supabase/functions/_shared/editorial-review-cost";

const candidate = { id: "new", title: "Autonomia urbana", summary: "Uma bateria maior permite deslocamentos diários.", headings: ["Bateria", "Trajeto", "Escolha"], body: "Considere bateria capacidade trajeto distância autonomia percurso carga motor consumo." };
describe("editorial review cost without paid calls", () => {
  it("preserves the former top five and includes every suspicious body without a cut", () => {
    const unrelated = { id: "other", title: "Culinária", summary: "Receita de bolo.", headings: ["Farinha"], body: "Cozinhe uma deliciosa receita." };
    const suspects = Array.from({ length: 6 }, (_, i) => ({ ...candidate, id: `peer-${i}`, body: `Texto completo ${i}` }));
    expect(reviewPeers(candidate, [candidate, unrelated, ...suspects])).toEqual(suspects);
    expect(reviewPeers(candidate, [unrelated])).toEqual([unrelated]);
  });
  it("omits only metadata outside the baseline and the suspicious set", () => {
    const peers = Array.from({ length: 20 }, (_, i) => ({ id: `peer-${String(i).padStart(2, "0")}`, title: "Receita", summary: "Culinária", headings: ["Farinha"], body: "Chocolate açúcar forno." }));
    expect(reviewPeers(candidate, peers)).toEqual(peers.slice(0, 5));
  });
  it("changes cache identity for every dependency and is stable for exact retries", async () => {
    const input = { policy: "v6", model: "writer", schema: {}, system: "rules", payload: { transcript: "source", text: "article", catalogue: [] }, revision: 7, corpus: [] };
    const key = await reviewInputKey(input);
    expect(key).toHaveLength(64);
    expect(await reviewInputKey(input)).toBe(key);
    for (const field of Object.keys(input)) expect(await reviewInputKey({ ...input, [field]: "changed" })).not.toBe(key);
    for (const field of Object.keys(input.payload)) expect(await reviewInputKey({ ...input, payload: { ...input.payload, [field]: "changed" } })).not.toBe(key);
  });
  it("does not trust incomplete or rejected assessments", () => {
    const valid = { pass: true, qualityScore: 90, issues: [], cautionViolations: [] };
    expect(approvedAssessment(valid)).toBe(true);
    for (const bad of [null, {}, { ...valid, pass: false }, { ...valid, issues: ["unsupported"] }, { ...valid, cautionViolations: ["invented"] }, { ...valid, qualityScore: NaN }, { ...valid, qualityScore: 101 }, { ...valid, issues: undefined }]) expect(approvedAssessment(bad)).toBe(false);
  });
  it("recognizes unchanged errors without blocking a new diagnosis", () => {
    expect(repeatedReviewIssues(["FALTA evidência", "erro"], ["erro", "falta evidencia"])).toBe(true);
    expect(repeatedReviewIssues(["Falta evidência"], ["Bike errada"])).toBe(false);
    expect(repeatedReviewIssues([], [])).toBe(false);
  });
});
