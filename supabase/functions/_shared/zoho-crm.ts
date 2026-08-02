/**
 * Cliente compartilhado do Zoho CRM (módulo Leads).
 *
 * Responsabilidades:
 *  - Renovar o access token via refresh token (nunca logar/expor tokens).
 *  - Mapear o payload do quiz para API names explícitos do Zoho.
 *  - Fazer upsert idempotente em Leads (chave: Email > Phone normalizado).
 *  - Adicionar tags no lead.
 *  - Retry curto apenas para 429/5xx.
 *
 * Secrets necessários:
 *  ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN,
 *  ZOHO_ACCOUNTS_URL (ex.: https://accounts.zoho.com),
 *  ZOHO_API_DOMAIN   (ex.: https://www.zohoapis.com)
 */

export type UpsertAction = "inserted" | "updated";

export interface ZohoResult {
  success: boolean;
  action?: UpsertAction;
  zoho_id?: string | null;
  status?: number;
  body?: string;
  error?: string;
  matched_by?: "lead_id" | "email" | "phone" | null;
}

export interface NormalizedPhone {
  /** Somente dígitos nacionais (10 ou 11), sem o 55. */
  digits: string;
  /** (11) 91234-5678 — formato usado no campo Phone do Zoho. */
  formatted: string;
  /** +5511912345678 — usado como chave alternativa de busca. */
  e164: string;
  valid: boolean;
}

// ---------------------------------------------------------------- utilidades

export function normalizePhone(input: unknown): NormalizedPhone {
  if (input === null || input === undefined) {
    return { digits: "", formatted: "", e164: "", valid: false };
  }
  let digits = String(input).replace(/\D/g, "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  if (digits.length === 11) {
    return {
      digits,
      formatted: `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`,
      e164: `+55${digits}`,
      valid: true,
    };
  }
  if (digits.length === 10) {
    return {
      digits,
      formatted: `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`,
      e164: `+55${digits}`,
      valid: true,
    };
  }
  return { digits, formatted: digits, e164: digits ? `+${digits}` : "", valid: false };
}

export function normalizeEmail(input: unknown): string {
  if (typeof input !== "string") return "";
  const value = input.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : "";
}

/** Remove tokens/secrets de qualquer texto antes de persistir/logar. */
export function sanitizeText(text: unknown, max = 2000): string {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/(\d{4}\.[A-Za-z0-9]{20,}\.[A-Za-z0-9]+)/g, "[redacted]")
    .replace(/("access_token"\s*:\s*")[^"]*(")/g, "$1[redacted]$2")
    .replace(/("refresh_token"\s*:\s*")[^"]*(")/g, "$1[redacted]$2")
    .replace(/Zoho-oauthtoken\s+\S+/g, "Zoho-oauthtoken [redacted]")
    .slice(0, max);
}

function splitName(fullName: unknown): { first: string; last: string } {
  const name = String(fullName ?? "").trim().replace(/\s+/g, " ");
  if (!name) return { first: "", last: "Lead sem nome" };
  const parts = name.split(" ");
  if (parts.length === 1) return { first: "", last: parts[0] };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

function firstDefined(source: Record<string, any>, keys: string[]): unknown {
  for (const k of keys) {
    const v = k.split(".").reduce<any>((acc, part) => (acc == null ? acc : acc[part]), source);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

// ------------------------------------------------------------- mapeamento

/**
 * Mapeamento explícito payload do quiz -> API names do Zoho (módulo Leads).
 * Chaves desconhecidas do payload são ignoradas.
 */
export const ZOHO_FIELD_MAP: Record<string, string[]> = {
  // Standard
  Company: ["company"],
  Lead_Source: ["lead_source", "traffic_origin", "detected_source", "utm_source", "tracking.utm_source"],
  Lead_Status: ["lead_status"],
  // Custom (API names reais do módulo Leads)
  LeadID_Lovable: ["LeadID Lovable", "lead_id", "id"],
  Principal_Uso: ["main_use_label", "answers.principal_use_label", "main_use", "answers.principal_use"],
  Km_s_por_dia: ["daily_km_range_label", "answers.daily_distance_label", "daily_km_range"],
  Como_o_trajeto: ["route_type_label", "answers.terrain_label", "route_type"],
  Uso_com_garupa: ["rider_capacity_need_label", "answers.rider_capacity_need_label", "rider_capacity_need"],
  Faixa_de_peso: ["weight_range_label", "answers.weight_range_label", "weight_range"],
  Or_amento: ["budget_range_label", "answers.budget_label", "budget_range"],
  J_teve_bike_el_trica_antes: ["had_ebike_before_label", "answers.experience_label", "had_ebike_before"],
  Rec_Principal: ["recommended_bike_1_label", "recommendations.primary_recommendation"],
  Rec_secund_ria: ["recommended_bike_2_label", "recommendations.secondary_recommendation"],
  Raz_o_da_Recomenda_o: ["recommended_bike_1_reason", "recommendations.primary_reason"],
  Raz_o_da_Rec_2: ["recommended_bike_2_reason", "recommendations.secondary_reason"],
  Rec_bike_1_link: ["recommended_bike_1_link", "recommendations.primary_link"],
  Rec_bike_2_link: ["recommended_bike_2_link", "recommendations.secondary_link"],
  bike1_slug: ["recommended_bike_1", "clusters.recommended_bike_1"],
  bike2_slug: ["recommended_bike_2", "clusters.recommended_bike_2"],
  traffic_origin: ["traffic_origin", "tracking.traffic_origin"],
  utm_source: ["utm_source", "tracking.utm_source"],
  utm_medium: ["utm_medium", "tracking.utm_medium"],
  utm_campaign: ["utm_campaign", "tracking.utm_campaign"],
  utm_content: ["utm_content", "tracking.utm_content"],
  utm_term: ["utm_term", "tracking.utm_term"],
  source_url: ["source_url", "tracking.source_url", "first_url"],
  device_type1: ["device_type", "tracking.device_type"],
};

/** Empresa fixa gravada em todo lead do quiz. */
export const LEAD_DA_EMPRESA = "Vitale Mobilidade";

/** Conjunto fechado de API names permitidos — nada fora disso é enviado. */
export const ALLOWED_ZOHO_FIELDS = new Set<string>([
  "Last_Name", "First_Name", "Email", "Phone", "Mobile", "Link_whatsapp",
  ...Object.keys(ZOHO_FIELD_MAP),
  "Status_do_Lead", "Lead_da_Empresa",
]);

/**
 * Status_do_Lead (campo específico do quiz, NÃO usar Lead_Status).
 * Conclusão do quiz => "Novo Lead". Cliques NÃO alteram o status
 * (o clique apenas acrescenta a tag "Clicou botão comprar ML").
 */
export function statusDoLeadForEvent(eventName: string): string | null {
  if (eventName === "quiz_completed") return "Novo Lead";
  return null;
}

export interface MappedLead {
  record: Record<string, unknown>;
  email: string;
  phone: NormalizedPhone;
}

export function whatsappLink(phone: NormalizedPhone): string {
  if (!phone.digits) return "";
  return `https://wa.me/55${phone.digits}`;
}

export function mapLeadToZoho(payload: Record<string, any>, eventName?: string): MappedLead {
  const email = normalizeEmail(firstDefined(payload, ["email", "lead.email", "contact.email"]));
  const phone = normalizePhone(
    firstDefined(payload, ["phone", "phone_digits", "lead.phone", "contact.phone"]),
  );
  const { first, last } = splitName(firstDefined(payload, ["name", "lead.name", "full_name"]));

  const record: Record<string, unknown> = {};
  record.Last_Name = last;
  if (first) record.First_Name = first;
  if (email) record.Email = email;
  if (phone.digits) {
    record.Phone = phone.formatted;
    record.Mobile = phone.formatted;
    record.Link_whatsapp = whatsappLink(phone);
  }

  for (const [apiName, sources] of Object.entries(ZOHO_FIELD_MAP)) {
    const value = firstDefined(payload, sources);
    if (value !== undefined) record[apiName] = typeof value === "string" ? value : String(value);
  }

  record.Lead_da_Empresa = LEAD_DA_EMPRESA;

  const resolvedEvent = eventName
    ?? (firstDefined(payload, ["event.event_name", "event_name"]) as string | undefined);
  const status = resolvedEvent ? statusDoLeadForEvent(resolvedEvent) : null;
  if (status) record.Status_do_Lead = status;

  // Guarda final: nunca enviar API name fora da lista permitida.
  for (const key of Object.keys(record)) {
    if (!ALLOWED_ZOHO_FIELDS.has(key)) delete record[key];
  }

  return { record, email, phone };
}


// --------------------------------------------------------------- token

let cachedToken: { token: string; expiresAt: number } | null = null;

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Zoho secret ${name} is not configured`);
  return value;
}

export function zohoConfigured(): boolean {
  return ["ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET", "ZOHO_REFRESH_TOKEN", "ZOHO_ACCOUNTS_URL", "ZOHO_API_DOMAIN"]
    .every((k) => !!Deno.env.get(k));
}

export function resetZohoTokenCache() {
  cachedToken = null;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  const accounts = requiredEnv("ZOHO_ACCOUNTS_URL").replace(/\/+$/, "");
  const body = new URLSearchParams({
    refresh_token: requiredEnv("ZOHO_REFRESH_TOKEN"),
    client_id: requiredEnv("ZOHO_CLIENT_ID"),
    client_secret: requiredEnv("ZOHO_CLIENT_SECRET"),
    grant_type: "refresh_token",
  });

  const res = await fetch(`${accounts}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.access_token) {
    // Nunca inclui o corpo bruto (pode conter tokens).
    throw new Error(`Zoho token refresh failed (HTTP ${res.status}${json?.error ? `: ${json.error}` : ""})`);
  }
  const ttl = Number(json.expires_in ?? 3600) * 1000;
  cachedToken = { token: json.access_token as string, expiresAt: Date.now() + ttl };
  return cachedToken.token;
}

// --------------------------------------------------------------- HTTP

const RETRYABLE = (status: number) => status === 429 || status >= 500;

async function zohoFetch(path: string, init: RequestInit = {}, attempt = 0): Promise<Response> {
  const domain = requiredEnv("ZOHO_API_DOMAIN").replace(/\/+$/, "");
  const token = await getAccessToken();
  const res = await fetch(`${domain}/crm/v6${path}`, {
    ...init,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 401 && attempt === 0) {
    resetZohoTokenCache();
    return zohoFetch(path, init, attempt + 1);
  }
  if (RETRYABLE(res.status) && attempt < 2) {
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    return zohoFetch(path, init, attempt + 1);
  }
  return res;
}

// --------------------------------------------------------------- dedupe

async function searchLeadId(criteria: string): Promise<string | null> {
  const res = await zohoFetch(`/Leads/search?criteria=${encodeURIComponent(criteria)}`, { method: "GET" });
  if (res.status === 204) return null;
  const text = await res.text();
  if (!res.ok) throw new Error(`Zoho search failed [${res.status}]: ${sanitizeText(text, 500)}`);
  const json = text ? JSON.parse(text) : null;
  const id = json?.data?.[0]?.id;
  return typeof id === "string" ? id : null;
}

/**
 * Procura lead existente. Prioridade: LeadID_Lovable (chave estável do quiz),
 * depois Email e por fim Phone normalizado.
 */
export async function findExistingLead(
  email: string,
  phone: NormalizedPhone,
  leadIdLovable?: string,
): Promise<{ id: string | null; matched_by: "lead_id" | "email" | "phone" | null }> {
  if (leadIdLovable) {
    const byLeadId = await searchLeadId(`(LeadID_Lovable:equals:${leadIdLovable})`).catch(() => null);
    if (byLeadId) return { id: byLeadId, matched_by: "lead_id" };
  }
  if (email) {
    const byEmail = await searchLeadId(`(Email:equals:${email})`);
    if (byEmail) return { id: byEmail, matched_by: "email" };
  }
  if (phone.digits) {
    const variants = [phone.formatted, phone.digits, phone.e164];
    for (const v of variants) {
      const found = await searchLeadId(`(Phone:equals:${v})`);
      if (found) return { id: found, matched_by: "phone" };
    }
  }
  return { id: null, matched_by: null };
}

// --------------------------------------------------------------- upsert

export interface UpsertOptions {
  tags?: string[];
  /** Nome do evento do quiz; define Status_do_Lead. */
  eventName?: string;
  /** Marca o lead como origem do quiz caso o Zoho não tenha Lead_Source definido. */
  defaultLeadSource?: string;
}

export async function upsertZohoLead(
  payload: Record<string, any>,
  options: UpsertOptions = {},
): Promise<ZohoResult> {
  try {
    const { record, email, phone } = mapLeadToZoho(payload, options.eventName);
    if (options.defaultLeadSource && !record.Lead_Source) record.Lead_Source = options.defaultLeadSource;

    const leadIdLovable = typeof record.LeadID_Lovable === "string" ? record.LeadID_Lovable : undefined;
    const existing = await findExistingLead(email, phone, leadIdLovable);

    let matchedBy = existing.matched_by;
    let targetId = existing.id;

    const send = (id: string | null) =>
      zohoFetch(id ? `/Leads/${id}` : "/Leads", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify({ data: [record], trigger: [] }),
      });

    let res = await send(targetId);
    let text = await res.text();
    let json = text ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null;
    let row = json?.data?.[0];
    let ok = res.ok && row?.status === "success";

    // O índice de busca do Zoho tem lag: um POST pode falhar com DUPLICATE_DATA
    // mesmo quando a busca não encontrou o lead. Nesse caso, refaz como PUT.
    const duplicateId = row?.code === "DUPLICATE_DATA"
      ? (row?.details?.duplicate_record?.id as string | undefined)
      : undefined;
    if (!ok && !targetId && duplicateId) {
      targetId = duplicateId;
      matchedBy = row?.details?.api_name === "Phone" ? "phone" : "email";
      res = await send(targetId);
      text = await res.text();
      json = text ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null;
      row = json?.data?.[0];
      ok = res.ok && row?.status === "success";
    }

    if (!ok) {
      return {
        success: false,
        status: res.status,
        body: sanitizeText(text),
        error: sanitizeText(row?.message ?? `HTTP ${res.status}`, 500),
        matched_by: matchedBy,
      };
    }

    const zohoId = (row?.details?.id as string | undefined) ?? targetId ?? null;
    const action: UpsertAction = targetId ? "updated" : "inserted";


    if (zohoId && options.tags?.length) {
      await addLeadTags(zohoId, options.tags).catch((e) =>
        console.error("[zoho] add tags failed", sanitizeText(e instanceof Error ? e.message : e, 300)),
      );
    }

    return {
      success: true,
      action,
      zoho_id: zohoId,
      status: res.status,
      body: sanitizeText(text),
      matched_by: matchedBy,
    };
  } catch (e) {
    const message = sanitizeText(e instanceof Error ? e.message : String(e), 500);
    console.error("[zoho] upsert failed", message);
    return { success: false, error: message };
  }
}

export async function addLeadTags(leadId: string, tags: string[]): Promise<void> {
  const names = tags.filter(Boolean).join(",");
  if (!names) return;
  // v6 exige body JSON mesmo com tag_names na query string.
  const res = await zohoFetch(
    `/Leads/actions/add_tags?ids=${encodeURIComponent(leadId)}&tag_names=${encodeURIComponent(names)}&over_write=false`,
    { method: "POST", body: JSON.stringify({ tags: tags.filter(Boolean).map((name) => ({ name })) }) },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Zoho add_tags failed [${res.status}]: ${sanitizeText(text, 300)}`);
  }
}

export const TAG_QUIZ_COMPLETED = "completou quiz";
export const TAG_BUY_CLICK = "Clicou botão comprar ML";

/**
 * Tag exata por evento do quiz. As tags antigas "Quiz Vitale" e
 * "Quiz completo" foram removidas do fluxo.
 */
export function tagsForEvent(eventName: string): string[] {
  if (eventName === "quiz_completed") return [TAG_QUIZ_COMPLETED];
  if (eventName.includes("click")) return [TAG_BUY_CLICK];
  return [];
}

export const CRM_DESTINATION = "zoho_crm";

export function makeFallbackEnabled(): boolean {
  return (Deno.env.get("CRM_FALLBACK_TO_MAKE") ?? "false").toLowerCase() === "true";
}
