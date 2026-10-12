import { describe, expect, it } from "vitest";
import { newsletterPopupAllowed, NEWSLETTER_COOLDOWN } from "./newsletter-exit";
import { newsletterPreparation } from "./newsletter-preparation";
describe("newsletter exit and preparation policy", () => {
  it("excludes quiz including results and admin, allows public pages", () => {
    for (const p of [
      "/quiz",
      "/quiz/resultado",
      "/admin/newsletter",
      "/api/public/newsletter-worker",
    ])
      expect(newsletterPopupAllowed(p, null, null)).toBe(false);
    for (const p of [
      "/",
      "/radar/bike",
      "/newsletter",
      "/conteudos/artigo",
      "/ferramentas",
    ])
      expect(newsletterPopupAllowed(p, null, null)).toBe(true);
  });
  it("waits the full 72 hours and suppresses confirmed subscriptions", () => {
    const time = 100000;
    expect(
      newsletterPopupAllowed(
        "/",
        String(time),
        null,
        time + NEWSLETTER_COOLDOWN - 1,
      ),
    ).toBe(false);
    expect(
      newsletterPopupAllowed(
        "/",
        String(time),
        null,
        time + NEWSLETTER_COOLDOWN,
      ),
    ).toBe(true);
    expect(newsletterPopupAllowed("/", null, "1")).toBe(false);
  });
  it("uses Sao Paulo dates for D-1 and permits catch-up on Sunday/Wednesday", () => {
    expect(newsletterPreparation(new Date("2026-10-11T09:29:00Z")).due).toBe(
      false,
    );
    expect(newsletterPreparation(new Date("2026-10-11T09:30:00Z"))).toEqual({
      day: "2026-10-12",
      weekday: 1,
      due: true,
    });
    expect(newsletterPreparation(new Date("2026-10-15T02:59:00Z"))).toEqual({
      day: "2026-10-15",
      weekday: 4,
      due: true,
    });
    expect(newsletterPreparation(new Date("2026-10-12T09:30:00Z")).due).toBe(
      true,
    );
  });
});
