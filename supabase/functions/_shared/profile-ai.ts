// Lógica pura do worker de perfil técnico via IA.
// Sem dependências de runtime — testável no vitest.

/** Enums compatíveis com as regexes de score do quiz-engine. */
export const BEST_FOR_ENUM = [
  "locomocao_diaria",
  "trabalho_delivery",
  "lazer_passeio",
  "urbano",
  "off_road",
  "subidas",
  "longa_distancia",
] as const;

export const TERRAINS_ENUM = [
  "plano",
  "misto",
  "muitas_subidas",
  "asfalto",
  "off_road",
] as const;

export type AiErrorKind =
  | "bad_request"
  | "config"
  | "credits"
  | "blocked"
  | "rate_limited"
  | "server"
  | "unknown";

export interface BikeProfileData {
  weightSupportKg: number | null;
  bestFor: string[];
  terrains: string[];
  strengths: string[];
  diferencial: string;
  perfilIndicado: string;
}

export interface ValidatedProfile {
  data: BikeProfileData;
  readiness: "ready" | "needs_review";
  missingFields: string[];
}

export const PROFILE_MAX_ATTEMPTS = 3;

/** Extrai o primeiro objeto JSON balanceado de um texto (suporta ``` fences e texto ao redor). */
export function extractJsonObject(raw: string): Record<string, unknown> | null {
  if (!raw) return null;
  const start = raw.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(raw.slice(start, i + 1));
          return parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function cleanString(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLen);
}

function cleanEnumArray(value: unknown, allowed: readonly string[], maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const v = item.trim().toLowerCase();
    if (allowed.includes(v) && !out.includes(v)) out.push(v);
    if (out.length >= maxItems) break;
  }
  return out;
}

function cleanStrengths(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const v = cleanString(item, 90);
    if (v.length >= 3 && !out.includes(v)) out.push(v);
    if (out.length >= maxItems) break;
  }
  return out;
}

function cleanWeight(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(",", ".")) : NaN;
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  return rounded >= 40 && rounded <= 400 ? rounded : null;
}

/**
 * Valida e saneia a saída da IA. Nunca lança — saída inválida vira null;
 * campos faltantes marcam readiness="needs_review" e entram em missingFields.
 * weightSupportKg só é aceito quando presente e plausível (40–400 kg).
 */
export function validateAiProfile(raw: unknown): ValidatedProfile | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;

  const weightSupportKg = cleanWeight(obj.weightSupportKg);
  const bestFor = cleanEnumArray(obj.bestFor, BEST_FOR_ENUM, 4);
  const terrains = cleanEnumArray(obj.terrains, TERRAINS_ENUM, 3);
  const strengths = cleanStrengths(obj.strengths, 6);
  const diferencial = cleanString(obj.diferencial, 240);
  const perfilIndicado = cleanString(obj.perfilIndicado, 240);

  const missingFields: string[] = [];
  if (weightSupportKg == null) missingFields.push("weightSupportKg");
  if (bestFor.length === 0) missingFields.push("bestFor");
  if (terrains.length === 0) missingFields.push("terrains");
  if (strengths.length === 0) missingFields.push("strengths");
  if (!diferencial) missingFields.push("diferencial");
  if (!perfilIndicado) missingFields.push("perfilIndicado");

  return {
    data: { weightSupportKg, bestFor, terrains, strengths, diferencial, perfilIndicado },
    readiness: missingFields.length === 0 ? "ready" : "needs_review",
    missingFields,
  };
}

/** Classifica a falha da chamada à IA pelo status HTTP. */
export function classifyAiError(status: number): AiErrorKind {
  if (status === 400) return "bad_request";
  if (status === 401) return "config";
  if (status === 402) return "credits";
  if (status === 403) return "blocked";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server";
  return "unknown";
}

export type JobFailureAction = "retry_later" | "failed" | "pause_worker";

export interface JobFailureDecision {
  action: JobFailureAction;
  /** Se true, a tentativa conta para o limite de retries. */
  burnAttempt: boolean;
}

/**
 * Decide o que fazer com um job que falhou:
 * - 429/5xx → retry até o limite (backoff feito pelo caller);
 * - 402/403/401 → pausa o worker inteiro SEM queimar tentativa do job;
 * - 400/desconhecido → falha terminal do job.
 */
export function jobFailureDecision(kind: AiErrorKind, attemptsAfter: number): JobFailureDecision {
  if (kind === "rate_limited" || kind === "server") {
    return attemptsAfter >= PROFILE_MAX_ATTEMPTS
      ? { action: "failed", burnAttempt: true }
      : { action: "retry_later", burnAttempt: true };
  }
  if (kind === "credits" || kind === "blocked" || kind === "config") {
    return { action: "pause_worker", burnAttempt: false };
  }
  return { action: "failed", burnAttempt: true };
}

/** Backoff curto para 429/5xx, honrando Retry-After quando presente. */
export function retryDelayMs(kind: AiErrorKind, retryAfterHeader: string | null, attempt: number): number {
  if (kind === "rate_limited" && retryAfterHeader) {
    const secs = Number(retryAfterHeader);
    if (Number.isFinite(secs) && secs > 0) return Math.min(secs, 20) * 1000;
  }
  const base = kind === "rate_limited" ? 2000 : 1000;
  return Math.min(base * Math.pow(2, Math.max(0, attempt - 1)) + Math.floor(Math.random() * 500), 10_000);
}

export interface ProfilePromptBike {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  price?: number | null;
  autonomyKm?: number | null;
  capacity?: number | null;
}

const SYSTEM_PROMPT =
  "Você é um especialista em bicicletas elétricas. Responda APENAS com um objeto JSON válido, sem markdown, sem texto adicional. Nunca invente especificações: use null quando a informação não estiver sustentada pela descrição fornecida.";

export function buildProfilePrompt(bike: ProfilePromptBike): { system: string; user: string } {
  const user = [
    `Analise a bicicleta elétrica abaixo e extraia o perfil técnico.`,
    ``,
    `Nome: ${bike.name}`,
    bike.shortDescription ? `Resumo: ${bike.shortDescription}` : null,
    bike.description ? `Descrição: ${bike.description.slice(0, 2500)}` : null,
    bike.price ? `Preço: R$ ${bike.price}` : null,
    bike.autonomyKm ? `Autonomia declarada: ${bike.autonomyKm} km` : null,
    bike.capacity ? `Capacidade: ${bike.capacity} pessoa(s)` : null,
    ``,
    `Responda com JSON exatamente neste formato:`,
    `{`,
    `  "weightSupportKg": <número inteiro em kg, ou null se a descrição não sustentar>,`,
    `  "bestFor": [<1-4 valores dentre: ${BEST_FOR_ENUM.join(", ")}>],`,
    `  "terrains": [<1-3 valores dentre: ${TERRAINS_ENUM.join(", ")}>],`,
    `  "strengths": [<3-6 pontos fortes curtos baseados SOMENTE na descrição>],`,
    `  "diferencial": "<frase curta>",`,
    `  "perfilIndicado": "<frase curta>"`,
    `}`,
  ].filter((l): l is string => l !== null).join("\n");

  return { system: SYSTEM_PROMPT, user };
}
