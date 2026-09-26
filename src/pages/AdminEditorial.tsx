import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminCall, adminStream, funnelPct, type AdminBike, type AdminGrowth, type AdminOffer, type AdminOverview, type AdminRole,
  type AdminEditorialWorkspace } from "@/lib/admin-api";
import { getSheetVideoCatalog } from "@/lib/videos.functions";
import { getBikesDiscovery } from "@/lib/bikes-discovery.functions";
import { getPublishedArticles } from "@/lib/editorial.functions";
import { safeVideos, type VideoCard } from "@/lib/videos.functions";
import { parseYoutubeId, type VideoItem } from "@/lib/video-catalog";
import { filterAdminVideos, manualAdminVideo } from "@/lib/admin-video-picker";
import { ArticleView, type PublishedArticle } from "@/components/editorial/ArticleView";
import { composeCover } from "@/lib/cover-compose";
import { blocksToMarkdown, CONTENT_TYPES, type EditorialArticle } from
  "../../supabase/functions/_shared/editorial-contract";
import type { EditorialBrief } from "../../supabase/functions/_shared/editorial-foundation";

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
  const f = data?.funnel ?? null;
  return <>
    <Heading title="Growth" detail="Funil real do Quiz, leads e cliques de compra comprovados pelos dados da Vitale.">
      <label className="text-sm font-semibold">Período<select className={`${INPUT} ml-2 w-auto`} value={rangeDays}
        onChange={e => setRangeDays(Number(e.target.value))}>
        <option value={7}>7 dias</option><option value={30}>30 dias</option><option value={90}>90 dias</option>
      </select></label>
    </Heading>
    {error && <Notice danger>{error}</Notice>}
    {growth.isFetching && data && <p role="status" className="mb-3 text-xs text-muted-foreground">Atualizando indicadores…</p>}
    {!data || !f ? <p aria-busy="true">Carregando indicadores…</p> : <>
      <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        <strong>Cobertura:</strong> o funil anônimo do Quiz é medido {f.coverageSince ? <>desde {date(f.coverageSince)}</> : "a partir da implantação (ainda sem sessões registradas)"}. Visitas anteriores não têm dados e não são estimadas. O Admin não lê GA4: não há pageviews do site inteiro aqui.
      </p>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Funil anônimo (sessões por primeira visita no período)</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([["Visitantes da página do Quiz", f.pageVisitors, null], ["Iniciaram", f.started, funnelPct(f.started, f.pageVisitors)],
          ["Formulário alcançado", f.leadFormReached, funnelPct(f.leadFormReached, f.started)], ["Concluíram", f.completed, funnelPct(f.completed, f.started)]] as const)
          .map(([label, value, rate]) => <div key={label} className={PANEL}><p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>{rate && <p className="mt-1 text-xs text-muted-foreground">{rate} da etapa anterior</p>}</div>)}
      </div>
      <h2 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Leads e compra (cadastros identificados no período)</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {[["Leads únicos (por telefone)", f.uniqueLeads], ["Cliques de compra", f.purchaseClicks], ["Pessoas identificadas que clicaram", f.identifiedClickers]]
          .map(([label, value]) => <div key={label} className={PANEL}><p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p></div>)}
      </div>
      <section className={`${PANEL} mt-5`}><h2 className="text-lg font-semibold">Funil por pergunta</h2>
        <p className="mt-1 text-xs text-muted-foreground">Abandono conta somente sessões sem atividade há mais de {f.abandonAfterMinutes} min. Sessões ativas ficam fora do abandono.</p>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="border-b border-line text-muted-foreground">
          <th className="pb-3">Etapa</th><th>Alcance</th><th>Avançaram</th><th>Avanço</th><th>Abandono</th></tr></thead>
          <tbody>
            <tr className="border-b border-line/70"><td className="py-2 font-medium">Página (antes de iniciar)</td><td>{f.pageVisitors}</td><td>{f.started}</td><td>{funnelPct(f.started, f.pageVisitors)}</td><td>{f.introAbandoned}</td></tr>
            {f.steps.map(s => <tr key={s.step} className="border-b border-line/70"><td className="py-2 font-medium">Pergunta {s.step}</td><td>{s.reached}</td>
              <td>{s.advanced}</td><td>{funnelPct(s.advanced, s.reached)}</td><td>{s.abandoned}</td></tr>)}
            <tr><td className="py-2 font-medium">Formulário de contato</td><td>{f.leadFormReached}</td><td>{f.completed}</td><td>{funnelPct(f.completed, f.leadFormReached)}</td><td>{f.leadFormAbandoned}</td></tr>
          </tbody></table></div>
        <p className="mt-3 text-xs text-muted-foreground">“Concluíram” exige recomendação final exibida. Leads identificados não são usados como conclusão do funil.</p>
      </section>
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
  const distribution = Object.entries((workspace.data?.briefs ?? []).reduce<Record<string, number>>((counts, brief) => {
    const key = brief.archetype ?? (brief.status === "in_progress" ? "em andamento" : "intenção incerta");
    counts[key] = (counts[key] ?? 0) + 1; return counts;
  }, {})).sort((a, b) => b[1] - a[1]);
  return <>
    <Heading title="Artigos"><Link to="/admin/conteudos/novo" search={{ video: undefined }} className={BTN}>Criar artigo</Link></Heading>
    {error && <Notice danger>{error}</Notice>}
    <section className={`${PANEL} mb-5`} aria-label="Distribuição editorial"><h2 className="font-semibold">Distribuição por arquétipo</h2>
      <p className="mt-1 text-sm text-muted-foreground">Outlines criados: {workspace.data?.briefs.length ?? 0}. Os artigos antigos permanecem na base de similaridade.</p>
      <ul className="mt-3 flex flex-wrap gap-2">{distribution.map(([name, count]) => <li key={name} className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-950">{name}: {count}</li>)}</ul>
    </section>
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
    const outlineOnly = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "outline";
    setBusy(outlineOnly ? "Analisando para o outline…" : "Entendendo conteúdo…");
    try {
      const result = await adminStream<{ article: EditorialArticle }>(outlineOnly ? "outline-only" : "generate", {
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
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="submit" value="outline" className={`${BTN} py-3.5 text-base`} disabled={Boolean(busy)} aria-live="polite">{busy || "Gerar somente outline"}</button>
        <button type="submit" value="draft" className={`${OUTLINE} py-3.5 text-base`} disabled={Boolean(busy)}>{busy ? "Aguarde…" : "Gerar outline e escrever rascunho"}</button>
      </div>
      <p className="text-center text-sm text-muted-foreground">O outline não escreve o artigo nem publica: mostra fonte, intenção, tese, módulos e alertas de repetição.</p>
      <p className="text-center text-sm text-muted-foreground">O rascunho fica privado. O QA de publicação roda depois, em etapa separada, dentro do artigo.</p>
      {busy && <p className="text-center text-sm text-muted-foreground">A análise pode levar alguns minutos. Mantenha esta aba aberta.</p>}
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
type BriefRow = { version: number; status: string; archetype?: string | null; primary_intent?: string | null;
  payload: Partial<EditorialBrief>; stages?: Record<string, { at?: string } | undefined>;
  quality_report: { differentiationScore?: number; qualityScore?: number; seoScore?: number; issues?: string[];
    closestArticleId?: string | null; intentUncertain?: boolean; articleQaPass?: boolean } };

const ARCHETYPE_LABEL: Record<string, string> = {
  direct_comparison: "Comparação direta", product_review: "Review de produto", real_world_test: "Teste real",
  buying_guide: "Guia de compra", audience_need: "Necessidade de público", education: "Educação",
  market_price: "Mercado e preço", curated_list: "Lista curada", use_comparison: "Comparação por uso",
};
const STAGE_LABEL: [string, string][] = [["source", "Fonte"], ["intent", "Intenção"], ["outline", "Outline"]];

/** Read-only view of the private brief: evidence, intent, thesis, modules, links and repetition alerts. */
function BriefPanel({ brief, index }: { brief: BriefRow; index: { id: string; slug: string; title: string }[] }) {
  const p = brief.payload ?? {};
  const claims = p.claims ?? []; const sections = p.sections ?? []; const modules = p.modules ?? [];
  const links = modules.filter(m => m.type === "article_link" && m.articleId);
  const closest = index.find(item => item.id === brief.quality_report?.closestArticleId);
  const issues = brief.quality_report?.issues ?? [];
  return <section className={`${PANEL} mb-6`} aria-label="Plano e qualidade editorial">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">Plano editorial</h2>
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold">
        {brief.quality_report?.intentUncertain ? "Intenção incerta" : ARCHETYPE_LABEL[p.archetype ?? brief.archetype ?? ""] ?? "Em andamento"} · {brief.status} · v{brief.version}</span></div>
    <ol className="mt-3 flex flex-wrap gap-2 text-xs" aria-label="Etapas salvas">{STAGE_LABEL.map(([key, label]) =>
      <li key={key} className={`rounded-full px-2 py-1 ${brief.stages?.[key]?.at ? "bg-emerald-100 text-emerald-900" : "bg-muted text-muted-foreground"}`}>
        {label}{brief.stages?.[key]?.at ? " ✓" : ""}</li>)}</ol>
    {(p.primaryIntent || brief.primary_intent) && <p className="mt-3"><strong>Intenção:</strong> {p.primaryIntent ?? brief.primary_intent}</p>}
    {p.thesis && <p className="mt-1"><strong>Tese:</strong> {p.thesis}</p>}
    {p.uniqueInsight && <p className="mt-1"><strong>Diferencial:</strong> {p.uniqueInsight}</p>}
    {sections.length > 0 && <ol className="mt-4 list-decimal space-y-1 pl-5">{sections.map((section, i) => <li key={`${i}-${section.heading}`}>
      <strong>{section.heading}</strong><span className="text-muted-foreground"> — {section.purpose}</span></li>)}</ol>}
    {modules.length > 0 && <div className="mt-4"><h3 className="font-semibold">Módulos contextuais</h3><ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
      {modules.map((m, i) => <li key={i}><strong>{m.type}</strong> após seção {m.afterSection + 1} — {m.reason}</li>)}</ul></div>}
    {links.length > 0 && <div className="mt-4"><h3 className="font-semibold">Links sugeridos</h3><ul className="mt-1 list-disc pl-5 text-sm">
      {links.map((m, i) => { const target = index.find(item => item.id === m.articleId);
        return <li key={i}>{target ? target.title : "Artigo publicado"} — {m.reason}</li>; })}</ul></div>}
    {claims.length > 0 && <details className="mt-4"><summary className="cursor-pointer font-semibold">Evidências da fonte ({claims.length})</summary>
      <ul className="mt-2 space-y-2 text-sm">{claims.map(c => <li key={c.id}><strong>{c.id}</strong> [{c.kind}] {c.statement}
        <blockquote className="mt-1 border-l-2 border-line pl-2 text-muted-foreground">“{c.excerpt}”</blockquote></li>)}</ul></details>}
    <p className="mt-3 text-sm text-muted-foreground">Diferenciação {brief.quality_report?.differentiationScore ?? "—"}/100
      {closest ? ` · mais próximo: ${closest.title}` : ""} · SEO/IA {brief.quality_report?.seoScore ?? "—"}/100 · qualidade {brief.quality_report?.qualityScore ?? "—"}/100</p>
    {issues.length > 0 && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950"><strong>Alertas</strong><ul className="mt-2 list-disc pl-5">{issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul></div>}
  </section>;
}

function ArticleAdmin({ id, role }: { id: string; role: AdminRole }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [article, setArticle] = useState<EditorialArticle | null>(null);
  const [brief, setBrief] = useState<BriefRow | null>(null);
  const [bikes, setBikes] = useState<Awaited<ReturnType<typeof getBikesDiscovery>>["bikes"]>([]);
  const [index, setIndex] = useState<{ id: string; slug: string; title: string; primaryBikeId?: string | null }[]>([]);
  const [relatedVideos, setRelatedVideos] = useState<VideoCard[]>([]);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { void Promise.all([
    adminCall<{ article: EditorialArticle; brief: typeof brief }>("article-get", { id }), getBikesDiscovery(), getPublishedArticles(),
  ]).then(async ([detail, catalog, published]) => { setArticle(detail.article); setBrief(detail.brief); setBikes(catalog.bikes); setIndex(published ?? []);
    if (detail.article.primary_bike_id) {
      const videos = await safeVideos({ bikeId: detail.article.primary_bike_id, limit: 12 });
      setRelatedVideos(videos.filter(item => item.videoId !== detail.article.video_id).slice(0, 4));
    } }).catch(e => setError(e.message)); }, [id]);
  async function stage(name: "brief-regenerate" | "draft-write" | "qa-run", label: string, payload: Record<string, unknown> = {}) {
    if (!article) return; setBusy(label); setError(""); setMessage("");
    try {
      const result = await adminStream<{ article?: EditorialArticle; brief?: typeof brief }>(name, { id, revision: article.revision, ...payload }, setBusy);
      if (result.article) setArticle(result.article);
      if (result.brief) setBrief(result.brief);
      await queryClient.invalidateQueries({ queryKey: ["admin", "editorial-workspace"] });
      setMessage(name === "qa-run" ? (result.article?.status === "published" ? "QA aprovado e publicado." : "QA concluído. Veja o resultado abaixo.") : "Etapa concluída.");
    } catch (e) { setError(e instanceof Error ? e.message : "A etapa falhou."); }
    finally { setBusy(""); }
  }
  async function run(name: string, payload: Record<string, unknown>, label: string) {
    if (!article) return null; setBusy(label); setError(""); setMessage("");
    try {
      const result = await adminCall<{ article?: EditorialArticle; brief?: typeof brief; ok?: boolean }>(name, { id, revision: article.revision, ...payload });
      if (result.article) {
        setArticle(result.article);
        await queryClient.invalidateQueries({ queryKey: ["admin", "editorial-workspace"] });
      }
      if (result.brief) setBrief(result.brief);
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
      <p className="mt-2 text-sm text-muted-foreground">{busy || (status === "draft" ? "Rascunho privado. A publicação automática depende do QA." : status === "published" ? `No ar em vitalemobilidade.com${publicUrl}` : "Arquivado — fora do site.")}</p>
    </div>
    {error && <Notice danger>{error}</Notice>}{message && <Notice>{message}</Notice>}
    {article.foundation_required && status !== "published" && <section className={`${PANEL} mb-6`} aria-label="Etapas editoriais">
      <h2 className="text-xl font-bold">Etapas</h2>
      <p className="mt-1 text-sm text-muted-foreground">Cada etapa roda separada e fica salva. Uma falha não apaga a etapa anterior.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className={OUTLINE} disabled={Boolean(busy)} onClick={() => void stage("brief-regenerate", "Gerando outline…", { force: true })}>Gerar outline de novo</button>
        <button className={OUTLINE} disabled={Boolean(busy) || brief?.status !== "ready"} title={brief?.status !== "ready" ? "Precisa de outline aprovado" : undefined}
          onClick={() => void stage("draft-write", "Escrevendo rascunho…")}>Escrever rascunho</button>
        <button className={OUTLINE} disabled={Boolean(busy) || brief?.status !== "ready" || article.blocks.length === 0}
          onClick={() => void stage("qa-run", "Revisando SEO, fatos e diversidade…")}>Rodar QA de publicação</button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Publicação automática só acontece quando o QA aprova e a liberação técnica estiver ativa; até lá o artigo aprovado fica privado.</p>
    </section>}
    {brief && <BriefPanel brief={brief} index={index} />}
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
    </section> : <>
      <CoverPanel article={article} disabled={Boolean(busy)} onApplied={async next => { setArticle(next);
        await queryClient.invalidateQueries({ queryKey: ["admin", "editorial-workspace"] }); }} />
      <div className="rounded-3xl bg-white shadow-sm"><ArticleView article={previewArticle(article)} bikes={bikes}
        relatedArticles={relatedArticles} relatedVideos={relatedVideos} /></div>
    </>}
  </>;
}

/** Manual AI cover pilot: generate/discard never write; apply is a separate, confirmed, revision-locked action. */
function CoverPanel({ article, disabled, onApplied }: { article: EditorialArticle; disabled: boolean; onApplied: (a: EditorialArticle) => Promise<void> }) {
  const [candidate, setCandidate] = useState<{ dataUrl: string; bytes: number; revision: number } | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [open, setOpen] = useState(false);
  const [currentBroken, setCurrentBroken] = useState(false);
  useEffect(() => { setCurrentBroken(false); }, [article.og_image_url]);
  const published = article.status === "published";
  async function generate() {
    setBusy("Gerando capa… (até 1 min)"); setError(""); setReviewed(false);
    try {
      const r = await adminCall<{ background: string; title: string; revision: number }>("cover-generate", { id: article.id, revision: article.revision });
      const composed = await composeCover(r.background, r.title);
      setCandidate({ ...composed, revision: r.revision });
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível gerar a capa."); }
    finally { setBusy(""); }
  }
  async function apply() {
    if (!candidate || !reviewed) return;
    if (published && !window.confirm("Este artigo está publicado. A nova capa aparece imediatamente na página, nos cards e no compartilhamento. Aplicar?")) return;
    setBusy("Aplicando…"); setError("");
    try {
      const r = await adminCall<{ article: EditorialArticle }>("cover-apply", { id: article.id, revision: candidate.revision, image: candidate.dataUrl });
      setCandidate(null); setReviewed(false);
      await onApplied(r.article);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível aplicar. A capa anterior foi mantida."); }
    finally { setBusy(""); }
  }
  const stale = candidate && candidate.revision !== article.revision;
  return <section aria-labelledby="cover-title" className={`${PANEL} mb-6`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 id="cover-title" className="text-lg font-semibold">Capa do artigo</h2>
        <p className="text-sm text-muted-foreground">Usada no topo do artigo, nos cards e no compartilhamento. O player do vídeo mantém a miniatura do YouTube.</p></div>
      {!open && !candidate && <button className={OUTLINE} disabled={disabled || Boolean(busy)} onClick={() => setOpen(true)}>Gerar capa com IA</button>}
    </div>
    {(open || candidate) && <>
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <figure><figcaption className="mb-2 text-sm font-semibold">Capa atual</figcaption>
          {article.og_image_url && !currentBroken
            ? <img src={article.og_image_url} alt="Capa atual" width={1280} height={720} onError={() => setCurrentBroken(true)} className="aspect-video w-full rounded-xl border border-line object-cover" />
            : <div className="grid aspect-video place-items-center rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted-foreground">
              {article.og_image_url ? "Capa aprovada fica visível publicamente quando o artigo está publicado." : "Sem capa."}</div>}
        </figure>
        <figure><figcaption className="mb-2 text-sm font-semibold">Candidata (não salva)</figcaption>
          {candidate
            ? <img src={candidate.dataUrl} alt="Capa candidata gerada por IA" width={1280} height={720} className="aspect-video w-full rounded-xl border border-line object-cover" />
            : <div aria-busy={Boolean(busy)} className="grid aspect-video place-items-center rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted-foreground">
              {busy || "Gere uma candidata: fundo novo por IA a partir da miniatura do vídeo, com o título exato e a marca Vitale."}</div>}
        </figure>
      </div>
      {candidate && <label className="mt-4 flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />
        <span>Revisei a imagem: sem texto inventado pela IA, título correto e legível, nada ofensivo ou enganoso. JPG 1280×720, {(candidate.bytes / 1024).toFixed(0)} KB.</span></label>}
      {stale && <p role="alert" className="mt-3 text-sm text-red-800">O artigo mudou desde a geração. Gere outra candidata.</p>}
      <div className="mt-4 flex flex-wrap gap-2" aria-live="polite">
        <button className={OUTLINE} disabled={disabled || Boolean(busy)} onClick={() => void generate()}>{busy.startsWith("Gerando") ? busy : candidate ? "Gerar outra" : "Gerar candidata"}</button>
        <button className={OUTLINE} disabled={Boolean(busy)} onClick={() => { setCandidate(null); setReviewed(false); setError(""); if (!candidate) setOpen(false); }}>{candidate ? "Descartar" : "Fechar"}</button>
        <button className={BTN} disabled={disabled || Boolean(busy) || !candidate || !reviewed || Boolean(stale)} onClick={() => void apply()}>{busy === "Aplicando…" ? busy : "Aplicar capa"}</button>
      </div>
      {published && <p className="mt-2 text-xs text-muted-foreground">Artigo publicado: aplicar altera a página pública imediatamente.</p>}
    </>}
  </section>;
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
