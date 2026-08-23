import { describe, expect, it } from "vitest";
import {
  buildPanelRows,
  DEFAULT_SORT,
  effectiveEligible,
  nextSort,
  PANEL_EXPIRES_KEY,
  PANEL_TOKEN_KEY,
  readPanelSession,
  sortPanelRows,
  storePanelSession,
  clearPanelSession,
  type PanelRow,
  type PanelStorages,
  type StorageLike,
} from "./painel-bikes";
import type { CatalogRow } from "./bike-catalog";

function row(partial: Partial<PanelRow> & { id: string; name: string }): PanelRow {
  return {
    image: null,
    price: null,
    autonomyKm: null,
    capacity: null,
    linkVitale: null,
    state: "eligible",
    isNew: false,
    missingFields: [],
    fromSheet: true,
    eligible: true,
    hasOverride: true,
    updatedAt: null,
    imageStatus: null,
    imageNeedsReview: false,
    profileStatus: null,
    ...partial,
  };
}

function catalogRow(partial: Partial<CatalogRow> & { id: string; name: string }): CatalogRow {
  return {
    image: null,
    price: null,
    autonomyKm: null,
    capacity: null,
    linkVitale: null,
    state: "eligible",
    isNew: false,
    missingFields: [],
    fromSheet: true,
    ...partial,
  };
}

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
  };
}

function storages(): PanelStorages {
  return { session: memoryStorage(), persistent: memoryStorage() };
}

describe("sortPanelRows — nome pt-BR natural", () => {
  it("ordena A–Z ignorando caso e acentos", () => {
    const rows = [
      row({ id: "1", name: "ônix XR" }),
      row({ id: "2", name: "Átomo S" }),
      row({ id: "3", name: "atom Lite" }),
      row({ id: "4", name: "Zeta" }),
    ];
    const sorted = sortPanelRows(rows, { key: "name", dir: "asc" }).map((r) => r.name);
    // "atom Lite" precede "Átomo S": com acento/caso ignorados, "atom" < "atomo".
    expect(sorted).toEqual(["atom Lite", "Átomo S", "ônix XR", "Zeta"]);
  });

  it("ordena números embutidos naturalmente (V8 antes de V20)", () => {
    const rows = [
      row({ id: "1", name: "V20 Pro" }),
      row({ id: "2", name: "V8 Ultra" }),
      row({ id: "3", name: "V35" }),
    ];
    const sorted = sortPanelRows(rows, { key: "name", dir: "asc" }).map((r) => r.name);
    expect(sorted).toEqual(["V8 Ultra", "V20 Pro", "V35"]);
  });

  it("desc inverte a ordem", () => {
    const rows = [row({ id: "1", name: "Alpha" }), row({ id: "2", name: "Beta" })];
    expect(sortPanelRows(rows, { key: "name", dir: "desc" }).map((r) => r.name))
      .toEqual(["Beta", "Alpha"]);
  });
});

describe("sortPanelRows — valores semânticos", () => {
  it("preço usa número e nulos vão por último nas duas direções", () => {
    const rows = [
      row({ id: "1", name: "Sem preço", price: null }),
      row({ id: "2", name: "Cara", price: 12990 }),
      row({ id: "3", name: "Barata", price: 5990 }),
    ];
    expect(sortPanelRows(rows, { key: "price", dir: "asc" }).map((r) => r.id)).toEqual(["3", "2", "1"]);
    expect(sortPanelRows(rows, { key: "price", dir: "desc" }).map((r) => r.id)).toEqual(["2", "3", "1"]);
  });

  it("autonomia e capacidade usam número", () => {
    const rows = [
      row({ id: "1", name: "A", autonomyKm: 80, capacity: 2 }),
      row({ id: "2", name: "B", autonomyKm: 35, capacity: 1 }),
    ];
    expect(sortPanelRows(rows, { key: "autonomyKm", dir: "asc" }).map((r) => r.id)).toEqual(["2", "1"]);
    expect(sortPanelRows(rows, { key: "capacity", dir: "desc" }).map((r) => r.id)).toEqual(["1", "2"]);
  });

  it("atualizado em usa timestamp e nulos por último", () => {
    const rows = [
      row({ id: "1", name: "Antiga", updatedAt: "2026-08-01T10:00:00Z" }),
      row({ id: "2", name: "Sem data", updatedAt: null }),
      row({ id: "3", name: "Recente", updatedAt: "2026-08-23T10:00:00Z" }),
    ];
    expect(sortPanelRows(rows, { key: "updatedAt", dir: "desc" }).map((r) => r.id))
      .toEqual(["3", "1", "2"]);
  });

  it("estado segue ordem semântica elegível < pendente < inativa < estática", () => {
    const rows = [
      row({ id: "1", name: "Estática", state: "static" }),
      row({ id: "2", name: "Inativa", state: "inactive" }),
      row({ id: "3", name: "Elegível", state: "eligible" }),
      row({ id: "4", name: "Pendente", state: "draft" }),
    ];
    expect(sortPanelRows(rows, { key: "state", dir: "asc" }).map((r) => r.id))
      .toEqual(["3", "4", "2", "1"]);
  });

  it("campos faltantes ordena pela contagem", () => {
    const rows = [
      row({ id: "1", name: "Muitos", missingFields: ["a", "b", "c"] }),
      row({ id: "2", name: "Nenhum", missingFields: [] }),
      row({ id: "3", name: "Um", missingFields: ["a"] }),
    ];
    expect(sortPanelRows(rows, { key: "missingFields", dir: "asc" }).map((r) => r.id))
      .toEqual(["2", "3", "1"]);
  });

  it("link ordena como texto pt-BR", () => {
    const rows = [
      row({ id: "1", name: "A", linkVitale: "https://meli.la/zz9" }),
      row({ id: "2", name: "B", linkVitale: "https://meli.la/ab1" }),
    ];
    expect(sortPanelRows(rows, { key: "linkVitale", dir: "asc" }).map((r) => r.id))
      .toEqual(["2", "1"]);
  });
});

describe("nextSort", () => {
  it("mesma coluna alterna direção", () => {
    expect(nextSort({ key: "price", dir: "asc" }, "price")).toEqual({ key: "price", dir: "desc" });
    expect(nextSort({ key: "price", dir: "desc" }, "price")).toEqual({ key: "price", dir: "asc" });
  });

  it("coluna nova começa asc", () => {
    expect(nextSort({ key: "price", dir: "desc" }, "name")).toEqual({ key: "name", dir: "asc" });
  });

  it("padrão é nome asc", () => {
    expect(DEFAULT_SORT).toEqual({ key: "name", dir: "asc" });
  });
});

describe("effectiveEligible / buildPanelRows", () => {
  it("override false torna não elegível mesmo com estado elegível", () => {
    expect(effectiveEligible("eligible", { eligible: false })).toBe(false);
  });

  it("override true mantém elegível", () => {
    expect(effectiveEligible("draft", { eligible: true })).toBe(true);
  });

  it("sem override: estática elegível, bike da planilha não elegível", () => {
    expect(effectiveEligible("static", undefined)).toBe(true);
    expect(effectiveEligible("eligible", undefined)).toBe(false);
    expect(effectiveEligible("draft", undefined)).toBe(false);
  });

  it("buildPanelRows aplica override e anexa status de imagem/perfil", () => {
    const base = [
      catalogRow({ id: "v8", name: "V8 Ultra", state: "eligible" }),
      catalogRow({ id: "nova", name: "Nova X", state: "draft" }),
    ];
    const rows = buildPanelRows(
      base,
      [{ bike_id: "v8", eligible: false }],
      "2026-08-23T12:00:00Z",
      [{ bike_id: "nova", status: "pending", needs_review: true }],
      [{ bike_id: "nova", status: "ready" }],
    );
    const v8 = rows.find((r) => r.id === "v8")!;
    const nova = rows.find((r) => r.id === "nova")!;
    expect(v8.eligible).toBe(false);
    expect(v8.hasOverride).toBe(true);
    expect(v8.updatedAt).toBe("2026-08-23T12:00:00Z");
    expect(nova.eligible).toBe(false); // draft sem override
    expect(nova.imageStatus).toBe("pending");
    expect(nova.imageNeedsReview).toBe(true);
    expect(nova.profileStatus).toBe("ready");
  });
});

describe("sessão do painel", () => {
  const future = new Date(Date.now() + 60_000).toISOString();

  it("lembrar=true grava só no persistente", () => {
    const s = storages();
    storePanelSession(s, "tok123", future, true);
    expect(s.persistent.getItem(PANEL_TOKEN_KEY)).toBe("tok123");
    expect(s.session.getItem(PANEL_TOKEN_KEY)).toBeNull();
  });

  it("lembrar=false grava só no de sessão", () => {
    const s = storages();
    storePanelSession(s, "tok123", future, false);
    expect(s.session.getItem(PANEL_TOKEN_KEY)).toBe("tok123");
    expect(s.persistent.getItem(PANEL_TOKEN_KEY)).toBeNull();
  });

  it("trocar de modo limpa o storage anterior", () => {
    const s = storages();
    storePanelSession(s, "a", future, true);
    storePanelSession(s, "b", future, false);
    expect(s.persistent.getItem(PANEL_TOKEN_KEY)).toBeNull();
    expect(readPanelSession(s)?.token).toBe("b");
    expect(readPanelSession(s)?.remember).toBe(false);
  });

  it("lê sessão válida e marca remember corretamente", () => {
    const s = storages();
    storePanelSession(s, "tok", future, true);
    const sess = readPanelSession(s);
    expect(sess).toEqual({ token: "tok", expiresAt: future, remember: true });
  });

  it("sessão expirada é removida e retorna null", () => {
    const s = storages();
    const past = new Date(Date.now() - 60_000).toISOString();
    storePanelSession(s, "tok", past, false);
    expect(readPanelSession(s)).toBeNull();
    expect(s.session.getItem(PANEL_TOKEN_KEY)).toBeNull();
  });

  it("expiração inválida retorna null", () => {
    const s = storages();
    s.session.setItem(PANEL_TOKEN_KEY, "tok");
    s.session.setItem(PANEL_EXPIRES_KEY, "nao-e-data");
    expect(readPanelSession(s)).toBeNull();
  });

  it("clearPanelSession limpa ambos os storages", () => {
    const s = storages();
    storePanelSession(s, "a", future, true);
    storePanelSession(s, "b", future, false);
    clearPanelSession(s);
    expect(s.persistent.getItem(PANEL_TOKEN_KEY)).toBeNull();
    expect(s.session.getItem(PANEL_TOKEN_KEY)).toBeNull();
    expect(readPanelSession(s)).toBeNull();
  });
});
