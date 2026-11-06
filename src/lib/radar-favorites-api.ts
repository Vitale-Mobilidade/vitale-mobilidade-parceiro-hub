import { createClientOnlyFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database, Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { memberAccountsEnabled } from "./member-accounts-feature";
import { favoriteBikeIdSchema, radarFavoritesSchema } from "./radar-favorites";

type FavoritesDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Functions"> & {
    Functions: Database["public"]["Functions"] & {
      member_radar_favorites: {
        Args: { p_action: string; p_bike_id?: string; p_saved?: boolean };
        Returns: Json;
      };
    };
  };
};
const client = supabase as SupabaseClient<FavoritesDatabase>;
export const listRadarFavorites = createClientOnlyFn(async () => {
  if (!memberAccountsEnabled) throw new Error("community_disabled");
  const { data, error } = await client.rpc("member_radar_favorites", {
    p_action: "list",
  });
  if (error) throw error;
  return radarFavoritesSchema.parse(data);
});
export const setRadarFavorite = createClientOnlyFn(
  async (bikeId: string, saved: boolean) => {
    if (!memberAccountsEnabled) throw new Error("community_disabled");
    const { data, error } = await client.rpc("member_radar_favorites", {
      p_action: "set",
      p_bike_id: favoriteBikeIdSchema.parse(bikeId),
      p_saved: saved,
    });
    if (error) throw error;
    const result = z.object({ saved: z.boolean() }).parse(data);
    if (result.saved !== saved) throw new Error("invalid_favorite_response");
  },
);
