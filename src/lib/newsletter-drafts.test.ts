import { newsletterDraftContentSchema } from "./newsletter-drafts";
import { describe, it, expect } from "vitest";
import { applyNewsletterEdit, editableNewsletter } from "./newsletter-drafts";
import { renderResendNewsletter } from "./newsletter";
import proof from "../../artifacts/newsletter-agent-refined-proof.json";
const content = newsletterDraftContentSchema.parse(proof.content);
describe("newsletter text editing", () => {
  it("edits prose without changing sources, images, drops or edition number", () => {
    const edit = editableNewsletter(content);
    edit.subject = "#1 — Boas ideias para o próximo pedal";
    edit.articles[0].title = "Um banco para novas histórias";
    const result = applyNewsletterEdit(content, edit);
    expect(result.subject).toBe(edit.subject);
    expect(result.articles[0].title).toBe(edit.articles[0].title);
    expect(result.articles.map((x) => [x.url, x.image])).toEqual(
      content.articles.map((x) => [x.url, x.image]),
    );
    expect(result.drops).toEqual(content.drops);
    expect(result.editionNumber).toBe(content.editionNumber);
  });
  it("rejects injected link or price changes in copy", () => {
    const edit = editableNewsletter(content);
    expect(() =>
      applyNewsletterEdit(content, {
        ...edit,
        bike: { ...edit.bike, url: "https://example.com" },
      }),
    ).toThrow();
    expect(() =>
      applyNewsletterEdit(content, { ...edit, drops: [] }),
    ).toThrow();
  });
  it("rejects section removal and header injection", () => {
    const edit = editableNewsletter(content);
    expect(() =>
      applyNewsletterEdit(content, {
        ...edit,
        articles: edit.articles.slice(1),
      }),
    ).toThrow("newsletter_edit_structure_changed");
    expect(() =>
      applyNewsletterEdit(content, {
        ...edit,
        subject: "hello\nBcc: everybody",
      }),
    ).toThrow();
  });
  it("escapes human markup and preserves UTM attribution", () => {
    const edit = editableNewsletter(content);
    edit.headline = "<script>alert(1)</script> boas ideias";
    const html = renderResendNewsletter(
      applyNewsletterEdit(content, edit),
    ).html;
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("utm_source=vitale_newsletter");
  });
});
