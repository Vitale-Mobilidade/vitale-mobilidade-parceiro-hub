import { describe, expect, it } from "vitest";
import { independentVideoQueue } from "../../supabase/functions/_shared/youtube-backlog";
import type { VideoItem } from "./video-catalog";
const video = (videoId: string, title = "Minha bike") => ({ videoId, title } as VideoItem);
describe("Fila de pendentes autorizados", () => {
  it("exclui artigo ativo por ID, independentemente de título/link curto", () => {
    expect(independentVideoQueue([video("abcDEFG1234")], [{ video_id: "abcDEFG1234", title: "Outro título" }], [])).toEqual([]);
  });
  it("usa título do vídeo vinculado mesmo se artigo foi renomeado", () => {
    expect(independentVideoQueue([video("novoDEFG123", "BÍKE: teste REAL!")], [{ video_id: "antigoFG123", title: "Review independente" }], [{ youtube_id: "antigoFG123", title: "Bike teste real" }])).toEqual([]);
  });
  it("exclui igualdade normalizada do título do artigo", () => {
    expect(independentVideoQueue([video("novoDEFG123", "Bike — teste!")], [{ video_id: "antigoFG123", title: "bike teste" }], [])).toEqual([]);
  });
  it("não usa a existência de vídeo salvo sem artigo para excluir pendente", () => {
    const item = video("abcDEFG1234"); expect(independentVideoQueue([item], [], [{ youtube_id: item.videoId, title: item.title }])).toEqual([item]);
  });
});
