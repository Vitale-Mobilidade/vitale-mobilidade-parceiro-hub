import { describe, expect, it } from "vitest";
import {
  youtubeThumbnailUrl,
  youtubeThumbnailVariant,
  buildVideoCatalog,
  selectCatalogVideos,
} from "@/lib/video-catalog";

describe("thumbnails do YouTube", () => {
  it("gera uma miniatura leve apenas para IDs válidos", () => {
    expect(youtubeThumbnailUrl("KSp39qV5XOk")).toBe("https://i.ytimg.com/vi/KSp39qV5XOk/mqdefault.jpg");
    expect(youtubeThumbnailUrl("id invalido")).toBeNull();
  });

  it("reduz variantes oficiais e preserva URLs externas", () => {
    expect(youtubeThumbnailVariant("https://i.ytimg.com/vi/KSp39qV5XOk/maxresdefault.jpg")).toBe(
      "https://i.ytimg.com/vi/KSp39qV5XOk/mqdefault.jpg",
    );
    expect(youtubeThumbnailVariant("https://cdn.example.com/editorial.jpg")).toBe(
      "https://cdn.example.com/editorial.jpg",
    );
  });
});

describe("complete model video associations", () => {
  const csv =
    "Data,Titulo,Link Youtube,Bikes\n" +
    Array.from(
      { length: 27 },
      (_, index) => `28/09/2026,Video ${index},https://youtu.be/vid${String(index).padStart(8, "0")},V9 Max`,
    ).join("\n") +
    "\n28/09/2026,Outra variante,https://youtu.be/variant0001,V9 Max S";
  const videos = buildVideoCatalog(csv);

  it("returns all 27 associations instead of the first 8 or 12", () => {
    expect(selectCatalogVideos(videos, "v9_max", null)).toHaveLength(27);
    expect(selectCatalogVideos(videos, "v9_max_s", null)).toHaveLength(1);
  });
  it("keeps explicit generic previews short without changing association data", () => {
    expect(selectCatalogVideos(videos, null, 4)).toHaveLength(4);
    expect(videos).toHaveLength(28);
  });
});
