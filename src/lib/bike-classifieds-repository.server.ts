import { createClient } from "@supabase/supabase-js";
import { publicListingSchema, type ListingsResult } from "./bike-classifieds";
/** Public credentials + explicit projection only. No cookies, Auth session or service role. */
export async function fetchPublicBikeListings(
  id?: string,
  limit = 12,
  offset = 0,
): Promise<ListingsResult> {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { ok: false, items: [], total: 0 };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const db = publicClassifiedsClient(url, key, controller.signal);
    const { data, error } = await db.rpc("member_bike_listings_public", {
      p_id: id ?? null,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw new Error("public_classifieds_unavailable");
    if (
      !data ||
      !Array.isArray(data.items) ||
      !Number.isInteger(data.total) ||
      data.total < 0
    )
      throw new Error("public_classifieds_invalid");
    const items = publicListingSchema.array().parse(data.items);
    for (const item of items) {
      for (const image of item.images)
        image.url = `/api/public/bike-image?id=${image.id}`;
      // Avatar is intentionally read only through the public listing projection.
      if (item.avatarPath) {
        const avatarId = item.avatarPath
          .split("/")
          .at(-1)
          ?.replace(".webp", "");
        if (avatarId) item.avatarUrl = `/api/public/bike-image?id=${avatarId}`;
      }
    }
    return { ok: true, items, total: data.total };
  } catch {
    return { ok: false, items: [], total: 0 };
  } finally {
    clearTimeout(timer);
  }
}

export function publicClassifiedsClient(
  url: string,
  key: string,
  signal: AbortSignal,
) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (
          key.startsWith("sb_publishable_") &&
          headers.get("Authorization") === `Bearer ${key}`
        )
          headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers, signal });
      },
    },
  });
}
