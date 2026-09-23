import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminCall, type AdminArticleList, type AdminBike, type AdminOffer, type AdminOverview, type AdminRole,
  type AdminVideoList, type ArticleRow } from "@/lib/admin-api";
import { getSheetVideoCatalog } from "@/lib/videos.functions";
import { getBikesDiscovery } from "@/lib/bikes-discovery.functions";
import { getPublishedArticles } from "@/lib/editorial.functions";
import { parseYoutubeId, type VideoItem } from "@/lib/video-catalog";
import { ArticleView, type PublishedArticle } from "@/components/editorial/ArticleView";
import { BLOCK_TYPES, CONTENT_TYPES, parseArticleBlocks, type ArticleBlock, type EditorialArticle, type EditorialVideo } from
  "../../supabase/functions/_shared/editorial-contract";

const BTN = "rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";
const OUTLINE = "rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold hover:bg-emerald-50 disabled:opacity-50";
const INPUT = "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm";
const PANEL = "rounded-2xl border border-line bg-white p-5 shadow-sm";
const date = (v?: string | null) => v ? new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
const money = (v?: number | null) => v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

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
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void adminCall<AdminOverview>("overview").then(setData).catch(e => setError(e.message)); }, []);
  return <>
    <Heading title="Visão geral" detail="O que precisa da atenção da equipe hoje." />
    {error && <Notice danger>{error}</Notice>}
    {!data ? <p aria-busy="true">Carregando operação…</p> : <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[["Bikes no catálogo", data.bikes], ["Vídeos cadastrados", data.videos],
          ["Artigos publicados", data.articles.published ?? 0], ["Rascunhos", data.articles.draft ?? 0],
          ["Erros de geração", data.generationErrors]].map(([label, value]) => <div key={label} className={PANEL}>
            <p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>)}
      </div>
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
        <a href="/admin/videos" className={BTN}>Organizar vídeos</a>
        <a href="/admin/conteudos/novo" className={OUTLINE}>Criar artigo</a>
      </div>}
    </>}
  </>;
}

export function AdminBikesPage() {
  return <AdminShell>{() => <Bikes />}</AdminShell>;
}
function Bikes() {
  const [data, setData] = useState<{ bikes: AdminBike[]; offers: AdminOffer[] } | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => { void adminCall<{ bikes: AdminBike[]; offers: AdminOffer[] }>("bikes").then(setData).catch(e => setError(e.message)); }, []);
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
        <td><a href={`/bikes/${b.slug}`} target="_blank" rel="noopener noreferrer" className="text-emerald-800 underline">Ver bike</a></td>
      </tr>; })}</tbody>
    </table></div>{data && bikes.length === 0 && <p className="py-4">Nenhuma bike encontrada.</p>}</div>
  </>;
}

export function AdminVideosPage() {
  return <AdminShell>{role => <OnlyEditorial role={role}><Videos /></OnlyEditorial>}</AdminShell>;
}
function Videos() {
  const [sheet, setSheet] = useState<VideoItem[]>([]);
  const [stored, setStored] = useState<EditorialVideo[]>([]);
  const [articles, setArticles] = useState<ArticleRow[]>([]);
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
  async function load() {
    const [sheetResult, videosResult, articlesResult] = await Promise.allSettled([
      getSheetVideoCatalog(), adminCall<AdminVideoList>("videos"), adminCall<AdminArticleList>("articles"),
    ]);
    if (sheetResult.status === "fulfilled") setSheet(sheetResult.value);
    else setError("A planilha de vídeos está indisponível; os vídeos já cadastrados no Admin continuam acessíveis.");
    if (videosResult.status === "fulfilled") setStored(videosResult.value.videos);
    else throw videosResult.reason;
    if (articlesResult.status === "fulfilled") setArticles(articlesResult.value.articles);
    else throw articlesResult.reason;
  }
  useEffect(() => { void load().catch(e => setError(e.message)); }, []);
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
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao salvar."); }
    finally { setSaving(false); }
  }
  return <>
    <Heading title="Biblioteca de vídeos" detail="A aba Videos Youtube é a fonte de descoberta; transcrições e relações editoriais ficam no Admin." />
    {error && <Notice danger>{error}</Notice>}{message && <Notice>{message}</Notice>}
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
        <button className={BTN} disabled={saving}>{saving ? "Salvando…" : "Salvar vídeo"}</button>
        <a href={selected.url} target="_blank" rel="noopener noreferrer" className="ml-3 text-sm text-emerald-800 underline">Ver no YouTube</a>
      </form> : <p className="text-sm text-muted-foreground">Selecione um vídeo para cadastrar transcrição e relações.</p>}</aside>
    </div>
  </>;
}

export function AdminArticlesPage() {
  return <AdminShell>{role => <OnlyEditorial role={role}><Articles /></OnlyEditorial>}</AdminShell>;
}
function Articles() {
  const [items, setItems] = useState<ArticleRow[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("all");
  useEffect(() => { void adminCall<AdminArticleList>("articles").then(v => setItems(v.articles)).catch(e => setError(e.message)); }, []);
  const visible = items.filter(a => status === "all" || a.status === status);
  return <>
    <Heading title="Artigos" detail="Rascunhos, validação, revisão e publicação em um único fluxo.">
      <a href="/admin/conteudos/novo" className={BTN}>Criar artigo</a>
    </Heading>
    {error && <Notice danger>{error}</Notice>}
    <select aria-label="Filtrar por status" value={status} onChange={e => setStatus(e.target.value)} className={`${INPUT} mb-4 max-w-xs`}>
      <option value="all">Todos os estados</option>
      {["draft", "generated", "validation_error", "ready", "published", "archived"].map(s => <option key={s} value={s}>{s}</option>)}
    </select>
    <div className={PANEL}><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm">
      <thead><tr className="border-b border-line text-muted-foreground"><th className="pb-3">Título / slug</th><th>Vídeo</th><th>Bike</th><th>Status</th><th>Atualizado</th><th>SEO</th></tr></thead>
      <tbody>{visible.map(a => <tr key={a.id} className="border-b border-line/70 last:border-0">
        <td className="py-3"><a href={`/admin/conteudos/${a.id}`} className="font-semibold text-emerald-800 underline">{a.title || "Sem título"}</a>
          <br/><small className="text-muted-foreground">{a.slug ?? "Sem slug"}</small></td>
        <td>{a.video_id}</td><td>{a.primary_bike_id ?? "—"}</td><td>{a.status}</td><td>{date(a.updated_at)}</td>
        <td>{a.validation_errors?.length ? `${a.validation_errors.length} pendências` : a.status === "draft" ? "Não validado" : "Sem erros"}</td>
      </tr>)}</tbody>
    </table></div>{visible.length === 0 && <p className="py-4 text-sm text-muted-foreground">Nenhum artigo neste estado.</p>}</div>
  </>;
}

export function AdminNewArticlePage() {
  return <AdminShell>{role => <OnlyEditorial role={role}><NewArticle /></OnlyEditorial>}</AdminShell>;
}
function NewArticle() {
  const [sheet, setSheet] = useState<VideoItem[]>([]);
  const [savedVideos, setSavedVideos] = useState<EditorialVideo[]>([]);
  const [videoId, setVideoId] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [videoDate, setVideoDate] = useState("");
  const [primaryBikeId, setPrimaryBikeId] = useState("");
  const [relatedBikeIds, setRelatedBikeIds] = useState("");
  const [contentType, setContentType] = useState("test");
  const [transcript, setTranscript] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { void Promise.allSettled([getSheetVideoCatalog(), adminCall<AdminVideoList>("videos")])
    .then(([items, saved]) => {
      if (items.status === "fulfilled") setSheet(items.value);
      if (saved.status === "fulfilled") setSavedVideos(saved.value.videos);
      else setError("Não foi possível carregar os vídeos cadastrados no Admin.");
    }); }, []);
  function choose(id: string) {
    setVideoId(id);
    const v = sheet.find(item => item.videoId === id);
    if (v) { setVideoUrl(v.url); setTitle(v.title); setVideoDate(v.date ?? "");
      const saved = savedVideos.find(item => item.youtube_id === id);
      setPrimaryBikeId(saved?.primary_bike_id ?? v.bikeIds[0] ?? "");
      setRelatedBikeIds((saved?.related_bike_ids ?? v.bikeIds).join(", "));
      setTranscript(saved?.transcript ?? ""); setContentType(saved?.content_type ?? "test"); }
  }
  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const id = videoId || parseYoutubeId(videoUrl);
    if (!id) { setError("Informe um vídeo do YouTube válido."); setBusy(false); return; }
    try {
      await adminCall("video-save", { youtubeId: id, title, date: videoDate || null, transcript,
        primaryBikeId: primaryBikeId || null,
        relatedBikeIds: relatedBikeIds.split(",").map(x => x.trim()).filter(Boolean), contentType });
      const result = await adminCall<{ article: EditorialArticle }>("article-create", { videoId: id, title });
      window.location.assign(`/admin/conteudos/${result.article.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível criar o artigo."); setBusy(false); }
  }
  return <>
    <Heading title="Criar artigo" detail="Comece por um vídeo real. A transcrição é obrigatória para geração e publicação." />
    {error && <Notice danger>{error}</Notice>}
    <form onSubmit={create} className={`${PANEL} max-w-3xl space-y-5`}>
      <label className="block text-sm font-medium">Vídeo da planilha
        <select className={`${INPUT} mt-1`} value={videoId} onChange={e => choose(e.target.value)}>
          <option value="">Escolher ou informar URL abaixo</option>
          {sheet.map(v => <option key={v.videoId} value={v.videoId}>{v.title}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium">URL YouTube<input className={`${INPUT} mt-1`} value={videoUrl} onChange={e => { setVideoUrl(e.target.value); setVideoId(""); }} required /></label>
      <label className="block text-sm font-medium">Título do vídeo<input className={`${INPUT} mt-1`} value={title} onChange={e => setTitle(e.target.value)} required /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">Data do vídeo<input className={`${INPUT} mt-1`} type="date" value={videoDate} onChange={e => setVideoDate(e.target.value)} /></label>
        <label className="block text-sm font-medium">Tipo<select className={`${INPUT} mt-1`} value={contentType} onChange={e => setContentType(e.target.value)}>
          {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></label>
      </div>
      <label className="block text-sm font-medium">Bike principal (ID estável)<input className={`${INPUT} mt-1`} value={primaryBikeId} onChange={e => setPrimaryBikeId(e.target.value)} /></label>
      <label className="block text-sm font-medium">Bikes relacionadas (IDs separados por vírgula)<input className={`${INPUT} mt-1`} value={relatedBikeIds} onChange={e => setRelatedBikeIds(e.target.value)} /></label>
      <label className="block text-sm font-medium">Transcrição completa<textarea className={`${INPUT} mt-1 min-h-64`} value={transcript} onChange={e => setTranscript(e.target.value)} required /></label>
      <p className="text-sm text-muted-foreground">A IA usará a transcrição como fonte, nunca como instrução. O artigo não será publicado automaticamente.</p>
      <button className={BTN} disabled={busy}>{busy ? "Criando…" : "Criar rascunho"}</button>
    </form>
  </>;
}

type EditorDraft = {
  title: string; slug: string; summary: string; summarySourceExcerpt: string; blocks: ArticleBlock[]; faq: { question: string; answer: string; sourceExcerpt: string }[];
  seoTitle: string; metaDescription: string; ogTitle: string; ogDescription: string; ogImageUrl: string;
  primaryBikeId: string; relatedBikeIds: string; relatedArticleIds: string[]; indexable: boolean;
};
const fromArticle = (a: EditorialArticle): EditorDraft => ({
  title: a.title, slug: a.slug ?? "", summary: a.summary, summarySourceExcerpt: a.summary_source_excerpt,
  blocks: a.blocks ?? [], faq: a.faq ?? [],
  seoTitle: a.seo_title, metaDescription: a.meta_description, ogTitle: a.og_title, ogDescription: a.og_description,
  ogImageUrl: a.og_image_url ?? "", primaryBikeId: a.primary_bike_id ?? "",
  relatedBikeIds: (a.related_bike_ids ?? []).join(", "), relatedArticleIds: a.related_article_ids ?? [], indexable: a.indexable,
});

export function AdminArticleEditorPage({ id }: { id: string }) {
  return <AdminShell>{role => <OnlyEditorial role={role}><Editor id={id} role={role} /></OnlyEditorial>}</AdminShell>;
}
function Editor({ id, role }: { id: string; role: AdminRole }) {
  const [article, setArticle] = useState<EditorialArticle | null>(null);
  const [video, setVideo] = useState<EditorialVideo | null>(null);
  const [draft, setDraft] = useState<EditorDraft | null>(null);
  const [related, setRelated] = useState<ArticleRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [reviewChecked, setReviewChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function load() {
    const [detail, list] = await Promise.all([
      adminCall<{ article: EditorialArticle; video: EditorialVideo }>("article-get", { id }),
      adminCall<AdminArticleList>("articles"),
    ]);
    setArticle(detail.article); setVideo(detail.video); setDraft(fromArticle(detail.article));
    setRelated(list.articles.filter(a => a.id !== id && a.status === "published")); setDirty(false);
  }
  useEffect(() => { void load().catch(e => setError(e.message)); }, [id]);
  function patch(next: Partial<EditorDraft>) { setDraft(v => v ? { ...v, ...next } : v); setDirty(true); setReviewChecked(false); }
  function changeBlock(index: number, next: Partial<ArticleBlock>) {
    if (!draft) return; const blocks = [...draft.blocks]; blocks[index] = { ...blocks[index], ...next }; patch({ blocks });
  }
  function moveBlock(index: number, direction: number) {
    if (!draft || index + direction < 0 || index + direction >= draft.blocks.length) return;
    const blocks = [...draft.blocks]; [blocks[index], blocks[index + direction]] = [blocks[index + direction], blocks[index]]; patch({ blocks });
  }
  async function action(name: string, payload: Record<string, unknown> = {}) {
    if (!article) return; setBusy(true); setError(""); setMessage("");
    try {
      const result = await adminCall<{ article?: EditorialArticle; errors?: string[]; ok?: boolean }>(name, { id, revision: article.revision, ...payload });
      if (result.article) { setArticle(result.article); setDraft(fromArticle(result.article)); setDirty(false); }
      if (result.errors?.length) setError(result.errors.join(" "));
      else setMessage(name === "publish-article" ? "Artigo publicado." : "Operação concluída.");
      if (result.ok) window.location.assign("/admin/conteudos");
    } catch (e) { setError(e instanceof Error ? e.message : "Falha na operação."); }
    finally { setBusy(false); }
  }
  async function save(event?: FormEvent) {
    event?.preventDefault(); if (!article || !draft) return;
    await action("article-save", {
      ...draft, blocks: parseArticleBlocks(draft.blocks), primaryBikeId: draft.primaryBikeId || null,
      relatedBikeIds: draft.relatedBikeIds.split(",").map(x => x.trim()).filter(Boolean),
    });
  }
  if (error && !article) return <Notice danger>{error}</Notice>;
  if (!article || !draft) return <p aria-busy="true">Carregando artigo…</p>;
  const editable = article.status !== "published" && article.status !== "archived";
  return <>
    <Heading title={article.title || "Novo artigo"} detail={`Estado: ${article.status} · revisão ${article.revision} · vídeo ${article.video_id}`}>
      <a href={`/admin/conteudos/${id}/preview`} target="_blank" rel="noopener noreferrer" className={OUTLINE}>Abrir preview</a>
    </Heading>
    {error && <Notice danger>{error}</Notice>}{message && <Notice>{message}</Notice>}
    {article.validation_errors?.length > 0 && <Notice danger>Validação: {article.validation_errors.join(" ")}</Notice>}
    <div className="mb-5 flex flex-wrap gap-2">
      <button className={BTN} disabled={!editable || !dirty || busy} onClick={() => void save()}>Salvar rascunho</button>
      <button className={OUTLINE} disabled={!editable || dirty || busy} onClick={() => void action("compile-article")}>Gerar artigo com IA</button>
      <button className={OUTLINE} disabled={!editable || dirty || busy} onClick={() => void action("validate-article")}>Validar</button>
      <button className={OUTLINE} disabled={!editable || dirty || busy || article.status !== "ready" || !reviewChecked}
        onClick={() => void action("review-article")}>Marcar revisão humana</button>
      <button className={BTN} disabled={!editable || dirty || busy || article.status !== "ready" || !article.reviewed_at}
        onClick={() => { if (window.confirm("Publicar este artigo no site público?")) void action("publish-article"); }}>Publicar</button>
      {article.status === "published" && <button className={OUTLINE} disabled={busy}
        onClick={() => { if (window.confirm("Despublicar este artigo?")) void action("unpublish-article"); }}>Despublicar</button>}
      {article.status !== "archived" && <button className={OUTLINE} disabled={busy}
        onClick={() => { if (window.confirm("Arquivar este artigo?")) void action("archive-article"); }}>Arquivar</button>}
      {role === "admin" && article.status === "archived" && <button className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-800"
        onClick={() => { const confirm = window.prompt(`Para excluir definitivamente, digite o slug: ${article.slug}`);
          if (confirm === article.slug) void action("delete-article", { confirm }); }}>Excluir definitivamente</button>}
    </div>
    <label className="mb-5 flex items-start gap-2 text-sm"><input type="checkbox" checked={reviewChecked} onChange={e => setReviewChecked(e.target.checked)} />
      Revisei transcrição, números, IDs, links, afirmações, SEO e preview. A IA não publica sozinha.</label>
    <form onSubmit={save} className="space-y-6">
      <section className={PANEL}><h2 className="mb-4 text-xl font-semibold">Identidade e relações</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">Título<input className={`${INPUT} mt-1`} disabled={!editable} value={draft.title} onChange={e => patch({ title: e.target.value })} /></label>
          <label className="text-sm font-medium">Slug<input className={`${INPUT} mt-1`} disabled={!editable} value={draft.slug} onChange={e => patch({ slug: e.target.value })} /></label>
          <label className="text-sm font-medium">Bike principal (ID)<input className={`${INPUT} mt-1`} disabled={!editable} value={draft.primaryBikeId} onChange={e => patch({ primaryBikeId: e.target.value })} /></label>
          <label className="text-sm font-medium">Outras bikes (IDs, vírgula)<input className={`${INPUT} mt-1`} disabled={!editable} value={draft.relatedBikeIds} onChange={e => patch({ relatedBikeIds: e.target.value })} /></label>
        </div>
        <label className="mt-4 block text-sm font-medium">Resumo<textarea className={`${INPUT} mt-1 min-h-24`} disabled={!editable} value={draft.summary} onChange={e => patch({ summary: e.target.value })} /></label>
        <label className="mt-3 block text-sm font-medium">Trecho literal que sustenta o resumo<textarea className={`${INPUT} mt-1 min-h-20`} disabled={!editable} value={draft.summarySourceExcerpt} onChange={e => patch({ summarySourceExcerpt: e.target.value })} /></label>
        <p className="mt-3 text-xs text-muted-foreground">Vídeo de origem: <a href={video?.youtube_url} target="_blank" rel="noopener noreferrer" className="underline">{video?.title ?? article.video_id}</a>. A transcrição é a referência factual.</p>
        <fieldset className="mt-4"><legend className="text-sm font-medium">Artigos relacionados</legend>
          <div className="mt-2 flex max-h-32 flex-wrap gap-2 overflow-y-auto">{related.map(a => <label key={a.id} className="rounded-lg border border-line px-3 py-2 text-xs">
            <input type="checkbox" disabled={!editable} checked={draft.relatedArticleIds.includes(a.id)} onChange={e => patch({
              relatedArticleIds: e.target.checked ? [...draft.relatedArticleIds, a.id] : draft.relatedArticleIds.filter(x => x !== a.id),
            })} /> {a.title}</label>)}</div>
        </fieldset>
      </section>
      <section className={PANEL}><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">Blocos editoriais</h2>
        <button type="button" className={OUTLINE} disabled={!editable} onClick={() => patch({ blocks: [...draft.blocks, { type: "text", heading: "", text: "", sourceExcerpt: "" }] })}>Adicionar bloco</button></div>
        <p className="mb-4 text-sm text-muted-foreground">Texto factual exige um trecho literal da transcrição. Blocos comerciais usam IDs de bike, nunca URL digitada pela IA.</p>
        <div className="space-y-4">{draft.blocks.map((b, i) => <div key={i} className="rounded-xl border border-line bg-surface p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2"><strong className="mr-auto text-sm">Bloco {i + 1}</strong>
            <button type="button" disabled={!editable || i === 0} onClick={() => moveBlock(i, -1)} className={OUTLINE}>↑</button>
            <button type="button" disabled={!editable || i === draft.blocks.length - 1} onClick={() => moveBlock(i, 1)} className={OUTLINE}>↓</button>
            <button type="button" disabled={!editable} onClick={() => patch({ blocks: draft.blocks.filter((_, k) => k !== i) })} className={OUTLINE}>Remover</button>
            <button type="button" disabled={!editable || dirty || busy} onClick={() => void action("regenerate-block", { index: i })} className={OUTLINE}>Regenerar bloco</button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs font-medium">Tipo<select className={`${INPUT} mt-1`} disabled={!editable} value={b.type} onChange={e => changeBlock(i, { type: e.target.value as ArticleBlock["type"] })}>
              {BLOCK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></label>
            <label className="text-xs font-medium">Título do bloco<input className={`${INPUT} mt-1`} disabled={!editable} value={b.heading ?? ""} onChange={e => changeBlock(i, { heading: e.target.value })} /></label>
            <label className="text-xs font-medium md:col-span-2">Texto<textarea className={`${INPUT} mt-1 min-h-24`} disabled={!editable} value={b.text ?? ""} onChange={e => changeBlock(i, { text: e.target.value })} /></label>
            <label className="text-xs font-medium md:col-span-2">Trecho de fonte (literal)<textarea className={`${INPUT} mt-1 min-h-20`} disabled={!editable} value={b.sourceExcerpt ?? ""} onChange={e => changeBlock(i, { sourceExcerpt: e.target.value })} /></label>
            <label className="text-xs font-medium">Bike ID<input className={`${INPUT} mt-1`} disabled={!editable} value={b.bikeId ?? ""} onChange={e => changeBlock(i, { bikeId: e.target.value })} /></label>
            <label className="text-xs font-medium">Vídeo ID<input className={`${INPUT} mt-1`} disabled={!editable} value={b.videoId ?? ""} onChange={e => changeBlock(i, { videoId: e.target.value })} /></label>
          </div>
        </div>)}</div>
      </section>
      <section className={PANEL}><h2 className="mb-4 text-xl font-semibold">FAQ</h2>
        {draft.faq.map((f, i) => <div key={i} className="mb-4 rounded-lg border border-line p-3">
          <label className="block text-sm">Pergunta<input className={`${INPUT} mt-1`} disabled={!editable} value={f.question} onChange={e => patch({ faq: draft.faq.map((x, j) => j === i ? { ...x, question: e.target.value } : x) })} /></label>
          <label className="mt-2 block text-sm">Resposta<textarea className={`${INPUT} mt-1`} disabled={!editable} value={f.answer} onChange={e => patch({ faq: draft.faq.map((x, j) => j === i ? { ...x, answer: e.target.value } : x) })} /></label>
          <label className="mt-2 block text-sm">Trecho literal da fonte<textarea className={`${INPUT} mt-1`} disabled={!editable} value={f.sourceExcerpt} onChange={e => patch({ faq: draft.faq.map((x, j) => j === i ? { ...x, sourceExcerpt: e.target.value } : x) })} /></label>
          <button type="button" className="mt-2 text-sm text-red-700 underline" disabled={!editable} onClick={() => patch({ faq: draft.faq.filter((_, j) => i !== j) })}>Remover pergunta</button>
        </div>)}
        <button type="button" className={OUTLINE} disabled={!editable} onClick={() => patch({ faq: [...draft.faq, { question: "", answer: "", sourceExcerpt: "" }] })}>Adicionar pergunta</button>
      </section>
      <section className={PANEL}><h2 className="mb-4 text-xl font-semibold">SEO e compartilhamento</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {([['seoTitle','SEO title'],['metaDescription','Meta description'],['ogTitle','OG title'],['ogDescription','OG description'],['ogImageUrl','Imagem OG (HTTPS)']] as const)
            .map(([key, label]) => <label key={key} className="text-sm font-medium">{label}<input className={`${INPUT} mt-1`} disabled={!editable} value={draft[key]} onChange={e => patch({ [key]: e.target.value })} /></label>)}
        </div>
        <label className="mt-4 flex gap-2 text-sm"><input type="checkbox" disabled={!editable} checked={draft.indexable} onChange={e => patch({ indexable: e.target.checked })} /> Permitir indexação após publicação</label>
        <div className="mt-4 rounded-lg bg-surface p-4 text-sm"><p className="font-semibold">Preview de busca/compartilhamento</p>
          <p className="mt-2 text-blue-700">{draft.seoTitle || draft.title}</p><p className="text-xs text-emerald-800">vitalemobilidade.com/conteudos/{draft.slug}</p>
          <p className="text-muted-foreground">{draft.metaDescription || "Descrição ainda não cadastrada."}</p></div>
      </section>
      <button className={BTN} disabled={!editable || !dirty || busy}>Salvar alterações</button>
    </form>
  </>;
}

function previewArticle(a: EditorialArticle): PublishedArticle {
  return {
    id: a.id, slug: a.slug ?? "rascunho", title: a.title, summary: a.summary,
    blocks: a.blocks ?? [], faq: a.faq ?? [], seoTitle: a.seo_title,
    metaDescription: a.meta_description, ogTitle: a.og_title, ogDescription: a.og_description,
    ogImageUrl: a.og_image_url, indexable: false, publishedAt: a.published_at,
    videoId: a.video_id, primaryBikeId: a.primary_bike_id,
    relatedBikeIds: a.related_bike_ids ?? [], relatedArticleIds: a.related_article_ids ?? [],
  };
}

export function AdminArticlePreviewPage({ id }: { id: string }) {
  return <AdminShell>{role => <OnlyEditorial role={role}><ArticlePreview id={id} /></OnlyEditorial>}</AdminShell>;
}
function ArticlePreview({ id }: { id: string }) {
  const [article, setArticle] = useState<EditorialArticle | null>(null);
  const [bikes, setBikes] = useState<Awaited<ReturnType<typeof getBikesDiscovery>>["bikes"]>([]);
  const [related, setRelated] = useState<{ id: string; slug: string; title: string }[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { void Promise.all([
    adminCall<{ article: EditorialArticle }>("article-get", { id }), getBikesDiscovery(), getPublishedArticles(),
  ]).then(([detail, catalog, index]) => { setArticle(detail.article); setBikes(catalog.bikes);
    setRelated((index ?? []).filter(a => detail.article.related_article_ids.includes(a.id))); })
    .catch(e => setError(e.message)); }, [id]);
  if (error) return <Notice danger>{error}</Notice>;
  if (!article) return <p aria-busy="true">Carregando preview…</p>;
  return <div className={PANEL}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4 text-sm">
      <a href={`/admin/conteudos/${id}`} className="font-semibold text-emerald-800 underline">← Voltar ao editor</a>
      <span>SEO: {article.seo_title || "sem título"} · {article.meta_description.length} caracteres na descrição</span>
    </div>
    <ArticleView article={previewArticle(article)} bikes={bikes} relatedArticles={related} preview />
  </div>;
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
            <td><a href={`/admin/conteudos/${r.article_id}`} className="text-emerald-800 underline">Abrir</a></td><td>{r.kind}</td><td>{r.status}</td>
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
