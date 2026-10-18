/* eslint-disable @typescript-eslint/no-explicit-any -- Stateful database test doubles exercise persistence, filters and CAS. */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import proof from "../../artifacts/newsletter-agent-refined-proof.json";
import { newsletterTestDb } from "@/test/helpers/newsletter-db";
const ai = vi.hoisted(() => ({ write: vi.fn(), validate: vi.fn() }));
vi.mock("./newsletter-sources.server", () => ({
  automaticNewsletter: ai.write,
  validateScheduledNewsletter: ai.validate,
}));
import {
  assertRewriteTime,
  newsletterRewriteAction,
  processNewsletterRewrite,
} from "./newsletter-rewrites.server";
const id = "00000000-0000-4000-8000-000000000001",
  jobId = "00000000-0000-4000-8000-000000000010";
const content = { ...proof.content, editionNumber: 4 };
function fixture() {
  return newsletterTestDb({
    newsletter_drafts: [
      {
        id,
        revision: 2,
        origin: "agent",
        edition_day: "2026-10-19",
        content,
        fingerprint: "old",
      },
    ],
    newsletter_campaigns: [],
  });
}
const request = {
  action: "draft_prompt",
  id,
  revision: 2,
  prompt: "Retire EVS e destaque temas de bike.",
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-18T13:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});
it("queues a durable prompt without generating, sending, or changing the current edition", async () => {
  const f = fixture();
  await newsletterRewriteAction(f.db, "admin", request);
  expect(f.tables.newsletter_rewrites[0]).toMatchObject({
    status: "queued",
    base_revision: 2,
    prompt: request.prompt,
  });
  expect(f.tables.newsletter_drafts[0].fingerprint).toBe("old");
  expect(ai.write).not.toHaveBeenCalled();
  await expect(newsletterRewriteAction(f.db, "admin", request)).rejects.toThrow(
    "newsletter_rewrite_pending",
  );
});
it("reviews a proposal in background, previews it and applies only by explicit action", async () => {
  const f = fixture();
  await newsletterRewriteAction(f.db, "admin", request);
  const approved = { ...content, subject: "#4 — Bikes nas ruas" };
  ai.write.mockResolvedValue({ content: approved, fingerprint: "new" });
  expect(await processNewsletterRewrite(f.db, "tok")).toBe(true);
  expect(f.tables.newsletter_rewrites[0].status).toBe("ready");
  expect(f.tables.newsletter_drafts[0].fingerprint).toBe("old");
  expect(ai.write.mock.calls[0][6]).toMatchObject({ prompt: request.prompt });
  const preview = await newsletterRewriteAction(f.db, "admin", {
    action: "draft_prompt_preview",
    jobId,
  });
  expect(preview).toHaveProperty("html");
  await newsletterRewriteAction(f.db, "admin", {
    action: "draft_prompt_apply",
    jobId,
  });
  expect(f.tables.newsletter_drafts[0]).toMatchObject({
    fingerprint: "new",
    revision: 3,
    edited_by: "admin",
  });
  expect(f.tables.newsletter_rewrites[0].status).toBe("applied");
  expect(f.tables.newsletter_campaigns).toHaveLength(0);
});
it("persists feedback and retries after a restart with a strict paid-call budget", async () => {
  const f = fixture();
  await newsletterRewriteAction(f.db, "admin", request);
  ai.write.mockImplementation(async (...args: any[]) => {
    args[4]({
      stage: "review",
      issues: ["opening: abandone a fórmula anterior"],
    });
    throw new Error("newsletter_writer_review_failed");
  });
  await processNewsletterRewrite(f.db, "tok");
  expect(f.tables.newsletter_rewrites[0]).toMatchObject({
    status: "queued",
    attempts: 1,
    feedback: ["opening: abandone a fórmula anterior"],
  });
  await processNewsletterRewrite(f.db, "tok");
  expect(ai.write).toHaveBeenCalledTimes(1);
  vi.setSystemTime(new Date("2026-10-18T13:11:00Z"));
  await processNewsletterRewrite(f.db, "tok");
  expect(ai.write.mock.calls[1][6].feedback).toEqual([
    "opening: abandone a fórmula anterior",
  ]);
  expect(f.tables.newsletter_rewrites[0].status).toBe("failed");
  expect(f.tables.newsletter_drafts[0].fingerprint).toBe("old");
  await processNewsletterRewrite(f.db, "tok");
  expect(ai.write).toHaveBeenCalledTimes(2);
});
it("does not overwrite concurrent human edits or frozen campaigns", async () => {
  const f = fixture();
  await newsletterRewriteAction(f.db, "admin", request);
  ai.write.mockResolvedValue({ content, fingerprint: "new" });
  await processNewsletterRewrite(f.db, "tok");
  f.tables.newsletter_drafts[0].revision = 3;
  await expect(
    newsletterRewriteAction(f.db, "admin", {
      action: "draft_prompt_apply",
      jobId,
    }),
  ).rejects.toThrow("newsletter_draft_conflict");
  f.tables.newsletter_drafts[0].revision = 2;
  f.tables.newsletter_campaigns.push({
    id: "frozen",
    edition_day: "2026-10-19",
  });
  await expect(
    newsletterRewriteAction(f.db, "admin", {
      action: "draft_prompt_apply",
      jobId,
    }),
  ).rejects.toThrow("newsletter_draft_frozen");
  expect(f.tables.newsletter_drafts[0].fingerprint).toBe("old");
});
it("recovers a crash without resetting the attempt count; rejects oversized and late prompts", async () => {
  const f = fixture();
  await newsletterRewriteAction(f.db, "admin", request);
  f.tables.newsletter_rewrites[0].status = "running";
  f.tables.newsletter_rewrites[0].attempts = 2;
  await processNewsletterRewrite(f.db, "tok");
  expect(ai.write).not.toHaveBeenCalled();
  expect(f.tables.newsletter_rewrites[0].status).toBe("failed");
  await expect(
    newsletterRewriteAction(f.db, "admin", {
      ...request,
      prompt: "x".repeat(2001),
    }),
  ).rejects.toThrow();
  expect(() =>
    assertRewriteTime("2026-10-19", new Date("2026-10-19T09:19:59Z")),
  ).not.toThrow();
  expect(() =>
    assertRewriteTime("2026-10-19", new Date("2026-10-19T09:20:00Z")),
  ).toThrow("newsletter_rewrite_too_late");
});
