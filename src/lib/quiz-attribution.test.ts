import { describe, expect, it } from "vitest";
import {
  attributionPayload,
  parseUtmsFromUrl,
  QUIZ_ATTRIBUTION_KEY,
  resolveQuizAttribution,
  trafficOriginFromUtms,
} from "./quiz-attribution";

function memStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    map,
  };
}

const FULL =
  "https://vitalemobilidade.com/escolherbike?utm_source=CodexSrc&utm_medium=CodexMed&utm_campaign=CodexCamp_1600&utm_content=Conteudo%20Especial&utm_term=Bike%2BTeste";

describe("parseUtmsFromUrl", () => {
  it("preserva valores exatos com espaços, símbolos e caixa mista", () => {
    const u = parseUtmsFromUrl(FULL);
    expect(u).toEqual({
      utm_source: "CodexSrc",
      utm_medium: "CodexMed",
      utm_campaign: "CodexCamp_1600",
      utm_content: "Conteudo Especial",
      utm_term: "Bike+Teste",
    });
  });

  it("aceita nomes de parâmetro case-insensitive", () => {
    const u = parseUtmsFromUrl("/escolherbike?UTM_Source=Meta&Utm_CAMPAIGN=X%20Y");
    expect(u.utm_source).toBe("Meta");
    expect(u.utm_campaign).toBe("X Y");
  });

  it("não inventa valores quando a URL não tem UTMs", () => {
    expect(parseUtmsFromUrl("/escolherbike")).toEqual({
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
    });
  });
});

describe("resolveQuizAttribution", () => {
  it("persiste após a query ser removida / navegação interna", () => {
    const s = memStorage();
    resolveQuizAttribution(FULL, s);
    const after = resolveQuizAttribution("https://vitalemobilidade.com/escolherbike", s);
    expect(after.utm_source).toBe("CodexSrc");
    expect(after.utm_content).toBe("Conteudo Especial");
    expect(after.source_url).toBe(FULL);
  });

  it("nova entrada com outra campanha substitui a sessão inteira", () => {
    const s = memStorage();
    resolveQuizAttribution(FULL, s);
    const next = resolveQuizAttribution("/escolherbike?utm_source=nova&utm_campaign=camp2", s);
    expect(next.utm_source).toBe("nova");
    expect(next.utm_campaign).toBe("camp2");
    expect(next.utm_content).toBeNull();
    expect(next.utm_medium).toBeNull();
  });

  it("entrada sem UTMs em nova sessão não herda campanha antiga", () => {
    const antiga = memStorage();
    resolveQuizAttribution(FULL, antiga);
    const novaSessao = memStorage();
    const r = resolveQuizAttribution("https://vitalemobilidade.com/escolherbike", novaSessao);
    expect(r.utm_source).toBeNull();
    expect(r.utm_campaign).toBeNull();
    expect(r.source_url).toBe("https://vitalemobilidade.com/escolherbike");
  });

  it("source_url guarda a URL completa com query string", () => {
    const s = memStorage();
    expect(resolveQuizAttribution(FULL, s).source_url).toBe(FULL);
    expect(s.map.get(QUIZ_ATTRIBUTION_KEY)).toContain("CodexCamp_1600");
  });
});

describe("sem hardcodes de campanha", () => {
  const proibidos = ["youtube", "video_description", "quiz_bike_eletrica", "as_5_bikes", "meta", "paid_social"];

  it("payload sem UTMs não contém nenhum valor padrão", () => {
    const s = memStorage();
    const p = attributionPayload(resolveQuizAttribution("/escolherbike", s));
    expect(JSON.stringify(p).toLowerCase()).not.toMatch(new RegExp(proibidos.join("|")));
    expect(p.traffic_origin).toBeNull();
  });

  it("traffic_origin só existe quando há utm_source real", () => {
    expect(trafficOriginFromUtms(parseUtmsFromUrl("/x"))).toBeNull();
    expect(trafficOriginFromUtms(parseUtmsFromUrl("/x?utm_source=CodexSrc"))).toBe("CodexSrc");
  });
});
