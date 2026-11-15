import { describe, expect, it, vi } from "vitest";
import {
  prepareInstagramSingle,
  queueNextInstagramSingle,
} from "../editorial-admin/instagram-single.ts";

vi.mock("./instagram-single-caption.ts", () => ({
  singleInstagramCaption: () => "Legenda com evidência",
}));
vi.mock("./cover-renderer/index.ts", () => ({
  composeNativeInstagramCover: async () => ({
    bytes: new Uint8Array([1, 2, 3]),
  }),
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
  title: "Teste",
  blocks: [],
};

function fixture(states = ["scheduled"]) {
  const rpc = vi.fn(async () => ({ data: [{ id: "prepared" }] }));
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
      then(resolve: (v: object) => void) {
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
    storage: { from: () => ({ upload }) },
  } as unknown as Parameters<typeof prepareInstagramSingle>[0];
  return { db, from, rpc, upload, generate };
}

describe("Independent Instagram artwork", () => {
  it("creates a dedicated review draft without reading or modifying an article cover", async () => {
    const f = fixture();
    await expect(
      prepareInstagramSingle(f.db, source.video_id, f.generate),
    ).resolves.toEqual({ id: "prepared" });
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

  it("does not reserve an AI draft without review or copy an article cover during a tick", async () => {
    const draft = fixture(["review"]);
    await expect(queueNextInstagramSingle(draft.db)).resolves.toEqual({
      status: "awaiting_review",
    });
    expect(draft.rpc).not.toHaveBeenCalled();
    const empty = fixture([]);
    await expect(queueNextInstagramSingle(empty.db)).resolves.toEqual({
      status: "cover_requires_preparation",
    });
    expect(empty.from).not.toHaveBeenCalledWith("editorial_articles");
    expect(empty.upload).not.toHaveBeenCalled();
  });
});
