import { createClientOnlyFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { memberAccountsEnabled } from "./member-accounts-feature";
import { newsletterReferralsEnabled } from "./newsletter-referrals";

// Local migration contract until the existing project's generated types are refreshed.
// Reuses the existing Auth client and session; never creates a second auth store.
type CommunityDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Functions"> & {
    Functions: Database["public"]["Functions"] & {
      member_community: {
        Args: { p_action: string; p_payload: Json };
        Returns: Json;
      };
      member_referrals: { Args: Record<string, never>; Returns: Json };
      member_identity: {
        Args: { p_action: string; p_payload: Json };
        Returns: Json;
      };
      member_community_account: {
        Args: { p_action: string; p_payload: Json };
        Returns: Json;
      };
    };
  };
};
export const memberCall = createClientOnlyFn(
  async (action: string, payload: Record<string, Json> = {}) => {
    if (!memberAccountsEnabled) throw new Error("community_disabled");
    const { data, error } = await (
      supabase as SupabaseClient<CommunityDatabase>
    ).rpc("member_community", {
      p_action: action,
      p_payload: payload,
    });
    if (error) throw error;
    return data;
  },
);

export const getMemberReferrals = createClientOnlyFn(async () => {
  if (!newsletterReferralsEnabled) throw new Error("community_disabled");
  const { data, error } = await (
    supabase as SupabaseClient<CommunityDatabase>
  ).rpc("member_referrals");
  if (error) throw error;
  return data;
});

export const communityAccount = createClientOnlyFn(
  async (action: "profile" | "join", payload: Record<string, Json> = {}) => {
    if (!memberAccountsEnabled) throw new Error("community_disabled");
    const { data, error } = await (
      supabase as SupabaseClient<CommunityDatabase>
    ).rpc("member_community_account", { p_action: action, p_payload: payload });
    if (error) throw error;
    return data;
  },
);

export const identityCall = createClientOnlyFn(
  async (action: "status" | "verify", payload: Record<string, Json> = {}) => {
    if (!memberAccountsEnabled) throw new Error("community_disabled");
    const { data, error } = await (
      supabase as SupabaseClient<CommunityDatabase>
    ).rpc("member_identity", { p_action: action, p_payload: payload });
    if (error) throw error;
    if (
      data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      data.ok === false
    )
      throw new Error(String(data.error));
    return data;
  },
);
