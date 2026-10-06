import { readFile, writeFile } from "node:fs/promises";
import { beforeAll, describe, expect, it } from "vitest";
import { inspectJpeg } from "../../supabase/functions/_shared/editorial-cover";
let render: typeof import("../../supabase/functions/_shared/cover-renderer/index").composeServerCover;
let background: string;
beforeAll(async () => {
  const bytes = await readFile(
    new URL(
      "../../supabase/functions/_shared/cover-renderer/fixture.png",
      import.meta.url,
    ),
  );
  background = `data:image/png;base64,${bytes.toString("base64")}`;
  render = (
    await import("../../supabase/functions/_shared/cover-renderer/index")
  ).composeServerCover;
});
describe("composição real de capa no servidor, sem IA ou navegador", () => {
  it("gera JPG 1280×720 com título exato, marca e limite de bytes", async () => {
    const title = "V9 Max: força nas subidas e conforto no dia a dia";
    const result = await render(background, title);
    expect(inspectJpeg(result.bytes)).toEqual({ width: 1280, height: 720 });
    expect(result.bytes.length).toBeLessThan(4 * 1024 * 1024);
    expect(result.title).toBe(title);
    expect(result.lines.join(" ")).toBe(title);
    await writeFile("/tmp/vitale-server-cover-offline-oct06.jpg", result.bytes);
  });
  it("aceita JPEG RGB real como entrada, preservando o fluxo do provedor", async () => {
    const initial = await render(background, "Primeiro título");
    const second = await render(
      `data:image/jpeg;base64,${Buffer.from(initial.bytes).toString("base64")}`,
      "Novo título",
    );
    expect(inspectJpeg(second.bytes)).toEqual({ width: 1280, height: 720 });
    expect(second.lines.join(" ")).toBe("Novo título");
  });
  it("rejeita background remoto e formato inesperado sem fetch", async () => {
    await expect(
      render("https://example.com/image.png", "Título válido"),
    ).rejects.toThrow("cover_background_invalid");
    await expect(
      render("data:image/webp;base64,UklGRg==", "Título válido"),
    ).rejects.toThrow("cover_background_invalid");
  });
  it("não corta palavras nem título que não cabe", async () => {
    await expect(render(background, "W".repeat(190))).rejects.toThrow(
      "cover_title_does_not_fit",
    );
  });
  it("rejeita dimensões enormes antes de descompactar pixels", async () => {
    const bytes = Buffer.from(background.split(",")[1], "base64");
    bytes.writeUInt32BE(9000, 16);
    bytes.writeUInt32BE(9000, 20);
    await expect(
      render(
        `data:image/png;base64,${bytes.toString("base64")}`,
        "Título válido",
      ),
    ).rejects.toThrow("cover_background_dimensions_invalid");
  });
});
