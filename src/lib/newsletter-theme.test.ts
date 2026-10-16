import { writeFileSync, mkdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderResendNewsletter } from "./newsletter";
import { newsletterDraftContentSchema } from "./newsletter-drafts";
import { previewTheme } from "./newsletter-theme";
import proof from "../../artifacts/newsletter-agent-refined-proof.json";
describe("newsletter theme", () => {
  it("preserves inline fallback and links while adding a dark palette", () => {
    const output = renderResendNewsletter(
      newsletterDraftContentSchema.parse(proof.content),
    );
    expect(output.html).toContain('name="color-scheme" content="light dark"');
    expect(output.html).toContain("@media (prefers-color-scheme: dark)");
    expect(output.html).toContain("color:#e4eee7!important");
    expect(output.html).toContain(
      '[style*="background:#e6f0e8"]{background:#173d2a!important;color:#d1f5df!important}',
    );
    expect(output.html).toContain("background:#ffffff");
    expect(output.html).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(output.html).toContain("utm_source=vitale_newsletter");
    expect(previewTheme(output.html, true)).toContain("@media all");
    expect(previewTheme(output.html, false)).toContain("@media not all");
    if (process.env.NEWSLETTER_THEME_QA_DIR) {
      mkdirSync(process.env.NEWSLETTER_THEME_QA_DIR, { recursive: true });
      for (const dark of [false, true])
        writeFileSync(
          `${process.env.NEWSLETTER_THEME_QA_DIR}/${dark ? "dark" : "light"}.html`,
          previewTheme(output.html, dark),
        );
      writeFileSync(
        `${process.env.NEWSLETTER_THEME_QA_DIR}/index.html`,
        `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>QA local da newsletter</title><style>body{font:16px Arial;background:#ddd;margin:20px}main{display:flex;gap:20px;align-items:start;flex-wrap:wrap}iframe{width:390px;height:1100px;border:1px solid #888}h1{font-size:22px}h2{font-size:18px}</style><h1>Prévia local · simulação mobile (390 px)</h1><p>Emulação de CSS no navegador, sem envio e sem simular cliente de email nativo.</p><main><section><h2>Claro</h2><iframe title="Claro" src="light.html"></iframe></section><section><h2>Escuro</h2><iframe title="Escuro" src="dark.html"></iframe></section></main></html>`,
      );
    }
  });
});
