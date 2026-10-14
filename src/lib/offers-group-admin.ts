import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { validOffersGroupUrl } from "./offers-group";
export type OffersGroup = { id: number; name: string; url: string };
export type OffersGroupCatalog = {
  url: string;
  revision: number;
  activeGroupId: number;
  groups: OffersGroup[];
};
export type OffersGroupAction = {
  p_action: "get" | "save" | "activate";
  p_revision?: number;
  p_group_id?: number;
  p_name?: string;
  p_url?: string;
};
export function validOffersGroupCatalog(
  value: unknown,
): value is OffersGroupCatalog {
  const c = value as OffersGroupCatalog | null;
  return (
    !!c &&
    Number.isInteger(c.revision) &&
    c.revision > 0 &&
    Array.isArray(c.groups) &&
    c.groups.length > 0 &&
    c.groups.every(
      (g) =>
        Number.isInteger(g.id) &&
        g.id > 0 &&
        typeof g.name === "string" &&
        g.name.trim().length > 0 &&
        g.name.length <= 80 &&
        validOffersGroupUrl(g.url),
    ) &&
    new Set(c.groups.map((g) => g.id)).size === c.groups.length &&
    c.groups.some((g) => g.id === c.activeGroupId && g.url === c.url)
  );
}
export async function offersGroupAdminCall(
  args: OffersGroupAction,
): Promise<OffersGroupCatalog> {
  const { data, error } = await (supabase as unknown as SupabaseClient).rpc(
    "manage_offers_groups",
    args,
  );
  if (error) throw new Error(error.message);
  if (!validOffersGroupCatalog(data))
    throw new Error(
      "Não foi possível conferir os grupos. Recarregue para tentar novamente.",
    );
  return data;
}
