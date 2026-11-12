import type { NewsletterDraft } from "./newsletter-drafts";
import { newsletterWindow } from "./newsletter";

type Draft = Pick<
  NewsletterDraft,
  | "edition_day"
  | "fingerprint"
  | "generation_mode"
  | "approved_revision"
  | "revision"
  | "manual_send_until"
  | "schedule_hold"
>;

export function newsletterDraftApproved(draft: Draft) {
  return (
    !!draft.fingerprint &&
    (draft.approved_revision === draft.revision ||
      draft.generation_mode === "agent")
  );
}

export function newsletterDraftNeedsHold(draft: Draft) {
  return (
    !!draft.edition_day &&
    !draft.schedule_hold &&
    newsletterDraftApproved(draft)
  );
}

export function newsletterSchedule(draft: Draft, enabled: boolean, now: Date) {
  const day = draft.edition_day;
  const start = day ? Date.parse(`${day}T06:30:00-03:00`) : NaN;
  const time = now.getTime();
  const weekday = day ? new Date(`${day}T12:00:00Z`).getUTCDay() : -1;
  const valid = !!draft.fingerprint && [1, 3, 5].includes(weekday);
  const closed = time >= start + 120 * 60_000;
  const approved = newsletterDraftApproved(draft);
  const requested =
    enabled &&
    !draft.schedule_hold &&
    draft.approved_revision === draft.revision &&
    Date.parse(draft.manual_send_until ?? "") > time;
  const canEdit = time < start - 10 * 60_000;
  const isToday = day === newsletterWindow(now).day;
  const status = !valid
    ? "invalid"
    : draft.schedule_hold
      ? "held"
      : requested
        ? "requested"
        : closed
          ? "closed"
          : !approved
            ? "review"
            : !enabled
              ? "paused"
              : time >= start
                ? "in_window"
                : "scheduled";
  return {
    status,
    canHold: valid && canEdit && newsletterDraftNeedsHold(draft),
    canEdit: valid && canEdit && !newsletterDraftNeedsHold(draft),
    canApprove: status === "review",
    canReschedule: valid && status === "held" && time < start,
    canSendNow:
      valid &&
      enabled &&
      !requested &&
      isToday &&
      time >= start &&
      (status === "closed" || status === "held" || status === "review"),
    approved: approved && !draft.schedule_hold,
  };
}
