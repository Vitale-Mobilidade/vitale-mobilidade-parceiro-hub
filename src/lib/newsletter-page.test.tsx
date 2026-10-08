import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("@/components/site/site-ui", () => ({ SiteHeader: () => null, SiteFooter: () => null }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => ({ options }), Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a> }));
import { NewsletterPage, Route } from "@/routes/newsletter";
import { STATIC_SITEMAP_PATHS } from "./sitemap";

describe("newsletter public landing", () => {
  it("renders an accessible opt-in form and informative content in SSR", () => {
    const html = renderToStaticMarkup(<NewsletterPage />);
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(html.match(/<form[ >]/g)).toHaveLength(1);
    expect(html).toContain('type="email"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('href="/privacidade"');
    expect(html).toContain("descadastro");
  });
  it("has an indexable canonical and subject-specific social card", () => {
    const head = (Route as any).options.head();
    expect(head.links).toContainEqual({ rel: "canonical", href: "https://vitalemobilidade.com/newsletter" });
    expect(head.meta).toContainEqual({ property: "og:image", content: "https://vitalemobilidade.com/og/newsletter-1200x630.jpg" });
    expect(head.meta.find((m: any) => m.name === "robots").content).not.toContain("noindex");
    expect(JSON.parse(head.scripts[0].children)["@type"]).toBe("WebPage");
    expect(STATIC_SITEMAP_PATHS).toContain("/newsletter");
  });
});
