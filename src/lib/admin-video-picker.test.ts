import { describe, expect, it } from "vitest";
import { filterAdminVideos, manualAdminVideo } from "./admin-video-picker";
import type { VideoItem } from "./video-catalog";

const videos: VideoItem[] = [
  {
    videoId: "abcDEFG1234",
    title: "Qual é a melhor bicicleta elétrica?",
    date: null,
    url: "",
    thumbnail: "",
    bikeIds: [],
    unmatched: [],
  },
  {
    videoId: "XYZmnop5678",
    title: "Teste da V9 Max",
    date: null,
    url: "",
    thumbnail: "",
    bikeIds: [],
    unmatched: [],
  },
];

describe("seleção de vídeos no Admin", () => {
  it("busca por título sem depender de acentos ou caixa", () => {
    expect(
      filterAdminVideos(videos, "BICICLETA ELETRICA").map((v) => v.videoId),
    ).toEqual(["abcDEFG1234"]);
  });

  it("também encontra pelo ID e mantém todos quando a busca está vazia", () => {
    expect(filterAdminVideos(videos, "xyzMNOP").map((v) => v.videoId)).toEqual([
      "XYZmnop5678",
    ]);
    expect(filterAdminVideos(videos, "  ")).toEqual(videos);
  });

  it("aceita outro vídeo por URL e devolve somente o link canônico", () => {
    expect(
      manualAdminVideo("https://youtu.be/abcDEFG1234?t=90", "  Novo   teste  "),
    ).toMatchObject({
      videoId: "abcDEFG1234",
      title: "Novo teste",
      url: "https://www.youtube.com/watch?v=abcDEFG1234",
    });
  });

  it("rejeita URL externa, ID inválido e título insuficiente", () => {
    expect(
      manualAdminVideo(
        "https://example.com/watch?v=abcDEFG1234",
        "Título válido",
      ),
    ).toBeNull();
    expect(
      manualAdminVideo("https://youtube.com/watch?v=abc", "Título válido"),
    ).toBeNull();
    expect(manualAdminVideo("https://youtu.be/abcDEFG1234", "x")).toBeNull();
  });
});
