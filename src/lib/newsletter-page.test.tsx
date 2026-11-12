import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("@/components/site/site-ui", async () => {
  const { NewsletterSignup } =
    await import("@/components/site/NewsletterSignup");
  return { SiteHeader: () => null, SiteFooter: ({ showNewsletter = true }: { showNewsletter?: boolean }) => showNewsletter ? <NewsletterSignup /> : null };
});
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  Link: ({ to, children, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
import { NewsletterPage, Route } from "@/routes/newsletter";
import { STATIC_SITEMAP_PATHS } from "./sitemap";

describe("newsletter public landing", () => {
  it("renders an accessible opt-in form and informative content in SSR", () => {
    const html = renderToStaticMarkup(<NewsletterPage />);
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(html.match(/<form[ >]/g)).toHaveLength(1);
    const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
    const formStart = main.indexOf("<form");
    expect(formStart).toBeGreaterThan(main.indexOf("</h1>"));
    expect(formStart).toBeLessThan(main.indexOf("Receba artigos, vídeos e destaques"));
    expect(main.indexOf("</form>")).toBeLessThan(main.indexOf('id="newsletter-benefits"'));
    expect(main).toContain('type="email"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('href="/privacidade"');
    expect(html).toContain("descadastro");
    expect(html).not.toContain("<select");
    expect(html).not.toContain("O que mais te interessa");
    expect(html).toContain("Receba artigos, vídeos e destaques");
  });
  it("has an indexable canonical and subject-specific social card", () => {
    const head = (Route as any).options.head();
    expect(head.links).toContainEqual({
      rel: "canonical",
      href: "https://vitalemobilidade.com/newsletter",
    });
    expect(head.meta).toContainEqual({
      property: "og:image",
      content: "https://vitalemobilidade.com/og/newsletter-1200x630.jpg",
    });
    expect(
      head.meta.find((m: any) => m.name === "robots").content,
    ).not.toContain("noindex");
    expect(JSON.parse(head.scripts[0].children)["@type"]).toBe("WebPage");
    expect(STATIC_SITEMAP_PATHS).toContain("/newsletter");
  });
});
