import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ALLOWED_ZOHO_FIELDS,
  buildLeadWriteBody,
  buildLeadWritePayload,
  findExistingLead,
  mapLeadToZoho,
  normalizeEmail,
  normalizePhone,
  resetZohoTokenCache,
  sanitizeText,
  slugFromLink,
  splitName,
  ZOHO_FIELD_MAP,
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

  assertEquals(record.Last_Name, "Lucas");
  assertEquals(record.Sobrenome, "Vitale");
  assertEquals("First_Name" in record, false);
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
  assertEquals(record.bike1_slug, "aaa");
  assertEquals(record.bike2_slug, "bbb");
  assertEquals(record.traffic_origin, "meta"); // deriva do utm_source real
  assertEquals(record.utm_source, "meta");
  assertEquals(record.utm_medium, "cpc");
  assertEquals(record.utm_campaign, "quiz");
  assertEquals(record.utm_content, "ad1");
  assertEquals(record.utm_term, "bike");
  assertEquals(record.source_url, "https://vitalemobilidade.com/escolher-bike");
  assertEquals(record.device_type1, "mobile");
  assertEquals(record.Lead_da_Empresa, "Vitale Mobilidade");
  assertEquals(record.Status_do_Lead, "Novo Lead");
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

  assertEquals("Status_do_Lead" in record, false);
  assertEquals("Lead_Status" in record, false);
});

Deno.test("statusDoLeadForEvent só define Novo Lead na conclusão", () => {
  assertEquals(statusDoLeadForEvent("quiz_completed"), "Novo Lead");
  assertEquals(statusDoLeadForEvent("buy_button_clicked"), null);
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
  assertEquals(record.traffic_origin, undefined); // sem utm_source real
});

Deno.test("tagsForEvent devolve exatamente as tags corretas", () => {
  assertEquals(tagsForEvent("quiz_completed"), ["completou quiz"]);
  assertEquals(tagsForEvent("buy_button_clicked"), ["Clicou botão comprar ML"]);
  assertEquals(tagsForEvent("secondary_option_clicked"), ["Clicou botão comprar ML"]);
});

// ------------------------------------------- fixture real anonimizada (prod)

const REAL_PAYLOAD: Record<string, unknown> = {
  id: "00000000-0000-4000-8000-000000000abc",
  lead_id: "00000000-0000-4000-8000-000000000abc",
  "LeadID Lovable": "00000000-0000-4000-8000-000000000abc",
  name: "Fulano de Teste",
  phone: "(11) 99992-7159",
  phone_digits: "11999927159",
  event_name: "quiz_completed",
  event: { event_name: "quiz_completed" },
  status: "completo",
  main_use: "trabalho_delivery_renda",
  main_use_label: "Trabalho, delivery ou renda",
  daily_km_range: "ate_10_km",
  daily_km_range_label: "Até 10 km",
  route_type: "plano",
  route_type_label: "Plano",
  rider_capacity_need: "apenas_1_pessoa",
  weight_range_label: "Até 80 kg",
  budget_range_label: "Até R$7.000",
  had_ebike_before_label: "Sim",
  recommended_bike_1: "ft03",
  recommended_bike_1_label: "FT03",
  recommended_bike_1_link: "https://meli.la/2qUTUra",
  recommended_bike_1_reason: "melhor equilíbrio",
  recommended_bike_2: "v20_mini",
  recommended_bike_2_label: "V20 Mini",
  recommended_bike_2_link: "https://meli.la/2RBcChy",
  recommended_bike_2_reason: "alternativa mais compacta",
  utm_source: "youtube",
  utm_medium: "video_description",
  utm_campaign: "quiz_bike_eletrica",
  utm_content: "as_5_bikes",
  traffic_origin: "youtube",
  source_url: "https://vitalemobilidade.com/escolherbike",
  device_type: "desktop",
};

Deno.test("regressão: payload real preenche telefone, links, slugs e status", () => {
  const { record, phone } = mapLeadToZoho(REAL_PAYLOAD);
  assertEquals(phone.digits, "11999927159");
  assertEquals(record.Phone, "(11) 99992-7159");
  assertEquals(record.Mobile, "(11) 99992-7159");
  assertEquals(record.Link_whatsapp, "https://wa.me/5511999927159");
  assertEquals(record.Last_Name, "Fulano");
  assertEquals(record.Sobrenome, "De Teste");
  assertEquals(record.LeadID_Lovable, "00000000-0000-4000-8000-000000000abc");
  assertEquals(record.Rec_Principal, "FT03");
  assertEquals(record.Rec_secund_ria, "V20 Mini");
  assertEquals(record.Raz_o_da_Recomenda_o, "melhor equilíbrio");
  assertEquals(record.Raz_o_da_Rec_2, "alternativa mais compacta");
  assertEquals(record.Rec_bike_1_link, "https://meli.la/2qUTUra");
  assertEquals(record.Rec_bike_2_link, "https://meli.la/2RBcChy");
  assertEquals(record.bike1_slug, "2qUTUra");
  assertEquals(record.bike2_slug, "2RBcChy");
  assertEquals(record.Principal_Uso, "Trabalho, delivery ou renda");
  assertEquals(record.Km_s_por_dia, "Até 10 km");
  assertEquals(record.Como_o_trajeto, "Plano");
  assertEquals(record.Faixa_de_peso, "Até 80 kg");
  assertEquals(record.Or_amento, "Até R$7.000");
  assertEquals(record.J_teve_bike_el_trica_antes, "Sim");
  assertEquals(record.utm_campaign, "quiz_bike_eletrica");
  assertEquals(record.traffic_origin, "youtube");
  assertEquals(record.Lead_Source, "youtube");
  assertEquals(record.device_type1, "desktop");
  assertEquals(record.Status_do_Lead, "Novo Lead");
  assertEquals(record.Lead_da_Empresa, "Vitale Mobilidade");
});

// ------------------------------------------- Data_de_formul_rio e slugs

Deno.test("slugFromLink extrai último segmento preservando case", () => {
  assertEquals(slugFromLink("https://meli.la/2YSVbMJ"), "2YSVbMJ");
  assertEquals(slugFromLink("https://meli.la/2aNm5oD"), "2aNm5oD");
  assertEquals(slugFromLink("https://meli.la/2YSVbMJ/"), "2YSVbMJ");
  assertEquals(slugFromLink("https://meli.la/2YSVbMJ?utm_source=x"), "2YSVbMJ");
  assertEquals(slugFromLink("https://meli.la/2aNm5oD#frag"), "2aNm5oD");
  assertEquals(slugFromLink("https://meli.la/2aNm5oD/?a=1#f"), "2aNm5oD");
  assertEquals(slugFromLink("", "v20_pro"), "v20_pro");
  assertEquals(slugFromLink(undefined, undefined), undefined);
});

Deno.test("Data_de_formul_rio é criada na conclusão com offset -03:00", () => {
  const { record } = mapLeadToZoho({ name: "Ana", event_name: "quiz_completed" });
  const value = record.Data_de_formul_rio as string;
  assertEquals(typeof value, "string");
  assertEquals(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/.test(value), true);
});

Deno.test("segunda conclusão gera timestamp novo e clique não altera", async () => {
  const first = mapLeadToZoho({ name: "Ana", event_name: "quiz_completed" }).record;
  await new Promise((r) => setTimeout(r, 1100));
  const second = mapLeadToZoho({ name: "Ana", event_name: "quiz_completed" }).record;
  assertEquals(first.Data_de_formul_rio !== second.Data_de_formul_rio, true);

  const click = mapLeadToZoho({ name: "Ana", event_name: "buy_button_click" }).record;
  assertEquals(click.Data_de_formul_rio, undefined);
  assertEquals(click.Status_do_Lead, undefined);
});

Deno.test("regressão: telefone só com dígitos também normaliza", () => {
  const { record } = mapLeadToZoho({ name: "Ana", phone_digits: "5511999927159" });
  assertEquals(record.Phone, "(11) 99992-7159");
  assertEquals(record.Mobile, "(11) 99992-7159");
  assertEquals(record.Link_whatsapp, "https://wa.me/5511999927159");
});

Deno.test("regressão: clique reaproveita o mesmo lead via LeadID_Lovable e só adiciona tag", async () => {
  setupEnv();
  const calls = await withFetch((url, init) => {
    if (url.includes("LeadID_Lovable%3Aequals")) {
      return new Response(JSON.stringify({ data: [{ id: "lead-real-1" }] }), { status: 200 });
    }
    if (url.includes("/search")) return new Response(null, { status: 204 });
    if (init?.method === "PUT") {
      return new Response(JSON.stringify({ data: [{ status: "success", details: { id: "lead-real-1" } }] }), { status: 200 });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  }, async () => {
    const r = await upsertZohoLead(
      { ...REAL_PAYLOAD, event: { event_name: "buy_button_clicked" }, event_name: "buy_button_clicked" },
      { tags: tagsForEvent("buy_button_clicked"), eventName: "buy_button_clicked" },
    );
    assertEquals(r.success, true);
    assertEquals(r.action, "updated");
    assertEquals(r.zoho_id, "lead-real-1");
    assertEquals(r.matched_by, "lead_id");
  });
  assertEquals(calls.some((c) => c.includes("tag_names=Clicou+bot%C3%A3o+comprar+ML") || c.includes("tag_names=Clicou%20bot%C3%A3o%20comprar%20ML")), true);
  assertEquals(calls.some((c) => c.includes("Quiz+Vitale") || c.includes("Quiz%20Vitale")), false);
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
  // 5xx tem retry curto (3 tentativas por consulta) e a falha de busca não
  // derruba o fluxo — o upsert segue e retorna erro final.
  assertEquals(searchCalls % 3, 0);
  assertEquals(searchCalls >= 3, true);
});

// ------------------------------------------------------------ nome/sobrenome

Deno.test("splitName: 1, 2 e 4 termos, caixa mista e acentos", () => {
  assertEquals(splitName("jOÃO dA siLVA souZA"), { last: "João", sobrenome: "Da Silva Souza" });
  assertEquals(splitName("ANA"), { last: "Ana", sobrenome: "" });
  assertEquals(splitName("maria   JOSÉ"), { last: "Maria", sobrenome: "José" });
  assertEquals(splitName("  "), { last: "Lead sem nome", sobrenome: "" });
});

Deno.test("mapLeadToZoho grava Nome=primeiro termo e Sobrenome=restante", () => {
  const { record } = mapLeadToZoho({ name: "jOÃO dA siLVA souZA" });
  assertEquals(record.Last_Name, "João");
  assertEquals(record.Sobrenome, "Da Silva Souza");
  assertEquals("First_Name" in record, false);
  const single = mapLeadToZoho({ name: "Joana" }).record;
  assertEquals(single.Last_Name, "Joana");
  assertEquals("Sobrenome" in single, false);
});

// ------------------------------------------------------------- atribuição

Deno.test("UTMs reais são preservadas exatamente", () => {
  const { record } = mapLeadToZoho({
    name: "Ana",
    utm_source: "CodexSrc",
    utm_medium: "CodexMed",
    utm_campaign: "CodexCamp_1600",
    utm_content: "Conteudo Especial",
    utm_term: "Bike+Teste",
    source_url: "https://vitalemobilidade.com/escolherbike?utm_source=CodexSrc&utm_term=Bike%2BTeste",
  });
  assertEquals(record.utm_source, "CodexSrc");
  assertEquals(record.utm_medium, "CodexMed");
  assertEquals(record.utm_campaign, "CodexCamp_1600");
  assertEquals(record.utm_content, "Conteudo Especial");
  assertEquals(record.utm_term, "Bike+Teste");
  assertEquals(record.traffic_origin, "CodexSrc");
  assertEquals(record.Lead_Source, "CodexSrc");
  assertEquals(String(record.source_url).includes("?utm_source=CodexSrc"), true);
});

Deno.test("sem utm_source não há traffic_origin, Lead_Source nem padrão youtube", () => {
  const { record } = mapLeadToZoho({ name: "Ana", traffic_origin: "youtube", detected_source: "youtube" });
  assertEquals("traffic_origin" in record, false);
  assertEquals("Lead_Source" in record, false);
  assertEquals(JSON.stringify(record).toLowerCase().includes("youtube"), false);
});

Deno.test("nenhum hardcode de campanha padrão no mapeamento", () => {
  const raw = JSON.stringify(ZOHO_FIELD_MAP).toLowerCase();
  for (const proibido of ["youtube", "video_description", "quiz_bike_eletrica", "as_5_bikes"]) {
    assertEquals(raw.includes(proibido), false, proibido);
  }
});

// --------------------------------------------------- trigger: ["workflow"]

function captureWrites(handler: Handler, fn: () => Promise<void>) {
  const writes: { method: string; url: string; body: any }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/oauth/v2/token")) {
      return Promise.resolve(
        new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }), { status: 200 }),
      );
    }
    const method = init?.method ?? "GET";
    if ((method === "POST" || method === "PUT") && /\/crm\/v6\/Leads(\/[^/?]+)?$/.test(url)) {
      writes.push({ method, url, body: JSON.parse(String(init?.body ?? "{}")) });
    } else if (method === "GET" || url.includes("/search")) {
      writes.push({ method, url, body: init?.body ? JSON.parse(String(init.body)) : null });
    }
    return Promise.resolve(handler(url, init));
  }) as typeof fetch;
  return fn().finally(() => { globalThis.fetch = original; }).then(() => writes);
}

function assertTriggerAtRoot(body: any) {
  assertEquals(body.trigger, ["workflow"]);
  assertEquals(Array.isArray(body.data), true);
  assertEquals("trigger" in body.data[0], false);
}

Deno.test("buildLeadWritePayload coloca trigger no nível raiz", () => {
  const payload = buildLeadWritePayload({ Last_Name: "Ana" });
  assertTriggerAtRoot(payload);
  assertEquals(payload.data[0], { Last_Name: "Ana" });
  assertEquals(JSON.parse(buildLeadWriteBody({ Last_Name: "Ana" })).trigger, ["workflow"]);
});

Deno.test("POST de criação envia trigger workflow", async () => {
  setupEnv();
  const writes = await captureWrites((url, init) => {
    if (url.includes("/search")) return new Response(null, { status: 204 });
    if (init?.method === "POST") {
      return new Response(JSON.stringify({ data: [{ status: "success", details: { id: "n1" } }] }), { status: 201 });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  }, async () => {
    const r = await upsertZohoLead({ name: "Ana Silva", email: "ana@x.com" }, { eventName: "quiz_completed" });
    assertEquals(r.action, "inserted");
  });
  const posts = writes.filter((w) => w.method === "POST" && !w.url.includes("add_tags"));
  assertEquals(posts.length, 1);
  assertTriggerAtRoot(posts[0].body);
});

Deno.test("PUT de atualização (match por email) envia trigger workflow", async () => {
  setupEnv();
  const writes = await captureWrites((url, init) => {
    if (url.includes("/search")) return new Response(JSON.stringify({ data: [{ id: "e9" }] }), { status: 200 });
    if (init?.method === "PUT") {
      return new Response(JSON.stringify({ data: [{ status: "success", details: { id: "e9" } }] }), { status: 200 });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  }, async () => {
    const r = await upsertZohoLead({ name: "Ana Silva", email: "ana@x.com" }, { eventName: "quiz_completed" });
    assertEquals(r.action, "updated");
  });
  const puts = writes.filter((w) => w.method === "PUT");
  assertEquals(puts.length, 1);
  assertTriggerAtRoot(puts[0].body);
});

Deno.test("PUT após DUPLICATE_DATA envia trigger workflow", async () => {
  setupEnv();
  const writes = await captureWrites((url, init) => {
    if (url.includes("/search")) return new Response(null, { status: 204 });
    if (init?.method === "POST" && url.endsWith("/Leads")) {
      return new Response(JSON.stringify({
        data: [{ status: "error", code: "DUPLICATE_DATA", details: { api_name: "Email", duplicate_record: { id: "dup-7" } } }],
      }), { status: 202 });
    }
    if (init?.method === "PUT") {
      return new Response(JSON.stringify({ data: [{ status: "success", details: { id: "dup-7" } }] }), { status: 200 });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  }, async () => {
    const r = await upsertZohoLead({ name: "Ana Silva", email: "ana@x.com" }, { eventName: "quiz_completed" });
    assertEquals(r.success, true);
    assertEquals(r.zoho_id, "dup-7");
  });
  const puts = writes.filter((w) => w.method === "PUT");
  assertEquals(puts.length, 1);
  assertTriggerAtRoot(puts[0].body);
  assertTriggerAtRoot(writes.find((w) => w.method === "POST" && w.url.endsWith("/Leads"))!.body);
});

Deno.test("clique de compra (reprocesso/tag) também envia trigger workflow", async () => {
  setupEnv();
  const writes = await captureWrites((url, init) => {
    if (url.includes("/search")) return new Response(JSON.stringify({ data: [{ id: "e9" }] }), { status: 200 });
    if (init?.method === "PUT") {
      return new Response(JSON.stringify({ data: [{ status: "success", details: { id: "e9" } }] }), { status: 200 });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  }, async () => {
    await upsertZohoLead({ name: "Ana Silva", email: "ana@x.com" }, {
      eventName: "buy_button_click",
      tags: tagsForEvent("buy_button_click"),
    });
  });
  assertTriggerAtRoot(writes.find((w) => w.method === "PUT")!.body);
});

Deno.test("operações de leitura não enviam trigger", async () => {
  setupEnv();
  const writes = await captureWrites(() => new Response(null, { status: 204 }), async () => {
    await findExistingLead("ana@x.com", normalizePhone("11986893890"));
  });
  for (const w of writes) {
    assertEquals(w.method, "GET");
    assertEquals(w.body, null);
  }
});
