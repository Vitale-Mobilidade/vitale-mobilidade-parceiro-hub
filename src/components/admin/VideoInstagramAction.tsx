import {useRef,useState} from 'react';
import {Link} from '@tanstack/react-router';
import {Play,ExternalLink} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {instagramPostCall} from '@/lib/instagram/api';
import type {VideoEligibility} from '@/lib/instagram/video-selection';
export function VideoInstagramAction({source,enabled,refresh}:{source?:VideoEligibility;enabled:boolean;refresh:()=>Promise<unknown>}){
 const lock=useRef(false),[busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[error,setError]=useState(''),[created,setCreated]=useState<string|null>(null);
 const id=created??source?.jobId;
 async function generate(){
  if(lock.current||!source||!enabled||id)return;
  lock.current=true;setBusy(true);setError('');setProgress('Preparando post…');
  try{const result=await instagramPostCall<{id:string}>({action:'generate',videoId:source.videoId,articleId:source.articleId},setProgress);setCreated(result.id);}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível concluir.');}
  finally{await refresh().catch(()=>{});lock.current=false;setBusy(false);setProgress('');}
 }
 return <section className="space-y-2 border-t border-border pt-3" aria-label="Post do vídeo">
  {id?<Button type="button" asChild variant="outline"><Link to="/admin/instagram" search={prev=>({...prev,id,artPreview:prev.artPreview})}><ExternalLink/>{source?.state==='blocked'?'Abrir rascunho para retomar':'Abrir post'}</Link></Button>:<Button type="button" disabled={busy||!source||!enabled} onClick={()=>void generate()}><Play/>{busy?'Gerando…':'Gerar post'}</Button>}
  {!source&&<p className="text-xs text-muted-foreground">Requer vídeo ativo, transcrição e artigo publicado.</p>}
  {source&&!enabled&&!id&&<p className="text-xs text-muted-foreground">Geração indisponível ou pausada.</p>}
  {progress&&<p role="status" className="text-sm break-words">{progress}</p>}
  {error&&<p role="alert" className="text-sm text-destructive break-words">{error} Abra o rascunho para ver a situação.</p>}
 </section>;
}