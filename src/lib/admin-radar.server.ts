import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type {
  AdminRadarAlert,
  AdminRadarAlerts,
  RadarAlertFilter,
} from "./admin-radar";

const PAGE_SIZE = 25;
const HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Authorization",
  "X-Robots-Tag": "noindex, nofollow",
};
const filterSchema = z
  .object({
    page: z.number().int().min(1).max(10000).default(1),
    scope: z.enum(["active", "all"]).default("active"),
    search: z
      .string()
      .trim()
      .max(100)
      .default("")
      .refine(
        (value) =>
          /^[+\d\s().-]+$/.test(value) ||
          /^[\p{L}\p{N}\s@.+_'-]*$/u.test(value),
      ),
  })
  .strict();
const positivePrice = (value: unknown) => {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

type AlertRow = {
  id: string;
  person_name: string;
  phone_e164: string;
  email: string | null;
  bike_id: string;
  bike_name: string;
  condition: string;
  target_price: number | null;
  reference_price: number;
  status: string;
  consent: boolean;
  delivery_enabled: boolean;
  created_at: string;
  updated_at: string;
};
export async function readRadarAlerts(
  db: SupabaseClient,
  filter: RadarAlertFilter,
): Promise<AdminRadarAlerts> {
  let query = db
    .from("bike_price_alerts")
    .select(
      "id,person_name,phone_e164,email,bike_id,bike_name,condition,target_price,reference_price,status,consent,delivery_enabled,created_at,updated_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (filter.scope === "active")
    query = query.eq("status", "active").eq("consent", true);
  if (filter.search) {
    const value = /^[+\d\s().-]+$/.test(filter.search)
      ? filter.search.replace(/\D/g, "")
      : filter.search;
    if (value)
      query = query.or(
        ["person_name", "phone_e164", "email", "bike_name", "bike_id"]
          .map((field) => `${field}.ilike."%${value}%"`)
          .join(","),
      );
  }
  const { data, count, error } = await query.range(
    (filter.page - 1) * PAGE_SIZE,
    filter.page * PAGE_SIZE - 1,
  );
  if (error || count == null) throw new Error("radar_alerts_unavailable");
  const rows = (data ?? []) as AlertRow[];
  const ids = [...new Set(rows.map((row) => row.bike_id))];
  const offers = ids.length
    ? await db
        .from("bike_offers")
        .select("bike_id,price,url,verified_at,synced_at,first_seen_at")
        .in("bike_id", ids)
        .eq("is_current", true)
        .is("ended_at", null)
        .gt("price", 0)
        .order("synced_at", { ascending: false })
        .order("first_seen_at", { ascending: false })
    : { data: [], error: null };
  if (offers.error) throw new Error("radar_prices_unavailable");
  const current = new Map<
    string,
    { price: number; verifiedAt: string | null }
  >();
  for (const offer of offers.data ?? []) {
    const price = positivePrice(offer.price);
    // Match the public Radar offer contract; never substitute the signup reference.
    if (
      price &&
      /^https:\/\/meli\.la\/[A-Za-z0-9]+$/.test(offer.url) &&
      !current.has(offer.bike_id)
    ) {
      current.set(offer.bike_id, { price, verifiedAt: offer.verified_at });
    }
  }
  const items: AdminRadarAlert[] = rows.map((row) => ({
    id: row.id,
    personName: row.person_name,
    phone: row.phone_e164,
    email: row.email,
    bikeId: row.bike_id,
    bikeName: row.bike_name,
    condition: row.condition,
    targetPrice:
      row.condition === "target" ? positivePrice(row.target_price) : null,
    referencePrice: positivePrice(row.reference_price),
    currentPrice: current.get(row.bike_id)?.price ?? null,
    priceVerifiedAt: current.get(row.bike_id)?.verifiedAt ?? null,
    status: row.status,
    consent: row.consent,
    deliveryEnabled: row.delivery_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
  return {
    items,
    page: filter.page,
    pageSize: PAGE_SIZE,
    totalAlerts: count,
    updatedAt: new Date().toISOString(),
  };
}
function createDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("database_not_configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function radarAlertsAdmin(
  request: Request,
  dbFactory = createDb,
): Promise<Response> {
  const reply = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: HEADERS });
  if (!["GET", "POST"].includes(request.method))
    return reply({ error: "method_not_allowed" }, 405);
  const token = request.headers
    .get("Authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token || token.length > 4000)
    return reply({ error: "unauthorized" }, 401);
  try {
    const db = dbFactory();
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth.user) return reply({ error: "unauthorized" }, 401);
    const membership = await db
      .from("editorial_admin_memberships")
      .select("role,active")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (
      membership.error ||
      membership.data?.active !== true ||
      membership.data.role !== "admin"
    )
      return reply({ error: "forbidden" }, 403);
    let raw: unknown = {};
    if (request.method === "POST") {
      const text = await request.text();
      if (text.length > 4096) return reply({ error: "invalid_filter" }, 413);
      try {
        raw = JSON.parse(text);
      } catch {
        return reply({ error: "invalid_filter" }, 400);
      }
    }
    const parsed = filterSchema.safeParse(raw);
    if (!parsed.success) return reply({ error: "invalid_filter" }, 400);
    return reply(await readRadarAlerts(db, parsed.data));
  } catch {
    // Do not log request bodies, tokens, contacts or database error payloads.
    return reply({ error: "radar_alerts_unavailable" }, 503);
  }
}
