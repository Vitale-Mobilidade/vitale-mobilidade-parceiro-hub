/**
 * Validação robusta de WhatsApp para formulários públicos.
 * Aceita APENAS celular brasileiro com 11 dígitos e nono dígito.
 *
 * Não expor `reason` ao usuário — é uso interno (analytics/log).
 * Mensagem visível deve ser sempre:
 *   "Informe um WhatsApp válido para concluir sua inscrição."
 */

export type WhatsAppInvalidReason =
  | "empty"
  | "invalid_length"
  | "landline_not_allowed"
  | "invalid_ddd"
  | "invalid_mobile_prefix"
  | "all_same_digits"
  | "obvious_sequence"
  | "placeholder"
  | "repeated_pattern";

export interface WhatsAppValidationResult {
  isValid: boolean;
  normalizedPhone: string; // 11 dígitos nacionais sem 55
  formattedPhone: string;  // (XX) XXXXX-XXXX
  reason?: WhatsAppInvalidReason;
}

// DDDs brasileiros válidos (ANATEL).
const VALID_DDDS = new Set<string>([
  "11","12","13","14","15","16","17","18","19",
  "21","22","24","27","28",
  "31","32","33","34","35","37","38",
  "41","42","43","44","45","46","47","48","49",
  "51","53","54","55",
  "61","62","63","64","65","66","67","68","69",
  "71","73","74","75","77","79",
  "81","82","83","84","85","86","87","88","89",
  "91","92","93","94","95","96","97","98","99",
]);

const OBVIOUS_SEQUENCES = new Set<string>([
  "12345678901","01234567890","98765432109","09876543210",
]);

const PLACEHOLDER_NUMBERS = new Set<string>([
  "00000000000","11000000000","99999999999","11111111111",
  "22222222222","33333333333","44444444444","55555555555",
  "66666666666","77777777777","88888888888",
  "11123456789","11987654321",
]);

/** Máscara visual brasileira para celular (11 dígitos). */
export function formatBrazilianPhoneMask(input: string): string {
  const d = String(input ?? "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Remove tudo que não é dígito e o prefixo 55 quando aplicável. Retorna número nacional. */
export function normalizeBrazilianPhone(input: string): string {
  let digits = String(input ?? "").replace(/\D/g, "");
  if ((digits.length === 13 || digits.length === 12) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  return digits;
}

function allSameDigit(s: string): boolean {
  return /^(\d)\1+$/.test(s);
}

/** Detecta padrões artificiais claros no restante do número (após DDD). */
function hasArtificialRepeatingPattern(national: string): boolean {
  const rest = national.slice(2); // 9 dígitos após DDD
  // Repetição de bloco de 2 (ex: 12121212 1) ou 3 dígitos após o nono
  const afterNine = rest.slice(1); // 8 dígitos
  if (/^(\d{2})\1{3}$/.test(afterNine)) return true;
  if (/^(\d{3})\1{1}\d{2}$/.test(afterNine)) return true;
  // 8 dígitos iguais após o 9
  if (/^(\d)\1{7}$/.test(afterNine)) return true;
  return false;
}

export function validateBrazilianWhatsApp(input: unknown): WhatsAppValidationResult {
  const raw = typeof input === "string" ? input : String(input ?? "");
  const normalized = normalizeBrazilianPhone(raw);
  const formatted = formatBrazilianPhoneMask(normalized);

  const fail = (reason: WhatsAppInvalidReason): WhatsAppValidationResult =>
    ({ isValid: false, normalizedPhone: normalized, formattedPhone: formatted, reason });

  if (!raw.trim() || normalized.length === 0) return fail("empty");

  // Telefone fixo (10 dígitos) — nunca aceito neste campo.
  if (normalized.length === 10) return fail("landline_not_allowed");

  if (normalized.length !== 11) return fail("invalid_length");

  const ddd = normalized.slice(0, 2);
  if (!VALID_DDDS.has(ddd)) return fail("invalid_ddd");

  // Terceiro dígito precisa ser 9 (celular).
  if (normalized[2] !== "9") return fail("invalid_mobile_prefix");

  if (allSameDigit(normalized)) return fail("all_same_digits");

  if (OBVIOUS_SEQUENCES.has(normalized)) return fail("obvious_sequence");
  if (PLACEHOLDER_NUMBERS.has(normalized)) return fail("placeholder");

  if (hasArtificialRepeatingPattern(normalized)) return fail("repeated_pattern");

  return { isValid: true, normalizedPhone: normalized, formattedPhone: formatted };
}
