import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { VideoRelatedArticle } from "@/components/admin/VideoRelatedArticle";
import type { ArticleRow } from "@/lib/admin-api";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
const article = { id: "article-1", title: "Teste da VL20", status: "published", slug: "teste-vl20" } as ArticleRow;
const render = (value?: ArticleRow) => renderToStaticMarkup(<VideoRelatedArticle article={value} />);
describe("artigo relacionado ao vídeo", () => {
  it("mostra título e URL pública absoluta copiável do artigo publicado", () => {
    const html = render(article);
    expect(html).toContain("Teste da VL20");
    expect(html).toContain('value="https://vitalemobilidade.com/conteudos/teste-vl20"');
    expect(html).toContain('readOnly=""');
    expect(html).toContain("Copiar link");
    expect(html).toContain("Abrir artigo");
    expect(html).toContain('type="button"');
  });
  it.each(["draft", "archived"] as const)("não oferece URL pública para %s", (status) => {
    const html = render({ ...article, status });
    expect(html).toContain("Editar artigo");
    expect(html).not.toContain("Copiar link");
    expect(html).not.toContain("https://vitalemobilidade.com");
  });
  it("explica ausência de artigo e endereço", () => {
    expect(render()).toContain("ainda não tem artigo relacionado");
    expect(render({ ...article, slug: "" })).not.toContain("Copiar link");
  });
});
