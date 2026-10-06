import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("./admin-api", () => ({ adminCall: vi.fn(), adminStream: vi.fn(), AdminApiError: Error }));
import { synchronizeAdmin } from "./admin-sync";

function setup(candidate: string | null = null) {
  return { bikes: vi.fn(async () => ({})), videos: vi.fn(async () => ({ videos: [], candidate, enabled: true })),
    generate: vi.fn(async () => ({})), progress: vi.fn(), catalog: vi.fn() };
}
describe("Sincronização geral do Admin", () => {
  it("atualiza bikes e vídeos sem gerar histórico ou artigos existentes", async () => {
    const input = setup(); const result = await synchronizeAdmin(input);
    expect(input.bikes).toHaveBeenCalledOnce(); expect(input.videos).toHaveBeenCalledOnce();
    expect(input.generate).not.toHaveBeenCalled(); expect(result.errors).toEqual([]);
    expect(input.catalog).toHaveBeenCalledWith([]);
  });
  it("gera artigo e capa apenas para o candidato novo retornado pelo servidor", async () => {
    const input = setup("abcDEFG1234"); await synchronizeAdmin(input);
    expect(input.generate).toHaveBeenCalledExactlyOnceWith("abcDEFG1234");
  });
  it("continua atualizando vídeos em falha das bikes mas impede IA com catálogo desatualizado", async () => {
    const input = setup("abcDEFG1234"); input.bikes.mockRejectedValue(new Error("Bikes indisponíveis"));
    const result = await synchronizeAdmin(input);
    expect(input.videos).toHaveBeenCalledOnce(); expect(input.generate).not.toHaveBeenCalled();
    expect(result.errors).toContain("Bikes indisponíveis"); expect(result.videos).toContain("atualizados");
  });
  it("não repete geração em caso de erro ou resultado incerto", async () => {
    const input = setup("abcDEFG1234"); input.generate.mockRejectedValue(new Error("Geração interrompida"));
    const result = await synchronizeAdmin(input);
    expect(input.generate).toHaveBeenCalledOnce(); expect(result.errors).toContain("Geração interrompida");
  });
  it("respeita a desativação da IA", async () => {
    const input = setup("abcDEFG1234"); input.videos.mockResolvedValue({ videos: [], candidate: "abcDEFG1234", enabled: false });
    expect((await synchronizeAdmin(input)).article).toContain("desativada");
    expect(input.generate).not.toHaveBeenCalled();
  });
});
