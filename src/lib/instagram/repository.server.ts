import { createClient,type SupabaseClient } from '@supabase/supabase-js';
import { type Source,type Job } from './contract';
import { type VideoEligibility,VIDEO_BATCH_LIMIT,videoIdPattern } from './video-selection';
import type { Store } from './workflow.server';
const BUCKET='instagram-carousels';
export function createDb(){const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw Error('database_not_configured');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});}
export async function authorize(request:Request,db:SupabaseClient){
 const token=request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];if(!token||token.length>4000)return null;
 const auth=await db.auth.getUser(token);if(auth.error||!auth.data.user)return null;
 const membership=await db.from('editorial_admin_memberships').select('role,active').eq('user_id',auth.data.user.id).maybeSingle();
 return !membership.error&&membership.data?.active===true&&membership.data.role==='admin'?auth.data.user.id:null;
}
/** Hub env gate first; if the Worker cannot see it, ask Edge read-only (its configured secret). */
export async function releaseEnabled(confirm:()=>Promise<boolean>=edgeRelease){if(process.env.INSTAGRAM_CAROUSEL_RELEASE_ENABLED==='true')return true;try{return await confirm();}catch{return false;}}
async function edgeRelease(){const {edge,edgeConfigured}=await import('./edge.server');return edgeConfigured()&&(await edge().runtime(false)).release;}
export async function settings(db:SupabaseClient){const row=await db.from('instagram_carousel_settings').select('*').eq('singleton',true).single();if(row.error)throw Error('instagram_release_pending');return row.data;}
export async function source(db:SupabaseClient,videoId?:string,articleId?:string):Promise<Source|null>{
 if(videoId&&!videoIdPattern.test(videoId))throw Error('instagram_video_invalid');
 let query=db.from('instagram_carousel_sources').select('*');
 if(videoId)query=query.eq('video_id',videoId);
 const row=await query.order('video_date',{ascending:false}).order('video_id').order('published_at',{ascending:false}).order('article_id',{ascending:false}).limit(1).maybeSingle();
 if(row.error)throw Error('instagram_source_unavailable');const s=row.data;
 if(!s)return null;
 if(articleId&&s.article_id!==articleId)throw Error('instagram_source_changed');
 const article=await db.from('editorial_articles').select('blocks,summary,og_image_url').eq('id',s.article_id).eq('status','published').single();
 if(article.error||!Array.isArray(article.data?.blocks))throw Error('instagram_full_article_unavailable');
 return {videoId:s.video_id,videoTitle:s.video_title,videoDate:s.video_date,transcript:s.transcript,articleId:s.article_id,articleTitle:s.article_title,articleSlug:s.article_slug,publishedAt:s.published_at,bikeIds:s.bike_ids,eligibleAt:s.eligible_at,articleBlocks:article.data.blocks,articleSummary:article.data.summary,articleCoverUrl:article.data.og_image_url};
}
/** Bounded admin-only DTO: the existing eligibility view is authoritative; no transcript projection. */
export async function videoEligibility(db:SupabaseClient,videoIds:string[]):Promise<VideoEligibility[]>{
 if(videoIds.length>VIDEO_BATCH_LIMIT||videoIds.some(id=>!videoIdPattern.test(id)))throw Error('instagram_video_batch_invalid');
 const ids=[...new Set(videoIds)];if(!ids.length)return [];
 const rows=await db.from('instagram_carousel_sources').select('video_id,article_id,published_at').in('video_id',ids).order('published_at',{ascending:false}).order('article_id',{ascending:false});
 if(rows.error)throw Error('instagram_source_unavailable');
 const selected=new Map<string,{video_id:string;article_id:string}>();
 for(const row of rows.data??[])if(!selected.has(row.video_id))selected.set(row.video_id,row);
 if(!selected.size)return [];
 const jobs=await db.from('instagram_carousel_jobs').select('id,video_id,article_id,revision,state').in('video_id',[...selected.keys()]);
 if(jobs.error)throw Error('instagram_jobs_unavailable');
 return [...selected.values()].map(row=>{const job=jobs.data?.find(j=>j.video_id===row.video_id&&j.article_id===row.article_id);return {videoId:row.video_id,articleId:row.article_id,jobId:job?.id??null,revision:job?.revision??null,state:job?.state??null};});
}
export async function claim(db:SupabaseClient,id:string,revision:number){const token=crypto.randomUUID();const result=await db.rpc('claim_instagram_carousel',{p_id:id,p_revision:revision,p_token:token});if(result.error)throw Error('instagram_claim_failed');const job=result.data?.[0] as Job|undefined;if(!job)throw Error('instagram_busy_or_changed');return job;}
export function store(db:SupabaseClient,job:Job):Store{
 return {
  async save(patch){const res=await db.from('instagram_carousel_jobs').update({...patch,updated_at:new Date().toISOString()}).eq('id',job.id).eq('revision',job.revision).eq('lease_token',job.lease_token).select('id').single();if(res.error||!res.data)throw Error('instagram_checkpoint_failed');},
  async download(path){const res=await db.storage.from(BUCKET).download(path);if(res.error||!res.data)throw Error('instagram_asset_missing');return new Uint8Array(await res.data.arrayBuffer());},
 };
}
