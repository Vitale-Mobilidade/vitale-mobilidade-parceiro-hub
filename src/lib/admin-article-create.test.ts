import { describe, expect, it, vi } from "vitest";
import { filterArticleBikes, applyRequestedArticleCover, creationBikeSelection } from "./admin-article-create";
import { adminCall } from "./admin-api";
import { composeCover } from "./cover-compose";
import type { EditorialArticle } from "../../supabase/functions/_shared/editorial-contract";
import { parseCreationBikeIds } from "../../supabase/functions/_shared/editorial-create-input";

vi.mock("./admin-api", () => ({ adminCall: vi.fn() }));
vi.mock("./cover-compose", () => ({ composeCover: vi.fn() }));
const article = {
  id: "saved-draft",
  title: "Título final",
  revision: 3,
  status: "draft",
} as EditorialArticle;
const bikes = [
  { bike_id: "v9", name: "Elétrica V9 Max" },
  { bike_id: "gt20", name: "GT20" },
];

describe("criação de artigo — bikes", () => {
  it("seletor vazio omite o opt-out da detecção, seleção manual mantém prioridade", () => {
    expect(JSON.parse(JSON.stringify(creationBikeSelection([])))).not.toHaveProperty("bikeIds");
    expect(parseCreationBikeIds(creationBikeSelection([]).bikeIds, new Set(["v9_max"]))).toBeUndefined();
    expect(creationBikeSelection(["v9_max", "ft03"])).toEqual({ bikeIds: ["v9_max", "ft03"] });
  });
  it("lista o catálogo sem termo e busca sem acentos, por nome e ID", () => {
    expect(filterArticleBikes(bikes, "")).toEqual(bikes);
    expect(filterArticleBikes(bikes, "ELETRICA")).toEqual([bikes[0]]);
    expect(filterArticleBikes(bikes, "GT20")).toEqual([bikes[1]]);
    expect(filterArticleBikes(bikes, "ausente")).toEqual([]);
  });
  it("diferencia seleção vazia de chamada antiga, preserva ordem e remove duplicatas", () => {
    const known = new Set(["v9", "gt20"]);
    expect(parseCreationBikeIds(undefined, known)).toBeUndefined();
    expect(parseCreationBikeIds([], known)).toEqual([]);
    expect(parseCreationBikeIds(["gt20", "v9", "gt20"], known)).toEqual(["gt20", "v9"]);
  });
  it("recusa IDs desconhecidos, payload inválido e excesso antes de usar a IA", () => {
    const known = new Set(["v9"]);
    for (const input of [["inventada"], [null], "v9", Array(8).fill("v9")]) {
      expect(() => parseCreationBikeIds(input, known)).toThrow("bikes válidas");
    }
  });
});

describe("criação de artigo — consentimento de capa", () => {
  it("não chama imagem sem opt-in, em publicado ou em resposta reutilizada", async () => {
    vi.mocked(adminCall).mockClear();
    expect(await applyRequestedArticleCover(article, false, false)).toBe(article);
    expect(await applyRequestedArticleCover(article, true, true)).toBe(article);
    const published = { ...article, status: "published" } as EditorialArticle;
    expect(await applyRequestedArticleCover(published, true, false)).toBe(published);
    expect(adminCall).not.toHaveBeenCalled();
  });
  it("gera, compõe o título do servidor e aplica uma vez com revisão correta", async () => {
    vi.mocked(adminCall).mockReset();
    vi.mocked(adminCall)
      .mockResolvedValueOnce({
        background: "data:image/png;base64,mock",
        title: "Título do banco",
        revision: 4,
      })
      .mockResolvedValueOnce({ article: { ...article, revision: 5 } });
    vi.mocked(composeCover).mockResolvedValue({
      dataUrl: "data:image/jpeg;base64,mock",
      bytes: 10,
    });
    const result = await applyRequestedArticleCover(article, true, false);
    expect(adminCall).toHaveBeenNthCalledWith(1, "cover-generate", {
      id: article.id,
      revision: 3,
    });
    expect(composeCover).toHaveBeenCalledWith("data:image/png;base64,mock", "Título do banco");
    expect(adminCall).toHaveBeenNthCalledWith(2, "cover-apply", {
      id: article.id,
      revision: 4,
      image: "data:image/jpeg;base64,mock",
    });
    expect(result.revision).toBe(5);
  });
  it("propaga falha de geração sem aplicar ou modificar artigo salvo", async () => {
    vi.mocked(adminCall).mockReset();
    vi.mocked(adminCall).mockRejectedValueOnce(new Error("Sem créditos"));
    await expect(applyRequestedArticleCover(article, true, false)).rejects.toThrow("Sem créditos");
    expect(adminCall).toHaveBeenCalledTimes(1);
    expect(article.revision).toBe(3);
  });
});
