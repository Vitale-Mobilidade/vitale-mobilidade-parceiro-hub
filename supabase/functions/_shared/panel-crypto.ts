/**
 * Criptografia da autenticação do painel administrativo.
 *
 * - Senha: PBKDF2-HMAC-SHA-256, mínimo 310.000 iterações, salt de 32 bytes.
 * - Comparação timing-safe.
 * - Sessões: token opaco aleatório; apenas o SHA-256 do token é persistido.
 *
 * NUNCA logar senha, token ou hash.
 */

export const MIN_ITERATIONS = 310_000;
export const SALT_BYTES = 32;
export const SESSION_TTL_SHORT_MS = 8 * 60 * 60 * 1000; // sessão de navegador
export const SESSION_TTL_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000; // "lembrar de mim"

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function base64ToBytes(value: string): Uint8Array {
  const bin = atob(String(value ?? "").trim());
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Comparação em tempo constante. */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

export async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number,
  lengthBytes = 32,
): Promise<Uint8Array> {
  if (iterations < MIN_ITERATIONS) throw new Error("iterations abaixo do mínimo permitido");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    lengthBytes * 8,
  );
  return new Uint8Array(bits);
}

export interface StoredCredential {
  salt_base64: string;
  hash_base64: string;
  iterations: number;
}

/** Verifica a senha contra a credencial armazenada (timing-safe). */
export async function verifyPassword(password: string, cred: StoredCredential): Promise<boolean> {
  try {
    const salt = base64ToBytes(cred.salt_base64);
    const expected = base64ToBytes(cred.hash_base64);
    if (salt.length < 16 || expected.length < 16) return false;
    const derived = await pbkdf2(password, salt, cred.iterations, expected.length);
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** Gera token opaco (não é a senha) para a sessão. */
export function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Hash do token de sessão (só o hash é armazenado). */
export async function hashSessionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesToBase64(new Uint8Array(digest));
}

/** Fingerprint estável e não sensível para rate limit (IP + user-agent). */
export async function loginFingerprint(ip: string, userAgent: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${ip ?? ""}|${(userAgent ?? "").slice(0, 120)}`),
  );
  return bytesToBase64(new Uint8Array(digest)).slice(0, 44);
}

export const MAX_LOGIN_ATTEMPTS = 8;
export const LOCKOUT_MS = 15 * 60 * 1000;
