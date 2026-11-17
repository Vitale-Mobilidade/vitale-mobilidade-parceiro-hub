import { describe, expect, it, vi } from "vitest";
import {
  prepareInstagramSingle,
  queueNextInstagramSingle,
} from "../editorial-admin/instagram-single.ts";

vi.mock("./instagram-single-caption.ts", () => ({
  singleInstagramCaption: () => "Legenda com evidência",
}));
vi.mock("./cover-renderer/index.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./cover-renderer/index.ts")>()),
  composeNativeInstagramCover: async () => ({ bytes: new Uint8Array([1, 2, 3]) }),
}));
vi.mock("./editorial-cover.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./editorial-cover.ts")>()),
  inspectJpeg: () => ({ width: 1080, height: 1350 }),
}));

const source = {
  video_id: "testVideo01",
  article_id: "65a38b00-727c-4f19-86a6-0926c8de930d",
  article_title: "Teste",
};
const article = {
  id: source.article_id,
  video_id: source.video_id,
  og_image_url: null,
  title: "Teste",
  blocks: [],
};

function fixture(states = ["scheduled"], photo = true) {
  const rpc = vi.fn(async (name: string) => ({
    data: name === "reserve_instagram_single" ? "2026-11-17T20:45:00Z" : [{ id: "prepared", fingerprint: "digest" }],
  }));
  const upload = vi.fn(async () => ({ error: null }));
  const generate = vi.fn(async () =>
    Response.json({ background: "data:image/jpeg;base64,AQID" }),
  );
  const from = vi.fn((table: string) => {
    let columns = "";
    let active = false;
    const q = {
      select(value: string) {
        columns = value;
        return q;
      },
      in() {
        active = true;
        return q;
      },
      eq: () => q,
      filter: () => q,
      limit: () => q,
      order: () => q,
      range: () => q,
      single: () => q,
      maybeSingle: () => q,
      update: () => q,
      then(resolve: (v: object) => void) {
        if (table === "instagram_single_settings")
          return resolve({ data: { automation_enabled: true, pilot_id: "pilot" } });
        if (table === "youtube_editorial_sources") return resolve({ data: photo ? {
          cover_background: { title: "Teste", mime: "image/jpeg",
            path: `${source.article_id}/backgrounds/e1d0a523-e954-4d92-be7e-ed93c565ef0e.jpg` },
        } : null });
        if (table === "editorial_articles") return resolve({ data: article });
        if (table === "instagram_carousel_sources")
          return resolve({
            data:
              columns === "transcript"
                ? { transcript: "Fonte original" }
                : [source],
          });
        if (table === "instagram_single_posts" && active)
          return resolve({
            data: states.map((state) => ({ state })),
            count: states.length,
          });
        return resolve({ data: [] });
      },
    };
    return q;
  });
  const db = {
    from,
    rpc,
    storage: { from: () => ({ upload, download: async () => ({ data: new Blob(["photo"]) }) }) },
  } as unknown as Parameters<typeof prepareInstagramSingle>[0];
  return { db, from, rpc, upload, generate };
}

describe("Independent Instagram artwork", () => {
  it("creates a dedicated review draft without reading or modifying an article cover", async () => {
    const f = fixture();
    await expect(
      prepareInstagramSingle(f.db, source.video_id, f.generate),
    ).resolves.toEqual({ id: "prepared", fingerprint: "digest" });
    expect(f.from).not.toHaveBeenCalledWith("youtube_editorial_sources");
    expect(f.generate).toHaveBeenCalledExactlyOnceWith(article);
    expect(f.upload).toHaveBeenCalledWith(
      expect.stringContaining("/instagram-single/"),
      expect.any(Uint8Array),
      expect.any(Object),
    );
    expect(f.rpc).toHaveBeenCalledExactlyOnceWith(
      "stage_instagram_single",
      expect.objectContaining({ p_article: source.article_id }),
    );
  });

  it("does not spend on art when all three slots already hold posts", async () => {
    const f = fixture(["scheduled", "scheduled", "scheduled"]);
    await expect(
      prepareInstagramSingle(f.db, source.video_id, f.generate),
    ).rejects.toThrow("instagram_queue_full");
    expect(f.generate).not.toHaveBeenCalled();
  });

  it("restocks from an exact published source without approving a manual draft or calling AI", async () => {
    const f = fixture(["review"]);
    await expect(queueNextInstagramSingle(f.db, "https://db.example")).resolves.toEqual({
      status: "scheduled", dueAt: "2026-11-17T20:45:00Z",
    });
    expect(f.rpc).toHaveBeenNthCalledWith(2, "reserve_instagram_single", {
      p_id: "prepared", p_fingerprint: "digest", p_auto: true,
    });
    expect(f.generate).not.toHaveBeenCalled();
  });

  it("does not stage or reserve when no verified photograph is available", async () => {
    const f = fixture([], false);
    await expect(queueNextInstagramSingle(f.db, "https://db.example")).resolves.toEqual({
      status: "source_requires_review",
    });
    expect(f.rpc).not.toHaveBeenCalled();
    expect(f.upload).not.toHaveBeenCalled();
  });
});
