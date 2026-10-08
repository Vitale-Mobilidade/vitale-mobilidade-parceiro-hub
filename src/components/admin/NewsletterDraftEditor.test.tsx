import { writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import proof from "../../../artifacts/newsletter-agent-refined-proof.json";
import {
  editableNewsletter,
  newsletterDraftContentSchema,
} from "@/lib/newsletter-drafts";
import { NewsletterDraftEditor } from "./NewsletterDraftEditor";
const content = newsletterDraftContentSchema.parse(proof.content);
const draft = {
  id: "00000000-0000-4000-8000-000000000001",
  revision: 1,
  origin: "agent",
  updated_at: "2026-10-08T12:00:00Z",
  content,
};
let nullStates = 0;
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useState: (initial: unknown) => [
      initial === null
        ? nullStates++ === 0
          ? draft
          : editableNewsletter(content)
        : initial,
      vi.fn(),
    ],
  };
});
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: { drafts: [draft] } }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@/lib/newsletter-api", () => ({ newsletterCall: vi.fn() }));
describe("newsletter editor form", () => {
  it("shows saved copy as editable fields, preserves the safe preview and separates saving from sending", () => {
    nullStates = 0;
    const html = renderToStaticMarkup(<NewsletterDraftEditor />);
    if (process.env.NEWSLETTER_QA_PATH)
      writeFileSync(
        process.env.NEWSLETTER_QA_PATH,
        `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Prévia local — Editor da newsletter</title><style>body{font:16px Arial;background:#f2f7f5;color:#18382a;margin:32px auto;max-width:1000px}section{background:white;padding:28px;border-radius:14px}label{display:block;margin:16px 0}input,textarea{box-sizing:border-box;display:block;width:100%;padding:12px;margin-top:8px;border:1px solid #ccd9d1;border-radius:8px;font:inherit}button{padding:12px 18px;background:#fff;border:1px solid #ccd9d1;border-radius:8px;color:#18382a;margin:8px 12px 8px 0;cursor:pointer}fieldset{border:1px solid #dbe5df;border-radius:10px;margin:18px 0;padding:18px}legend{padding:0 8px}ul{padding:0;list-style:none}li button{width:100%;text-align:left}h2{font-size:24px}p{line-height:1.5;color:#587064}</style><p>Prévia local do editor; botões demonstrativos. Ainda não publicado.</p>${html}</html>`,
      );
    expect(html).toContain("Assunto do e-mail");
    expect(html).toContain(content.subject);
    expect(html).toContain("Título dentro da newsletter");
    expect(html).toContain("Salvar ajustes");
    expect(html).toContain("Visualizar");
    expect(html).toContain("Os ajustes acima são edição humana");
    expect(html).not.toContain("Enviar campanha");
    expect((html.match(/<fieldset/g) ?? []).length).toBe(7);
  });
});
