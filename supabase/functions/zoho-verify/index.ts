// Função temporária de verificação do lead de teste no Zoho (somente leitura).
import { sanitizeText } from "../_shared/zoho-crm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function token(): Promise<string> {
  const accounts = (Deno.env.get("ZOHO_ACCOUNTS_URL") ?? "").replace(/\/+$/, "");
  const body = new URLSearchParams({
    refresh_token: Deno.env.get("ZOHO_REFRESH_TOKEN") ?? "",
    client_id: Deno.env.get("ZOHO_CLIENT_ID") ?? "",
    client_secret: Deno.env.get("ZOHO_CLIENT_SECRET") ?? "",
    grant_type: "refresh_token",
  });
  const res = await fetch(`${accounts}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!json?.access_token) throw new Error(`token refresh failed (HTTP ${res.status})`);
  return json.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!/^\d+$/.test(id)) throw new Error("invalid id");
    const domain = (Deno.env.get("ZOHO_API_DOMAIN") ?? "").replace(/\/+$/, "");
    const t = await token();
    const headers = { Authorization: `Zoho-oauthtoken ${t}` };
    const [recRes, tagRes] = await Promise.all([
      fetch(`${domain}/crm/v6/Leads/${id}`, { headers }),
      fetch(`${domain}/crm/v6/Leads/${id}?fields=Tag`, { headers }),
    ]);
    const rec = await recRes.json().catch(() => ({}));
    const tag = await tagRes.json().catch(() => ({}));
    const r = rec?.data?.[0] ?? {};
    return new Response(
      JSON.stringify({
        id: r.id ?? null,
        Last_Name: r.Last_Name ?? null,
        Email: r.Email ?? null,
        Phone: r.Phone ?? null,
        Mobile: r.Mobile ?? null,
        Link_whatsapp: r.Link_whatsapp ?? null,
        First_Name: r.First_Name ?? null,
        Rec_bike_1_link: r.Rec_bike_1_link ?? null,
        Rec_bike_2_link: r.Rec_bike_2_link ?? null,
        bike1_slug: r.bike1_slug ?? null,
        bike2_slug: r.bike2_slug ?? null,
        Principal_Uso: r.Principal_Uso ?? null,
        utm_campaign: r.utm_campaign ?? null,
        Status_do_Lead: r.Status_do_Lead ?? null,
        Lead_da_Empresa: r.Lead_da_Empresa ?? null,
        Lead_Source: r.Lead_Source ?? null,
        LeadID_Lovable: r.LeadID_Lovable ?? null,
        Or_amento: r.Or_amento ?? null,
        Rec_Principal: r.Rec_Principal ?? null,
        Rec_secund_ria: r.Rec_secund_ria ?? null,
        tags: (tag?.data?.[0]?.Tag ?? r.Tag ?? []).map((x: any) => x?.name ?? x),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: sanitizeText(e instanceof Error ? e.message : String(e), 300) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  }
});
