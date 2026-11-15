import { describe, expect, it, vi } from "vitest";
import { changeInstagramSingle } from "../editorial-admin/instagram-single.ts";
import { INSTAGRAM_CAPTION_END } from "./instagram-single-caption.ts";
import * as jpeg from "./cover-renderer/vendor/jpeg.js";
const id = "00000000-0000-4000-8000-000000000001";
const article = "00000000-0000-4000-8000-000000000002";
const encode = (value: string) => new TextEncoder().encode(value);
async function sha(value: Uint8Array) {
  const hash = await crypto.subtle.digest("SHA-256", value);
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
function fixture() {
  const pixels = new Uint8Array(1080 * 1350 * 4).fill(100);
  const bytes = jpeg.encode(pixels, 1080, 1350, 70);
  const dueAt = new Date(Date.now() + 3_600_000).toISOString();
  const update = vi.fn();
  const filter = vi.fn();
  const upload = vi.fn(async () => ({ error: null }));
  const generateCover = vi.fn();
  const generateCaption = vi.fn();
  return {
    bytes,
    dueAt,
    update,
    filter,
    upload,
    generateCover,
    generateCaption,
  };
}
async function dbFor(
  f: ReturnType<typeof fixture>,
  { attempted = false, conflict = false } = {},
) {
  const jpegSha = await sha(f.bytes);
  const fingerprint = await sha(encode(`${jpegSha}\nLegenda original`));
  const row = {
    id,
    article_id: article,
    video_id: "example",
    title: "Uma pauta real",
    state: "scheduled",
    caption: "Legenda original",
    due_at: f.dueAt,
    fingerprint,
    asset_path: `${article}/instagram-single/${fingerprint}.jpg`,
    attempted_at: attempted ? f.dueAt : null,
    lease: null,
    lease_until: null,
  };
  const db = {
    storage: {
      from: () => ({
        download: vi.fn(async () => ({ data: new Blob([f.bytes]) })),
        upload: f.upload,
      }),
    },
    from() {
      let writing = false;
      const q = {
        select: () => q,
        update(fields: object) {
          writing = true;
          f.update(fields);
          return q;
        },
        eq: (...args: unknown[]) => {
          if (writing) f.filter("eq", ...args);
          return q;
        },
        gt: (...args: unknown[]) => {
          f.filter("gt", ...args);
          return q;
        },
        is: (...args: unknown[]) => {
          f.filter("is", ...args);
          return q;
        },
        maybeSingle: async () => ({ data: writing && conflict ? null : row }),
      };
      return q;
    },
  } as unknown as Parameters<typeof changeInstagramSingle>[0];
  return { db, row, jpegSha };
}
describe("Instagram post edits", () => {
  it("keeps the reservation and image bytes when saving a different caption", async () => {
    const f = fixture();
    const { db, row, jpegSha } = await dbFor(f);
    const caption = "Legenda revisada";
    await changeInstagramSingle(
      db,
      "save",
      { id, fingerprint: row.fingerprint, caption },
      f.generateCover,
      f.generateCaption,
    );
    const next = await sha(encode(`${jpegSha}\n${caption}`));
    expect(f.update).toHaveBeenCalledExactlyOnceWith({
      caption,
      fingerprint: next,
      asset_path: `${article}/instagram-single/${next}.jpg`,
    });
    expect(f.filter).toHaveBeenCalledWith("eq", "due_at", f.dueAt);
    expect(f.filter).toHaveBeenCalledWith("is", "lease", null);
    expect(f.generateCover).not.toHaveBeenCalled();
    expect(f.generateCaption).not.toHaveBeenCalled();
  });
  it("does not call Lovable after a send attempt", async () => {
    const f = fixture();
    const { db, row } = await dbFor(f, { attempted: true });
    await expect(
      changeInstagramSingle(
        db,
        "cover",
        { id, fingerprint: row.fingerprint },
        f.generateCover,
        f.generateCaption,
      ),
    ).rejects.toThrow("instagram_edit_conflict");
    expect(f.generateCover).not.toHaveBeenCalled();
    expect(f.update).not.toHaveBeenCalled();
  });
  it("reports an edit conflict when the reservation changed before the update", async () => {
    const f = fixture();
    const { db, row } = await dbFor(f, { conflict: true });
    await expect(
      changeInstagramSingle(
        db,
        "save",
        {
          id,
          fingerprint: row.fingerprint,
          caption: `Legenda revisada\n\n${INSTAGRAM_CAPTION_END}`,
        },
        f.generateCover,
        f.generateCaption,
      ),
    ).rejects.toThrow("instagram_edit_conflict");
    expect(f.filter).toHaveBeenCalledWith("eq", "fingerprint", row.fingerprint);
    expect(f.filter).toHaveBeenCalledWith("eq", "state", "scheduled");
  });
  it.each(["", " ", "a".repeat(2201), "texto\0inválido"])(
    "rejects an invalid caption before storage or update",
    async (caption) => {
      const f = fixture();
      const { db, row } = await dbFor(f);
      await expect(
        changeInstagramSingle(
          db,
          "save",
          { id, fingerprint: row.fingerprint, caption },
          f.generateCover,
          f.generateCaption,
        ),
      ).rejects.toThrow("instagram_caption_invalid");
      expect(f.upload).not.toHaveBeenCalled();
      expect(f.update).not.toHaveBeenCalled();
    },
  );
  it("accepts exactly 2200 caption characters", async () => {
    const f = fixture();
    const { db, row } = await dbFor(f);
    await changeInstagramSingle(
      db,
      "save",
      { id, fingerprint: row.fingerprint, caption: "a".repeat(2200) },
      f.generateCover,
      f.generateCaption,
    );
    expect(f.update).toHaveBeenCalledWith(
      expect.objectContaining({ caption: "a".repeat(2200) }),
    );
  });
  it.each(["published", "publishing", "attention"])(
    "blocks editing state %s",
    async (state) => {
      const f = fixture();
      const { db, row } = await dbFor(f);
      row.state = state;
      await expect(
        changeInstagramSingle(
          db,
          "cover",
          { id, fingerprint: row.fingerprint },
          f.generateCover,
          f.generateCaption,
        ),
      ).rejects.toThrow("instagram_edit_conflict");
      expect(f.generateCover).not.toHaveBeenCalled();
    },
  );
  it("blocks editing within the two-minute margin", async () => {
    const f = fixture();
    const { db, row } = await dbFor(f);
    row.due_at = new Date(Date.now() + 120_000).toISOString();
    await expect(
      changeInstagramSingle(
        db,
        "cover",
        { id, fingerprint: row.fingerprint },
        f.generateCover,
        f.generateCaption,
      ),
    ).rejects.toThrow("instagram_edit_conflict");
    expect(f.generateCover).not.toHaveBeenCalled();
  });
  it("allows an unscheduled review caption edit", async () => {
    const f = fixture();
    const { db, row } = await dbFor(f);
    row.state = "review";
    await changeInstagramSingle(
      db,
      "save",
      { id, fingerprint: row.fingerprint, caption: "Revisada" },
      f.generateCover,
      f.generateCaption,
    );
    expect(f.filter).not.toHaveBeenCalledWith("eq", "due_at", f.dueAt);
    expect(f.update).toHaveBeenCalledOnce();
  });
  it("rejects malformed preview ID before downloading or updating", async () => {
    const f = fixture();
    const { db, row } = await dbFor(f);
    await expect(
      changeInstagramSingle(
        db,
        "save",
        { id, fingerprint: row.fingerprint, previewId: "../other" },
        f.generateCover,
        f.generateCaption,
      ),
    ).rejects.toThrow("instagram_edit_conflict");
    expect(f.upload).not.toHaveBeenCalled();
    expect(f.update).not.toHaveBeenCalled();
  });
  it("does not replay generation for invalid revision identity", async () => {
    const f = fixture();
    const { db } = await dbFor(f);
    await expect(
      changeInstagramSingle(
        db,
        "caption",
        { id, fingerprint: "invalid" },
        f.generateCover,
        f.generateCaption,
      ),
    ).rejects.toThrow("instagram_edit_conflict");
    expect(f.generateCaption).not.toHaveBeenCalled();
  });
});
