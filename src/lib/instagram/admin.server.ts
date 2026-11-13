import { z } from 'zod';
import { hash,type Job,type Snapshot } from './contract';
import { createDb,authorize,releaseEnabled,settings,source,claim,store } from './repository.server';
import { inspectJpeg } from '../../../supabase/functions/_shared/editorial-cover';
const headers={'Cache-Control':'private, no-store','Vary':'Authorization','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
const input=z.object({action:z.enum(['snapshot','discover','generate','resume','approve','reconcile','publish','pause']),id:z.string().uuid().optional(),revision:z.number().int().positive().optional(),videoId:z.string().regex(/^[A-Za-z0-9_-]{11}$/).optional(),articleId:z.string().uuid().optional(),omitScene:z.boolean().optional()}).strict();
export async function instagramAdmin(request:Request,dbFactory=createDb,verifiedSchedulerActor?:string){
 const reply=(data:unknown,status=200)=>Response.json(data,{status,headers});
 if(request.method!=='POST')return reply({error:'method_not_allowed'},405);
 if(!verifiedSchedulerActor&&!request.headers.get('Authorization')?.match(/^Bearer .+$/))return reply({error:'authentication_required'},401);
 try{
  const db=dbFactory(),actor=verifiedSchedulerActor??await authorize(request,db);if(!actor)return reply({error:'Acesso restrito a administradores.'},403);
  const text=await request.text();if(text.length>4096)return reply({error:'Requisição inválida.'},413);const data=input.parse(JSON.parse(text));
  if(!releaseEnabled())return data.action==='snapshot'?reply({available:false,generationEnabled:false,publishingEnabled:false,automationEnabled:false,source:null,jobs:[]} satisfies Snapshot):reply({error:'Release ainda não autorizado. Geração e publicação estão desligadas.'},409);
  const cfg=await settings(db);
  if(data.action==='snapshot'){
   const [selected,jobs]=await Promise.all([source(db),db.from('instagram_carousel_jobs').select('*').order('created_at',{ascending:false}).limit(40)]);if(jobs.error)throw Error('instagram_jobs_unavailable');
   return reply({available:true,generationEnabled:cfg.generation_enabled&&!cfg.paused_reason,publishingEnabled:cfg.publishing_enabled&&!cfg.paused_reason,automationEnabled:cfg.automation_enabled,source:selected,jobs:(jobs.data??[]).map(({media_token_hash,lease_token,...job})=>({...job,media_token_hash:null,lease_token:null}))});
  }
  if(data.action==='pause'){const res=await db.from('instagram_carousel_settings').update({generation_enabled:false,publishing_enabled:false,automation_enabled:false,paused_reason:'owner_pause'}).eq('singleton',true);if(res.error)throw Error('instagram_pause_failed');return reply({status:'paused'});}
  if(cfg.paused_reason)throw Error('instagram_paused');
  let id=data.id,revision=data.revision;
  if(data.action==='discover'){
   if(!cfg.automation_enabled||!cfg.generation_enabled)throw Error('instagram_automation_disabled');
   const discovered=await db.rpc('discover_instagram_carousels');if(discovered.error)throw Error('instagram_discovery_failed');
   const pending=await db.from('instagram_carousel_jobs').select('id,revision').eq('state','queued').order('created_at').order('id').limit(1).maybeSingle();
   if(pending.error)throw Error('instagram_queue_unavailable');if(!pending.data)return reply({status:'idle'});
   id=pending.data.id;revision=pending.data.revision;
  }
  if(data.action==='generate'){
   if(!cfg.generation_enabled)throw Error('instagram_generation_disabled');
   const selected=await source(db);if(!selected||selected.videoId!==data.videoId||selected.articleId!==data.articleId)throw Error('instagram_source_changed');
   const res=await db.from('instagram_carousel_jobs').upsert({video_id:selected.videoId,article_id:selected.articleId,source:selected},{onConflict:'video_id,article_id',ignoreDuplicates:true}).select('id,revision').maybeSingle();if(res.error)throw Error('instagram_job_create_failed');
   const existing=res.data??(await db.from('instagram_carousel_jobs').select('id,revision').eq('video_id',selected.videoId).eq('article_id',selected.articleId).single()).data;
   if(!existing)throw Error('instagram_job_missing');id=existing.id;revision=existing.revision;
  }
  if(!id||!revision)throw Error('instagram_job_required');const job=await claim(db,id,revision),storage=store(db,job);
  const save=async(patch:Partial<Job>)=>{await storage.save(patch);Object.assign(job,patch);};
  if(data.action==='generate'||data.action==='resume'||data.action==='discover'){
   if(!cfg.generation_enabled){await save({lease_token:null,lease_until:null});throw Error('instagram_generation_disabled');}
   const key=process.env.LOVABLE_API_KEY;
   if(!key){await save({lease_token:null,lease_until:null});throw Error('ai_not_configured');}
   const {prepare}=await import('./workflow.server');
   const {gateway,GatewayError}=await import('./gateway.server');
   // Live progress belongs to this explicit action; no effect on route load.
   const encoder=new TextEncoder();let alive=true;
   const body=new ReadableStream({async start(controller){
    const emit=(event:unknown)=>{if(alive)try{controller.enqueue(encoder.encode(JSON.stringify(event)+'\n'));}catch{alive=false;}};
    try{
     const progressStore={...storage,async save(patch:Partial<Job>){await save(patch);emit({state:job.state,assets:job.assets.length,id:job.id});}};
     await prepare(job,progressStore,gateway(key,request.headers.get('X-Lovable-AIG-Run-ID')??undefined),data.omitScene===true);
     await save({lease_token:null,lease_until:null});emit({done:true,id:job.id});
    }catch(error){
     const code=error instanceof Error?error.message:'instagram_generation_failed';
     const message=error instanceof GatewayError?error.safeMessage:code;
     const terminal=error instanceof GatewayError&&([402,403].includes(error.status)||error.providerDenial);
     if(terminal)await db.from('instagram_carousel_settings').update({paused_reason:code}).eq('singleton',true);
     await save({state:'blocked',error_code:code,error_message:message,lease_token:null,lease_until:null}).catch(()=>{});emit({error:message});
    }finally{if(alive)controller.close();}
   },cancel(){alive=false;}});
   return new Response(body,{headers:{...headers,'Content-Type':'application/x-ndjson'}});
  }
  try{
   const {approvable,publish}=await import('./workflow.server');
   if(data.action==='approve'){
    if(!approvable(job))throw Error('instagram_review_required');
    for(const a of job.assets){const bytes=await storage.download(a.path),d=inspectJpeg(bytes);if(d?.width!==1080||d.height!==1350||await hash(bytes)!==a.sha256)throw Error('instagram_asset_validation_failed');}
    await save({state:'approved',approved_revision:job.revision,approved_by:actor,error_code:null,error_message:null});
   }else{
    if(!cfg.publishing_enabled)throw Error('instagram_publication_disabled');
    const {carouselPublisher,readInstagramSettings}=await import('./meta.server');
    const metaSettings=readInstagramSettings(name=>process.env[name]);if(!metaSettings)throw Error('instagram_meta_not_configured');
    const meta=carouselPublisher(metaSettings);
    if(data.action==='reconcile'){
     if(!job.publish_attempted||!job.album_id)throw Error('instagram_nothing_to_reconcile');
     const account=await meta.account();const result=await meta.reconcile(account,job.album_id);
     // Uncertainty never permits a second publish. Matching ordered approved
     // children and exact caption is required; absence remains uncertain.
     if(result){const match=result.items.filter((item:{caption?:string;children?:{data?:{id:string}[]}})=>item.caption===job.script?.caption&&item.children?.data?.map(x=>x.id).join(',')===job.children.join(','));if(match.length===1)await save({state:'published',media_id:match[0].id,permalink:match[0].permalink??null,media_token_hash:null,media_expires_at:null,error_code:null});}
    }else if(data.action==='publish'){
     if(job.publish_attempted)throw Error('instagram_publish_uncertain_reconcile_only');
     const token=crypto.randomUUID()+crypto.randomUUID(),expires=new Date(Date.now()+60*60*1000).toISOString();
     await save({media_token_hash:await hash(token),media_expires_at:expires});
     const origin=process.env.INSTAGRAM_PUBLIC_ORIGIN;
     if(origin!=='https://vitalemobilidade.com')throw Error('instagram_public_origin_not_configured');
     await publish(job,save,meta,position=>`${origin}/api/public/instagram/media/${job.id}/${position}?token=${encodeURIComponent(token)}`);
    }
   }
   await save({lease_token:null,lease_until:null});return reply({status:job.state,id:job.id});
  }catch(error){const code=error instanceof Error?error.message:'instagram_operation_failed';await save({state:job.state==='published'?'published':job.publish_attempted?'uncertain':job.state,error_code:code,lease_token:null,lease_until:null}).catch(()=>{});return reply({error:code},409);}
 }catch(error){return reply({error:error instanceof Error?error.message:'instagram_unavailable'},409);}
}
export async function instagramAsset(request:Request,id:string,position:string,publicMedia=false,dbFactory=createDb){
 if(!/^[a-f0-9-]{36}$/.test(id)||! /^[1-7]$/.test(position))return new Response(null,{status:404,headers});
 try{
  if(!releaseEnabled())return new Response(null,{status:404,headers});const db=dbFactory();
  if(!publicMedia&&!await authorize(request,db))return new Response(null,{status:403,headers});
  const result=await db.from('instagram_carousel_jobs').select('*').eq('id',id).single();const job=result.data as Job|null;if(result.error||!job)return new Response(null,{status:404,headers});
  if(publicMedia){const cfg=await settings(db),token=new URL(request.url).searchParams.get('token');if(!cfg.publishing_enabled||cfg.paused_reason||!token||token.length>100||!job.media_token_hash||await hash(token)!==job.media_token_hash||!job.media_expires_at||Date.parse(job.media_expires_at)<=Date.now()||job.approved_revision!==job.revision||!job.approved_by||!['approved','publishing','uncertain'].includes(job.state))return new Response(null,{status:404,headers});}
  const asset=job.assets.find(a=>a.position===Number(position));if(!asset||asset.path!==`${id}/r${job.revision}/${position.padStart(2,'0')}.jpg`)return new Response(null,{status:404,headers});
  const bytes=await store(db,job).download(asset.path),d=inspectJpeg(bytes);if(d?.width!==1080||d.height!==1350||await hash(bytes)!==asset.sha256)throw Error('instagram_asset_invalid');
  return new Response(new Uint8Array(bytes).buffer,{headers:{...headers,'Content-Type':'image/jpeg','Content-Length':String(bytes.length),'Content-Disposition':`${new URL(request.url).searchParams.has('download')?'attachment':'inline'}; filename="${String(asset.position).padStart(2,'0')}-vitale.jpg"`}});
 }catch{return new Response(null,{status:404,headers});}
}
