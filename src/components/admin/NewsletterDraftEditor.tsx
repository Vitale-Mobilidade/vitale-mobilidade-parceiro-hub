import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { newsletterCall } from "@/lib/newsletter-api";
import {
  editableNewsletter,
  type NewsletterDraft,
  type NewsletterEdit,
  type NewsletterRewrite,
} from "@/lib/newsletter-drafts";
const field = "mt-1 w-full rounded-lg border border-line bg-white p-3";
const button =
  "rounded-lg border border-line px-4 py-2 font-medium disabled:opacity-50";
export function NewsletterDraftEditor({
  lockedDays = [],
}: { lockedDays?: string[] } = {}) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const qc = useQueryClient();
  const [draft, setDraft] = useState<NewsletterDraft | null>(null),
    [edit, setEdit] = useState<NewsletterEdit | null>(null);
  const [html, setHtml] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const [prompt, setPrompt] = useState("");
  const drafts = useQuery({
    queryKey: ["admin", "newsletter", "drafts"],
    queryFn: () =>
      newsletterCall<{
        drafts: NewsletterDraft[];
        rewrites?: NewsletterRewrite[];
        preparations?: {
          edition_day: string;
          attempts: number;
          next_attempt_at: string | null;
          last_error: string | null;
        }[];
      }>("draft_list"),
    staleTime: 15000,
    refetchInterval: 30_000,
  });
  function open(d: NewsletterDraft) {
    setPrompt("");
    setDraft(d);
    setEdit(editableNewsletter(d.content));
    setHtml("");
    setNotice("");
    setError("");
  }
  async function run(action: string, jobId?: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await newsletterCall<{
        draft?: NewsletterDraft;
        html?: string;
        job?: { id: string; status: string };
      }>(
        action,
        action === "draft_prompt"
          ? { id: draft?.id, revision: draft?.revision, prompt }
          : action.startsWith("draft_prompt_")
            ? { jobId }
            : action === "draft_import_test"
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
      await qc.invalidateQueries({
        queryKey: ["admin", "newsletter", "drafts"],
      });
      setNotice(
        action === "draft_prompt"
          ? "Pedido salvo. A IA vai refazer e revisar em segundo plano. Você pode fechar esta página; a edição atual está preservada."
          : action === "draft_prompt_apply"
            ? "Nova versão aplicada ao rascunho. Nenhum e-mail enviado."
            : action === "draft_prompt_discard"
              ? "Proposta descartada; rascunho preservado."
              : action === "draft_prompt_preview"
                ? "Prévia da proposta aprovada pela revisão."
                : action === "draft_save"
                  ? "Ajustes salvos. Nenhum e-mail enviado."
                  : action === "draft_import_test"
                    ? "Teste recuperado como rascunho com título positivo."
                    : action === "draft_prepare_fallback"
                      ? "Edição simples preparada sem IA. Nenhum e-mail enviado."
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
        Próximas edições
      </h2>
      <p className="text-sm text-ink-muted">
        Abra uma edição para ajustar assunto e textos sem gerar tudo novamente.
        Salvar não envia e não altera campanhas já enviadas. Os links, imagens e
        preços continuam ligados às fontes. Rascunhos com data de envio são
        usados pela automação; salve os ajustes antes das 06h20. Ao começar a
        preparar as campanhas, o conteúdo daquela edição fica congelado.
      </p>
      {drafts.data?.preparations
        ?.filter((p) => p.last_error)
        .map((p) => (
          <p key={p.edition_day} role="status" className="text-sm">
            Preparação de {p.edition_day.split("-").reverse().join("/")}:
            tentativa {p.attempts}/3.{" "}
            {p.next_attempt_at
              ? "A recuperação continua automaticamente; a edição simples válida é preservada."
              : "As tentativas editoriais terminaram; uma edição simples válida mantém a preparação quando disponível."}{" "}
            ({p.last_error})
          </p>
        ))}
      {drafts.data?.preparations?.some((p) => p.last_error) && (
        <button
          className={button}
          disabled={busy}
          onClick={() => void run("draft_prepare_fallback")}
        >
          Preparar edição simples sem IA
        </button>
      )}
      {drafts.isPending && <p role="status">Carregando rascunhos…</p>}
      {drafts.isError && <p role="alert">{drafts.error.message}</p>}
      {drafts.data &&
        !drafts.data.drafts.some(
          (d) =>
            d.edition_day &&
            d.edition_day >= today &&
            !lockedDays.includes(d.edition_day),
        ) && (
          <p className="text-sm text-muted-foreground">
            Nenhuma edição futura disponível para ajuste. Edições enviadas ficam
            no histórico de entregas.
          </p>
        )}
      <ul className="space-y-2">
        {drafts.data?.drafts
          .filter(
            (d) =>
              d.edition_day &&
              d.edition_day >= today &&
              !lockedDays.includes(d.edition_day),
          )
          .map((d) => (
            <li key={d.id}>
              <button
                className={button + " w-full text-left"}
                disabled={busy}
                onClick={() => open(d)}
              >
                {d.content.subject}
                {d.edition_day && (
                  <span className="block text-xs">
                    Envio previsto:{" "}
                    {d.edition_day.split("-").reverse().join("/")} às 06h30 (São
                    Paulo)
                  </span>
                )}
                {d.generation_mode === "fallback" && (
                  <span className="block text-xs">
                    Edição simples: recuperação da geração
                  </span>
                )}
                <span className="ml-2 text-xs">· Revisão {d.revision}</span>
              </button>
            </li>
          ))}
      </ul>
      {draft && edit && !lockedDays.includes(draft.edition_day ?? "") && (
        <fieldset disabled={busy} className="space-y-4 border-t pt-4">
          <div className="rounded-lg border border-line bg-surface p-4 space-y-3">
            <label className="block">
              Refazer com uma orientação para a IA
              <textarea
                className={field}
                value={prompt}
                rows={3}
                maxLength={2000}
                placeholder="Ex.: retire o destaque da Voltz EVS e priorize bikes ou temas de bike."
                onChange={(e) => setPrompt(e.target.value)}
              />
            </label>
            <p className="text-sm text-ink-muted">
              O pedido usa a revisão salva e fontes verificadas. A IA gera uma
              proposta e passa pelo revisor; você confere e aplica. Os ajustes
              ainda não salvos abaixo não entram no pedido. Envie antes das
              06h20 no dia da edição.
            </p>
            <button
              className={button}
              disabled={
                busy ||
                prompt.trim().length < 10 ||
                drafts.data?.rewrites?.some(
                  (j) =>
                    j.draft_id === draft.id &&
                    ["queued", "running", "ready"].includes(j.status),
                )
              }
              onClick={() => void run("draft_prompt")}
            >
              Gerar proposta com IA
            </button>
            <div aria-live="polite">
              {drafts.data?.rewrites
                ?.filter((j) => j.draft_id === draft.id)
                .slice(0, 1)
                .map((job) => (
                  <div key={job.id} className="space-y-2">
                    <p role="status">
                      {job.status === "ready"
                        ? "Proposta revisada e pronta para conferir."
                        : job.status === "queued" || job.status === "running"
                          ? `Pedido em processamento automático · tentativa ${job.attempts}/2. A próxima verificação ocorre em até 5 minutos; uma nova tentativa aguarda 10 minutos.`
                          : job.status === "applied"
                            ? "Proposta aplicada."
                            : job.status === "conflict"
                              ? "A edição mudou ou entrou na preparação do envio. Reabra o rascunho; a proposta não foi aplicada."
                              : "Não foi possível concluir uma proposta revisada após as tentativas automáticas. A edição anterior continua preservada; confira a orientação e tente novamente."}
                    </p>
                    {job.status === "ready" && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          className={button}
                          onClick={() =>
                            void run("draft_prompt_preview", job.id)
                          }
                        >
                          Ver proposta
                        </button>
                        <button
                          className={button}
                          onClick={() => void run("draft_prompt_apply", job.id)}
                        >
                          Aplicar proposta ao rascunho
                        </button>
                      </div>
                    )}
                    {["queued", "running", "ready"].includes(job.status) && (
                      <button
                        className={button}
                        onClick={() => void run("draft_prompt_discard", job.id)}
                      >
                        Descartar pedido
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
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
