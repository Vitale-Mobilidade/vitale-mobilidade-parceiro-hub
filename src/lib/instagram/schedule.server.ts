import type {SupabaseClient} from '@supabase/supabase-js';
import {approvedFingerprint,saoPauloInstant,scheduledDecision,type InstagramSchedule} from './schedule';
import {createDb,settings} from './repository.server';
import {instagramAdmin} from './admin.server';
import type {Job} from './contract';
export async function manageSchedule(db:SupabaseClient,actor:string,id:string,revision:number,local:string|undefined,cancel=false){
 const row=await db.from('instagram_carousel_jobs').select('*').eq('id',id).eq('revision',revision).single();
 if(row.error||!row.data)throw Error('instagram_job_missing');const job=row.data as Job;
 const fingerprint=await approvedFingerprint(job);if(job.publish_attempted)throw Error('instagram_publish_uncertain_reconcile_only');
 const r=await db.rpc('manage_instagram_schedule',{p_job:id,p_revision:revision,p_actor:actor,p_due:cancel?null:saoPauloInstant(local??''),p_fingerprint:fingerprint,p_cancel:cancel});
 if(r.error)throw Error('instagram_schedule_busy_disabled_or_changed');return {status:cancel?'cancelled':'scheduled',id};
}
export async function runScheduled(schedule:InstagramSchedule,job:Job,execute:()=>Promise<void>,finish:(state:InstagramSchedule['state'],error?:string)=>Promise<void>,now=Date.now()){
 let fingerprint='';try{fingerprint=await approvedFingerprint(job);}catch{/* Decision fails closed. */}
 const decision=scheduledDecision(schedule,job,now,fingerprint);
 if(decision==='wait')return;
 if(decision==='published'){await finish('published');return;}
 if(decision==='uncertain'){await finish('uncertain','publication_uncertain');return;}
 if(decision!=='send'){await finish('blocked',`schedule_${decision}`);return;}
 try{await execute();await finish('published');}catch(error){
  // Confirmed container processing is a safe read/checkpoint retry, never a media_publish retry.
  if(error instanceof Error&&error.message==='meta_processing'&&!job.publish_attempted)await finish('pending','meta_processing');
  else await finish('uncertain','schedule_execution_unconfirmed');
 }
}
export async function scheduledTick(request:Request){
 const {verifyInstagramTick}=await import('./scheduler.server');
 if(!await verifyInstagramTick(request,'instagram-publish'))return Response.json({error:'unauthorized_or_disabled'},{status:403});
 if(process.env.INSTAGRAM_SCHEDULING_ENABLED!=='true')return Response.json({status:'disabled'});
 const db=createDb(),cfg=await settings(db);if(!cfg.scheduling_enabled||!cfg.publishing_enabled||cfg.paused_reason)return Response.json({status:'paused'});
 const token=crypto.randomUUID(),r=await db.rpc('claim_instagram_schedule',{p_token:token});
 if(r.error)return Response.json({error:'schedule_claim_failed'},{status:409});
 const s=r.data?.[0] as InstagramSchedule|undefined;if(!s)return Response.json({status:'idle'});
 const finish=async(state:InstagramSchedule['state'],error?:string)=>{const result=await db.from('instagram_carousel_schedules').update({state,error_code:error??null,lease_token:null,lease_until:null,updated_at:new Date().toISOString()}).eq('id',s.id).eq('lease_token',token).eq('state','running').select('id').single();if(result.error)throw Error('schedule_checkpoint_failed');};
 const membership=await db.from('editorial_admin_memberships').select('active,role').eq('user_id',s.actor_id).maybeSingle();
 if(membership.error||!membership.data?.active||membership.data.role!=='admin'){await finish('blocked','schedule_actor_revoked');return Response.json({status:'blocked'});}
 const row=await db.from('instagram_carousel_jobs').select('*').eq('id',s.job_id).single();if(row.error||!row.data){await finish('blocked','schedule_job_missing');return Response.json({status:'blocked'});}
 await runScheduled(s,row.data as Job,async()=>{
  const internal=new Request(request.url,{method:'POST',body:JSON.stringify({action:'publish',id:s.job_id,revision:s.revision})});
  const result=await instagramAdmin(internal,()=>db,s.actor_id,s.id);
  const body=await result.json();if(!result.ok||body.status!=='published')throw Error(body.error==='meta_processing'?'meta_processing':'schedule_publication_unconfirmed');
 },finish);
 return Response.json({status:'processed',id:s.id},{headers:{'Cache-Control':'no-store'}});
}