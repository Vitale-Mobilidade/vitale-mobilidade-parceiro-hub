import { createServerFn } from "@tanstack/react-start";
import type { Json } from "@/integrations/supabase/types";
import { fetchQuizCatalog } from "./quiz-catalog-repository.server";

export const getQuizCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const r = await fetchQuizCatalog();
  return r.ok ? { ok: true as const, bikes: r.bikes as Json[] } : { ok: false as const };
});
