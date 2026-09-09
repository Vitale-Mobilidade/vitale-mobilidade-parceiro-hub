import { describe, expect, it } from "vitest";
import WORKER_SRC from "../../supabase/functions/bike-profile-worker/index.ts?raw";

/**
 * Regra aprovada: falha terminal de IA (gateway, JSON ou validação) NUNCA pode
 * escrever em bike_profiles — o perfil ready/baseline anterior permanece ativo
 * até existir um payload novo completamente validado.
 */
const SRC = WORKER_SRC;

function block(startMarker: string, endMarker: string): string {
  const start = SRC.indexOf(startMarker);
  expect(start).toBeGreaterThan(-1);
  const end = SRC.indexOf(endMarker, start);
  expect(end).toBeGreaterThan(start);
  return SRC.slice(start, end);
}

describe("bike-profile-worker: falha terminal preserva perfil anterior", () => {
  it("ramo de erro de IA não escreve em bike_profiles", () => {
    const errorBranch = block('if (result.kind === "error")', "const validated = validateAiProfile");
    expect(errorBranch).not.toContain("bike_profiles");
    expect(errorBranch).toContain("failJob");
    expect(errorBranch).toContain("profile_kept_on_failure");
  });

  it("ramo de payload inválido não escreve em bike_profiles", () => {
    const invalidBranch = block("const validated = validateAiProfile", "// Falha não apaga");
    expect(invalidBranch).not.toContain("bike_profiles");
    expect(invalidBranch).toContain("invalid_ai_payload");
  });

  it("nenhum upsert em bike_profiles com status error", () => {
    expect(SRC).not.toContain('status: "error"');
  });

  it("apenas o ramo validado escreve o perfil", () => {
    const writes = SRC.split("\n").filter((l) => l.includes('from("bike_profiles")'));
    // 1 leitura de idempotência + 1 upsert de sucesso
    expect(writes).toHaveLength(2);
    expect(SRC.indexOf('from("bike_profiles").upsert')).toBeGreaterThan(
      SRC.indexOf("const validated = validateAiProfile"),
    );
  });
});
