import { createClient,type SupabaseClient } from '@supabase/supabase-js';
import { type Source,type Job } from './contract';
import { BUCKET,type Store } from './workflow.server';
import { decodePhoto } from './render.server';
export function createDb(){const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw Error('database_not_configured');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});}
export async function authorize(request:Request,db:SupabaseClient){
 const token=request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];if(!token||token.length>4000)return null;
 const auth=await db.auth.getUser(token);if(auth.error||!auth.data.user)return null;
 const membership=await db.from('editorial_admin_memberships').select('role,active').eq('user_id',auth.data.user.id).maybeSingle();
 return !membership.error&&membership.data?.active===true&&membership.data.role==='admin'?auth.data.user.id:null;
}
export function releaseEnabled(){return process.env.INSTAGRAM_CAROUSEL_RELEASE_ENABLED==='true';}
export async function settings(db:SupabaseClient){const row=await db.from('instagram_carousel_settings').select('generation_enabled,publishing_enabled,automation_enabled,activated_at,cursor_at,paused_reason').eq('singleton',true).single();if(row.error)throw Error('instagram_release_pending');return row.data;}
export async function source(db:SupabaseClient):Promise<Source|null>{
 const row=await db.from('instagram_carousel_sources').select('*').order('video_date',{ascending:false}).order('video_id').order('article_id').limit(1).maybeSingle();
 if(row.error)throw Error('instagram_source_unavailable');const s=row.data;
 return s?{videoId:s.video_id,videoTitle:s.video_title,videoDate:s.video_date,transcript:s.transcript,articleId:s.article_id,articleTitle:s.article_title,articleSlug:s.article_slug,publishedAt:s.published_at,bikeIds:s.bike_ids,eligibleAt:s.eligible_at}:null;
}
export async function claim(db:SupabaseClient,id:string,revision:number){const token=crypto.randomUUID();const result=await db.rpc('claim_instagram_carousel',{p_id:id,p_revision:revision,p_token:token});if(result.error)throw Error('instagram_claim_failed');const job=result.data?.[0] as Job|undefined;if(!job)throw Error('instagram_busy_or_changed');return job;}
export function store(db:SupabaseClient,job:Job):Store{
 return {
  async save(patch){const res=await db.from('instagram_carousel_jobs').update({...patch,updated_at:new Date().toISOString()}).eq('id',job.id).eq('revision',job.revision).eq('lease_token',job.lease_token).select('id').single();if(res.error||!res.data)throw Error('instagram_checkpoint_failed');},
  async upload(path,bytes,mime){const res=await db.storage.from(BUCKET).upload(path,bytes,{contentType:mime,upsert:true});if(res.error)throw Error('instagram_asset_save_failed');},
  async download(path){const res=await db.storage.from(BUCKET).download(path);if(res.error||!res.data)throw Error('instagram_asset_missing');return new Uint8Array(await res.data.arrayBuffer());},
  async photo(id){const asset=await db.from('bike_assets').select('storage_path,content_type').eq('bike_id',id).eq('status','ready').not('storage_path','is',null).maybeSingle();if(asset.error||!asset.data?.storage_path)return null;
   const res=await db.storage.from('bike-images').download(asset.data.storage_path);if(res.error||!res.data)return null;
   if(res.data.size>12*1024*1024)return null;
   try{return await decodePhoto(new Uint8Array(await res.data.arrayBuffer()),asset.data.content_type??res.data.type);}catch{return null;}
  },
 };
}
