import { describe, expect, it } from "vitest";
import {
  renderNewsletter,
  newsletterUtmUrl,
  renderResendNewsletter,
  segmentNewsletterRecipients,
} from "./newsletter";
const edition = {
  subject: "Vitale <destaques>",
  intro: "<img src=x onerror=alert(1)>",
  articles: [
    {
      title: "Teste & review",
      url: "https://vitalemobilidade.com/conteudos/teste",
    },
  ],
  bike: { title: "V9", url: "https://vitalemobilidade.com/radar/v9_max" },
  videos: [{ title: "Vídeo", url: "https://www.youtube.com/watch?v=abc" }],
  unsubscribeUrl: "https://example.com/unsubscribe/token",
};
describe("newsletter export", () => {
  it("escapes editorial HTML and preserves links", () => {
    const result = renderNewsletter(edition);
    expect(result.html).toContain("&lt;img");
    expect(result.html).not.toContain("<img");
    expect(result.text).toContain(edition.bike.url);
    expect(result.html).toContain(edition.unsubscribeUrl);
  });
  it("requires unsubscribe and disallows dangerous or unrelated content URLs", () => {
    expect(() =>
      renderNewsletter({ ...edition, unsubscribeUrl: "" }),
    ).toThrow();
    expect(() =>
      renderNewsletter({
        ...edition,
        bike: { title: "x", url: "javascript:alert(1)" },
      }),
    ).toThrow();
    expect(() =>
      renderNewsletter({
        ...edition,
        bike: { title: "x", url: "https://evil.example" },
      }),
    ).toThrow();
    expect(() =>
      renderNewsletter({ ...edition, subject: "Subject\r\nBcc: injected" }),
    ).toThrow();
  });
  it("does not silently export oversized or empty sections", () => {
    expect(() => renderNewsletter({ ...edition, videos: [] })).toThrow();
    expect(() =>
      renderNewsletter({
        ...edition,
        articles: Array(4).fill(edition.articles[0]),
      }),
    ).toThrow();
  });
});
describe("newsletter eligibility", () => {
  it("honors opt-in, suppression, minimum interval, invalid timestamps and deduplication", () => {
    const base = {
      consent: true,
      suppressed: false,
      lastSentAt: null,
      interest: null,
    };
    const result = segmentNewsletterRecipients(
      [
        { ...base, id: "1", interest: "radar" },
        { ...base, id: "1", interest: "content" },
        { ...base, id: "2", consent: false },
        { ...base, id: "3", suppressed: true },
        { ...base, id: "4", lastSentAt: "2026-10-06T10:00:00Z" },
        { ...base, id: "5", lastSentAt: "invalid" },
        { ...base, id: "6", lastSentAt: "2026-10-04T10:00:00Z" },
      ],
      new Date("2026-10-07T10:00:00Z"),
    );
    expect(result).toEqual({ radar: ["1"], content: [], general: ["6"] });
  });
});

it("exports Resend personalization without an invented unsubscribe endpoint", () => {
  const output = renderResendNewsletter(edition);
  expect(output.html).toContain("{{{contact.first_name|amigo(a)}}}");
  expect(output.html).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
  expect(output.html).not.toContain("__newsletter_provider_unsubscribe__");
});

import { newsletterWindow } from "./newsletter";
it("uses São Paulo weekdays and sending window, independent of host timezone", () => {
  expect(newsletterWindow(new Date("2026-10-08T13:00:00Z"))).toEqual({
    day: "2026-10-08",
    weekday: 4,
    due: true,
  });
  expect(newsletterWindow(new Date("2026-10-12T13:00:00Z")).due).toBe(true);
  expect(newsletterWindow(new Date("2026-10-08T12:59:59Z")).due).toBe(false);
  expect(newsletterWindow(new Date("2026-10-08T15:00:00Z")).due).toBe(false);
  expect(newsletterWindow(new Date("2026-10-07T13:00:00Z")).due).toBe(false);
});

it("does not send a third weekly edition on Friday", () => {
  expect(newsletterWindow(new Date("2026-10-09T13:00:00Z")).due).toBe(false);
});

import { numberNewsletterSubject } from "./newsletter";
it("numbers the edition once without inheriting an old prefix", () => {
  expect(numberNewsletterSubject("Ladeira acima", 1)).toBe(
    "#1 — Ladeira acima",
  );
  expect(numberNewsletterSubject("#1 — Outra pauta", 2)).toBe(
    "#2 — Outra pauta",
  );
  expect(() => numberNewsletterSubject("Pauta", 0)).toThrow("number_invalid");
});

it("tracks every editorial destination without changing video identity or unsubscribe", () => {
  const u = new URL(
    newsletterUtmUrl(
      "https://www.youtube.com/watch?v=abc&t=25#part",
      "giro_1",
      "video_1",
      "radar",
    ),
  );
  expect(u.searchParams.get("v")).toBe("abc");
  expect(u.searchParams.get("t")).toBe("25");
  expect(u.hash).toBe("#part");
  expect(u.searchParams.get("utm_content")).toBe("radar_video_1");
  const out = renderResendNewsletter({
    ...edition,
    headline: "Um giro divertido pela cidade",
    editionNumber: 1,
  });
  const hrefs = [...out.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  expect(
    hrefs.filter((v) => !v.includes("RESEND_UNSUBSCRIBE")),
  ).not.toHaveLength(0);
  expect(
    hrefs.every(
      (v) =>
        v.includes("RESEND_UNSUBSCRIBE") ||
        v.includes("utm_source=vitale_newsletter"),
    ),
  ).toBe(true);
  expect(out.text).toContain("utm_campaign=giro_1");
});
