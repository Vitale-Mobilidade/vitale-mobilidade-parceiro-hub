import { describe, expect, it, vi } from "vitest";
import { composeNativeInstagramCover, composeFullBleedCover } from "./cover-renderer/index.ts";
import {
  prepareInstagramSingle,
  queueNextInstagramSingle,
} from "../editorial-admin/instagram-single.ts";

vi.mock("./instagram-single-caption.ts", () => ({
  singleInstagramCaption: () => "Legenda com evidência",
}));
vi.mock("./cover-renderer/index.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./cover-renderer/index.ts")>()),
  composeNativeInstagramCover: vi.fn(async () => ({ bytes: new Uint8Array([1, 2, 3]) })),
  composeFullBleedCover: vi.fn(async () => ({ bytes: new Uint8Array([1, 2, 3]) })),
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

function fixture(states = ["scheduled"], photo = true, frameEvidence?: object, sourceCount = 1) {
  const candidates = Array.from({length: sourceCount}, (_, index) => index === 0 ? source : {
    ...source, video_id: `testVideo0${index + 1}`,
    article_id: source.article_id.slice(0, -1) + String(index),
  });
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
            path: `${source.article_id}/backgrounds/e1d0a523-e954-4d92-be7e-ed93c565ef0e.jpg`, frameEvidence },
        } : null });
        if (table === "editorial_articles") return resolve({ data: article });
        if (table === "instagram_carousel_sources")
          return resolve({
            data:
              columns === "transcript"
                ? { transcript: "Fonte original" }
                : candidates,
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
      status: "scheduled", dueAt: "2026-11-17T20:45:00Z", reserved: 1, remaining: "no_source",
    });
    expect(f.rpc).toHaveBeenNthCalledWith(2, "reserve_instagram_single", {
      p_id: "prepared", p_fingerprint: "digest", p_auto: true,
    });
    expect(f.generate).not.toHaveBeenCalled();
  });

  it.each([[[], 3], [["scheduled"], 2]] as const)(
    "fills %j to three reservations in one run",
    async (states, vacant) => {
      const f = fixture([...states], true, undefined, 4);
      await expect(queueNextInstagramSingle(f.db, "https://db.example"))
        .resolves.toMatchObject({ status: "scheduled", reserved: vacant });
      const attempts = f.rpc.mock.calls.filter(([name]) => name === "reserve_instagram_single");
      expect(attempts).toHaveLength(vacant);
      expect(f.upload).toHaveBeenCalledTimes(vacant);
      expect(f.generate).not.toHaveBeenCalled();
    },
  );

  it("does not stage a landscape JPEG when no crop is verified", async () => {
    const f = fixture([]);
    vi.mocked(composeNativeInstagramCover).mockRejectedValueOnce(Error("instagram_cover_ratio_invalid"));
    await expect(queueNextInstagramSingle(f.db, "https://db.example")).resolves.toEqual({
      status: "source_requires_review",
    });
    expect(f.upload).not.toHaveBeenCalled();
    expect(f.rpc).not.toHaveBeenCalled();
  });

  it("uses the full-bleed renderer when the landscape crop has verified subject bounds", async () => {
    const evidence = { focus: { x: 0.5, y: 0.5 }, subjects: [{ left: 0.32, top: 0.2, right: 0.68, bottom: 0.8 }] };
    const f = fixture([], true, evidence);
    vi.mocked(composeNativeInstagramCover).mockRejectedValueOnce(Error("instagram_cover_ratio_invalid"));
    await expect(queueNextInstagramSingle(f.db, "https://db.example")).resolves.toMatchObject({ status: "scheduled" });
    expect(composeFullBleedCover).toHaveBeenCalledWith(expect.any(Object), article.title, "instagram", evidence);
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
