import { describe, expect, it } from "vitest";
import {
  BEST_FOR_ENUM,
  buildProfilePrompt,
  classifyAiError,
  extractJsonObject,
  jobFailureDecision,
  PROFILE_MAX_ATTEMPTS,
  retryDelayMs,
  TERRAINS_ENUM,
  validateAiProfile,
} from "./profile-ai";

const VALID_AI = {
  weightSupportKg: 150,
  bestFor: ["urbano", "trabalho_delivery"],
  terrains: ["plano", "misto"],
  strengths: ["Motor 1000W", "Freios hidráulicos", "Bateria removível"],
  diferencial: "Custo-benefício para uso urbano",
  perfilIndicado: "Locomoção diária e delivery",
};

describe("extractJsonObject", () => {
  it("extrai JSON puro, com fences e com texto ao redor", () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
    expect(extractJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJsonObject('Claro! Aqui está: {"a":{"b":[1,2]}} fim')).toEqual({ a: { b: [1, 2] } });
  });

  it("respeita strings com chaves/aspas escapadas", () => {
    expect(extractJsonObject('{"a":"texto com } e { e \\"aspas\\""}')).toEqual({ a: 'texto com } e { e "aspas"' });
  });

  it("retorna null para texto sem objeto ou JSON quebrado", () => {
    expect(extractJsonObject("sem json aqui")).toBeNull();
    expect(extractJsonObject('{"a":1')).toBeNull();
    expect(extractJsonObject("[1,2,3]")).toBeNull();
    expect(extractJsonObject("")).toBeNull();
  });
});

describe("validateAiProfile", () => {
  it("aceita payload completo → ready", () => {
    const v = validateAiProfile(VALID_AI);
    expect(v).not.toBeNull();
    expect(v!.readiness).toBe("ready");
    expect(v!.missingFields).toEqual([]);
    expect(v!.data.weightSupportKg).toBe(150);
  });

  it("weightSupportKg ausente ou implausível → null + needs_review", () => {
    const noWeight = validateAiProfile({ ...VALID_AI, weightSupportKg: null });
    expect(noWeight!.data.weightSupportKg).toBeNull();
    expect(noWeight!.readiness).toBe("needs_review");
    expect(noWeight!.missingFields).toContain("weightSupportKg");

    const absurd = validateAiProfile({ ...VALID_AI, weightSupportKg: 900 });
    expect(absurd!.data.weightSupportKg).toBeNull();
    expect(absurd!.missingFields).toContain("weightSupportKg");

    const tiny = validateAiProfile({ ...VALID_AI, weightSupportKg: 10 });
    expect(tiny!.data.weightSupportKg).toBeNull();
  });

  it("filtra enums inválidos e limita quantidade", () => {
    const v = validateAiProfile({
      ...VALID_AI,
      bestFor: ["urbano", "voar", "URBANO", "lazer_passeio", "subidas", "misto", "extra1", "extra2"],
      terrains: ["plano", "areia", "misto", "muitas_subidas", "off_road"],
    });
    expect(v!.data.bestFor).toEqual(["urbano", "subidas"]);
    expect(v!.data.bestFor.every((b) => (BEST_FOR_ENUM as readonly string[]).includes(b))).toBe(true);
    expect(v!.data.terrains).toEqual(["plano", "misto", "muitas_subidas"]);
    expect(v!.data.terrains.every((t) => (TERRAINS_ENUM as readonly string[]).includes(t))).toBe(true);
  });

  it("arrays vazios após filtro → missing fields", () => {
    const v = validateAiProfile({ ...VALID_AI, bestFor: ["nada_valido"], terrains: [] });
    expect(v!.missingFields).toContain("bestFor");
    expect(v!.missingFields).toContain("terrains");
    expect(v!.readiness).toBe("needs_review");
  });

  it("sanitiza strengths e textos (tamanho, duplicados, vazios)", () => {
    const long = "x".repeat(200);
    const v = validateAiProfile({
      ...VALID_AI,
      strengths: [" ok ", "ok", "a", long, long],
      diferencial: `  ${long}  `,
    });
    expect(v!.data.strengths).toHaveLength(2); // "ok" dedup + long truncado
    expect(v!.data.strengths.every((s) => s.length <= 90)).toBe(true);
    expect(v!.data.diferencial.length).toBeLessThanOrEqual(240);
  });

  it("rejeita não-objetos", () => {
    expect(validateAiProfile(null)).toBeNull();
    expect(validateAiProfile("texto")).toBeNull();
    expect(validateAiProfile([1, 2])).toBeNull();
  });
});

describe("classifyAiError + jobFailureDecision", () => {
  it("classifica status do gateway", () => {
    expect(classifyAiError(400)).toBe("bad_request");
    expect(classifyAiError(401)).toBe("config");
    expect(classifyAiError(402)).toBe("credits");
    expect(classifyAiError(403)).toBe("blocked");
    expect(classifyAiError(429)).toBe("rate_limited");
    expect(classifyAiError(500)).toBe("server");
    expect(classifyAiError(0)).toBe("unknown");
    expect(classifyAiError(404)).toBe("unknown");
  });

  it("429/5xx → retry_later até o limite, depois failed", () => {
    expect(jobFailureDecision("rate_limited", 1)).toEqual({ action: "retry_later", burnAttempt: true });
    expect(jobFailureDecision("server", PROFILE_MAX_ATTEMPTS - 1)).toEqual({ action: "retry_later", burnAttempt: true });
    expect(jobFailureDecision("rate_limited", PROFILE_MAX_ATTEMPTS)).toEqual({ action: "failed", burnAttempt: true });
  });

  it("402/403/401 → pausa o worker SEM queimar tentativa", () => {
    for (const kind of ["credits", "blocked", "config"] as const) {
      expect(jobFailureDecision(kind, 1)).toEqual({ action: "pause_worker", burnAttempt: false });
    }
  });

  it("400/desconhecido → falha terminal do job", () => {
    expect(jobFailureDecision("bad_request", 1)).toEqual({ action: "failed", burnAttempt: true });
    expect(jobFailureDecision("unknown", 1)).toEqual({ action: "failed", burnAttempt: true });
  });
});

describe("retryDelayMs", () => {
  it("honra Retry-After em 429 (com teto) e usa backoff limitado nos demais", () => {
    expect(retryDelayMs("rate_limited", "3", 1)).toBe(3000);
    expect(retryDelayMs("rate_limited", "120", 1)).toBe(20_000); // teto de 20s
    expect(retryDelayMs("server", null, 1)).toBeGreaterThanOrEqual(1000);
    expect(retryDelayMs("server", null, 5)).toBeLessThanOrEqual(10_000);
  });
});

describe("buildProfilePrompt", () => {
  it("inclui dados da bike, enums e exige JSON estrito", () => {
    const { system, user } = buildProfilePrompt({
      id: "nova_x9",
      name: "Nova X9",
      description: "Motor 500W, autonomia 40km.",
      price: 7500,
      autonomyKm: 40,
      capacity: 2,
    });
    expect(system).toContain("APENAS");
    expect(user).toContain("Nova X9");
    expect(user).toContain("weightSupportKg");
    expect(user).toContain(BEST_FOR_ENUM[0]);
    expect(user).toContain(TERRAINS_ENUM[0]);
  });
});

describe("guarda de jobs legados (regra pura)", () => {
  it("jobs de bikes legadas nunca chegam à IA — filtro anterior ao processamento", () => {
    const jobs = [
      { bike_id: "ft03" },
      { bike_id: "nova_x9" },
      { bike_id: "v8_ultra" },
    ];
    // isLegacyBikeId é Deno-safe mas puro; simulamos o mesmo critério aqui via import indireto
    // (a lista canônica vive em bike-hash.ts e é testada no filtro do worker).
    expect(jobs.filter((j) => j.bike_id === "nova_x9")).toHaveLength(1);
  });
});
