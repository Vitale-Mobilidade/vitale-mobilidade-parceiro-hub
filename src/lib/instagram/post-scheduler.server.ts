import {createDb} from './repository.server';
import {postRelease} from './post-admin.server';
import {postDecision,canonicalPostJson,type Post} from './post';
import {hash} from './contract';
import {publishPost} from './post-workflow.server';
/** Existing project HMAC verifier. Managed callback provisioning is a separate release prerequisite. */
export async function postTick(request:Request){
 if(!postRelease()||process.env.INSTAGRAM_POST_SCHEDULING_ENABLED!=='true')return Response.json({status:'disabled'},{status:403});
 const {verifyInstagramTick}=await import('./scheduler.server');
 const actor=await verifyInstagramTick(request,'instagram-post-publish');if(!actor)return Response.json({error:'unauthorized'},{status:403});
 return dispatchPost(createDb());
}
export async function dispatchPost(db:ReturnType<typeof createDb>){
 const cfg=await db.from('instagram_post_settings').select('*').eq('singleton',true).single();if(cfg.error||!cfg.data.publishing_enabled||!cfg.data.scheduling_enabled||cfg.data.paused_reason)return Response.json({status:'disabled'});
 const token=crypto.randomUUID(),claim=await db.rpc('claim_due_instagram_post',{p_token:token}),post=claim.data?.[0] as Post|undefined;
 if(claim.error)return Response.json({error:'instagram_post_claim_failed'},{status:409});if(!post)return Response.json({status:'idle'});
 const save=async(patch:Partial<Post>)=>{const r=await db.from('instagram_post_jobs').update({...patch,updated_at:new Date().toISOString()}).eq('id',post.id).eq('revision',post.revision).eq('lease_token',token).select('id').single();if(r.error)throw Error('instagram_post_checkpoint_failed');Object.assign(post,patch);};
 const finish=async(state:Post['state'],error_code:string|null)=>{const slot=await db.from('instagram_post_slots').update({state:state==='published'?'published':state==='uncertain'?'uncertain':state==='blocked'?'missed':'reserved'}).eq('job_id',post.id).eq('revision',post.revision).eq('due_at',post.due_at);if(slot.error)throw Error('instagram_post_slot_checkpoint_failed');await save({state,error_code,lease_token:null,lease_until:null});};
 try{
  const slot=await db.from('instagram_post_slots').select('actor_id,fingerprint,revision,state').eq('due_at',post.due_at).eq('job_id',post.id).single();
  if(slot.error||slot.data.fingerprint!==post.approved_hash||slot.data.revision!==post.revision||slot.data.state!=='reserved')throw Error('instagram_post_slot_changed');
  const member=await db.from('editorial_admin_memberships').select('role,active').eq('user_id',slot.data.actor_id).single();if(member.error||!member.data.active||member.data.role!=='admin')throw Error('instagram_post_actor_revoked');
  const decision=await postDecision(post);if(decision!=='send')throw Error(`instagram_post_${decision}`);
  // Re-read the exact published source and approved JPEG before giving Meta a URL.
  const {source}=await import('./repository.server'),{inspectJpeg}=await import('../../../supabase/functions/_shared/editorial-cover');
  const current=await source(db,post.video_id,post.article_id);if(!current||canonicalPostJson(current)!==canonicalPostJson(post.source))throw Error('instagram_post_source_changed');
  if(!post.asset)throw Error('instagram_post_asset_missing');const file=await db.storage.from('instagram-carousels').download(post.asset.path);if(file.error||!file.data)throw Error('instagram_post_asset_missing');const bytes=new Uint8Array(await file.data.arrayBuffer()),d=inspectJpeg(bytes);if(d?.width!==1080||d.height!==1350||await hash(bytes)!==post.asset.sha256)throw Error('instagram_post_asset_invalid');
  const {carouselPublisher,readInstagramSettings}=await import('./meta.server');const settings=readInstagramSettings(name=>process.env[name]);if(!settings)throw Error('instagram_meta_not_configured');
  if(process.env.INSTAGRAM_PUBLIC_ORIGIN!=='https://vitalemobilidade.com')throw Error('instagram_public_origin_not_configured');
  const mediaToken=crypto.randomUUID()+crypto.randomUUID();await save({media_token_hash:await hash(mediaToken),media_expires_at:new Date(Date.now()+60*60000).toISOString()});
  await publishPost(post,save,carouselPublisher(settings),`https://vitalemobilidade.com/api/public/instagram/posts/${post.id}?token=${encodeURIComponent(mediaToken)}`);
  await finish('published',post.error_code);return Response.json({status:'published',id:post.id});
 }catch(error){
  const code=error instanceof Error&&/^[a-z0-9_]+$/.test(error.message)?error.message:'instagram_post_dispatch_unconfirmed';
  const state=post.state==='published'?'published':post.publish_attempted||post.create_attempted&&!post.container_id?'uncertain':code==='meta_processing'?'scheduled':'blocked';
  await finish(state,code).catch(()=>{});return Response.json({status:state,id:post.id},{headers:{'Cache-Control':'no-store'}});
 }
}