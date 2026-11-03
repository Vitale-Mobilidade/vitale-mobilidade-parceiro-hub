import { useEffect, useState } from "react";
import { z } from "zod";
import { memberCall } from "@/lib/member-community-api";
import { memberError, moderationCommentSchema } from "@/lib/member-community";

export function CommentModeration() {
  const [status, setStatus] = useState("pending");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<z.infer<typeof moderationCommentSchema>[]>(
    [],
  );
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void memberCall("moderation_list", { status, offset })
      .then((data) => {
        const rows = z.array(moderationCommentSchema).parse(data);
        if (active) setItems(rows);
      })
      .catch((e) => {
        if (active) {
          setError(memberError(e));
          setItems([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [status, offset, revision]);
  async function act(action: string, id: string, value: string | boolean) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await memberCall(
        action,
        action === "moderate"
          ? { id, status: String(value) }
          : { id, suspended: Boolean(value) },
      );
      setMessage("Moderação atualizada.");
      setOffset(0);
      setRevision((n) => n + 1);
    } catch (e) {
      setError(memberError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="p-4 sm:p-8" data-heatmap-private>
      <h1 className="text-3xl font-bold">Comentários dos leitores</h1>
      <p className="mt-3">
        Aprove contribuições relacionadas ao artigo. Rejeite spam, ataques e
        dados pessoais. Suspender oculta todas as contribuições do leitor e
        impede novos comentários; restaurar torna os aprovados visíveis
        novamente.
      </p>
      <label className="mt-5 block font-semibold">
        Mostrar
        <select
          value={status}
          disabled={busy}
          onChange={(e) => {
            setStatus(e.target.value);
            setOffset(0);
          }}
          className="ml-3 rounded-lg border border-line p-3"
        >
          <option value="pending">Pendentes</option>
          <option value="approved">Aprovados</option>
          <option value="rejected">Rejeitados</option>
        </select>
      </label>
      <button
        onClick={() => setRevision((n) => n + 1)}
        disabled={busy}
        className="mt-3 min-h-11 underline"
      >
        Atualizar fila
      </button>
      {error && (
        <p role="alert" className="mt-4 text-red-800">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-4 text-emerald-900">
          {message}
        </p>
      )}
      {loading ? (
        <p role="status">Carregando fila…</p>
      ) : (
        <>
          {!items.length && !error && (
            <p className="mt-6">Nenhum comentário nesta página.</p>
          )}
          <ul className="mt-6 space-y-4">
            {items.slice(0, 20).map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-line bg-white p-4"
              >
                <p className="font-semibold">
                  {item.authorName}
                  {item.suspended ? " · suspenso" : ""}
                </p>
                <p>{item.articleTitle}</p>
                <time dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                </time>
                <p className="mt-3 whitespace-pre-wrap break-words">
                  {item.body}
                </p>
                <div className="mt-3 flex flex-wrap gap-4">
                  <button
                    disabled={busy || item.status === "approved"}
                    onClick={() => void act("moderate", item.id, "approved")}
                    className="min-h-11 font-semibold underline disabled:opacity-40"
                  >
                    Aprovar
                  </button>
                  <button
                    disabled={busy || item.status === "rejected"}
                    onClick={() => void act("moderate", item.id, "rejected")}
                    className="min-h-11 underline disabled:opacity-40"
                  >
                    Rejeitar / retirar do público
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          item.suspended
                            ? "Restaurar acesso deste leitor?"
                            : "Suspender este leitor e ocultar todas as suas contribuições?",
                        )
                      )
                        void act("suspend_author", item.id, !item.suspended);
                    }}
                    className="min-h-11 underline"
                  >
                    {item.suspended ? "Restaurar leitor" : "Suspender leitor"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <nav aria-label="Páginas da fila" className="mt-5 flex gap-4">
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
