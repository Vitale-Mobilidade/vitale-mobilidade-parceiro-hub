import {z} from 'zod';
import {authorize,createDb,source} from './repository.server';
import {hash} from './contract';
import {postFingerprint,canonicalPostJson,type Post} from './post';
import {inspectJpeg} from '../../../supabase/functions/_shared/editorial-cover';
const headers={'Cache-Control':'private, no-store','Vary':'Authorization','X-Robots-Tag':'noindex, nofollow'};
const input=z.object({action:z.enum(['snapshot','video-eligibility','generate','resume','approve','schedule','cancel-schedule','reconcile']),id:z.string().uuid().optional(),revision:z.number().int().positive().optional(),videoId:z.string().regex(/^[A-Za-z0-9_-]{11}$/).optional(),articleId:z.string().uuid().optional(),videoIds:z.array(z.string().regex(/^[A-Za-z0-9_-]{11}$/)).max(40).optional()}).strict();
export function postRelease(){return process.env.INSTAGRAM_POST_RELEASE_ENABLED==='true';}
export async function postAdmin(request:Request,dbFactory=createDb){
 const reply=(data:unknown,status=200)=>Response.json(data,{status,headers});
 if(!request.headers.get('Authorization')?.match(/^Bearer .+$/))return reply({error:'authentication_required'},401);
 try{
  const db=dbFactory(),actor=await authorize(request,db);if(!actor)return reply({error:'Acesso restrito a administradores.'},403);
  const text=await request.text();if(text.length>4096)return reply({error:'Requisição inválida.'},413);const data=input.parse(JSON.parse(text));
  if(!postRelease())return data.action==='snapshot'||data.action==='video-eligibility'?reply({available:false,generationEnabled:false,publishingEnabled:false,schedulingEnabled:false,source:null,posts:[],sources:[]}):reply({error:'Post de imagem única aguardando release.'},409);
  const cfg=await db.from('instagram_post_settings').select('*').eq('singleton',true).single();if(cfg.error)throw Error('Release de imagem única ainda não aplicado.');
  const flags={available:true,generationEnabled:cfg.data.generation_enabled&&!cfg.data.paused_reason,publishingEnabled:cfg.data.publishing_enabled&&!cfg.data.paused_reason,schedulingEnabled:cfg.data.scheduling_enabled&&process.env.INSTAGRAM_POST_SCHEDULING_ENABLED==='true'&&!cfg.data.paused_reason};
  if(data.action==='snapshot'){
   const rows=await db.from('instagram_post_jobs').select('*').order('created_at',{ascending:false}).limit(40);if(rows.error)throw Error('Posts indisponíveis.');
   if(data.id&&!rows.data.some(p=>p.id===data.id)){const exact=await db.from('instagram_post_jobs').select('*').eq('id',data.id).maybeSingle();if(exact.error)throw Error('Post indisponível.');if(exact.data)rows.data.push(exact.data);}
   return reply({...flags,source:await source(db),posts:rows.data.map(({lease_token,media_token_hash,...p})=>({...p,lease_token:null,media_token_hash:null}))});
  }
  if(data.action==='video-eligibility'){
   const ids=[...new Set(data.videoIds??[])];if(!ids.length)return reply({...flags,sources:[]});
   const rows=await db.from('instagram_carousel_sources').select('video_id,article_id,published_at').in('video_id',ids).order('published_at',{ascending:false}).order('article_id',{ascending:false});if(rows.error)throw Error('Fontes indisponíveis.');
   const pairs=new Map<string,{video_id:string;article_id:string}>();for(const r of rows.data??[])if(!pairs.has(r.video_id))pairs.set(r.video_id,r);
   const posts=await db.from('instagram_post_jobs').select('id,video_id,revision,state').in('video_id',ids);if(posts.error)throw Error('Posts indisponíveis.');
   const sources=[];for(const r of pairs.values()){const seen=await db.rpc('instagram_post_seen',{p_video:r.video_id,p_article:r.article_id});if(seen.error)throw Error('Histórico indisponível.');if(seen.data)continue;const p=posts.data.find(p=>p.video_id===r.video_id);sources.push({videoId:r.video_id,articleId:r.article_id,jobId:p?.id??null,revision:p?.revision??null,state:p?.state??null});}
   return reply({...flags,sources});
  }
  let id=data.id,revision=data.revision;
  if(data.action==='generate'){
   if(!flags.generationEnabled||!data.videoId)throw Error('Geração desligada ou vídeo ausente.');
   const selected=await source(db,data.videoId,data.articleId);if(!selected)throw Error('Fonte mudou ou não é elegível.');
   const r=await db.rpc('enqueue_instagram_post',{p_video:selected.videoId,p_article:selected.articleId,p_source:selected,p_actor:actor});if(r.error)throw Error('Pauta já enviada, incerta ou indisponível.');
   id=r.data;const existing=await db.from('instagram_post_jobs').select('revision,state').eq('id',id).single();if(existing.error)throw Error('Post indisponível.');revision=existing.data.revision;
   if(existing.data.state!=='queued')return reply({id,status:existing.data.state,existing:true});
  }
  if(!id||!revision)throw Error('Selecione a revisão do post.');
  if(data.action==='reconcile'){
   if(!flags.publishingEnabled)throw Error('Conferência Meta desligada.');
   const row=await db.from('instagram_post_jobs').select('*').eq('id',id).eq('revision',revision).single();if(row.error||!row.data)throw Error('Post indisponível.');
   const p=row.data as Post,{carouselPublisher,readInstagramSettings}=await import('./meta.server');const config=readInstagramSettings(name=>process.env[name]);if(!config)throw Error('Conexão Instagram indisponível.');
   const meta=carouselPublisher(config);await meta.account();
   const status=p.container_id?await meta.status(p.container_id):'UNKNOWN';
   // Read only: PUBLISHED container is not a media id. Never infer a matching post by caption.
   return reply({id,status:p.state,containerStatus:status,message:status==='PUBLISHED'?'Container publicado. Conferir ID final e registro antes de reconciliar; não repetir envio.':'Envio continua sem confirmação. Não repetir; reconciliar os IDs com o registro Meta.'});
  }
  if(data.action==='schedule'||data.action==='cancel-schedule'){
   if(data.action==='schedule'&&(!flags.schedulingEnabled||!flags.publishingEnabled))throw Error('Agenda desligada.');
   const row=await db.from('instagram_post_jobs').select('*').eq('id',id).eq('revision',revision).single();if(row.error)throw Error('Post indisponível.');
   const fingerprint=await postFingerprint(row.data as Post);if(fingerprint!==row.data.approved_hash)throw Error('Revisão mudou.');
   const r=await db.rpc('schedule_instagram_post',{p_id:id,p_revision:revision,p_actor:actor,p_hash:fingerprint,p_cancel:data.action==='cancel-schedule'});if(r.error)throw Error('Agenda indisponível ou revisão ocupada.');return reply({id,due_at:r.data,status:data.action==='schedule'?'scheduled':'approved'});
  }
  const token=crypto.randomUUID(),claim=await db.rpc('claim_instagram_post',{p_id:id,p_revision:revision,p_token:token});const p=claim.data?.[0] as Post&{caption_attempted:boolean}|undefined;if(claim.error||!p)throw Error('Post ocupado ou revisão mudou.');
  const save=async(patch:Partial<Post>&{caption_attempted?:boolean})=>{const r=await db.from('instagram_post_jobs').update({...patch,updated_at:new Date().toISOString()}).eq('id',p.id).eq('revision',p.revision).eq('lease_token',token).select('id').single();if(r.error)throw Error('instagram_post_checkpoint_failed');Object.assign(p,patch);};
  try{
   if(data.action==='generate'||data.action==='resume'){
    if(!flags.generationEnabled)throw Error('Geração desligada.');const selected=await source(db,p.video_id,p.article_id);if(!selected||canonicalPostJson(selected)!==canonicalPostJson(p.source))throw Error('Fonte mudou. Crie revisão controlada.');
    const {preparePost}=await import('./post-workflow.server'),{postStudio}=await import('./post-edge.server');await preparePost(p,save,postStudio(),p.caption_attempted);
   }else if(data.action==='approve'){
    if(p.state!=='review'||!p.asset||!p.caption)throw Error('Revise imagem e legenda.');
    const file=await db.storage.from('instagram-carousels').download(p.asset.path);if(file.error||!file.data)throw Error('Arte ausente.');const bytes=new Uint8Array(await file.data.arrayBuffer()),d=inspectJpeg(bytes);
    if(d?.width!==1080||d.height!==1350||await hash(bytes)!==p.asset.sha256)throw Error('Arte inválida.');
    await save({state:'approved',approved_by:actor,approved_revision:p.revision,approved_hash:await postFingerprint(p)});
   }
   await save({lease_token:null,lease_until:null});return reply({id:p.id,status:p.state});
  }catch{await save({state:p.state==='approved'?'approved':'blocked',error_code:p.caption?'instagram_post_render_failed':'instagram_post_caption_uncertain',lease_token:null,lease_until:null}).catch(()=>{});return reply({id:p.id,error:'Preparação interrompida. Confira o post; saída de texto incerta não será repetida.'},409);}
 }catch(error){return reply({error:error instanceof Error?error.message:'Post indisponível.'},409);}
}
export async function postAsset(request:Request,id:string,publicMedia=false,dbFactory=createDb){
 if(!z.string().uuid().safeParse(id).success||!postRelease())return new Response(null,{status:404,headers});
 try{const db=dbFactory();if(!publicMedia&&!await authorize(request,db))return new Response(null,{status:403,headers});const row=await db.from('instagram_post_jobs').select('*').eq('id',id).single();const p=row.data as Post;if(row.error||!p?.asset||p.asset.path!==`posts/${id}/r${p.revision}/01.jpg`)throw Error('missing');
  if(publicMedia){const cfg=await db.from('instagram_post_settings').select('*').eq('singleton',true).single(),token=new URL(request.url).searchParams.get('token');if(cfg.error||!cfg.data.publishing_enabled||cfg.data.paused_reason||!token||token.length>100||!p.media_token_hash||await hash(token)!==p.media_token_hash||Date.parse(p.media_expires_at??'')<=Date.now()||!p.media_expires_at||p.approved_hash!==await postFingerprint(p)||!['publishing','uncertain'].includes(p.state))throw Error('denied');}
  const file=await db.storage.from('instagram-carousels').download(p.asset.path);if(file.error||!file.data)throw Error('missing');const bytes=new Uint8Array(await file.data.arrayBuffer()),d=inspectJpeg(bytes);if(d?.width!==1080||d.height!==1350||await hash(bytes)!==p.asset.sha256)throw Error('invalid');return new Response(bytes.buffer,{headers:{...headers,'Content-Type':'image/jpeg','X-Content-Type-Options':'nosniff'}});
 }catch{return new Response(null,{status:404,headers});}
}