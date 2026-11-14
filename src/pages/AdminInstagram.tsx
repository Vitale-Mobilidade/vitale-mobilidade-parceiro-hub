import {instagramErrorMessage} from '@/lib/instagram/errors';
import { useEffect,useState } from 'react';
import { useMutation,useQuery } from '@tanstack/react-query';
import { Link,getRouteApi,useNavigate } from '@tanstack/react-router';
import { Check,Download,RefreshCw,Send,Pause,Image as ImageIcon,Play,Copy } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { Button } from '@/components/ui/button';
import { instagramCall,assetBlob } from '@/lib/instagram/api';
import { type Snapshot,type Job,type Asset } from '@/lib/instagram/contract';
import InstagramEditorialReview from '@/components/admin/InstagramEditorialReview';
import {InstagramSchedule} from '@/components/admin/InstagramSchedule';
const labels:Record<string,string>={queued:'Na fila',scripting:'Roteiro em preparação',scene:'Ambientação',rendering:'Compondo artes',review:'Aguardando revisão',approved:'Aprovado',publishing:'Preparando álbum',uncertain:'Envio sem confirmação',published:'Publicado',blocked:'Requer atenção'};
export default function AdminInstagram(){return <AdminShell>{role=>role==='admin'?<InstagramWorkspace/>:<p role="alert">Acesso restrito a administradores.</p>}</AdminShell>;}
function PrivateImage({job,asset}:{job:Job;asset:Asset}){
 const [url,setUrl]=useState(''),[error,setError]=useState('');
 useEffect(()=>{let active=true,objectUrl='';void assetBlob(job.id,asset.position).then(blob=>{objectUrl=URL.createObjectURL(blob);if(active)setUrl(objectUrl);else URL.revokeObjectURL(objectUrl);}).catch(()=>{if(active)setError('Arte indisponível');});return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};},[job.id,job.revision,asset.position]);
 return <div className="aspect-[4/5] w-full bg-muted">{url?<img src={url} alt={asset.alt} className="h-full w-full object-contain"/>:<p className="flex h-full items-center justify-center text-sm text-muted-foreground">{error||'Carregando arte…'}</p>}</div>;
}
export function InstagramWorkspace(){
 const {id:selected}=getRouteApi('/admin/instagram').useSearch(),navigate=useNavigate({from:'/admin/instagram'});
 const [progress,setProgress]=useState(''),[reviewed,setReviewed]=useState(false),[feedback,setFeedback]=useState(''),[sandbox,setSandbox]=useState(false);
 const query=useQuery({queryKey:['admin','instagram',selected],queryFn:()=>instagramCall<Snapshot>({action:'snapshot',...(selected?{id:selected}:{})}),retry:false,staleTime:15000});
 const data=query.data,job=selected?data?.jobs.find(j=>j.id===selected):data?.jobs[0];
 useEffect(()=>{setReviewed(false);setFeedback('');},[selected]);
 const mutation=useMutation({mutationFn:(input:Record<string,unknown>)=>instagramCall<{id?:string;status?:string}>(input,setProgress),onSuccess:async(result)=>{if(result.id)await navigate({search:prev=>({...prev,id:result.id})});setReviewed(false);setFeedback(result.status==='published'?'Publicado no Instagram.':'Estado atualizado.');await query.refetch();},onError:async(error)=>{setFeedback(error.message);await query.refetch();},onSettled:()=>setProgress('')});
 const busy=mutation.isPending;
 async function download(asset:Asset){if(!job)return;try{const blob=await assetBlob(job.id,asset.position),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${String(asset.position).padStart(2,'0')}-vitale.jpg`;a.click();URL.revokeObjectURL(url);}catch(error){setFeedback(error instanceof Error?error.message:'Download indisponível.');}}
 const act=(action:string,extra:Record<string,unknown>={})=>{if(job)mutation.mutate({action,id:job.id,revision:job.revision,...extra});};
 return <div className="space-y-6">
  <header className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-primary">Conteúdo</p><h1 className="mt-1 text-3xl font-bold">Instagram</h1></div><div className="flex gap-2"><Button variant="outline" aria-label="Atualizar Instagram" title="Atualizar" disabled={busy||query.isFetching} onClick={()=>void query.refetch()}><RefreshCw/>Atualizar</Button>{data?.available&&<Button variant="outline" disabled={busy} onClick={()=>{if(window.confirm('Pausar geração e publicação do Instagram?'))mutation.mutate({action:'pause'});}}><Pause/>Pausar</Button>}</div></header>
  <div className="flex gap-2"><Button variant={!sandbox?'secondary':'outline'} onClick={()=>setSandbox(false)}>Rascunhos</Button><Button variant={sandbox?'secondary':'outline'} onClick={()=>setSandbox(true)}>Revisão do sistema editorial</Button></div>
  {sandbox&&<InstagramEditorialReview/>}
  {query.isPending&&<p role="status">Consultando fontes e rascunhos…</p>}
  {query.isError&&<p role="alert" className="text-destructive">{query.error.message}</p>}
  {data&&!data.available&&<section className="border-y border-border py-6"><h2 className="font-semibold">Release aguardando autorização</h2><p className="mt-2 text-sm text-muted-foreground">Geração, publicação e agendamento estão desligados.</p></section>}
  {data?.available&&<>
   <section className="border-y border-border py-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><h2 className="font-semibold">Fonte selecionada</h2>{data.source?<><p className="mt-2 font-semibold break-words">{data.source.videoTitle}</p><p className="mt-1 text-sm text-muted-foreground">Vídeo de {data.source.videoDate} · transcrição cadastrada</p><Link to="/admin/conteudos/$id" params={{id:data.source.articleId}} className="mt-2 inline-block text-sm text-primary underline">{data.source.articleTitle}</Link><p className="mt-1 text-xs text-muted-foreground">Artigo publicado · {new Date(data.source.publishedAt).toLocaleString('pt-BR')}</p></>:<p className="mt-2 text-sm text-muted-foreground">Nenhum vídeo com transcrição e artigo publicado correspondente é elegível.</p>}</div><Button disabled={busy||!data.source||!data.generationEnabled} onClick={()=>{if(data.source)mutation.mutate({action:'generate',videoId:data.source.videoId,articleId:data.source.articleId});}}><Play/>Gerar rascunho</Button></div></section>
   <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]"><aside><h2 className="mb-3 font-semibold">Rascunhos</h2>{!data.jobs.length&&<p className="text-sm text-muted-foreground">Nenhum rascunho preparado.</p>}<ul className="space-y-2">{data.jobs.map(item=><li key={item.id}><Button variant={job?.id===item.id?'secondary':'ghost'} className="h-auto w-full justify-start whitespace-normal py-3 text-left" onClick={()=>{void navigate({search:prev=>({...prev,id:item.id})});setReviewed(false);setFeedback('');}}><span><span className="block">{item.source.videoTitle}</span><span className="mt-1 block text-xs text-muted-foreground">{labels[item.state]} · revisão {item.revision}</span></span></Button></li>)}</ul></aside>
   {job?<section className="min-w-0 space-y-5"><header><h2 className="text-xl font-bold break-words">{job.script?.topic??job.source.videoTitle}</h2><p className="mt-1 text-sm text-muted-foreground">{labels[job.state]} · {job.assets.length} artes · revisão {job.revision} · arte v{job.script?.artVersion??1}</p></header>
    {job.error_code&&<p role="alert" className="break-words text-sm text-destructive">{instagramErrorMessage(job.error_code,job.error_message)}</p>}
    {job.assets.some(a=>a.missingBikeIds.length)&&<p className="text-sm text-muted-foreground">Foto específica indisponível em parte das artes; composição sem substituição da bike.</p>}
    {job.scene_omitted&&<p className="text-sm text-muted-foreground">Concluído sem ambientação.</p>}
    {!!job.assets.length&&<ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{job.assets.map(asset=><li key={`${job.revision}-${asset.position}`} className="overflow-hidden rounded-md border border-border"><PrivateImage job={job} asset={asset}/><div className="flex items-center justify-between gap-2 p-3"><span className="text-sm font-semibold">{String(asset.position).padStart(2,'0')}</span><Button size="icon" variant="ghost" title="Baixar JPEG" aria-label={`Baixar arte ${asset.position}`} onClick={()=>void download(asset)}><Download/></Button></div></li>)}</ol>}
    {job.script&&<><section className="border-t border-border pt-4"><div className="flex justify-between gap-2"><h3 className="font-semibold">Legenda</h3><Button variant="ghost" size="icon" aria-label="Copiar legenda" title="Copiar legenda" onClick={()=>void navigator.clipboard.writeText(job.script?.caption??'').then(()=>setFeedback('Legenda copiada.'))}><Copy/></Button></div><p className="mt-2 whitespace-pre-wrap text-sm">{job.script.caption}</p></section><details className="border-t border-border pt-4"><summary className="cursor-pointer font-semibold">Evidências da transcrição</summary><ol className="mt-3 space-y-3">{job.script.slides.map((slide,i)=><li key={i}><h4 className="text-sm font-semibold">{i+1}. {slide.title}</h4>{slide.evidence.map((e,k)=><blockquote key={k} className="mt-2 border-l-2 border-primary pl-3 text-sm text-muted-foreground">{e.quote}<span className="block text-xs">{e.kind} · trecho {e.start}</span></blockquote>)}</li>)}</ol></details></>}
    <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
     {['queued','scripting','scene','rendering','blocked'].includes(job.state)&&<>{!(!job.script&&job.script_attempted)&&<Button disabled={busy||!data.generationEnabled} variant="outline" onClick={()=>act('resume')}><RefreshCw/>Retomar</Button>}{!!job.script?.slides.some(slide=>slide.scene)&&job.scene_attempted&&!job.scene_path&&!job.scene_omitted&&<Button disabled={busy||!data.generationEnabled} variant="outline" onClick={()=>act('resume',{omitScene:true})}><ImageIcon/>Concluir sem cenário</Button>}</>}
     {job.state==='review'&&<><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>Revisei artes, legenda e evidências</label><Button disabled={busy||!reviewed} onClick={()=>act('approve')}><Check/>Aprovar revisão {job.revision}</Button></>}
     {['approved','publishing'].includes(job.state)&&!job.publish_attempted&&<Button disabled={busy||!data.publishingEnabled||data.schedules?.some(s=>s.job_id===job.id&&s.revision===job.revision&&['pending','running','uncertain'].includes(s.state))} onClick={()=>{if(window.confirm('Publicar esta revisão aprovada no Instagram da Vitale?'))act('publish');}}><Send/>Publicar no Instagram</Button>}
     {job.state==='uncertain'&&<Button disabled={busy||!data.publishingEnabled} variant="outline" onClick={()=>act('reconcile')}><RefreshCw/>Conferir envio sem repetir</Button>}
     {job.permalink&&<Button asChild variant="outline"><a href={job.permalink} target="_blank" rel="noopener noreferrer">Abrir no Instagram</a></Button>}
    </div>
    <InstagramSchedule key={`${job.id}-${job.revision}`} job={job} schedule={data.schedules?.find(s=>s.job_id===job.id&&s.revision===job.revision)} enabled={data.schedulingEnabled===true&&data.publishingEnabled} busy={busy} act={act}/>
   </section>:<p className="text-sm text-muted-foreground">Selecione ou prepare um rascunho.</p>}</div>
  </>}
  {progress&&<p role="status" className="text-sm">{progress}</p>}{feedback&&<p role="status" className="break-words text-sm">{feedback}</p>}
 </div>;
}
