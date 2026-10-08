import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { newsletterCall } from "@/lib/newsletter-api";
import {
  editableNewsletter,
  type NewsletterDraft,
  type NewsletterEdit,
} from "@/lib/newsletter-drafts";
const field = "mt-1 w-full rounded-lg border border-line bg-white p-3";
const button =
  "rounded-lg border border-line px-4 py-2 font-medium disabled:opacity-50";
export function NewsletterDraftEditor() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<NewsletterDraft | null>(null),
    [edit, setEdit] = useState<NewsletterEdit | null>(null);
  const [html, setHtml] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const drafts = useQuery({
    queryKey: ["admin", "newsletter", "drafts"],
    queryFn: () => newsletterCall<{ drafts: NewsletterDraft[] }>("draft_list"),
    staleTime: 15000,
  });
  function open(d: NewsletterDraft) {
    setDraft(d);
    setEdit(editableNewsletter(d.content));
    setHtml("");
    setNotice("");
    setError("");
  }
  async function run(action: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await newsletterCall<{
        draft?: NewsletterDraft;
        html?: string;
      }>(
        action,
        action === "draft_import_test"
          ? {}
          : { id: draft?.id, revision: draft?.revision, edit },
      );
      if (r.draft) {
        setDraft(r.draft);
        setEdit(editableNewsletter(r.draft.content));
        await qc.invalidateQueries({
          queryKey: ["admin", "newsletter", "drafts"],
        });
      }
      if (r.html) setHtml(r.html);
      setNotice(
        action === "draft_save"
          ? "Ajustes salvos. Nenhum e-mail enviado."
          : action === "draft_import_test"
            ? "Teste recuperado como rascunho com título positivo."
            : "Prévia atualizada sem usar IA.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  function top(key: "subject" | "headline" | "intro", value: string) {
    setEdit((e) => (e ? { ...e, [key]: value } : e));
    setHtml("");
  }
  function section(
    group: "articles" | "videos" | "bike",
    index: number,
    key: "title" | "paragraphs" | "bullets",
    value: string,
  ) {
    setHtml("");
    setEdit((e) => {
      if (!e) return e;
      const change =
        key === "title"
          ? { title: value }
          : {
              [key]: value
                .split(key === "paragraphs" ? "\n\n" : "\n")
                .map((s) => s.trim())
                .filter(Boolean),
            };
      if (group === "bike") return { ...e, bike: { ...e.bike, ...change } };
      return {
        ...e,
        [group]: e[group].map((item, i) =>
          i === index ? { ...item, ...change } : item,
        ),
      };
    });
  }
  return (
    <section
      className="space-y-4 rounded-xl border border-line bg-white p-5"
      aria-labelledby="newsletter-drafts-title"
    >
      <h2 id="newsletter-drafts-title" className="text-xl font-bold">
        Rascunhos e edição
      </h2>
      <p className="text-sm text-ink-muted">
        Abra uma edição para ajustar assunto e textos sem gerar tudo novamente.
        Salvar não envia e não altera campanhas já enviadas. Os links, imagens e
        preços continuam ligados às fontes.
      </p>
      {drafts.isPending && <p role="status">Carregando rascunhos…</p>}
      {drafts.isError && <p role="alert">{drafts.error.message}</p>}
      {drafts.data &&
        !drafts.data.drafts.some((d) => d.origin === "test_import") && (
          <button
            className={button}
            disabled={busy}
            onClick={() => void run("draft_import_test")}
          >
            Recuperar edição do teste
          </button>
        )}
      <ul className="space-y-2">
        {drafts.data?.drafts.map((d) => (
          <li key={d.id}>
            <button
              className={button + " w-full text-left"}
              disabled={busy}
              onClick={() => open(d)}
            >
              {d.content.subject}
              <span className="ml-2 text-xs">· Revisão {d.revision}</span>
            </button>
          </li>
        ))}
      </ul>
      {draft && edit && (
        <fieldset disabled={busy} className="space-y-4 border-t pt-4">
          <label className="block">
            Assunto do e-mail
            <input
              className={field}
              value={edit.subject}
              maxLength={120}
              onChange={(e) => top("subject", e.target.value)}
            />
          </label>
          <label className="block">
            Título dentro da newsletter
            <input
              className={field}
              value={edit.headline}
              maxLength={100}
              onChange={(e) => top("headline", e.target.value)}
            />
          </label>
          <label className="block">
            Abertura
            <textarea
              className={field}
              rows={4}
              value={edit.intro}
              maxLength={1800}
              onChange={(e) => top("intro", e.target.value)}
            />
          </label>
          {(["articles", "bike", "videos"] as const).map((group) => (
            <div key={group} className="space-y-4">
              <h3 className="font-bold">
                {group === "articles"
                  ? "Leituras"
                  : group === "bike"
                    ? "Bike em destaque"
                    : "Vídeos"}
              </h3>
              {(group === "bike" ? [edit.bike] : edit[group]).map(
                (item, index) => (
                  <fieldset className="rounded-lg border p-4" key={index}>
                    <legend className="px-2 text-sm">{item.title}</legend>
                    <label className="block">
                      Título da seção
                      <input
                        className={field}
                        value={item.title}
                        maxLength={200}
                        onChange={(e) =>
                          section(group, index, "title", e.target.value)
                        }
                      />
                    </label>
                    <label className="mt-3 block">
                      Texto (separe parágrafos com uma linha em branco)
                      <textarea
                        className={field}
                        rows={5}
                        value={item.paragraphs.join("\n\n")}
                        onChange={(e) =>
                          section(group, index, "paragraphs", e.target.value)
                        }
                      />
                    </label>
                    <label className="mt-3 block">
                      Tópicos (um por linha)
                      <textarea
                        className={field}
                        rows={3}
                        value={item.bullets.join("\n")}
                        onChange={(e) =>
                          section(group, index, "bullets", e.target.value)
                        }
                      />
                    </label>
                  </fieldset>
                ),
              )}
            </div>
          ))}
          <p className="text-sm text-ink-muted">
            Os ajustes acima são edição humana. Confira afirmações nas fontes
            antes de usar o texto. O Radar preserva os dados verificados.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              className={button + " bg-emerald-800 text-white"}
              disabled={busy}
              onClick={() => void run("draft_save")}
            >
              Salvar ajustes
            </button>
            <button
              className={button}
              disabled={busy}
              onClick={() => void run("draft_render")}
            >
              Visualizar
            </button>
          </div>
        </fieldset>
      )}
      {busy && <p role="status">Processando…</p>}
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      {html && (
        <>
          <h3 className="font-bold">Prévia com seus ajustes</h3>
          <iframe
            title="Rascunho editado da newsletter"
            sandbox=""
            srcDoc={html}
            className="h-[680px] w-full rounded-lg border"
          />
          <button
            className={button}
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([html], { type: "text/html;charset=utf-8" }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = "vitale-newsletter-editada.html";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Exportar HTML
          </button>
        </>
      )}
    </section>
  );
}
