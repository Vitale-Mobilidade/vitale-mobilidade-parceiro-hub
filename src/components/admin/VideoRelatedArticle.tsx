import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/seo";
import type { ArticleRow } from "@/lib/admin-api";

export function VideoRelatedArticle({ article }: { article?: ArticleRow }) {
  const [feedback, setFeedback] = useState("");
  if (!article) return <p className="text-sm text-muted-foreground">Este vídeo ainda não tem artigo relacionado.</p>;
  const url = article.status === "published" && article.slug
    ? `${SITE_URL}/conteudos/${encodeURIComponent(article.slug)}`
    : null;
  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setFeedback("Link copiado!");
    } catch {
      setFeedback("Não foi possível copiar automaticamente. Selecione o link abaixo e copie manualmente.");
    }
  }
  return (
    <section aria-label="Artigo relacionado" className="space-y-3 rounded-lg border border-line bg-surface p-3">
      <h3 className="text-sm font-semibold">Artigo relacionado</h3>
      <p className="break-words text-sm">{article.title}</p>
      <p className="text-xs text-muted-foreground">
        {article.status === "published" ? "Publicado" : article.status === "archived" ? "Arquivado" : "Rascunho"}
      </p>
      <Link to="/admin/conteudos/$id" params={{ id: article.id }} className="inline-block text-sm text-emerald-800 underline">
        Editar artigo
      </Link>
      {url ? <>
        <label className="block text-sm font-medium">
          Link do artigo
          <input readOnly value={url} onFocus={(event) => event.currentTarget.select()}
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm" />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-800 underline">Abrir artigo</a>
          <button type="button" onClick={copy} className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold hover:bg-emerald-50">Copiar link</button>
        </div>
      </> : <p className="text-xs text-muted-foreground">O link público estará disponível quando o artigo estiver publicado com endereço definido.</p>}
      <p role="status" aria-live="polite" className="text-xs">{feedback}</p>
    </section>
  );
}
