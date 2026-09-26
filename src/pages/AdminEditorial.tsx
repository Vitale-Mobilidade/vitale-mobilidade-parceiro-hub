import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminCall, adminStream, type AdminBike, type AdminGrowth, type AdminOffer, type AdminOverview, type AdminRole,
  type AdminEditorialWorkspace } from "@/lib/admin-api";
import { getSheetVideoCatalog } from "@/lib/videos.functions";
import { getBikesDiscovery } from "@/lib/bikes-discovery.functions";
import { getPublishedArticles } from "@/lib/editorial.functions";
import { safeVideos, type VideoCard } from "@/lib/videos.functions";
import { parseYoutubeId, type VideoItem } from "@/lib/video-catalog";
import { filterAdminVideos, manualAdminVideo } from "@/lib/admin-video-picker";
import { ArticleView, type PublishedArticle } from "@/components/editorial/ArticleView";
import { blocksToMarkdown, CONTENT_TYPES, type EditorialArticle } from
  "../../supabase/functions/_shared/editorial-contract";

const BTN = "rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";
const OUTLINE = "rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold hover:bg-emerald-50 disabled:opacity-50";
const INPUT = "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm";
const PANEL = "rounded-2xl border border-line bg-white p-5 shadow-sm";
const ADMIN_STALE_MS = 5 * 60 * 1000;
const GROWTH_STALE_MS = 60 * 1000;
const date = (v?: string | null) => v ? new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
const money = (v?: number | null) => v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const queryError = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

function Heading({ title, detail, children }: { title: string; detail?: string; children?: React.ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-3xl font-bold tracking-tight">{title}</h1>{detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}</div>
    {children}
  </div>;
}
function Notice({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
  return <p role={danger ? "alert" : "status"} className={`mb-4 rounded-lg p-3 text-sm ${danger ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-950"}`}>{children}</p>;
}
function OnlyEditorial({ role, children }: { role: AdminRole; children: React.ReactNode }) {
  return role === "operation" ? <Notice danger>Seu perfil pode operar o catálogo, mas não editar conteúdo.</Notice> : <>{children}</>;
}

export function AdminOverviewPage() {
  return <AdminShell>{role => <Overview role={role} />}</AdminShell>;
}
function Overview({ role }: { role: AdminRole }) {
  const overview = useQuery({ queryKey: ["admin", "overview"], queryFn: () => adminCall<AdminOverview>("overview"),
    staleTime: ADMIN_STALE_MS, refetchOnWindowFocus: false, retry: false });
  const videoCatalog = useQuery({ queryKey: ["admin", "video-catalog"], queryFn: getSheetVideoCatalog,
    staleTime: ADMIN_STALE_MS, refetchOnWindowFocus: false, retry: false });
  const data = overview.data ?? null;
  const error = overview.error ? queryError(overview.error, "Não foi possível carregar a operação.") : "";
  const videoCatalogCount = videoCatalog.data?.length ?? null;
  return <>
    <Heading title="Visão geral" detail="O que precisa da atenção da equipe hoje." />
    {error && <Notice danger>{error}</Notice>}
    {!data ? <p aria-busy="true">Carregando operação…</p> : <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[["Vídeos na planilha", videoCatalogCount ?? "—"], ["Vídeos importados", data.videos],
          ["Com transcrição", data.videosWithTranscript ?? "—"], ["Com artigo", data.videosWithArticle ?? "—"],
          ["Artigos publicados", data.articles.published ?? 0], ["Rascunhos", data.articles.draft ?? 0],
          ["Bikes no catálogo", data.bikes], ["Erros de geração", data.generationErrors]].map(([label, value]) => <div key={label} className={PANEL}>
            <p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>)}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">“Na planilha” é o acervo disponível. “Importados” são vídeos que já receberam dados editoriais no Admin.</p>
      <div className={`${PANEL} mt-5`}>
        <h2 className="text-lg font-semibold">Sincronização da planilha</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-muted-foreground">Último sucesso</dt><dd className="font-semibold">{date(data.sync?.last_success_at)}</dd></div>
          <div><dt className="text-muted-foreground">Última tentativa</dt><dd className="font-semibold">{date(data.sync?.last_attempt_at)}</dd></div>
          <div><dt className="text-muted-foreground">Estado</dt><dd className="font-semibold">{data.sync?.status ?? "Indisponível"}</dd></div>
        </dl>
        {data.sync?.error_message && <Notice danger>{data.sync.error_message}</Notice>}
        <p className="mt-3 text-sm text-muted-foreground">A planilha e o sincronizador existente continuam responsáveis por preços, links e elegibilidade.</p>
        <a href="/painel-bikes" className="mt-3 inline-block text-sm font-semibold text-emerald-800 underline">Abrir painel operacional de bikes</a>
      </div>
      {role !== "operation" && <div className="mt-5 flex flex-wrap gap-3">
        <Link to="/admin/videos" className={BTN}>Organizar vídeos</Link>
        <Link to="/admin/conteudos/novo" search={{ video: undefined }} className={OUTLINE}>Criar artigo</Link>
      </div>}
    </>}
  </>;
}

export function AdminGrowthPage() {
  return <AdminShell>{role => role === "admin" ? <Growth /> : <Notice danger>Somente Admin pode ver dados de Growth.</Notice>}</AdminShell>;
}

function Growth() {
  const [rangeDays, setRangeDays] = useState(30);
  const growth = useQuery({ queryKey: ["admin", "growth", rangeDays], queryFn: () => adminCall<AdminGrowth>("growth", { rangeDays }),
    staleTime: GROWTH_STALE_MS, placeholderData: keepPreviousData, refetchOnWindowFocus: false, retry: false });
  const data = growth.data ?? null;
  const error = growth.error ? queryError(growth.error, "Não foi possível carregar Growth.") : "";
  const completion = data?.quiz.started ? Math.round((data.quiz.completed / data.quiz.started) * 100) : 0;
  const clickThrough = data?.quiz.started ? Math.round((data.quiz.identifiedClickers / data.quiz.started) * 100) : 0;
  return <>
    <Heading title="Growth" detail="Aquisição, intenção e cliques de compra comprovados pelos dados da Vitale.">
      <label className="text-sm font-semibold">Período<select className={`${INPUT} ml-2 w-auto`} value={rangeDays}
        onChange={e => setRangeDays(Number(e.target.value))}>
        <option value={7}>7 dias</option><option value={30}>30 dias</option><option value={90}>90 dias</option>
      </select></label>
    </Heading>
    {error && <Notice danger>{error}</Notice>}
    {growth.isFetching && data && <p role="status" className="mb-3 text-xs text-muted-foreground">Atualizando indicadores…</p>}
    {!data ? <p aria-busy="true">Carregando indicadores…</p> : <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[["Pessoas que iniciaram o Quiz", data.quiz.started], ["Quiz concluídos", data.quiz.completed],
          ["Cliques de compra", data.quiz.purchaseClicks], ["Pessoas identificadas que clicaram", data.quiz.identifiedClickers]]
          .map(([label, value]) => <div key={label} className={PANEL}><p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p></div>)}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className={PANEL}><h2 className="text-lg font-semibold">Funil do Quiz</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4"><div><dt className="text-sm text-muted-foreground">Conclusão</dt><dd className="text-2xl font-bold">{completion}%</dd></div>
            <div><dt className="text-sm text-muted-foreground">Pessoas com clique</dt><dd className="text-2xl font-bold">{clickThrough}%</dd></div></dl>
          <p className="mt-3 text-xs text-muted-foreground">Taxas calculadas sobre quem iniciou o Quiz no período.</p>
        </section>
        <section className={PANEL}><h2 className="text-lg font-semibold">Cobertura atual</h2>
          <p className="mt-3 text-sm">O Supabase permite ligar cliques do Quiz a leads identificados. Os cliques gerais e pageviews continuam sendo enviados ao GTM, mas o Admin ainda não possui leitura do GA4/Lovable Analytics.</p>
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><strong>Pendente:</strong> conectar a fonte externa de analytics para páginas mais acessadas, usuários e cliques do site inteiro. Os números abaixo não fingem essa cobertura.</p>
        </section>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <RankedList title="Bikes mais clicadas no Quiz" rows={data.topBikes.map(row => ({ label: row.name, value: row.clicks }))} empty="Nenhuma bike clicada no período." />
        <RankedList title="Origens dos leads do Quiz" rows={data.origins.map(row => ({ label: row.name, value: row.leads }))} empty="Nenhuma origem registrada no período." />
      </div>
      <section className={`${PANEL} mt-5`}><h2 className="text-lg font-semibold">Pessoas que clicaram para comprar</h2>
        <p className="mt-1 text-sm text-muted-foreground">Somente leads que se identificaram no Quiz. Dados pessoais restritos ao perfil Admin.</p>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-line text-muted-foreground">
          <th className="pb-3">Pessoa</th><th>Contato</th><th>Bike</th><th>Posição</th><th>Quando</th></tr></thead>
          <tbody>{data.recentClickers.map(person => <tr key={person.id} className="border-b border-line/70 last:border-0"><td className="py-3 font-medium">{person.name || "Não informado"}</td>
            <td>{person.phone || "—"}</td><td>{person.bike || "—"}</td><td>{person.position || "—"}</td><td>{date(person.clickedAt)}</td></tr>)}</tbody>
        </table></div>{data.recentClickers.length === 0 && <p className="py-4 text-sm text-muted-foreground">Nenhum clique identificado no período.</p>}
      </section>
    </>}
  </>;
}

function RankedList({ title, rows, empty }: { title: string; rows: { label: string; value: number }[]; empty: string }) {
  const max = Math.max(1, ...rows.map(row => row.value));
  return <section className={PANEL}><h2 className="text-lg font-semibold">{title}</h2>
    {rows.length ? <ol className="mt-4 space-y-3">{rows.map(row => <li key={row.label}>
      <div className="flex justify-between gap-4 text-sm"><span className="truncate">{row.label}</span><strong>{row.value}</strong></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-emerald-100"><div className="h-full rounded-full bg-emerald-700" style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} /></div>
    </li>)}</ol> : <p className="mt-4 text-sm text-muted-foreground">{empty}</p>}
  </section>;
}

export function AdminBikesPage() {
  return <AdminShell>{() => <Bikes />}</AdminShell>;
}
function Bikes() {
  const [query, setQuery] = useState("");
  const result = useQuery({ queryKey: ["admin", "bikes"], queryFn: () => adminCall<{ bikes: AdminBike[]; offers: AdminOffer[] }>("bikes"),
    staleTime: ADMIN_STALE_MS, refetchOnWindowFocus: false, retry: false });
  const data = result.data ?? null;
  const error = result.error ? queryError(result.error, "Não foi possível carregar as bikes.") : "";
  const offers = useMemo(() => new Map(data?.offers.filter(o => o.is_current).map(o => [o.bike_id, o])), [data]);
  const bikes = useMemo(() => data?.bikes.filter(b => `${b.name} ${b.bike_id}`.toLowerCase().includes(query.toLowerCase())) ?? [], [data, query]);
  return <>
    <Heading title="Bikes" detail="Leitura do catálogo central. Preço, link e elegibilidade continuam na planilha oficial.">
      <a href="/painel-bikes" className={OUTLINE}>Painel operacional</a>
    </Heading>
    {error && <Notice danger>{error}</Notice>}
    <label htmlFor="bike-search" className="sr-only">Buscar bike</label>
    <input id="bike-search" className={`${INPUT} mb-4 max-w-sm`} placeholder="Buscar modelo ou ID" value={query} onChange={e => setQuery(e.target.value)} />
    <div className={PANEL}><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm">
      <thead><tr className="border-b border-line text-muted-foreground"><th className="pb-3">Bike</th><th>Especificações</th><th>Preço vigente</th><th>Última verificação</th><th>Oferta</th><th>Página</th></tr></thead>
      <tbody>{bikes.map(b => { const offer = offers.get(b.bike_id); return <tr key={b.bike_id} className="border-b border-line/70 last:border-0">
        <td className="py-3"><div className="flex items-center gap-3">{b.image_url && <img src={b.image_url} alt="" loading="lazy" className="h-14 w-16 rounded-lg bg-surface object-contain" />}
          <span><strong>{b.name}</strong><br/><small className="text-muted-foreground">{b.bike_id}</small></span></div></td>
        <td className="text-xs text-muted-foreground">{[b.autonomy_km != null && `${b.autonomy_km} km`, b.motor_w != null && `${b.motor_w} W`, b.capacity_people != null && `${b.capacity_people} pessoa(s)`].filter(Boolean).join(" · ") || "—"}</td>
        <td>{offer ? money(offer.price) : "Sem oferta atual"}</td><td>{date(offer?.verified_at)}</td>
        <td>{offer?.url ? <a href={offer.url} target="_blank" rel="noopener noreferrer" className="text-emerald-800 underline">Link vigente</a> : "Indisponível"}</td>
         <td><a href={`/radar/${encodeURIComponent(b.bike_id)}`} target="_blank" rel="noopener noreferrer" className="text-emerald-800 underline">Ver bike</a></td>
      </tr>; })}</tbody>
    </table></div>{data && bikes.length === 0 && <p className="py-4">Nenhuma bike encontrada.</p>}</div>
  </>;
}

export function AdminVideosPage() {
  return <AdminShell>{role => <OnlyEditorial role={role}><Videos /></OnlyEditorial>}</AdminShell>;
}
function Videos() {
  const queryClient = useQueryClient();
  const sheetQuery = useQuery({ queryKey: ["admin", "video-catalog"], queryFn: getSheetVideoCatalog,
    staleTime: ADMIN_STALE_MS, refetchOnWindowFocus: false, retry: false });
  const workspaceQuery = useQuery({ queryKey: ["admin", "editorial-workspace"],
    queryFn: () => adminCall<AdminEditorialWorkspace>("editorial-workspace"), staleTime: ADMIN_STALE_MS, refetchOnWindowFocus: false, retry: false });
  const sheet = sheetQuery.data ?? [];
  const stored = workspaceQuery.data?.videos ?? [];
  const articles = workspaceQuery.data?.articles ?? [];
  const [selected, setSelected] = useState<VideoItem | null>(null);
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [primaryBikeId, setPrimaryBikeId] = useState("");
  const [relatedBikeIds, setRelatedBikeIds] = useState("");
  const [contentType, setContentType] = useState("test");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const readError = workspaceQuery.error
    ? queryError(workspaceQuery.error, "Não foi possível carregar o workspace editorial.")
    : sheetQuery.error ? "A planilha de vídeos está indisponível; os vídeos já cadastrados no Admin continuam acessíveis." : "";
  const storedMap = useMemo(() => new Map(stored.map(v => [v.youtube_id, v])), [stored]);
  const articleMap = useMemo(() => new Map(articles.map(a => [a.video_id, a])), [articles]);
  const items = useMemo(() => {
    const merged = [...sheet];
    for (const v of stored) if (!merged.some(s => s.videoId === v.youtube_id)) merged.push({
      videoId: v.youtube_id, title: v.title, date: v.published_on, url: v.youtube_url,
      thumbnail: v.thumbnail_url ?? "", bikeIds: v.related_bike_ids, unmatched: [],
    });
    return merged.filter(v => {
      if (!`${v.title} ${v.videoId}`.toLowerCase().includes(query.toLowerCase())) return false;
      const saved = storedMap.get(v.videoId), article = articleMap.get(v.videoId);
      if (filter === "no-transcript") return !saved?.transcript;
      if (filter === "no-article") return !article;
      if (filter === "no-bike") return !(saved?.primary_bike_id || v.bikeIds.length);
      if (filter === "processed") return !!article;
      return true;
    });
  }, [sheet, stored, storedMap, articleMap, query, filter]);
  function select(v: VideoItem) {
    const saved = storedMap.get(v.videoId);
    setSelected(v); setTitle(saved?.title ?? v.title); setTranscript(saved?.transcript ?? "");
    setPrimaryBikeId(saved?.primary_bike_id ?? v.bikeIds[0] ?? "");
    setRelatedBikeIds((saved?.related_bike_ids ?? v.bikeIds).join(", "));
    setContentType(saved?.content_type ?? "test"); setMessage(""); setError("");
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!selected) return; setSaving(true); setError(""); setMessage("");
    try {
      await adminCall("video-save", { youtubeId: selected.videoId, title, transcript, date: selected.date,
        primaryBikeId: primaryBikeId || null,
        relatedBikeIds: relatedBikeIds.split(",").map(x => x.trim()).filter(Boolean), contentType });
      setMessage("Vídeo salvo. O catálogo comercial e a planilha não foram alterados.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "editorial-workspace"] });
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao salvar."); }
    finally { setSaving(false); }
  }
  return <>
    <Heading title="Biblioteca de vídeos" detail="A aba Videos Youtube é a fonte de descoberta; transcrições e relações editoriais ficam no Admin." />
    {(error || readError) && <Notice danger>{error || readError}</Notice>}{message && <Notice>{message}</Notice>}
    {(sheetQuery.isPending || workspaceQuery.isPending) && items.length === 0 && <p aria-busy="true" className="mb-4">Carregando biblioteca…</p>}
    <div className="mb-4 flex flex-wrap gap-2">
      <input aria-label="Buscar vídeo" className={`${INPUT} max-w-sm`} placeholder="Buscar vídeo" value={query} onChange={e => setQuery(e.target.value)} />
      <select aria-label="Filtrar vídeos" className={INPUT + " max-w-xs"} value={filter} onChange={e => setFilter(e.target.value)}>
        <option value="all">Todos</option><option value="no-transcript">Sem transcrição</option>
        <option value="no-article">Sem artigo</option><option value="no-bike">Sem bike relacionada</option><option value="processed">Já processados</option>
      </select>
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className={PANEL}><p className="mb-3 text-sm text-muted-foreground">{items.length} vídeos encontrados</p>
        <div className="max-h-[70vh] divide-y divide-line overflow-y-auto">{items.map(v => {
          const saved = storedMap.get(v.videoId), article = articleMap.get(v.videoId);
          return <button key={v.videoId} onClick={() => select(v)} className="flex w-full gap-3 py-3 text-left hover:bg-surface">
            <img src={v.thumbnail} alt="" loading="lazy" className="h-16 w-24 shrink-0 rounded-md object-cover" />
            <span className="min-w-0"><strong className="line-clamp-2 text-sm">{v.title}</strong>
              <span className="mt-1 block text-xs text-muted-foreground">
                {saved?.transcript ? "Transcrição cadastrada" : "Sem transcrição"} · {article ? `Artigo ${article.status}` : "Sem artigo"}
                {!(saved?.primary_bike_id || v.bikeIds.length) ? " · Sem bike" : ""}
              </span>
            </span>
          </button>;
        })}</div>
      </div>
      <aside className={PANEL}>{selected ? <form onSubmit={save} className="space-y-4">
        <h2 className="text-lg font-semibold">Editar vídeo</h2>
        <p className="text-xs text-muted-foreground">YouTube ID: {selected.videoId}</p>
        <label className="block text-sm font-medium">Título<input className={`${INPUT} mt-1`} value={title} onChange={e => setTitle(e.target.value)} required /></label>
        <label className="block text-sm font-medium">Bike principal (ID)<input className={`${INPUT} mt-1`} value={primaryBikeId} onChange={e => setPrimaryBikeId(e.target.value)} /></label>
        <label className="block text-sm font-medium">Bikes relacionadas (IDs separados por vírgula)<input className={`${INPUT} mt-1`} value={relatedBikeIds} onChange={e => setRelatedBikeIds(e.target.value)} /></label>
        <label className="block text-sm font-medium">Tipo de conteúdo<select className={`${INPUT} mt-1`} value={contentType} onChange={e => setContentType(e.target.value)}>
          {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select></label>
        <label className="block text-sm font-medium">Transcrição completa<textarea className={`${INPUT} mt-1 min-h-48`} value={transcript} onChange={e => setTranscript(e.target.value)} placeholder="Cole a transcrição revisada do vídeo." /></label>
        <div className="flex flex-wrap gap-2">
          <button className={BTN} disabled={saving}>{saving ? "Salvando…" : "Salvar vídeo"}</button>
          <Link to="/admin/conteudos/novo" search={{ video: selected.videoId }} className={OUTLINE}>Criar artigo</Link>
        </div>
        <a href={selected.url} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-800 underline">Ver no YouTube</a>
      </form> : <p className="text-sm text-muted-foreground">Selecione um vídeo para cadastrar transcrição e relações.</p>}</aside>
    </div>
  </>;
}

export function AdminArticlesPage() {
  return <AdminShell>{role => <OnlyEditorial role={role}><Articles /></OnlyEditorial>}</AdminShell>;
}
type SimpleStatus = "draft" | "published" | "archived";
const simpleStatus = (s: string): SimpleStatus => s === "published" ? "published" : s === "archived" ? "archived" : "draft";
const STATUS_LABEL: Record<SimpleStatus, string> = { draft: "Rascunho", published: "Publicado", archived: "Arquivado" };
function Articles() {
  const [status, setStatus] = useState<"all" | SimpleStatus>("all");
  const workspace = useQuery({ queryKey: ["admin", "editorial-workspace"],
    queryFn: () => adminCall<AdminEditorialWorkspace>("editorial-workspace"), staleTime: ADMIN_STALE_MS, refetchOnWindowFocus: false, retry: false });
  const items = workspace.data?.articles ?? [];
  const error = workspace.error ? queryError(workspace.error, "Não foi possível carregar os artigos.") : "";
  const visible = items.filter(a => status === "all" || simpleStatus(a.status) === status);
  return <>
    <Heading title="Artigos"><Link to="/admin/conteudos/novo" search={{ video: undefined }} className={BTN}>Criar artigo</Link></Heading>
    {error && <Notice danger>{error}</Notice>}
    <select aria-label="Filtrar por status" value={status} onChange={e => setStatus(e.target.value as typeof status)} className={`${INPUT} mb-4 max-w-xs`}>
      <option value="all">Todos</option>
      {(Object.keys(STATUS_LABEL) as SimpleStatus[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
    </select>
    <div className={PANEL}><ul className="divide-y divide-line">{visible.map(a => <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
      <Link to="/admin/conteudos/$id" params={{ id: a.id }} className="font-semibold text-emerald-800 underline">{a.title || "Sem título"}</Link>
      <span className="text-sm text-muted-foreground">{STATUS_LABEL[simpleStatus(a.status)]} · {date(a.updated_at)}</span>
    </li>)}</ul>{visible.length === 0 && <p className="py-4 text-sm text-muted-foreground">Nenhum artigo.</p>}</div>
  </>;
}

export function AdminNewArticlePage({ initialVideoId }: { initialVideoId?: string }) {
  return <AdminShell>{role => <OnlyEditorial role={role}><NewArticle initialVideoId={initialVideoId} /></OnlyEditorial>}</AdminShell>;
}
function NewArticle({ initialVideoId }: { initialVideoId?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const videoUrlInput = useRef<HTMLInputElement>(null);
  const transcriptDrafts = useRef(new Map<string, string>());
  const catalogQuery = useQuery({ queryKey: ["admin", "video-catalog"], queryFn: getSheetVideoCatalog,
    staleTime: ADMIN_STALE_MS, refetchOnWindowFocus: false, retry: false });
  const workspaceQuery = useQuery({ queryKey: ["admin", "editorial-workspace"],
    queryFn: () => adminCall<AdminEditorialWorkspace>("editorial-workspace"), staleTime: ADMIN_STALE_MS, refetchOnWindowFocus: false, retry: false });
  const catalog = useMemo(() => catalogQuery.data ?? [], [catalogQuery.data]);
  const savedVideos = useMemo(() => workspaceQuery.data?.videos ?? [], [workspaceQuery.data?.videos]);
  const [videoSource, setVideoSource] = useState<"library" | "url">("library");
  const [videoId, setVideoId] = useState(initialVideoId ?? "");
  const [videoSearch, setVideoSearch] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [transcript, setTranscript] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const videos = useMemo(() => {
    const merged = [...catalog];
    for (const video of savedVideos) if (!merged.some(item => item.videoId === video.youtube_id)) merged.push({
      videoId: video.youtube_id, title: video.title, date: video.published_on, url: video.youtube_url,
      thumbnail: video.thumbnail_url ?? "", bikeIds: video.related_bike_ids, unmatched: [],
    });
    return merged;
  }, [catalog, savedVideos]);
  const filteredVideos = useMemo(() => filterAdminVideos(videos, videoSearch), [videos, videoSearch]);
  const existingManualVideo = videoSource === "url"
    ? videos.find(video => video.videoId === parseYoutubeId(manualUrl)) ?? null
    : null;
  const selected = videoSource === "library"
    ? videos.find(video => video.videoId === videoId) ?? null
    : existingManualVideo ? null : manualAdminVideo(manualUrl, manualTitle);
  const selectedVideoId = selected?.videoId ?? "";

  useEffect(() => {
    if (!selectedVideoId) { setTranscript(""); return; }
    const saved = savedVideos.find(video => video.youtube_id === selectedVideoId);
    setTranscript(transcriptDrafts.current.get(selectedVideoId) ?? saved?.transcript ?? "");
  }, [selectedVideoId, savedVideos]);

  async function copyVideoUrl() {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.url);
      setCopyStatus("Link copiado.");
    } catch {
      videoUrlInput.current?.focus();
      videoUrlInput.current?.select();
      setCopyStatus("Selecione e copie o link no campo.");
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!selected) { setError(existingManualVideo ? "Este vídeo já está na biblioteca. Selecione-o na busca." : videoSource === "url" ? "Informe um link válido do YouTube e o título do vídeo." : "Escolha um vídeo da biblioteca."); return; }
    setBusy("Entendendo conteúdo…");
    try {
      const result = await adminStream<{ article: EditorialArticle }>("generate", {
        youtubeId: selected.videoId, title: selected.title, transcript,
      }, setBusy);
      await queryClient.invalidateQueries({ queryKey: ["admin", "editorial-workspace"] });
      await navigate({ to: "/admin/conteudos/$id", params: { id: result.article.id } });
    } catch (e) { setError(e instanceof Error ? e.message : "Não conseguimos gerar o artigo. Tente novamente."); setBusy(""); }
  }
  return <>
    <Heading title="Criar artigo" />
    {(error || (videoSource === "library" && catalogQuery.error) || workspaceQuery.error) && <Notice danger>{error || (workspaceQuery.error
      ? queryError(workspaceQuery.error, "Não foi possível carregar os vídeos.")
      : "A planilha de vídeos está indisponível. Você ainda pode usar um vídeo já importado.")}</Notice>}
    <form onSubmit={create} className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-9">
      <fieldset disabled={Boolean(busy)} className="space-y-4">
        <legend className="text-base font-semibold">Qual vídeo será usado?</legend>
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={videoSource === "library"} className={videoSource === "library" ? BTN : OUTLINE}
            onClick={() => { setVideoSource("library"); setCopyStatus(""); setError(""); }}>Buscar na biblioteca</button>
          <button type="button" aria-pressed={videoSource === "url"} className={videoSource === "url" ? BTN : OUTLINE}
            onClick={() => { setVideoSource("url"); setCopyStatus(""); setError(""); }}>Usar outro vídeo</button>
        </div>
        {videoSource === "library" ? <div>
          <label htmlFor="article-video-search" className="block text-sm font-semibold">Buscar por título ou ID</label>
          <input id="article-video-search" type="search" autoComplete="off" className={`${INPUT} mt-2 py-3`}
            value={videoSearch} onChange={e => setVideoSearch(e.target.value)} placeholder="Ex.: V9 Max, autonomia, teste…" />
          <p role="status" className="mt-2 text-xs text-muted-foreground">
            {catalogQuery.isPending || workspaceQuery.isPending ? "Carregando vídeos…" : `${filteredVideos.length} de ${videos.length} vídeos encontrados`}
          </p>
          <div aria-label="Resultados da busca de vídeos" className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
            {filteredVideos.map(video => <button key={video.videoId} type="button" aria-pressed={videoId === video.videoId}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 ${videoId === video.videoId ? "bg-emerald-50 font-semibold text-emerald-900" : ""}`}
              onClick={() => { setVideoId(video.videoId); setCopyStatus(""); setError(""); }}>
              {video.title}<span className="mt-1 block text-xs font-normal text-muted-foreground">{video.videoId}</span>
            </button>)}
            {!catalogQuery.isPending && !workspaceQuery.isPending && filteredVideos.length === 0 && <p className="p-3 text-sm text-muted-foreground">Nenhum vídeo encontrado. Tente outro termo ou use “Usar outro vídeo”.</p>}
          </div>
        </div> : <div className="space-y-4">
          <label className="block text-sm font-semibold">Link do vídeo no YouTube
            <input type="url" className={`${INPUT} mt-2 py-3`} value={manualUrl} onChange={e => { setManualUrl(e.target.value); setCopyStatus(""); }}
              placeholder="https://www.youtube.com/watch?v=…" required />
          </label>
          {manualUrl && !manualAdminVideo(manualUrl, "Título provisório") && <p role="alert" className="text-sm text-red-700">Use um link válido do YouTube ou youtu.be.</p>}
          {existingManualVideo && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
            <p>Este vídeo já está na biblioteca: <strong>{existingManualVideo.title}</strong>.</p>
            <button type="button" className="mt-2 font-semibold underline" onClick={() => { setVideoId(existingManualVideo.videoId); setVideoSearch(existingManualVideo.title); setVideoSource("library"); }}>Selecionar este vídeo na biblioteca</button>
          </div>}
          <label className="block text-sm font-semibold">Título do vídeo
            <input className={`${INPUT} mt-2 py-3`} value={manualTitle} onChange={e => setManualTitle(e.target.value)}
              placeholder="Título que identifica este vídeo" required minLength={3} maxLength={300} />
          </label>
          <p className="text-xs text-muted-foreground">O vídeo será incluído no acervo editorial do Admin ao gerar o artigo. A planilha não será alterada.</p>
        </div>}
      </fieldset>
      {selected && <div className="space-y-3 rounded-2xl bg-surface p-4">
        <div className="flex gap-4">
          {selected.thumbnail && <img src={selected.thumbnail} alt="" className="h-20 w-32 rounded-lg object-cover" />}
          <div className="min-w-0"><p className="font-semibold">{selected.title}</p>
            <a href={selected.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm text-emerald-800 underline">Abrir no YouTube</a>
          </div>
        </div>
        <label htmlFor="selected-video-url" className="block text-sm font-semibold">Link do vídeo para copiar</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input id="selected-video-url" ref={videoUrlInput} readOnly value={selected.url} className={`${INPUT} min-w-0 flex-1`} onFocus={e => e.target.select()} />
          <button type="button" className={OUTLINE} onClick={() => void copyVideoUrl()}>Copiar link</button>
        </div>
        {copyStatus && <p role="status" className="text-sm text-emerald-800">{copyStatus}</p>}
      </div>}
      <label className="block text-base font-semibold">Transcrição completa<textarea className={`${INPUT} mt-2 min-h-72 leading-7`} value={transcript}
        onChange={e => { setTranscript(e.target.value); if (selectedVideoId) transcriptDrafts.current.set(selectedVideoId, e.target.value); }} required minLength={200} disabled={Boolean(busy)}
        placeholder={videoSource === "library" ? "Cole aqui a transcrição revisada. URL e título já vêm da biblioteca." : "Cole aqui a transcrição revisada deste vídeo."} /></label>
      <button className={`${BTN} w-full py-3.5 text-base`} disabled={Boolean(busy)} aria-live="polite">{busy || "Gerar artigo"}</button>
      {busy && <p className="text-center text-sm text-muted-foreground">Isso leva um ou dois minutos. Mantenha esta aba aberta.</p>}
    </form>
  </>;
}

function previewArticle(a: EditorialArticle): PublishedArticle {
  return {
    id: a.id, slug: a.slug ?? "rascunho", title: a.title, summary: a.summary,
    blocks: a.blocks ?? [], faq: a.faq ?? [], seoTitle: a.seo_title,
    metaDescription: a.meta_description, ogTitle: a.og_title, ogDescription: a.og_description,
    ogImageUrl: a.og_image_url, indexable: a.indexable, publishedAt: a.published_at,
    videoId: a.video_id, primaryBikeId: a.primary_bike_id,
    relatedBikeIds: a.related_bike_ids ?? [], relatedArticleIds: a.related_article_ids ?? [],
  };
}

type EditDraft = { title: string; summary: string; body: string; slug: string; seoTitle: string; metaDescription: string;
  ogImageUrl: string; primaryBikeId: string; relatedBikeIds: string; indexable: boolean };
const toDraft = (a: EditorialArticle): EditDraft => ({ title: a.title, summary: a.summary, body: blocksToMarkdown(a.blocks),
  slug: a.slug ?? "", seoTitle: a.seo_title, metaDescription: a.meta_description, ogImageUrl: a.og_image_url ?? "",
  primaryBikeId: a.primary_bike_id ?? "", relatedBikeIds: (a.related_bike_ids ?? []).join(", "), indexable: a.indexable });

export function AdminArticleEditorPage({ id }: { id: string }) {
  return <AdminShell>{role => <OnlyEditorial role={role}><ArticleAdmin id={id} role={role} /></OnlyEditorial>}</AdminShell>;
}
function ArticleAdmin({ id, role }: { id: string; role: AdminRole }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [article, setArticle] = useState<EditorialArticle | null>(null);
  const [bikes, setBikes] = useState<Awaited<ReturnType<typeof getBikesDiscovery>>["bikes"]>([]);
  const [index, setIndex] = useState<{ id: string; slug: string; title: string; primaryBikeId?: string | null }[]>([]);
  const [relatedVideos, setRelatedVideos] = useState<VideoCard[]>([]);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { void Promise.all([
    adminCall<{ article: EditorialArticle }>("article-get", { id }), getBikesDiscovery(), getPublishedArticles(),
  ]).then(async ([detail, catalog, published]) => { setArticle(detail.article); setBikes(catalog.bikes); setIndex(published ?? []);
    if (detail.article.primary_bike_id) {
      const videos = await safeVideos({ bikeId: detail.article.primary_bike_id, limit: 12 });
      setRelatedVideos(videos.filter(item => item.videoId !== detail.article.video_id).slice(0, 4));
    } }).catch(e => setError(e.message)); }, [id]);
  async function run(name: string, payload: Record<string, unknown>, label: string) {
    if (!article) return null; setBusy(label); setError(""); setMessage("");
    try {
      const result = await adminCall<{ article?: EditorialArticle; ok?: boolean }>(name, { id, revision: article.revision, ...payload });
      if (result.article) {
        setArticle(result.article);
        await queryClient.invalidateQueries({ queryKey: ["admin", "editorial-workspace"] });
      }
      return result;
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível concluir."); return null; }
    finally { setBusy(""); }
  }
  async function changeStatus(status: SimpleStatus) {
    const result = await run("article-status", { status }, "Atualizando…");
    if (result?.article) setMessage(status === "published" ? "Publicado. A página já está no ar." : `Status: ${STATUS_LABEL[status]}.`);
  }
  async function save() {
    if (!draft) return;
    const result = await run("article-save", { title: draft.title, summary: draft.summary, body: draft.body, advanced: {
      slug: draft.slug, seoTitle: draft.seoTitle, metaDescription: draft.metaDescription, ogImageUrl: draft.ogImageUrl,
      primaryBikeId: draft.primaryBikeId, relatedBikeIds: draft.relatedBikeIds.split(",").map(x => x.trim()).filter(Boolean), indexable: draft.indexable,
    } }, "Salvando…");
    if (result?.article) { setDraft(null); setMessage(simpleStatus(result.article.status) === "published" ? "Salvo. A página pública foi atualizada." : "Salvo."); }
  }
  async function remove() {
    if (!article || !window.confirm("Excluir este artigo definitivamente?")) return;
    let current = article;
    if (current.status !== "archived") { const r = await run("archive-article", {}, "Arquivando…"); if (!r?.article) return; current = r.article; }
    setBusy("Excluindo…");
    try {
      await adminCall("delete-article", { id, revision: current.revision, confirm: current.slug });
      await queryClient.invalidateQueries({ queryKey: ["admin", "editorial-workspace"] });
      await navigate({ to: "/admin/conteudos" });
    }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível excluir."); setBusy(""); }
  }
  if (error && !article) return <Notice danger>{error}</Notice>;
  if (!article) return <p aria-busy="true">Carregando artigo…</p>;
  const status = simpleStatus(article.status);
  const bikeIds = [article.primary_bike_id, ...article.related_bike_ids].filter(Boolean);
  const relatedArticles = index.filter(a => a.id !== article.id &&
    (article.related_article_ids.includes(a.id) || (a.primaryBikeId && bikeIds.includes(a.primaryBikeId)))).slice(0, 4);
  const publicUrl = article.slug ? `/conteudos/${article.slug}` : null;
  const set = (next: Partial<EditDraft>) => setDraft(d => d ? { ...d, ...next } : d);
  return <>
    <div className="sticky top-0 z-10 -mx-4 mb-6 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/admin/conteudos" className="mr-auto text-sm text-emerald-800 underline">← Artigos</Link>
        <label className="flex items-center gap-2 text-sm font-semibold">Status
          <select className={`${INPUT} w-auto`} value={status} disabled={Boolean(busy) || Boolean(draft)} onChange={e => void changeStatus(e.target.value as SimpleStatus)}>
            {(Object.keys(STATUS_LABEL) as SimpleStatus[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select></label>
        {status === "published" && publicUrl
          ? <a href={publicUrl} target="_blank" rel="noopener noreferrer" className={OUTLINE}>Abrir página</a>
          : <button className={OUTLINE} disabled title="Disponível depois de publicar">Abrir página</button>}
        {draft ? <>
          <button className={OUTLINE} disabled={Boolean(busy)} onClick={() => setDraft(null)}>Cancelar</button>
          <button className={BTN} disabled={Boolean(busy)} onClick={() => void save()}>{busy || "Salvar"}</button>
        </> : <button className={BTN} disabled={Boolean(busy)} onClick={() => setDraft(toDraft(article))}>Editar</button>}
        <details className="relative">
          <summary className={`${OUTLINE} cursor-pointer list-none`} aria-label="Mais ações">Mais</summary>
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-line bg-white p-2 shadow-lg">
            <button className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-emerald-50 disabled:opacity-50" disabled={Boolean(busy) || status === "published"}
              title={status === "published" ? "Mude para Rascunho para regenerar" : undefined}
              onClick={() => { if (window.confirm("Gerar o artigo novamente a partir da transcrição?")) void run("compile-article", {}, "Regenerando… (1–2 min)").then(r => r?.article && setMessage("Artigo regenerado.")); }}>Regenerar artigo</button>
            <button className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-emerald-50 disabled:opacity-50" disabled={Boolean(busy) || status === "archived"}
              onClick={() => void changeStatus("archived")}>Arquivar</button>
            {role === "admin" && <button className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50" disabled={Boolean(busy)} onClick={() => void remove()}>Excluir</button>}
          </div>
        </details>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{busy || (status === "draft" ? "Artigo criado pela Vitale. Você decide quando colocá-lo no ar." : status === "published" ? `No ar em vitalemobilidade.com${publicUrl}` : "Arquivado — fora do site.")}</p>
    </div>
    {error && <Notice danger>{error}</Notice>}{message && <Notice>{message}</Notice>}
    {draft ? <section className="mx-auto max-w-4xl space-y-5 rounded-3xl bg-white p-6 shadow-sm sm:p-10">
      <label className="block text-sm font-semibold">Título<input className="mt-2 w-full border-0 border-b border-line px-0 py-2 text-3xl font-bold" value={draft.title} onChange={e => set({ title: e.target.value })} /></label>
      <label className="block text-sm font-semibold">Introdução<textarea className={`${INPUT} mt-2 min-h-24 text-lg leading-8`} value={draft.summary} onChange={e => set({ summary: e.target.value })} /></label>
      <label className="block text-sm font-semibold">Corpo do artigo
        <span className="mt-1 block text-xs font-normal text-muted-foreground">## Subtítulo · ### Subtópico · **negrito** · - item de lista · &gt; citação. Vídeo, Radar, oferta e Quiz entram sozinhos.</span>
        <textarea className={`${INPUT} mt-2 min-h-[32rem] font-mono text-sm leading-7`} value={draft.body} onChange={e => set({ body: e.target.value })} /></label>
      <details className="rounded-xl bg-surface p-4 text-sm">
        <summary className="cursor-pointer font-semibold">Configurações avançadas</summary>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label>Endereço (slug)<input className={`${INPUT} mt-1`} value={draft.slug} onChange={e => set({ slug: e.target.value })} /></label>
          <label>Imagem de compartilhamento (HTTPS)<input className={`${INPUT} mt-1`} value={draft.ogImageUrl} onChange={e => set({ ogImageUrl: e.target.value })} /></label>
          <label>Título SEO<input className={`${INPUT} mt-1`} value={draft.seoTitle} onChange={e => set({ seoTitle: e.target.value })} /></label>
          <label>Descrição SEO<input className={`${INPUT} mt-1`} value={draft.metaDescription} onChange={e => set({ metaDescription: e.target.value })} /></label>
          <label>Bike principal (ID)<input className={`${INPUT} mt-1`} value={draft.primaryBikeId} onChange={e => set({ primaryBikeId: e.target.value })} /></label>
          <label>Bikes relacionadas (IDs)<input className={`${INPUT} mt-1`} value={draft.relatedBikeIds} onChange={e => set({ relatedBikeIds: e.target.value })} /></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={draft.indexable} onChange={e => set({ indexable: e.target.checked })} /> Permitir indexação</label>
          <p className="text-muted-foreground">Canonical: https://vitalemobilidade.com/conteudos/{draft.slug} · Dados estruturados: Article, VideoObject, BreadcrumbList.</p>
        </div>
      </details>
    </section> : <div className="rounded-3xl bg-white shadow-sm"><ArticleView article={previewArticle(article)} bikes={bikes}
      relatedArticles={relatedArticles} relatedVideos={relatedVideos} /></div>}
  </>;
}

export function AdminArticlePreviewPage({ id }: { id: string }) {
  return <AdminArticleEditorPage id={id} />;
}

export function AdminAiPage() {
  return <AdminShell>{role => <OnlyEditorial role={role}><AiStatus role={role} /></OnlyEditorial>}</AdminShell>;
}
type AiState = {
  prompt: { version: number; model: string; schemaVersion: number; createdAt: string; changeReason: string; systemPrompt?: string };
  runs: { id: string; article_id: string; kind: string; status: string; prompt_version: number; model: string; error_code: string | null; started_at: string }[];
};
function AiStatus({ role }: { role: AdminRole }) {
  const [data, setData] = useState<AiState | null>(null);
  const [newPrompt, setNewPrompt] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() { const result = await adminCall<AiState>("ai-status"); setData(result); setNewPrompt(result.prompt.systemPrompt ?? ""); }
  useEffect(() => { void load().catch(e => setError(e.message)); }, []);
  async function savePrompt(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try { const result = await adminCall<{ version: number }>("prompt-create", { systemPrompt: newPrompt, reason });
      setMessage(`Prompt v${result.version} criado. Versões anteriores permanecem preservadas.`); setReason(""); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Falha ao criar versão."); }
    finally { setBusy(false); }
  }
  return <>
    <Heading title="Article Compiler" detail="Geração de rascunhos ancorados em vídeo e dados reais. Publicação sempre humana." />
    {error && <Notice danger>{error}</Notice>}{message && <Notice>{message}</Notice>}
    {!data ? <p aria-busy="true">Carregando estado da IA…</p> : <>
      <div className={PANEL}><h2 className="text-lg font-semibold">Versão ativa do prompt</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3"><div><dt>Versão</dt><dd className="font-bold">v{data.prompt.version}</dd></div>
          <div><dt>Modelo</dt><dd className="font-bold">{data.prompt.model}</dd></div>
          <div><dt>Schema</dt><dd className="font-bold">v{data.prompt.schemaVersion}</dd></div></dl>
        <p className="mt-3 text-sm text-muted-foreground">{data.prompt.changeReason} · {date(data.prompt.createdAt)}</p>
      </div>
      {role === "admin" && <form onSubmit={savePrompt} className={`${PANEL} mt-5 space-y-3`}>
        <h2 className="text-lg font-semibold">Nova versão do prompt</h2>
        <p className="text-sm text-muted-foreground">Uma nova versão não altera execuções anteriores. Revise o texto completo antes de salvar.</p>
        <textarea aria-label="Prompt de sistema" className={`${INPUT} min-h-52`} value={newPrompt} onChange={e => setNewPrompt(e.target.value)} required />
        <input aria-label="Motivo da alteração" className={INPUT} placeholder="Motivo da alteração" value={reason} onChange={e => setReason(e.target.value)} required />
        <button className={BTN} disabled={busy || newPrompt.length < 100 || reason.length < 10}>Criar versão</button>
      </form>}
      <div className={`${PANEL} mt-5`}><h2 className="mb-3 text-lg font-semibold">Últimas execuções</h2>
        <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead><tr className="border-b border-line"><th>Quando</th><th>Artigo</th><th>Tipo</th><th>Estado</th><th>Prompt</th><th>Erro</th></tr></thead>
          <tbody>{data.runs.map(r => <tr key={r.id} className="border-b border-line/70"><td className="py-2">{date(r.started_at)}</td>
            <td><Link to="/admin/conteudos/$id" params={{ id: r.article_id }} className="text-emerald-800 underline">Abrir</Link></td><td>{r.kind}</td><td>{r.status}</td>
            <td>v{r.prompt_version}</td><td>{r.error_code ?? "—"}</td></tr>)}</tbody></table></div>
        {data.runs.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma geração executada ainda.</p>}
      </div>
    </>}
  </>;
}

export function AdminLogsPage() {
  return <AdminShell>{role => role === "admin" ? <Logs /> : <Notice danger>Somente Admin pode ver logs.</Notice>}</AdminShell>;
}
function Logs() {
  const [logs, setLogs] = useState<{ id: number; actor: string | null; action: string; entity_type: string; entity_id: string; created_at: string; detail: Record<string, unknown> }[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { void adminCall<{ logs: typeof logs }>("logs").then(v => setLogs(v.logs)).catch(e => setError(e.message)); }, []);
  return <>
    <Heading title="Logs" detail="Ações administrativas relevantes, sem registrar cada clique." />
    {error && <Notice danger>{error}</Notice>}
    <div className={PANEL}><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm">
      <thead><tr className="border-b border-line"><th>Data</th><th>Ação</th><th>Entidade</th><th>Ator</th></tr></thead>
      <tbody>{logs.map(l => <tr key={l.id} className="border-b border-line/70"><td className="py-2">{date(l.created_at)}</td>
        <td>{l.action}</td><td>{l.entity_type} · {l.entity_id}</td><td className="max-w-44 truncate">{l.actor ?? "sistema"}</td></tr>)}</tbody>
    </table></div>{logs.length === 0 && <p className="py-4 text-sm text-muted-foreground">Nenhuma ação registrada.</p>}</div>
  </>;
}
