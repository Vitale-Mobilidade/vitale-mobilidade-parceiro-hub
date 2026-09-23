import { vi } from "vitest";

// Nenhum teste pode tocar backend, CRM, IA, Edge Functions ou links reais.
vi.mock("@/integrations/supabase/client", () => {
  const blocked = () => {
    throw new Error("Chamada real ao backend bloqueada nos testes");
  };
  return {
    supabase: {
      rpc: vi.fn(blocked),
      from: vi.fn(blocked),
      functions: { invoke: vi.fn(blocked) },
      auth: { getSession: vi.fn(async () => ({ data: { session: null }, error: null })) },
    },
  };
});

globalThis.fetch = vi.fn(async (input: unknown) => {
  throw new Error(`fetch bloqueado nos testes: ${String(input)}`);
}) as unknown as typeof fetch;
