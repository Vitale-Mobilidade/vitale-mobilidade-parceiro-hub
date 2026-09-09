/**
 * Testes de interface do painel /painel-bikes.
 *
 * - Motivos amigáveis de pendência (sem termos internos).
 * - Ausência dos rótulos técnicos e do botão "Atualizar visualização".
 * - Histórico renderizado depois da tabela e iniciando fechado.
 * - Atualização silenciosa sem duplicar timers.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pendingReasons, SILENT_REFRESH_MS, startSilentRefresh } from "./painel-bikes";
import painelSrc from "../pages/PainelBikes.tsx?raw";
import historySrc from "../components/painel/SyncHistory.tsx?raw";

describe("motivos amigáveis de pendência", () => {
  const base = { missingFields: [] as string[], imageStatus: null as string | null, profileStatus: null as string | null };

  it("linha incompleta mostra os campos reais faltantes", () => {
    expect(pendingReasons({ ...base, effective: "pending", missingFields: ["Preço R$", "Autonomia"] }))
      .toEqual(["Preço R$", "Autonomia"]);
  });

  it("bike nova completa aguardando imagem", () => {
    expect(pendingReasons({ ...base, effective: "pending", imageStatus: "pending", profileStatus: "ready" }))
      .toEqual(["Processando imagem"]);
  });

  it("aguardando recomendação", () => {
    expect(pendingReasons({ ...base, effective: "pending", imageStatus: "ready", profileStatus: "pending" }))
      .toEqual(["Processando recomendação"]);
  });

  it("aguardando os dois", () => {
    expect(pendingReasons({ ...base, effective: "pending" }))
      .toEqual(["Processando imagem e recomendação"]);
  });

  it("erros reais são explicados sem termos internos", () => {
    expect(pendingReasons({ ...base, effective: "pending", imageStatus: "error", profileStatus: "error" }))
      .toEqual(["Falha ao processar imagem", "Falha ao processar recomendação"]);
  });

  it("elegível e não elegível prontas não exibem motivo", () => {
    expect(pendingReasons({ ...base, effective: "eligible", imageStatus: "ready", profileStatus: "ready" })).toEqual([]);
    expect(pendingReasons({ ...base, effective: "not_eligible", imageStatus: null, profileStatus: null })).toEqual([]);
  });

  it("nenhum motivo contém termo interno", () => {
    const all = [
      ...pendingReasons({ ...base, effective: "pending" }),
      ...pendingReasons({ ...base, effective: "pending", imageStatus: "error", profileStatus: "error" }),
    ].join(" ").toLowerCase();
    for (const termo of ["asset", "profile", "baseline", "hash", "job", " ia"]) {
      expect(all).not.toContain(termo);
    }
  });
});

describe("cabeçalho e tabela do painel", () => {
  it("não existe botão 'Atualizar visualização'", () => {
    expect(painelSrc).not.toContain("Atualizar visualização");
  });

  it("mantém Abrir planilha, Sincronizar agora e Sair", () => {
    expect(painelSrc).toContain("Abrir planilha");
    expect(painelSrc).toContain("Sincronizar agora");
    expect(painelSrc).toContain("Sair");
  });

  it("não renderiza rótulos técnicos abaixo do nome", () => {
    for (const rotulo of [
      "imagem pendente",
      "baixando imagem",
      "imagem persistida",
      "perfil IA pendente",
      "gerando perfil IA",
      "perfil IA pronto",
      "baseline",
    ]) {
      expect(painelSrc).not.toContain(rotulo);
    }
  });

  it("mantém a coluna Imagem com a foto da bike", () => {
    expect(painelSrc).toContain("Foto da bike elétrica");
  });
});

describe("histórico de atualizações", () => {
  it("é renderizado depois da tabela de bikes", () => {
    const tabela = painelSrc.indexOf("<table");
    const historico = painelSrc.indexOf("<SyncHistory");
    expect(tabela).toBeGreaterThan(-1);
    expect(historico).toBeGreaterThan(tabela);
  });

  it("inicia fechado e é acessível", () => {
    expect(historySrc).toContain("const [open, setOpen] = useState(false)");
    expect(historySrc).toContain("aria-expanded={open}");
    expect(historySrc).toContain("Auditoria das sincronizações e mudanças do catálogo");
  });

  it("não busca dados antes da primeira abertura", () => {
    expect(historySrc).toContain("if (open) void load()");
  });
});

describe("atualização silenciosa", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("roda a cada 30s enquanto visível", () => {
    const run = vi.fn();
    const stop = startSilentRefresh(run, { isHidden: () => false });
    vi.advanceTimersByTime(SILENT_REFRESH_MS * 3);
    expect(run).toHaveBeenCalledTimes(3);
    stop();
  });

  it("pausa quando a aba está oculta", () => {
    const run = vi.fn();
    let hidden = true;
    const stop = startSilentRefresh(run, { isHidden: () => hidden });
    vi.advanceTimersByTime(SILENT_REFRESH_MS * 2);
    expect(run).not.toHaveBeenCalled();
    hidden = false;
    vi.advanceTimersByTime(SILENT_REFRESH_MS);
    expect(run).toHaveBeenCalledTimes(1);
    stop();
  });

  it("não duplica timers e para no unmount", () => {
    const run = vi.fn();
    const stop = startSilentRefresh(run, { isHidden: () => false });
    vi.advanceTimersByTime(SILENT_REFRESH_MS);
    expect(run).toHaveBeenCalledTimes(1);
    stop();
    stop(); // idempotente
    vi.advanceTimersByTime(SILENT_REFRESH_MS * 5);
    expect(run).toHaveBeenCalledTimes(1);
  });
});

describe("ordem estrutural da página", () => {
  it("filtros e tabela vêm antes de pendências, ajuda e histórico", () => {
    const filtros = painelSrc.indexOf("Buscar por nome ou ID");
    const tabela = painelSrc.indexOf("<table");
    const pendentes = painelSrc.indexOf("Linhas pendentes na planilha");
    const ajuda = painelSrc.indexOf("Como editar o catálogo");
    const historico = painelSrc.indexOf("<SyncHistory");
    expect(filtros).toBeGreaterThan(-1);
    expect(tabela).toBeGreaterThan(filtros);
    expect(pendentes).toBeGreaterThan(tabela);
    expect(ajuda).toBeGreaterThan(pendentes);
    expect(historico).toBeGreaterThan(ajuda);
  });
});
