import {
  DEFAULT_OFFERS_GROUP_DESTINATION,
  validOffersGroupUrl,
} from "./offers-group";

export async function fetchOffersGroupDestination(): Promise<string> {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return DEFAULT_OFFERS_GROUP_DESTINATION;
  try {
    const response = await fetch(
      `${url}/rest/v1/offers_group_settings?id=eq.true&select=url`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(3000),
        cache: "no-store",
      },
    );
    if (!response.ok) return DEFAULT_OFFERS_GROUP_DESTINATION;
    const data = await response.json();
    return Array.isArray(data) &&
      data.length === 1 &&
      validOffersGroupUrl(data[0]?.url)
      ? data[0].url
      : DEFAULT_OFFERS_GROUP_DESTINATION;
  } catch {
    return DEFAULT_OFFERS_GROUP_DESTINATION;
  }
}
