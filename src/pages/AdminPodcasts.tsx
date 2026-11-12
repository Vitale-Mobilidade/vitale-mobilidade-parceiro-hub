import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminCall } from "@/lib/admin-api";
import { formatPodcastDateTime, nextPodcastSlot, podcastSlots } from "@/lib/podcast-dashboard-clock";
import {
  PODCAST_HISTORY_PAGE_SIZE,
  PODCAST_MAX_HISTORY_PAGE,
  type PodcastDashboardItem,
  type PodcastDashboardSnapshot,
} from "../../supabase/functions/_shared/podcast-dashboard-contract";

const panel = "rounded-2xl border border-line bg-white p-4 sm:p-6";
const button = "inline-flex min-h-11 items-center rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold hover:bg-emerald-50 disabled:opacity-50";
const instagramLabels = {
  pending: "Instagram em processamento",
  published: "Publicado no Instagram",
  failed: "Falha ao publicar no Instagram",
  expired: "Janela do Instagram encerrada",
  unconfirmed: "Envio ao Instagram sem confirmação",
};
const textLink = "inline-flex min-h-11 items-center text-sm font-semibold text-emerald-800 underline";

export default function AdminPodcasts() {
  return <AdminShell>{(role) => role === "admin" ? <PodcastDashboard /> : <p role="alert">Acesso restrito a administradores.</p>}</AdminShell>;
}

function PodcastDashboard() {
  const [page, setPage] = useState(0);
  const query = useQuery({
    queryKey: ["admin", "podcast-dashboard", page],
    queryFn: () => adminCall<PodcastDashboardSnapshot>("podcast-dashboard", { historyPage: page }),
    staleTime: 30_000,
    retry: false,
  });
  const instagramCheck = useMutation({
    mutationFn: () => adminCall<{ status: string }>("podcast-instagram-connection"),
  });
  const instagramRetry = useMutation({
    mutationFn: (episode: PodcastDashboardItem) =>
      adminCall<{ status: string; code?: string }>("podcast-instagram-retry", { youtubeId: episode.id }),
    onSettled: () => query.refetch(),
  });
  const retryMessage = instagramRetry.isError ? "Não foi possível concluir o envio. Atualize o histórico antes de tentar de novo."
    : instagramRetry.data?.status === "published" ? "Publicado no Instagram."
    : instagramRetry.data?.code === "meta_processing" ? "A Meta ainda está processando a imagem. Tente novamente em instantes."
    : instagramRetry.data?.status === "unavailable" ? "Este episódio não está disponível para reenvio."
    : instagramRetry.data ? "O Instagram ainda não confirmou o envio. Confira o histórico." : null;
  const instagramConnectionMessage = instagramCheck.isError ? "Não foi possível consultar a conexão."
    : ({
      verified: "Conta @vitalemobilidade confirmada.",
      not_configured: "A conexão com o Instagram ainda precisa ser configurada.",
      wrong_instagram_account: "A conta conectada é diferente de @vitalemobilidade.",
      meta_authorization: "A autorização da Meta precisa ser renovada.",
      meta_request: "Não foi possível verificar a conta na Meta.",
    } as Record<string, string>)[instagramCheck.data?.status ?? ""];
  const data = query.data;
  const agenda = data?.feedEnabled && data.schedulerEnabled;
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Podcasts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acompanhe a fila e as publicações do podcast da Vitale.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/videos" className={button}>Gerenciar áudios</Link>
          <button className={button} type="button" disabled={query.isFetching} onClick={() => void query.refetch()}>
            {query.isFetching ? "Consultando…" : "Atualizar"}
          </button>
        </div>
      </header>
      {query.isPending && <p role="status">Consultando a fila do podcast…</p>}
      {query.isError && <p role="alert">Não foi possível atualizar o painel. Tente novamente.</p>}
      {data && <>
        <section className={panel} aria-labelledby="podcast-agenda">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="podcast-agenda" className="text-lg font-semibold">Agenda de publicação</h2>
              <p className="mt-2 font-semibold">{!data.feedEnabled ? "RSS desativado" : agenda ? "Agenda habilitada" : "Agenda pausada"}</p>
              {data.instagramEnabled !== undefined && <p className="mt-1 text-sm">
                {data.instagramEnabled ? "Instagram automático na mesma janela" : "Instagram automático desativado"}
              </p>}
              <p className="mt-1 text-sm text-muted-foreground">
                {podcastSlots.map((slot) => slot.label).join(" · ")} — horário de Brasília.
              </p>
              {agenda && <p className="mt-2 text-sm">
                Próxima janela prevista: <strong>{nextPodcastSlot(data.checkedAt)}</strong>
              </p>}
            </div>
            {data.feedEnabled && <a href="/podcast/rss.xml" target="_blank" rel="noopener noreferrer" className={button}>Abrir RSS</a>}
          </div>
          {data.instagramEnabled !== undefined && <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" className={button} disabled={instagramCheck.isPending} onClick={() => instagramCheck.mutate()}>
              {instagramCheck.isPending ? "Verificando…" : "Verificar conta do Instagram"}
            </button>
            {instagramConnectionMessage && <p role="status" className="text-sm">{instagramConnectionMessage}</p>}
          </div>}
          <p className="mt-3 text-sm text-muted-foreground">O Lovable prepara os episódios com capa quadrada e legenda e mostra até seis janelas previstas. Cada aplicativo atualiza o RSS no seu próprio ritmo.</p>
          <p className="mt-1 text-xs text-muted-foreground">Dados de <time dateTime={data.checkedAt}>{formatPodcastDateTime(data.checkedAt)}</time>, horário de Brasília.</p>
        </section>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[["MP3 anexados", data.audioCount], ["A preparar", data.ready.total], ["Preparados", data.prepared.total], ["Publicados no RSS", data.released.total]].map(([label, count]) => (
            <div key={label} className="rounded-xl border border-line bg-white p-3 sm:p-4">
              <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums">{count}</dd>
            </div>
          ))}
        </dl>
        <EpisodeSection title="Preparados" section={data.prepared} kind="prepared" empty="Ainda não há episódios preparados." />
        <EpisodeSection title="A preparar" section={data.ready} kind="ready" empty="Nenhum vídeo com MP3 e artigo publicado aguarda preparação." />
        <EpisodeSection title="Histórico de publicações" section={data.released} kind="released" empty={page ? "Nenhum episódio nesta página." : "Ainda não há episódios publicados."}
          retryInstagram={data.feedEnabled && data.instagramEnabled ? (item) => {
            if (window.confirm(`Enviar “${item.title}” ao Instagram da Vitale agora?`)) instagramRetry.mutate(item);
          } : undefined} retryPending={instagramRetry.isPending}>
          {retryMessage && <p role="status" className="mt-3 text-sm">{retryMessage}</p>}
          {data.released.total > PODCAST_HISTORY_PAGE_SIZE && <nav aria-label="Páginas do histórico" className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" className={button} disabled={page === 0 || query.isFetching} onClick={() => setPage(page - 1)}>Mais recentes</button>
            <span className="text-sm">Página {page + 1}</span>
            <button type="button" className={button} disabled={page >= PODCAST_MAX_HISTORY_PAGE || (page + 1) * PODCAST_HISTORY_PAGE_SIZE >= data.released.total || query.isFetching} onClick={() => setPage(page + 1)}>Mais antigos</button>
          </nav>}
        </EpisodeSection>
      </>}
    </div>
  );
}

function EpisodeSection({ title, section, kind, empty, children, retryInstagram, retryPending }: {
  title: string; section: { total: number; items: PodcastDashboardItem[] }; kind: "prepared" | "ready" | "released"; empty: string;
  children?: React.ReactNode;
  retryInstagram?: (item: PodcastDashboardItem) => void;
  retryPending?: boolean;
}) {
  return <section className={panel} aria-labelledby={`podcasts-${kind}`}>
    <h2 id={`podcasts-${kind}`} className="text-lg font-semibold">{title}</h2>
    {kind === "released" && <p className="mt-1 text-sm text-muted-foreground">
      O link do Spotify aparece quando o episódio é identificado. Apple Podcasts, Amazon Music e Deezer ainda não têm confirmação automática neste painel.
    </p>}
    {kind === "ready" && section.total > 0 && <p className="mt-1 text-sm text-muted-foreground">Lista dos vídeos elegíveis no catálogo. A ordem pode mudar até a publicação.</p>}
    {section.items.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{empty}</p> :
      <ul className="mt-3 divide-y divide-line border-y border-line">
        {section.items.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-4 py-3">
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold">{item.title}</p>
            {item.releasedAt && <p className="text-sm text-muted-foreground">Publicado em <time dateTime={item.releasedAt}>{formatPodcastDateTime(item.releasedAt)}</time></p>}
            {item.instagram && <p className="text-sm text-muted-foreground">{instagramLabels[item.instagram.status]}</p>}
            {kind === "prepared" && <p className="text-sm text-muted-foreground">
              {!item.articleSlug ? "Aguardando artigo publicado"
                : item.slotAt ? <>Publicação prevista em <time dateTime={item.slotAt}>{formatPodcastDateTime(item.slotAt)}</time></>
                : "Aguardando uma janela da agenda"}
            </p>}
          </div>
          <div className="flex flex-wrap gap-x-3">
            {item.articleSlug && <Link className={textLink} to="/conteudos/$slug" params={{ slug: item.articleSlug }}>Ver artigo</Link>}
            {item.instagram?.permalink && <a className={textLink} href={item.instagram.permalink} target="_blank" rel="noopener noreferrer">Abrir no Instagram</a>}
            {retryInstagram && item.instagram?.status === "expired" &&
              <button type="button" className={button} disabled={retryPending} onClick={() => retryInstagram(item)}>
                Tentar enviar ao Instagram
              </button>}
            {item.spotifyId && <a className={textLink} href={`https://open.spotify.com/episode/${item.spotifyId}`} target="_blank" rel="noopener noreferrer">Abrir no Spotify</a>}
          </div>
        </li>)}
      </ul>}
    {section.items.length < section.total && kind !== "released" && <p className="mt-3 text-sm text-muted-foreground">Exibindo {section.items.length} de {section.total}.</p>}
    {children}
  </section>;
}
