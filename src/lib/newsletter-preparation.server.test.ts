/* eslint-disable @typescript-eslint/no-explicit-any -- Stateful database test doubles exercise persistence, filters and CAS. */
import { afterEach, expect, it, vi } from "vitest";
import proof from "../../artifacts/newsletter-agent-refined-proof.json";
import { newsletterTestDb } from "@/test/helpers/newsletter-db";
const writer = vi.hoisted(() => vi.fn());
vi.mock("./newsletter-sources.server", () => ({ automaticNewsletter: writer }));
import { prepareNewsletterDraft } from "./newsletter-preparation.server";
afterEach(() => vi.resetAllMocks());
const now = new Date("2026-10-18T13:00:00Z"),
  day = "2026-10-19";
const simple = { content: proof.content, fingerprint: "safe" },
  agent = {
    content: { ...proof.content, subject: "#4 — Nova edição aprovada" },
    fingerprint: "agent",
  };
const run = (db: any, time = now, window = false) =>
  prepareNewsletterDraft(db, day, 1, "tok", [], 4, window, time);
it("persists a safe edition BEFORE the writer, and keeps it when review rejects", async () => {
  const f = newsletterTestDb();
  writer.mockImplementation(async (...args: any[]) => {
    if (args[5] === "fallback") return simple;
    expect(f.tables.newsletter_drafts[0].fingerprint).toBe("safe");
    args[4]({
      stage: "review",
      attempt: 1,
      approved: false,
      issues: ["opening: fórmula repetida"],
    });
    throw new Error("newsletter_writer_review_failed");
  });
  expect(await run(f.db)).toMatchObject({
    ok: false,
    fallback: true,
    preparationRetry: true,
  });
  expect(f.tables.newsletter_drafts[0].generation_mode).toBe("fallback");
  expect(f.tables.newsletter_preparations[0]).toMatchObject({
    attempts: 1,
    feedback: ["opening: fórmula repetida"],
    next_attempt_at: "2026-10-18T13:30:00.000Z",
  });
  expect(f.writes.some((w) => w.table === "newsletter_settings")).toBe(false);
});
it("resumes with persisted reviewer feedback and never pays more than twice across restarts", async () => {
  const f = newsletterTestDb();
  writer.mockImplementation(async (...a: any[]) => {
    if (a[5] === "fallback") return simple;
    throw new Error("newsletter_writer_review_failed");
  });
  await run(f.db);
  expect(writer).toHaveBeenCalledTimes(2);
  await run(f.db, new Date("2026-10-18T13:15:00Z"));
  expect(writer).toHaveBeenCalledTimes(2);
  await run(f.db, new Date("2026-10-18T13:31:00Z"));
  expect(writer).toHaveBeenCalledTimes(3);
  await run(f.db, new Date("2026-10-18T14:31:00Z"));
  expect(writer).toHaveBeenCalledTimes(3);
  expect(f.tables.newsletter_drafts[0].fingerprint).toBe("safe");
});
it("upgrades a safe fallback after review approval with a new revision", async () => {
  const f = newsletterTestDb();
  writer.mockImplementation(async (...a: any[]) =>
    a[5] === "fallback" ? simple : agent,
  );
  expect(await run(f.db)).toEqual({
    ok: true,
    draftPrepared: true,
    fallback: false,
  });
  expect(f.tables.newsletter_drafts[0]).toMatchObject({
    generation_mode: "agent",
    fingerprint: "agent",
    revision: 2,
  });
});
it("never pays in the sending window and never overwrites a human edit", async () => {
  const f = newsletterTestDb();
  writer.mockResolvedValue(simple);
  await run(f.db, now, true);
  expect(writer).toHaveBeenCalledTimes(1);
  expect(writer.mock.calls[0][5]).toBe("fallback");
  f.tables.newsletter_drafts[0].edited_by = "admin";
  writer.mockClear();
  await run(f.db);
  expect(writer).not.toHaveBeenCalled();
});
it("keeps retry state after lease loss without losing the already saved safe edition", async () => {
  const f = newsletterTestDb();
  let renew = 0;
  f.db.rpc = async () => ({ data: ++renew === 1, error: null });
  writer.mockImplementation(async (...a: any[]) =>
    a[5] === "fallback" ? simple : agent,
  );
  await expect(run(f.db)).rejects.toThrow("newsletter_lease_expired");
  expect(f.tables.newsletter_drafts[0].fingerprint).toBe("safe");
  expect(f.tables.newsletter_preparations[0].attempts).toBe(1);
});
it("source outages retry without any model and never create fake content", async () => {
  const f = newsletterTestDb({
    newsletter_preparations: [
      { edition_day: day, attempts: 3, next_attempt_at: null },
    ],
  });
  writer.mockRejectedValue(new Error("newsletter_sources_unavailable"));
  expect(await run(f.db)).toMatchObject({ ok: false, preparationRetry: true });
  expect(f.tables.newsletter_drafts).toHaveLength(0);
  expect(writer.mock.calls[0][5]).toBe("fallback");
});

it("does not let an earlier cooldown block deterministic recovery at the end of the sending window", async () => {
  const f = newsletterTestDb({
    newsletter_preparations: [
      {
        edition_day: day,
        attempts: 3,
        next_attempt_at: "2026-10-19T11:55:00Z",
      },
    ],
  });
  writer.mockResolvedValue(simple);
  expect(await run(f.db, new Date("2026-10-19T11:25:00Z"), true)).toMatchObject(
    { ok: false, fallback: true },
  );
  expect(writer).toHaveBeenCalledTimes(1);
  expect(writer.mock.calls[0][5]).toBe("fallback");
});
