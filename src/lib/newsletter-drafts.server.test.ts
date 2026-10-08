import { newsletterDraftContentSchema } from "./newsletter-drafts";
import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { newsletterDraftAction } from "./newsletter-drafts.server";
import { editableNewsletter } from "./newsletter-drafts";
import proof from "../../artifacts/newsletter-agent-refined-proof.json";
const content = newsletterDraftContentSchema.parse(proof.content);
const draft = {
  id: "00000000-0000-4000-8000-000000000001",
  revision: 2,
  content,
};
function query(data: unknown, error: unknown = null) {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    then: Promise.resolve({ data, error }).then.bind(
      Promise.resolve({ data, error }),
    ),
  };
  for (const key of [
    "select",
    "eq",
    "order",
    "limit",
    "update",
    "insert",
  ] as const)
    q[key] = vi.fn(() => q);
  q.single = vi.fn(async () => ({ data, error }));
  q.maybeSingle = q.single;
  q.then = Promise.resolve({ data, error }).then.bind(
    Promise.resolve({ data, error }),
  );
  return q;
}
describe("private newsletter draft storage", () => {
  it("rejects stale revisions before writing", async () => {
    const read = query(draft);
    const from = vi.fn(() => read);
    await expect(
      newsletterDraftAction({ from } as unknown as SupabaseClient, "admin", {
        action: "draft_save",
        id: draft.id,
        revision: 1,
        edit: editableNewsletter(content),
      }),
    ).rejects.toThrow("newsletter_draft_conflict");
    expect(from).toHaveBeenCalledTimes(1);
    expect(read.update).not.toHaveBeenCalled();
  });
  it("saves with compare-and-swap and no campaigns or AI", async () => {
    const read = query(draft),
      write = query({ ...draft, revision: 3 });
    const from = vi.fn().mockReturnValueOnce(read).mockReturnValueOnce(write);
    await newsletterDraftAction(
      { from } as unknown as SupabaseClient,
      "admin",
      {
        action: "draft_save",
        id: draft.id,
        revision: 2,
        edit: editableNewsletter(content),
      },
    );
    expect(write.eq).toHaveBeenCalledWith("revision", 2);
    expect(write.update).toHaveBeenCalledWith(
      expect.objectContaining({ revision: 3, edited_by: "admin" }),
    );
    expect(from.mock.calls.every((c) => c[0] === "newsletter_drafts")).toBe(
      true,
    );
  });
  it("previews unsaved edits without writing", async () => {
    const read = query(draft);
    const from = vi.fn(() => read);
    const edit = editableNewsletter(content);
    edit.subject = "#1 — Boas ideias para o próximo pedal";
    const result = await newsletterDraftAction(
      { from } as unknown as SupabaseClient,
      "admin",
      { action: "draft_render", id: draft.id, revision: 2, edit },
    );
    expect(result).toHaveProperty("html");
    expect(from).toHaveBeenCalledTimes(1);
    expect(read.update).not.toHaveBeenCalled();
  });
  it("does not duplicate the imported test", async () => {
    const from = vi.fn(() => query([{ id: draft.id }]));
    await expect(
      newsletterDraftAction({ from } as unknown as SupabaseClient, "admin", {
        action: "draft_import_test",
      }),
    ).rejects.toThrow("newsletter_test_already_imported");
    expect(from).toHaveBeenCalledTimes(1);
  });
});
