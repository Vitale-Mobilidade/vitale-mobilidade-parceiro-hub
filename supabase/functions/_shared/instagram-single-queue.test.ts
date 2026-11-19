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
  revision: 1,
  blocks: [],
};

function fixture(states = ["scheduled"], photo = true, frameEvidence?: object, sourceCount = 1) {
  const candidates = Array.from({length: sourceCount}, (_, index) => index === 0 ? source : {
    ...source, video_id: `testVideo0${index + 1}`,
    article_id: source.article_id.slice(0, -1) + String(index),
  });
  const staged: Array<{id: string; fingerprint: string; video_id: string; article_id: string; state: string}> = [];
  const rpc = vi.fn(async (name: string, args: Record<string, string>) => {
    if (name === "reserve_instagram_single") {
      const post = staged.find(post => post.id === args.p_id);
      if (post) post.state = "scheduled";
      return {data: "2026-11-17T20:45:00Z"};
    }
    const post = {id: staged.length ? `prepared${staged.length + 1}` : "prepared",
      fingerprint: "digest", video_id: args.p_video, article_id: args.p_article, state: "review"};
    staged.push(post);
    return {data: [{id: post.id, fingerprint: post.fingerprint}]};
  });
  const cache = new Map<string, Blob>();
  const upload = vi.fn(async (path: string, bytes: string | Uint8Array) => {
    if (cache.has(path)) return { error: { statusCode: "409" } };
    cache.set(path, new Blob([bytes]));
    return { error: null };
  });
  const generate = vi.fn(async () =>
    Response.json({ background: "data:image/jpeg;base64,AQID" }),
  );
  const from = vi.fn((table: string) => {
    let columns = "";
    let active = false;
    let selectedId = source.article_id;
    const q = {
      select(value: string) {
        columns = value;
        return q;
      },
      in() {
        active = true;
        return q;
      },
      eq(key: string, value: string) {
        if (key === "id" || key === "article_id") selectedId = value;
        return q;
      },
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
            path: `${selectedId}/backgrounds/e1d0a523-e954-4d92-be7e-ed93c565ef0e.jpg`, frameEvidence },
        } : null });
        if (table === "editorial_articles") {
          const candidate = candidates.find(item => item.article_id === selectedId) ?? source;
          return resolve({ data: { ...article, id: selectedId, video_id: candidate.video_id } });
        }
        if (table === "instagram_carousel_sources")
          return resolve({
            data:
              columns === "transcript"
                ? { transcript: "Fonte original" }
                : candidates,
          });
        if (table === "instagram_single_posts" && active)
          return resolve({
            data: [...states.map((state) => ({state})), ...staged],
            count: states.length + staged.length,
          });
        if (table === "instagram_single_posts") return resolve({data: staged});
        return resolve({ data: [] });
      },
    };
    return q;
  });
  const db = {
    from,
    rpc,
    storage: { from: () => ({ upload, download: async (path: string) => {
      if (path.includes("/backgrounds/")) return { data: new Blob(["photo"]) };
      return cache.has(path) ? { data: cache.get(path) } : { error: { statusCode: "404" } };
    } }) },
  } as unknown as Parameters<typeof prepareInstagramSingle>[0];
  return { db, from, rpc, upload, generate, staged };
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

  it("automatically generates a native portrait when no original exists, then leaves the next run to finish", async () => {
    const f = fixture([], false, undefined, 4);
    await expect(queueNextInstagramSingle(f.db, "https://db.example", f.generate)).resolves.toMatchObject({
      status: "scheduled", reserved: 1, remaining: "instagram_auto_generation_pending",
    });
    expect(f.generate).toHaveBeenCalledTimes(1);
    expect(f.rpc.mock.calls.filter(([name]) => name === "reserve_instagram_single")).toHaveLength(1);
    expect(f.upload.mock.calls.some(([path]) => path.endsWith(".attempt.json"))).toBe(true);
  });

  it("bootstraps three future reservations over bounded preparation calls", async () => {
    const f = fixture([], false, undefined, 4);
    for (let run = 0; run < 3; run++) await queueNextInstagramSingle(f.db, "https://db.example", f.generate);
    expect(f.staged).toHaveLength(3);
    expect(new Set(f.staged.map(post => post.video_id)).size).toBe(3);
    expect(f.staged.every(post => post.state === "scheduled")).toBe(true);
    await expect(queueNextInstagramSingle(f.db, "https://db.example", f.generate)).resolves.toEqual({status: "queue_full"});
    expect(f.generate).toHaveBeenCalledTimes(3);
  });

  it("automatically generates a portrait instead of framing a landscape inside green bars", async () => {
    const f = fixture([], true);
    vi.mocked(composeNativeInstagramCover).mockRejectedValueOnce(Error("instagram_cover_ratio_invalid"));
    await expect(queueNextInstagramSingle(f.db, "https://db.example", f.generate)).resolves.toMatchObject({
      status: "scheduled", reserved: 1,
    });
    expect(f.generate).toHaveBeenCalledTimes(1);
  });

  it("never generates a paid cover for a full queue", async () => {
    const f = fixture(["scheduled", "scheduled", "scheduled"], false);
    await expect(queueNextInstagramSingle(f.db, "https://db.example", f.generate)).resolves.toMatchObject({status: "queue_full"});
    expect(f.generate).not.toHaveBeenCalled();
    expect(f.upload).not.toHaveBeenCalled();
  });

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
