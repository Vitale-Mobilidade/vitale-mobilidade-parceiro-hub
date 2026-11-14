import { afterEach, describe, expect, it, vi } from "vitest";
import { queueNextInstagramSingle } from "../editorial-admin/instagram-single.ts";

vi.mock("./instagram-single-caption.ts", () => ({
  singleInstagramCaption: () => "Legenda com evidência",
}));
vi.mock("./cover-renderer/index.ts", () => {
  const render = async () => ({ bytes: new Uint8Array([1, 2, 3]) });
  return {
    composeFullBleedCover: render,
    composeUncroppedInstagramCover: render,
  };
});
vi.mock("./editorial-cover.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./editorial-cover.ts")>()),
  inspectJpeg: () => ({ width: 1080, height: 1350 }),
}));

const first = {
  video_id: "first",
  article_id: "65a38b00-727c-4f19-86a6-0926c8de930d",
};
const second = {
  video_id: "second",
  article_id: "17faaee7-7b5c-4377-bba3-dd97f8c3d340",
};
const dueAt = "2026-11-15T20:45:00Z";

function createDb({ missingOriginals = false, downloadFails = false } = {}) {
  const lookup = vi.fn((table, column, video) => {
    if (table === "instagram_single_settings") {
      return { automation_enabled: true, pilot_id: "pilot" };
    }
    if (table === "editorial_articles") return { title: "Teste", blocks: [] };
    if (table === "youtube_editorial_sources") {
      return !missingOriginals && (video === second.video_id || downloadFails)
        ? {
            background: {
              path: `${video === second.video_id ? second.article_id : first.article_id}/backgrounds/858042d4-bd96-4d6a-8d43-b863afbff043.png`,
              mime: "image/png",
              title: "Teste",
            },
          }
        : null;
    }
    if (table === "instagram_carousel_sources") {
      return column === "transcript"
        ? { transcript: "Transcrição original" }
        : [first, second];
    }
    if (table === "instagram_single_posts" && column.includes("fingerprint")) {
      return [{ state: "scheduled" }, { state: "scheduled" }];
    }
    return [];
  });
  const update = vi.fn();
  const rpc = vi.fn(async (name) =>
    name === "stage_instagram_single"
      ? { data: [{ id: "prepared", fingerprint: "fingerprint" }] }
      : { data: dueAt },
  );
  const db = {
    from(table: string) {
      let columns = "";
      let video: string | undefined;
      const query = {
        select(value: string) {
          columns = value;
          return query;
        },
        eq(key: string, value: string) {
          if (key === "video_id") video = value;
          return query;
        },
        update(value: unknown) {
          update(value);
          return query;
        },
        filter: () => query,
        in: () => query,
        limit: () => query,
        order: () => query,
        range: () => query,
        single: () => query,
        maybeSingle: () => query,
        then(resolve: (result: { data: unknown }) => void) {
          resolve({ data: lookup(table, columns, video) });
        },
      };
      return query;
    },
    rpc,
    storage: {
      from: () => ({
        download: async () =>
          downloadFails
            ? { data: null, error: new Error("storage unavailable") }
            : { data: new Blob(["original"]) },
        upload: async () => ({ error: null }),
      }),
    },
  };
  return {
    db: db as unknown as Parameters<typeof queueNextInstagramSingle>[0],
    rpc,
    update,
    lookup,
  };
}

afterEach(() => vi.restoreAllMocks());

describe("Instagram single-post replenishment", () => {
  it("skips a missing original and reserves the next source", async () => {
    const { db, rpc, update } = createDb();
    await expect(queueNextInstagramSingle(db)).resolves.toEqual({
      status: "scheduled",
      dueAt,
    });
    expect(rpc).toHaveBeenNthCalledWith(
      1,
      "stage_instagram_single",
      expect.objectContaining({ p_video: second.video_id }),
    );
    expect(rpc).toHaveBeenNthCalledWith(2, "reserve_instagram_single", {
      p_id: "prepared",
      p_fingerprint: "fingerprint",
      p_auto: true,
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("records an issue when each candidate needs editorial review", async () => {
    const { db, rpc, update } = createDb({ missingOriginals: true });
    await expect(queueNextInstagramSingle(db)).resolves.toEqual({
      status: "source_requires_review",
    });
    expect(update).toHaveBeenCalledWith({
      automation_issue: "instagram_original_missing",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("stops and preserves priority on a temporary storage failure", async () => {
    const { db, lookup, rpc, update } = createDb({ downloadFails: true });
    await expect(queueNextInstagramSingle(db)).rejects.toThrow(
      "instagram_original_read_failed",
    );
    expect(lookup).not.toHaveBeenCalledWith(
      "youtube_editorial_sources",
      expect.any(String),
      second.video_id,
    );
    expect(update).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});
