import { afterEach, beforeEach, expect, it, vi } from "vitest";
import fixture from "../../artifacts/newsletter-agent-refined-proof.json";
import { newsletterTestDb } from "@/test/helpers/newsletter-db";
import { newsletterSchedule } from "./newsletter-schedule";
import { newsletterDraftAction } from "./newsletter-drafts.server";
import {
  editableNewsletter,
  newsletterDraftContentSchema,
} from "./newsletter-drafts";
import { newsletterSendAllowed } from "./newsletter";
import { approveNewsletterDraft } from "./newsletter-approval.server";

const validate = vi.hoisted(() => vi.fn());
vi.mock("./newsletter-sources.server", () => ({
  validateScheduledNewsletter: validate,
}));

const id = "00000000-0000-4000-8000-000000000001";
const day = "2026-11-11";
const input = { id, revision: 1 };
function database() {
  return newsletterTestDb({
    newsletter_drafts: [
      {
        ...input,
        edition_day: day,
        generation_mode: "fallback",
        fingerprint: "saved",
        content: fixture.content,
      },
    ],
    newsletter_settings: [{ singleton: true, enabled: true }],
  });
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${day}T05:00:00-03:00`));
  validate.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

it("approves the exact revision without enqueuing a send or changing the copy", async () => {
  const { db, tables, writes } = database();
  expect(
    await approveNewsletterDraft(db, id, "lease", {
      ...input,
      action: "draft_approve",
    }),
  ).toEqual({ approved: true, manualUntil: null });
  expect(tables.newsletter_drafts[0]).toMatchObject({
    revision: 1,
    approved_revision: 1,
    approved_by: id,
    generation_mode: "fallback",
    content: fixture.content,
  });
  expect(writes.map((write) => write.table)).toEqual(["newsletter_drafts"]);
  expect(validate).toHaveBeenCalledWith(expect.anything(), [], "human");
});

it("rejects stale previews, existing campaigns and unavailable offers", async () => {
  const { db, tables, writes } = database();
  const body = { ...input, action: "draft_approve" };
  tables.newsletter_drafts[0].revision = 2;
  await expect(approveNewsletterDraft(db, id, "lease", body)).rejects.toThrow(
    "newsletter_draft_conflict",
  );
  tables.newsletter_campaigns = [{ edition_day: day }];
  await expect(
    approveNewsletterDraft(db, id, "lease", { ...body, revision: 2 }),
  ).rejects.toThrow("newsletter_draft_frozen");
  tables.newsletter_campaigns = [];
  validate.mockRejectedValue(new Error("newsletter_offer_unavailable"));
  await expect(
    approveNewsletterDraft(db, id, "lease", { ...body, revision: 2 }),
  ).rejects.toThrow("newsletter_offer_unavailable");
  expect(writes).toHaveLength(0);
});

it("queues a single same-day send request with an expiry", async () => {
  const { db, tables, writes } = database();
  const body = { ...input, action: "draft_send_now" };
  await expect(approveNewsletterDraft(db, id, "lease", body)).rejects.toThrow(
    "newsletter_manual_send_unavailable",
  );
  vi.setSystemTime(new Date(`${day}T11:45:00-03:00`));
  tables.newsletter_settings[0].enabled = false;
  await expect(approveNewsletterDraft(db, id, "lease", body)).rejects.toThrow(
    "newsletter_manual_send_paused",
  );
  tables.newsletter_settings[0].enabled = true;
  const result = await approveNewsletterDraft(db, id, "lease", body);
  expect(result.manualUntil).toBe("2026-11-11T15:15:00.000Z");
  vi.setSystemTime(new Date(`${day}T11:50:00-03:00`));
  expect(await approveNewsletterDraft(db, id, "lease", body)).toEqual(result);
  expect(writes).toHaveLength(1);
  expect(newsletterSendAllowed(day, result.manualUntil, new Date())).toBe(true);
  expect(
    newsletterSendAllowed(
      day,
      result.manualUntil,
      new Date(result.manualUntil!),
    ),
  ).toBe(false);
  expect(
    newsletterSendAllowed("2026-11-10", result.manualUntil, new Date()),
  ).toBe(false);
});

it("suspends an automatically approved edition, preserves the hold on edits, and resumes only after validation", async () => {
  const { db, tables, writes } = database();
  const row = tables.newsletter_drafts[0];
  row.generation_mode = "agent";
  expect(newsletterSchedule(row, true, new Date())).toMatchObject({
    status: "scheduled",
    canHold: true,
    canApprove: false,
  });
  const edit = editableNewsletter(
    newsletterDraftContentSchema.parse(fixture.content),
  );
  edit.subject = "#1 — Uma nova abertura";
  const save = (revision: number) =>
    newsletterDraftAction(db, id, {
      id,
      revision,
      action: "draft_save",
      edit,
    });
  await expect(save(1)).rejects.toThrow("newsletter_draft_hold_required");
  expect(writes).toHaveLength(0);
  await expect(
    approveNewsletterDraft(db, id, "lease", {
      ...input,
      action: "draft_unschedule",
    }),
  ).resolves.toEqual({ held: true, revision: 2 });
  expect(validate).not.toHaveBeenCalled();
  expect(newsletterSchedule(row, true, new Date())).toMatchObject({
    status: "held",
    canApprove: false,
    canReschedule: true,
  });
  await save(2);
  expect(row).toMatchObject({ schedule_hold: true, revision: 3 });
  expect(row.content.subject).toBe(edit.subject);
  expect(row.fingerprint).not.toBe("saved");
  const resume = { id, revision: 3, action: "draft_reschedule" };
  await expect(
    approveNewsletterDraft(db, id, "lease", {
      ...resume,
      action: "draft_approve",
    }),
  ).rejects.toThrow("newsletter_draft_conflict");
  validate.mockRejectedValueOnce(new Error("newsletter_offer_unavailable"));
  await expect(approveNewsletterDraft(db, id, "lease", resume)).rejects.toThrow(
    "newsletter_offer_unavailable",
  );
  expect(row.schedule_hold).toBe(true);
  await approveNewsletterDraft(db, id, "lease", resume);
  expect(row).toMatchObject({ schedule_hold: false, approved_revision: 3 });
  expect(writes.every((w) => w.table === "newsletter_drafts")).toBe(true);
});

it("only offers approval for editorial review and stops allowing suspension at 06h20", async () => {
  const { db, tables } = database();
  const row = tables.newsletter_drafts[0];
  expect(newsletterSchedule(row, true, new Date())).toMatchObject({
    status: "review",
    canApprove: true,
    canHold: false,
  });
  row.generation_mode = "agent";
  expect(newsletterSchedule(row, false, new Date()).status).toBe("paused");
  vi.setSystemTime(new Date(`${day}T06:20:00-03:00`));
  expect(newsletterSchedule(row, true, new Date()).canHold).toBe(false);
  await expect(
    approveNewsletterDraft(db, id, "lease", {
      ...input,
      action: "draft_unschedule",
    }),
  ).rejects.toThrow("newsletter_rewrite_too_late");
  row.schedule_hold = true;
  vi.setSystemTime(new Date(`${day}T06:30:00-03:00`));
  expect(newsletterSchedule(row, true, new Date())).toMatchObject({
    status: "held",
    canReschedule: false,
    canSendNow: true,
  });
  await expect(
    approveNewsletterDraft(db, id, "lease", {
      ...input,
      action: "draft_reschedule",
    }),
  ).rejects.toThrow("newsletter_reschedule_window_open");
});
