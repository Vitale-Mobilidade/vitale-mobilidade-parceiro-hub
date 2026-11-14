import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Copy, RefreshCw, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { Button } from '@/components/ui/button';
import { adminCall } from '@/lib/admin-api';
import { formatPodcastDateTime, podcastSlots } from '@/lib/podcast-dashboard-clock';
import { PODCAST_HISTORY_PAGE_SIZE, PODCAST_MAX_HISTORY_PAGE, type PodcastInstagramPostsSnapshot } from '../../supabase/functions/_shared/podcast-dashboard-contract';

export default function AdminInstagram() {
  return <AdminShell>{role => role === 'admin' ? <InstagramWorkspace /> : <p role="alert">Acesso restrito a administradores.</p>}</AdminShell>;
}

export function InstagramWorkspace() {
  const [page,setPage]=useState(0), [selected,setSelected]=useState<string|null>(null), [feedback,setFeedback]=useState(''), [localTime,setLocalTime]=useState('');
  const query=useQuery({queryKey:['admin','podcast-instagram-posts',page],queryFn:()=>adminCall<PodcastInstagramPostsSnapshot>('podcast-instagram-posts',{page}),retry:false,staleTime:30_000});
  const data=query.data, item=data?.items.find(post=>post.id===selected)??data?.items[0];
  const connection=useMutation({mutationFn:()=>adminCall<{status:string}>('podcast-instagram-connection')});
  const delivery=useMutation({mutationFn:({id,scheduled}:{id:string;scheduled:boolean})=>scheduled
    ?adminCall<{status:string;scheduledAt?:string}>('podcast-instagram-schedule',{youtubeId:id,localTime})
    :adminCall<{status:string}>('podcast-instagram-retry',{youtubeId:id}),onSettled:async()=>{await query.refetch();}});
  const enabled=data?.feedEnabled&&data.instagramEnabled;
  const label=(post:NonNullable<typeof item>)=>post.state==='published'?'Publicado':post.reviewHold?'Aguardando revisão':post.state==='scheduled'?'Agendado':'Rascunho';
  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-bold">Instagram</h1>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={connection.isPending} onClick={()=>connection.mutate()}>Verificar conta</Button>
        <Button variant="outline" disabled={query.isFetching} onClick={()=>void query.refetch()}><RefreshCw/>Atualizar</Button></div>
    </header>
    {connection.data&&<p role="status" className="text-sm">{connection.data.status==='verified'?'Conta @vitalemobilidade confirmada.':'Não foi possível confirmar a conexão com a conta. Verifique a autorização.'}</p>}
    {connection.isError&&<p role="alert" className="text-destructive">Não foi possível verificar a conta.</p>}
    {data&&<p className="text-sm text-muted-foreground">{enabled&&data.schedulerEnabled?'Agenda automática habilitada':'Agenda automática pausada'} · {podcastSlots.map(slot=>slot.label).join(' · ')} — São Paulo</p>}
    {query.isPending&&<p role="status">Consultando posts…</p>}
    {query.isError&&<p role="alert" className="text-destructive">Não foi possível carregar a fila e o histórico. Tente atualizar.</p>}
    {data&&<>
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="min-w-0"><h2 className="mb-3 font-semibold">Posts · {data.total}</h2>
          {!data.items.length&&<p className="text-sm text-muted-foreground">Nenhum post nesta página.</p>}
          <ul className="divide-y divide-border border-y border-border">{data.items.map(post=><li key={post.id}>
            <Button variant={item?.id===post.id?'secondary':'ghost'} aria-pressed={item?.id===post.id} className="h-auto w-full justify-start gap-3 whitespace-normal rounded-none py-3 text-left" onClick={()=>{setSelected(post.id);setFeedback('');setLocalTime('');delivery.reset();}}>
              {post.imageUrl?<img src={post.imageUrl} alt="" className="aspect-[4/5] w-14 shrink-0 object-contain"/>:<ImageIcon className="w-14 shrink-0 text-muted-foreground"/>}
              <span className="min-w-0 break-words"><span className="block text-sm font-semibold">{post.title}</span><span className="mt-1 block text-xs text-muted-foreground">{label(post)}</span>{post.errorCode&&<span className="block text-xs text-destructive">Requer atenção · não confirmado</span>}</span>
            </Button>
          </li>)}</ul>
          {(page>0||data.total>PODCAST_HISTORY_PAGE_SIZE)&&<nav aria-label="Páginas dos posts" className="mt-3 flex gap-2">
            <Button variant="outline" disabled={!page||query.isFetching} onClick={()=>{setSelected(null);setPage(page-1);}}>Anteriores</Button>
            <Button variant="outline" disabled={query.isFetching||page>=PODCAST_MAX_HISTORY_PAGE||(page+1)*PODCAST_HISTORY_PAGE_SIZE>=data.total} onClick={()=>{setSelected(null);setPage(page+1);}}>Próximos</Button>
          </nav>}
        </aside>
        {item&&<section className="min-w-0 space-y-4" aria-label="Detalhe do post">
          <header><h2 className="break-words text-xl font-bold">{item.title}</h2><p className="mt-1 text-sm font-semibold">{label(item)}</p></header>
          {item.reviewHold&&item.state!=='published'&&<p className="border-l-2 border-primary pl-3 text-sm">Envio automático bloqueado até revisão do proprietário. RSS segue normal.</p>}
          {item.state==='published'&&item.publishedAt&&<p className="text-sm text-muted-foreground">Confirmado em {formatPodcastDateTime(item.publishedAt)}</p>}
          {item.state==='scheduled'&&item.scheduledAt&&<p className="text-sm">Horário reservado: {formatPodcastDateTime(item.scheduledAt)} — São Paulo</p>}
          {item.state==='draft'&&item.predictedAt&&<p className="text-sm text-muted-foreground">Janela prevista: {formatPodcastDateTime(item.predictedAt)} — São Paulo. Previsão, não reserva de envio.</p>}
          {item.errorCode&&<p role="alert" className="break-words border-l-2 border-destructive pl-3 text-sm text-destructive">{item.errorCode==='meta_create_uncertain'||item.errorCode==='request_unconfirmed'?'Envio sem confirmação. Exige reconciliação; não repita a publicação.':item.errorCode==='review_hold'?'Aguardando revisão do proprietário.':item.errorCode==='meta_processing'?'A Meta ainda está processando a imagem; publicação não confirmada.':'Este post requer atenção. A publicação não foi confirmada.'}</p>}
          {item.imageUrl?<img src={item.imageUrl} alt={item.title} className="aspect-[4/5] w-full max-w-md object-contain"/>:<p className="text-sm text-muted-foreground">Imagem histórica indisponível.</p>}
          <div className="border-t border-border pt-4"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">Legenda</h3>
            <Button variant="ghost" size="icon" aria-label="Copiar legenda" title="Copiar legenda" disabled={!item.caption} onClick={()=>void navigator.clipboard.writeText(item.caption??'').then(()=>setFeedback('Legenda copiada.')).catch(()=>setFeedback('Não foi possível copiar. Selecione a legenda abaixo.'))}><Copy/></Button></div>
            <p className="mt-2 select-text break-words whitespace-pre-wrap text-sm">{item.caption||'Legenda histórica indisponível.'}</p></div>
          {item.state==='published'&&item.permalink&&<Button asChild variant="outline"><a href={item.permalink} target="_blank" rel="noopener noreferrer"><ExternalLink/>Abrir no Instagram</a></Button>}
          {item.recoverable&&item.state!=='published'&&!item.reviewHold&&<div className="space-y-3 border-t border-border pt-4">
            <Button variant="outline" disabled={!enabled||delivery.isPending} onClick={()=>{if(window.confirm(`Publicar “${item.title}” agora?`))delivery.mutate({id:item.id,scheduled:false});}}>Publicar agora</Button>
            <form className="flex flex-wrap items-end gap-3" onSubmit={event=>{event.preventDefault();delivery.mutate({id:item.id,scheduled:true});}}><label className="grid gap-1 text-sm">Data e hora de São Paulo<input type="datetime-local" required value={localTime} onChange={e=>setLocalTime(e.target.value)} className="min-h-11 rounded-md border border-input bg-background px-3"/></label><Button type="submit" variant="outline" disabled={!enabled||!data.schedulerEnabled||!localTime||delivery.isPending}>Agendar</Button></form>
          </div>}
        </section>}
      </div>
      {delivery.isError&&<p role="alert" className="text-destructive">Não foi possível concluir. Atualize antes de tentar novamente.</p>}
      {delivery.data&&<p role="status" className="text-sm">{delivery.data.status==='published'?'Publicado no Instagram.':delivery.data.status==='scheduled'?'Horário reservado.':'Publicação não confirmada. Confira o estado do post.'}</p>}
    </>}
    {feedback&&<p role="status" className="text-sm">{feedback}</p>}
  </div>;
}
