import { describe, expect, it } from "vitest";
import { youtubeThumbnailUrl, youtubeThumbnailVariant } from "@/lib/video-catalog";

describe("thumbnails do YouTube", () => {
  it("gera uma miniatura leve apenas para IDs válidos", () => {
    expect(youtubeThumbnailUrl("KSp39qV5XOk")).toBe("https://i.ytimg.com/vi/KSp39qV5XOk/mqdefault.jpg");
    expect(youtubeThumbnailUrl("id invalido")).toBeNull();
  });

  it("reduz variantes oficiais e preserva URLs externas", () => {
    expect(youtubeThumbnailVariant("https://i.ytimg.com/vi/KSp39qV5XOk/maxresdefault.jpg"))
      .toBe("https://i.ytimg.com/vi/KSp39qV5XOk/mqdefault.jpg");
    expect(youtubeThumbnailVariant("https://cdn.example.com/editorial.jpg"))
      .toBe("https://cdn.example.com/editorial.jpg");
  });
});
