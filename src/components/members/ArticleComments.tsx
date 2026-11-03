import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { useMemberSession } from "@/hooks/use-member-session";
import { memberCall } from "@/lib/member-community-api";
import {
  commentBodySchema,
  memberCommentSchema,
  memberError,
  memberReturnPath,
  type MemberComment,
} from "@/lib/member-community";

export default function ArticleComments({
  articleId,
  slug,
}: {
  articleId: string;
  slug: string;
}) {
  const { session, loading: sessionLoading } = useMemberSession();
  const [rows, setRows] = useState<{
    key: string;
    items: MemberComment[];
  } | null>(null);
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const key = `${articleId}:${session?.user.id ?? "anon"}:${offset}`;
  const accountUrl = `/conta?retorno=${encodeURIComponent(memberReturnPath(`/conteudos/${slug}`))}`;
  useEffect(() => {
    setOffset(0);
    setBody("");
    setMessage("");
  }, [articleId, session?.user.id]);
  useEffect(() => {
    if (sessionLoading) return;
    let active = true;
    setLoading(true);
    setError("");
    void memberCall("comments", { articleId, offset })
      .then((data) => {
        const items = z.array(memberCommentSchema).parse(data);
        if (active) setRows({ key, items });
      })
      .catch((e) => {
        if (active) {
          setError(memberError(e));
          setRows(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [articleId, key, offset, revision, sessionLoading]);
  async function mutate(action: "add_comment" | "remove_comment", id?: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await memberCall(
        action,
        action === "add_comment"
          ? { articleId, body: commentBodySchema.parse(body) }
          : { id: id! },
      );
      setBody("");
      setOffset(0);
      setRevision((n) => n + 1);
      setMessage(
        action === "add_comment"
          ? "Comentário enviado. Ele ficará público após aprovação da Vitale."
          : "Comentário removido.",
      );
    } catch (e) {
      setError(memberError(e));
    } finally {
      setBusy(false);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void mutate("add_comment");
  }
  const items = rows?.key === key ? rows.items : [];
  return (
    <section
      id="comentarios"
      aria-labelledby="comments-title"
      className="mx-auto max-w-3xl px-4 py-12"
      data-heatmap-private
    >
      <h2 id="comments-title" className="text-2xl font-bold text-ink">
        Converse sobre este artigo
      </h2>
      <p className="mt-3 text-muted-foreground">
        Compartilhe dúvidas e experiências. Não publique telefone, endereço ou
        outros dados pessoais. A Vitale modera os comentários antes da
        publicação.
      </p>
      {sessionLoading ? (
        <p role="status" className="mt-4">
          Verificando acesso…
        </p>
      ) : session ? (
        <form onSubmit={submit} className="mt-5 space-y-3">
          <p className="text-sm">
            Use seu nome público.{" "}
            <a href={accountUrl} className="underline">
              Editar meu perfil ou sair
            </a>
          </p>
          <label htmlFor="article-comment" className="block font-semibold">
            Seu comentário
          </label>
          <textarea
            id="article-comment"
            className="min-h-32 w-full rounded-lg border border-line bg-white p-3"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            minLength={3}
            maxLength={2000}
            required
            aria-describedby="comment-limit"
          />
          <p id="comment-limit" className="text-sm text-muted-foreground">
            {body.length}/2.000 caracteres · Até 20 comentários por dia, com um
            minuto de intervalo.
          </p>
          <button
            disabled={
              busy || loading || !commentBodySchema.safeParse(body).success
            }
            className="min-h-11 rounded-lg bg-ink px-5 py-3 font-bold text-white disabled:opacity-50"
          >
            {busy ? "Enviando…" : "Enviar para moderação"}
          </button>
        </form>
      ) : (
        <p className="mt-5">
          <a
            href={accountUrl}
            className="inline-flex min-h-11 items-center font-semibold underline"
          >
            Entre ou crie sua conta gratuita para comentar
          </a>
        </p>
      )}
      {error && (
        <div className="mt-4">
          <p role="alert" className="text-red-800">
            {error}
          </p>
          <a
            href={accountUrl}
            className="inline-flex min-h-11 items-center underline"
          >
            Minha conta
          </a>
          <button
            type="button"
            onClick={() => setRevision((n) => n + 1)}
            className="ml-4 min-h-11 underline"
          >
            Atualizar comentários
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="mt-4 text-emerald-900">
          {message}
        </p>
      )}
      {loading || sessionLoading ? (
        <p role="status" className="mt-6">
          Carregando comentários…
        </p>
      ) : (
        <>
          {!items.length && !error && (
            <p className="mt-6 text-muted-foreground">
              Ainda não há comentários nesta página.
            </p>
          )}
          <ul className="mt-6 space-y-4">
            {items.slice(0, 20).map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-line bg-white p-4"
              >
                <p className="font-semibold">
                  {item.authorName}{" "}
                  {item.isOwn && <span className="font-normal">(você)</span>}
                </p>
                <time
                  className="text-sm text-muted-foreground"
                  dateTime={item.createdAt}
                >
                  {new Date(item.createdAt).toLocaleDateString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                </time>
                {item.status !== "approved" && (
                  <p className="mt-2 text-sm font-semibold">
                    {item.status === "pending"
                      ? "Aguardando moderação · visível só para você"
                      : "Não aprovado · visível só para você"}
                  </p>
                )}
                <p className="mt-3 whitespace-pre-wrap break-words">
                  {item.body}
                </p>
                {item.isOwn && (
                  <button
                    disabled={busy}
                    type="button"
                    onClick={() => {
                      if (window.confirm("Remover seu comentário?"))
                        void mutate("remove_comment", item.id);
                    }}
                    className="mt-2 min-h-11 underline"
                  >
                    Remover meu comentário
                  </button>
                )}
              </li>
            ))}
          </ul>
          <nav aria-label="Páginas de comentários" className="mt-5 flex gap-5">
            <button
              disabled={offset === 0 || busy}
              onClick={() => setOffset((n) => Math.max(0, n - 20))}
              className="min-h-11 underline disabled:opacity-40"
            >
              Anteriores
            </button>
            <button
              disabled={items.length <= 20 || busy || offset >= 10000}
              onClick={() => setOffset((n) => n + 20)}
              className="min-h-11 underline disabled:opacity-40"
            >
              Próximos
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
