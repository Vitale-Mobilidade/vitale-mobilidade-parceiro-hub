// Server-only: leitura pública do catálogo do Quiz via RPC `get_quiz_catalog`
// (chave publicável/anon). Nunca usa service role nem lê tabelas diretamente.

const TIMEOUT_MS = 5000;
const MAX_ITEMS = 200;

export type QuizCatalogResult = { ok: true; bikes: unknown[] } | { ok: false };

function isValidItem(item: unknown): boolean {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;
  const id = (item as { id?: unknown }).id;
  return typeof id === "string" && /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(id);
}

export async function fetchQuizCatalog(): Promise<QuizCatalogResult> {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return { ok: false };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${url}/rest/v1/rpc/get_quiz_catalog`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json", Accept: "application/json" },
      body: "{}",
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false };
    const data: unknown = await res.json();
    // Formato: lista não vazia de objetos com id válido (mesma condição do cliente: length > 0).
    if (!Array.isArray(data) || data.length === 0 || data.length > MAX_ITEMS) return { ok: false };
    if (!data.every(isValidItem)) return { ok: false };
    return { ok: true, bikes: JSON.parse(JSON.stringify(data)) as unknown[] };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}
