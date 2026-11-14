import { useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { adminCall } from "@/lib/admin-api";
import {
  formatPodcastDateTime,
  podcastSlots,
} from "@/lib/podcast-dashboard-clock";
import {
  PODCAST_HISTORY_PAGE_SIZE,
  type PodcastInstagramPostsSnapshot,
} from "../../supabase/functions/_shared/podcast-dashboard-contract";
import type {
  InstagramSingleDashboard,
  InstagramSingleItem,
} from "../../supabase/functions/_shared/instagram-single-contract";

const labels = {
  review: "Aguardando revisão",
  scheduled: "Agendado",
  publishing: "Em envio",
  published: "Publicado",
  attention: "Requer atenção",
  draft: "Rascunho",
};
type Status = keyof typeof labels;
type Item = {
  id: string;
  title: string;
  caption: string;
  status: Status;
  image: string | null;
  date: string | null;
  link: string | null;
  live?: InstagramSingleItem;
};
const control =
  "h-10 rounded-md border border-input bg-background px-3 text-sm";

export default function AdminInstagram() {
  return (
    <AdminShell>
      {(role) =>
        role === "admin" ? (
          <InstagramWorkspace />
        ) : (
          <p role="alert">Acesso restrito a administradores.</p>
        )
      }
    </AdminShell>
  );
}

export function InstagramWorkspace() {
  const [view, setView] = useState<"current" | "history">("current");
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState<Status | "">(""),
    [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null),
    [feedback, setFeedback] = useState("");
  const term = useDeferredValue(search.trim());
  const client = useQueryClient();
  const snapshot = useQuery({
    queryKey: [
      "admin",
      "instagram-single",
      view === "current" ? page : 0,
      view === "current" ? term : "",
      view === "current" ? status : "",
    ],
    queryFn: () =>
      adminCall<InstagramSingleDashboard>(
        "instagram-single-list",
        view === "current" ? { page, search: term, state: status } : {},
      ),
    retry: false,
    staleTime: 20_000,
  });
  const legacy = useQuery({
    queryKey: ["admin", "instagram-history"],
    enabled: view === "history",
    retry: false,
    staleTime: 60_000,
    queryFn: async () => {
      const first = await adminCall<PodcastInstagramPostsSnapshot>(
        "podcast-instagram-posts",
        { page: 0 },
      );
      const remaining = Math.ceil(first.total / PODCAST_HISTORY_PAGE_SIZE) - 1;
      if (remaining > 20)
        throw Error("O histórico excedeu o limite de consulta.");
      const rest = await Promise.all(
        Array.from({ length: Math.max(0, remaining) }, (_, i) =>
          adminCall<PodcastInstagramPostsSnapshot>("podcast-instagram-posts", {
            page: i + 1,
          }),
        ),
      );
      return [first, ...rest].flatMap((x) => x.items);
    },
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["admin", "instagram-single"] });
    void client.invalidateQueries({ queryKey: ["admin", "instagram-history"] });
  };
  const prepare = useMutation({
    mutationFn: (videoId: string) =>
      adminCall<{ id?: string }>("instagram-single-prepare", { videoId }),
    onSuccess: (row) => {
      setSearch("");
      setStatus("");
      setPage(0);
      setSelected(row?.id ?? null);
      refresh();
      setFeedback("Rascunho preparado. Confira a capa e a legenda.");
    },
  });
  const approve = useMutation({
    mutationFn: (item: InstagramSingleItem) =>
      adminCall<{ dueAt: string }>("instagram-single-approve", {
        id: item.id,
        fingerprint: item.fingerprint,
      }),
    onSuccess: (result) => {
      setFeedback(
        "Post aprovado para " +
          formatPodcastDateTime(result.dueAt) +
          " — São Paulo.",
      );
      refresh();
    },
  });
  const enqueue = useMutation({
    mutationFn: () =>
      adminCall<{ status: string; dueAt?: string }>(
        "instagram-single-queue-next",
      ),
    onSuccess: (result) => {
      const issues: Record<string, string> = {
        queue_full: "As três próximas janelas já estão reservadas.",
        source_requires_review: "A próxima fonte precisa de revisão editorial.",
        no_source: "Não há outro vídeo elegível e inédito.",
        awaiting_review: "A primeira publicação ainda não foi aprovada.",
      };
      setFeedback(
        result.dueAt
          ? "Post agendado para " +
              formatPodcastDateTime(result.dueAt) +
              " — São Paulo."
          : (issues[result.status] ??
              "Atualize a fila para conferir o estado."),
      );
      refresh();
    },
  });
  const connection = useMutation({
    mutationFn: () =>
      adminCall<{ status: string }>("podcast-instagram-connection"),
  });
  const config = snapshot.data;
  const legacyItems: Item[] = (legacy.data ?? [])
    .map<Item>((row) => ({
      id: row.id,
      title: row.title,
      caption: row.caption ?? "",
      image: row.imageUrl ?? null,
      link: row.permalink,
      status:
        row.state === "published"
          ? "published"
          : row.reviewHold
            ? "review"
            : row.errorCode
              ? "attention"
              : row.state,
      date: row.publishedAt ?? row.scheduledAt,
    }))
    .filter(
      (x) =>
        (!status || status === x.status) &&
        (!term ||
          x.title
            .toLocaleLowerCase("pt-BR")
            .includes(term.toLocaleLowerCase("pt-BR"))),
    );
  const items: Item[] =
    view === "current"
      ? (config?.items ?? []).map((row) => ({
          id: row.id,
          title: row.title,
          caption: row.caption,
          image: row.imageUrl,
          link: row.permalink,
          status: row.state,
          date: row.published_at ?? row.due_at ?? row.created_at,
          live: row,
        }))
      : legacyItems.slice(page * 20, page * 20 + 20);
  const total = view === "current" ? (config?.total ?? 0) : legacyItems.length;
  const item = items.find((x) => x.id === selected) ?? items[0];
  const error = prepare.error ?? approve.error ?? enqueue.error;
  const switchView = (target: typeof view) => {
    setView(target);
    setPage(0);
    setSelected(null);
    setSearch("");
    setStatus(target === "history" ? "published" : "");
  };
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Instagram</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie a fila e acompanhe as publicações.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={connection.isPending}
            onClick={() => connection.mutate()}
          >
            Verificar conta
          </Button>
          <Button
            variant="outline"
            disabled={snapshot.isFetching || legacy.isFetching}
            onClick={refresh}
          >
            <RefreshCw />
            Atualizar
          </Button>
        </div>
      </header>
      {connection.data && (
        <p role="status" className="text-sm">
          {connection.data.status === "verified"
            ? "Conta @vitalemobilidade confirmada."
            : "Não foi possível confirmar a conexão com a conta."}
        </p>
      )}
      {connection.isError && (
        <p role="alert" className="text-destructive">
          Não foi possível verificar a conta.
        </p>
      )}
      <section
        aria-label="Agenda automática"
        className="rounded-lg border bg-card p-4"
      >
        <h2 className="font-semibold">
          {config
            ? config.automationEnabled
              ? "Agenda automática ativa"
              : "Agenda automática pausada"
            : "Agenda automática"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {podcastSlots.map((slot) => slot.label).join(" · ")} — São Paulo
        </p>
        {config?.firstApprovalPending && (
          <p className="mt-2 text-sm">
            O primeiro envio depende da sua aprovação da capa e da legenda.
          </p>
        )}
        {config?.issue && (
          <p className="mt-2 text-sm">
            A próxima fonte precisa de revisão de capa ou conteúdo antes de
            entrar na fila.
          </p>
        )}
      </section>
      {config && view === "current" && (
        <nav
          aria-label="Resumo da fila"
          className="grid grid-cols-2 gap-2 md:grid-cols-4"
        >
          {(["review", "scheduled", "published", "attention"] as const).map(
            (key) => (
              <button
                key={key}
                type="button"
                aria-pressed={status === key}
                className="rounded-lg border bg-card p-3 text-left focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  setStatus(status === key ? "" : key);
                  setPage(0);
                  setSelected(null);
                }}
              >
                <span className="block text-xl font-bold">
                  {config.counts[key] ?? 0}
                </span>
                <span className="text-xs text-muted-foreground">
                  {labels[key]}
                </span>
              </button>
            ),
          )}
        </nav>
      )}
      {config?.source && view === "current" && (
        <section
          aria-label="Próxima fonte"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4"
        >
          <div>
            <h2 className="font-semibold">Vídeo elegível mais recente</h2>
            <p className="text-sm">{config.source.article_title}</p>
          </div>
          {config.automationEnabled && !config.firstApprovalPending ? (
            <Button
              disabled={
                enqueue.isPending ||
                (config.counts.scheduled ?? 0) +
                  (config.counts.publishing ?? 0) >=
                  3
              }
              onClick={() => enqueue.mutate()}
            >
              {enqueue.isPending ? "Preparando…" : "Colocar na fila"}
            </Button>
          ) : (
            <Button
              disabled={prepare.isPending || (config.counts.review ?? 0) > 0}
              onClick={() => prepare.mutate(config.source!.video_id)}
            >
              {prepare.isPending ? "Preparando…" : "Preparar rascunho"}
            </Button>
          )}
        </section>
      )}
      <div className="flex flex-wrap gap-2" aria-label="Área de posts">
        <Button
          variant={view === "current" ? "default" : "outline"}
          aria-pressed={view === "current"}
          onClick={() => switchView("current")}
        >
          Operação atual
        </Button>
        <Button
          variant={view === "history" ? "default" : "outline"}
          aria-pressed={view === "history"}
          onClick={() => switchView("history")}
        >
          Histórico anterior
        </Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="grid min-w-0 flex-1 gap-1 text-sm font-medium">
          Buscar por título
          <input
            className={control}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
              setSelected(null);
            }}
            placeholder="Ex.: Mobylette"
            maxLength={100}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Status
          <select
            className={control}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as Status | "");
              setPage(0);
              setSelected(null);
            }}
          >
            <option value="">Todos</option>
            {(Object.keys(labels) as Status[]).map((s) => (
              <option key={s} value={s}>
                {labels[s]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {(view === "current" ? snapshot.isPending : legacy.isPending) && (
        <p role="status">Consultando posts…</p>
      )}
      {(view === "current" ? snapshot.isError : legacy.isError) && (
        <p role="alert" className="text-destructive">
          Não foi possível consultar a lista de posts. Tente atualizar.
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(225px,0.8fr)_minmax(0,1.5fr)]">
        <aside className="min-w-0 rounded-lg border bg-card p-3">
          <h2 className="mb-2 px-2 font-semibold">Posts · {total}</h2>
          <ul className="divide-y divide-border">
            {items.map((x) => (
              <li key={x.id}>
                <Button
                  variant={item?.id === x.id ? "secondary" : "ghost"}
                  aria-pressed={item?.id === x.id}
                  className="h-auto w-full justify-start gap-3 whitespace-normal py-3 text-left"
                  onClick={() => {
                    setSelected(x.id);
                    setFeedback("");
                  }}
                >
                  {x.image && (
                    <img
                      src={x.image}
                      alt=""
                      loading="lazy"
                      className="aspect-[4/5] w-12 shrink-0 rounded object-cover"
                    />
                  )}
                  <span className="min-w-0 break-words">
                    <span className="block font-semibold">{x.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {labels[x.status]}
                      {x.date ? " · " + formatPodcastDateTime(x.date) : ""}
                    </span>
                  </span>
                </Button>
              </li>
            ))}
          </ul>
          {!items.length && (
            <p className="px-2 text-sm text-muted-foreground">
              Nenhum post com esses filtros.
            </p>
          )}
          {(page > 0 || total > 20) && (
            <nav
              aria-label="Páginas dos posts"
              className="mt-3 flex flex-wrap gap-2"
            >
              <Button
                variant="outline"
                disabled={page === 0}
                onClick={() => {
                  setPage(page - 1);
                  setSelected(null);
                }}
              >
                Anteriores
              </Button>
              <Button
                variant="outline"
                disabled={(page + 1) * 20 >= total}
                onClick={() => {
                  setPage(page + 1);
                  setSelected(null);
                }}
              >
                Próximos
              </Button>
            </nav>
          )}
        </aside>
        {item && (
          <section
            aria-label="Detalhe do post"
            className="min-w-0 space-y-4 rounded-lg border bg-card p-4"
          >
            <header>
              <h2 className="break-words text-xl font-bold">{item.title}</h2>
              <p className="mt-1 text-sm font-medium">{labels[item.status]}</p>
            </header>
            {item.live?.due_at && (
              <p className="text-sm">
                Horário reservado: {formatPodcastDateTime(item.live.due_at)} —
                São Paulo
              </p>
            )}
            {item.live?.error_code === "shipment_unconfirmed" && (
              <p role="alert" className="text-sm text-destructive">
                Envio sem confirmação. Confira a conta antes de qualquer nova
                tentativa.
              </p>
            )}
            {item.image ? (
              <figure className="max-w-sm">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-auto w-full rounded-md"
                />
                {item.live && (
                  <figcaption className="mt-2 text-sm text-muted-foreground">
                    Uma imagem · 1080 × 1350 px
                  </figcaption>
                )}
              </figure>
            ) : (
              <p className="text-sm text-muted-foreground">
                Imagem indisponível.
              </p>
            )}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">Legenda</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Copiar legenda"
                  disabled={!item.caption}
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(item.caption)
                      .then(() => setFeedback("Legenda copiada."))
                      .catch(() =>
                        setFeedback("Selecione o texto para copiar."),
                      )
                  }
                >
                  <Copy />
                </Button>
              </div>
              <p className="select-text whitespace-pre-wrap break-words text-sm leading-relaxed">
                {item.caption || "Legenda indisponível."}
              </p>
            </div>
            {item.live &&
              item.image &&
              (item.status === "review" ||
                ["slot_missed", "connection_unavailable"].includes(
                  item.live.error_code ?? "",
                )) && (
                <Button
                  disabled={approve.isPending}
                  onClick={() => approve.mutate(item.live!)}
                >
                  Aprovar e agendar na próxima janela
                </Button>
              )}
            {item.link && (
              <Button asChild variant="outline">
                <a href={item.link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  Abrir no Instagram
                </a>
              </Button>
            )}
          </section>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      )}
      {feedback && (
        <p role="status" className="text-sm">
          {feedback}
        </p>
      )}
    </div>
  );
}
