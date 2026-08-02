import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ALLOWED_ZOHO_FIELDS,
  findExistingLead,
  mapLeadToZoho,
  normalizeEmail,
  normalizePhone,
  resetZohoTokenCache,
  sanitizeText,
  statusDoLeadForEvent,
  tagsForEvent,
  upsertZohoLead,
} from "./zoho-crm.ts";

// ------------------------------------------------------------ normalização

Deno.test("normalizePhone remove 55 e formata celular", () => {
  const r = normalizePhone("+55 (11) 98689-3890");
  assertEquals(r.digits, "11986893890");
  assertEquals(r.formatted, "(11) 98689-3890");
  assertEquals(r.e164, "+5511986893890");
  assertEquals(r.valid, true);
});

Deno.test("normalizePhone aceita fixo de 10 dígitos", () => {
  const r = normalizePhone("1134567890");
  assertEquals(r.formatted, "(11) 3456-7890");
  assertEquals(r.valid, true);
});

Deno.test("normalizePhone marca inválido quando tamanho não bate", () => {
  assertEquals(normalizePhone("123").valid, false);
  assertEquals(normalizePhone(null).digits, "");
});

Deno.test("normalizeEmail faz lowercase e valida", () => {
  assertEquals(normalizeEmail("  Lucas@Vitale.COM "), "lucas@vitale.com");
  assertEquals(normalizeEmail("nao-e-email"), "");
});

Deno.test("sanitizeText remove tokens", () => {
  const out = sanitizeText('{"access_token":"1000.abc.def","x":1}');
  assertEquals(out.includes("1000.abc.def"), false);
});

// ------------------------------------------------------------- mapeamento

Deno.test("mapLeadToZoho mapeia apenas API names reais", () => {
  const { record, email, phone } = mapLeadToZoho({
    name: "Lucas Vitale",
    phone: "5511986893890",
    email: "LUCAS@vitale.com",
    "LeadID Lovable": "abc-123",
    main_use_label: "Trabalho",
    daily_km_range_label: "10 a 20 km",
    route_type_label: "Asfalto",
    rider_capacity_need_label: "Sim, com garupa",
    weight_range_label: "Até 120 kg",
    budget_range_label: "Até 7 mil",
    had_ebike_before_label: "Não",
    recommended_bike_1_label: "V20 Pro",
    recommended_bike_2_label: "V8 Ultra",
    recommended_bike_1_reason: "melhor custo",
    recommended_bike_2_reason: "mais robusta",
    recommended_bike_1_link: "https://meli.la/aaa",
    recommended_bike_2_link: "https://meli.la/bbb",
    recommended_bike_1: "v20_pro",
    recommended_bike_2: "v8_ultra",
    traffic_origin: "pago",
    utm_source: "meta",
    utm_medium: "cpc",
    utm_campaign: "quiz",
    utm_content: "ad1",
    utm_term: "bike",
    source_url: "https://vitalemobilidade.com/escolher-bike",
    device_type: "mobile",
    campo_desconhecido: "ignorar",
    event: { event_name: "quiz_completed" },
  });

  assertEquals(record.Last_Name, "Vitale");
  assertEquals(record.First_Name, "Lucas");
  assertEquals(record.Email, "lucas@vitale.com");
  assertEquals(record.Phone, "(11) 98689-3890");
  assertEquals(record.LeadID_Lovable, "abc-123");
  assertEquals(record.Principal_Uso, "Trabalho");
  assertEquals(record.Km_s_por_dia, "10 a 20 km");
  assertEquals(record.Como_o_trajeto, "Asfalto");
  assertEquals(record.Uso_com_garupa, "Sim, com garupa");
  assertEquals(record.Faixa_de_peso, "Até 120 kg");
  assertEquals(record.Or_amento, "Até 7 mil");
  assertEquals(record.J_teve_bike_el_trica_antes, "Não");
  assertEquals(record.Rec_Principal, "V20 Pro");
  assertEquals(record.Rec_secund_ria, "V8 Ultra");
  assertEquals(record.Raz_o_da_Recomenda_o, "melhor custo");
  assertEquals(record.Raz_o_da_Rec_2, "mais robusta");
  assertEquals(record.Rec_bike_1_link, "https://meli.la/aaa");
  assertEquals(record.Rec_bike_2_link, "https://meli.la/bbb");
  assertEquals(record.bike1_slug, "v20_pro");
  assertEquals(record.bike2_slug, "v8_ultra");
  assertEquals(record.traffic_origin, "pago");
  assertEquals(record.utm_source, "meta");
  assertEquals(record.utm_medium, "cpc");
  assertEquals(record.utm_campaign, "quiz");
  assertEquals(record.utm_content, "ad1");
  assertEquals(record.utm_term, "bike");
  assertEquals(record.source_url, "https://vitalemobilidade.com/escolher-bike");
  assertEquals(record.device_type1, "mobile");
  assertEquals(record.Lead_da_Empresa, "Vitale Mobilidade");
  assertEquals(record.Status_do_Lead, "Completou Quiz");
  assertEquals(email, "lucas@vitale.com");
  assertEquals(phone.digits, "11986893890");
});

Deno.test("mapLeadToZoho nunca envia API names inexistentes", () => {
  const { record } = mapLeadToZoho({
    name: "Ana Silva",
    phone: "11986893890",
    main_use_label: "Trabalho",
    conversion_status: "clicou",
    clicked_bike_name: "V20 Pro",
    purchase_link_used: "https://meli.la/aaa",
    campo_desconhecido: "x",
    event: { event_name: "buy_button_clicked" },
  });

  const banidos = [
    "Evento", "Uso_Principal", "Distancia_Diaria", "Tipo_de_Terreno", "Capacidade_Passageiro",
    "Peso_Total", "Orcamento", "Experiencia_Ebike", "Recomendacao_1", "Recomendacao_2",
    "Motivo_Recomendacao_1", "Motivo_Recomendacao_2", "Link_Recomendacao_1", "Link_Recomendacao_2",
    "Bike_Clicada", "Link_Compra_Usado", "Status_Conversao", "Origem_Trafego",
    "UTM_Source", "UTM_Medium", "UTM_Campaign", "UTM_Content", "UTM_Term", "URL_Origem", "Dispositivo",
    "campo_desconhecido",
  ];
  for (const key of banidos) assertEquals(key in record, false, `campo proibido enviado: ${key}`);

  for (const key of Object.keys(record)) {
    assertEquals(ALLOWED_ZOHO_FIELDS.has(key), true, `campo fora da lista permitida: ${key}`);
  }

  assertEquals(record.Status_do_Lead, "Clicou botão comprar ML");
  assertEquals("Lead_Status" in record, false);
});

Deno.test("statusDoLeadForEvent mapeia os dois estados do quiz", () => {
  assertEquals(statusDoLeadForEvent("quiz_completed"), "Completou Quiz");
  assertEquals(statusDoLeadForEvent("buy_button_clicked"), "Clicou botão comprar ML");
  assertEquals(statusDoLeadForEvent("quiz_started"), null);
});

Deno.test("mapLeadToZoho garante Last_Name mesmo sem nome", () => {
  const { record } = mapLeadToZoho({ phone: "11986893890" });
  assertEquals(record.Last_Name, "Lead sem nome");
});

Deno.test("mapLeadToZoho lê payload aninhado do reprocess", () => {
  const { record } = mapLeadToZoho({
    name: "Ana",
    answers: { principal_use_label: "Lazer", budget_label: "Até 7 mil" },
    recommendations: { primary_recommendation: "V8 Ultra" },
    tracking: { utm_campaign: "quiz", traffic_origin: "organico" },
  });
  assertEquals(record.Principal_Uso, "Lazer");
  assertEquals(record.Or_amento, "Até 7 mil");
  assertEquals(record.Rec_Principal, "V8 Ultra");
  assertEquals(record.utm_campaign, "quiz");
  assertEquals(record.traffic_origin, "organico");
});

Deno.test("tagsForEvent devolve tags esperadas", () => {
  assertEquals(tagsForEvent("quiz_completed"), ["Quiz Vitale", "Quiz completo"]);
  assertEquals(tagsForEvent("buy_button_clicked"), ["Quiz Vitale", "Clicou botão"]);
});

// -------------------------------------------------- dedupe / inserted-updated

function setupEnv() {
  Deno.env.set("ZOHO_CLIENT_ID", "id");
  Deno.env.set("ZOHO_CLIENT_SECRET", "secret");
  Deno.env.set("ZOHO_REFRESH_TOKEN", "refresh");
  Deno.env.set("ZOHO_ACCOUNTS_URL", "https://accounts.zoho.test");
  Deno.env.set("ZOHO_API_DOMAIN", "https://api.zoho.test");
  resetZohoTokenCache();
}

type Handler = (url: string, init?: RequestInit) => Response;

function withFetch(handler: Handler, fn: () => Promise<void>) {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push(`${init?.method ?? "GET"} ${url}`);
    if (url.includes("/oauth/v2/token")) {
      return Promise.resolve(
        new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }), { status: 200 }),
      );
    }
    return Promise.resolve(handler(url, init));
  }) as typeof fetch;
  return fn().finally(() => {
    globalThis.fetch = original;
  }).then(() => calls);
}

Deno.test("findExistingLead prioriza email", async () => {
  setupEnv();
  const calls = await withFetch((url) => {
    if (url.includes("Email%3Aequals")) {
      return new Response(JSON.stringify({ data: [{ id: "zoho-1" }] }), { status: 200 });
    }
    return new Response(null, { status: 204 });
  }, async () => {
    const r = await findExistingLead("a@b.com", normalizePhone("11986893890"));
    assertEquals(r.id, "zoho-1");
    assertEquals(r.matched_by, "email");
  });
  assertEquals(calls.filter((c) => c.includes("Phone")).length, 0);
});

Deno.test("findExistingLead cai para phone quando não há email", async () => {
  setupEnv();
  await withFetch((url) => {
    if (url.includes("Phone%3Aequals")) {
      return new Response(JSON.stringify({ data: [{ id: "zoho-2" }] }), { status: 200 });
    }
    return new Response(null, { status: 204 });
  }, async () => {
    const r = await findExistingLead("", normalizePhone("11986893890"));
    assertEquals(r.id, "zoho-2");
    assertEquals(r.matched_by, "phone");
  });
});

Deno.test("upsertZohoLead insere quando não existe", async () => {
  setupEnv();
  const calls = await withFetch((url, init) => {
    if (url.includes("/search")) return new Response(null, { status: 204 });
    if (init?.method === "POST" && url.endsWith("/Leads")) {
      return new Response(JSON.stringify({ data: [{ status: "success", details: { id: "new-1" } }] }), { status: 201 });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  }, async () => {
    const r = await upsertZohoLead(
      { name: "Ana Silva", phone: "11986893890" },
      { tags: ["Quiz completo"], eventName: "quiz_completed" },
    );
    assertEquals(r.success, true);
    assertEquals(r.action, "inserted");
    assertEquals(r.zoho_id, "new-1");
  });
  assertEquals(calls.some((c) => c.includes("add_tags")), true);
});

Deno.test("upsertZohoLead atualiza sem duplicar quando a chave já existe", async () => {
  setupEnv();
  const calls = await withFetch((url, init) => {
    if (url.includes("/search")) {
      return new Response(JSON.stringify({ data: [{ id: "exist-9" }] }), { status: 200 });
    }
    if (init?.method === "PUT") {
      return new Response(JSON.stringify({ data: [{ status: "success", details: { id: "exist-9" } }] }), { status: 200 });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  }, async () => {
    const r = await upsertZohoLead({ name: "Ana Silva", email: "ana@x.com", phone: "11986893890" });
    assertEquals(r.success, true);
    assertEquals(r.action, "updated");
    assertEquals(r.zoho_id, "exist-9");
  });
  assertEquals(calls.some((c) => c.startsWith("POST https://api.zoho.test/crm/v6/Leads")), false);
});

Deno.test("upsertZohoLead faz retry apenas em 5xx e devolve erro final", async () => {
  setupEnv();
  let searchCalls = 0;
  await withFetch((url) => {
    if (url.includes("/search")) {
      searchCalls++;
      return new Response("boom", { status: 500 });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  }, async () => {
    const r = await upsertZohoLead({ name: "Ana", phone: "11986893890" });
    assertEquals(r.success, false);
  });
  assertEquals(searchCalls, 3);
});
