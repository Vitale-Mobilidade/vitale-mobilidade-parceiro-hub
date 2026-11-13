import { z } from 'zod';
export const WIDTH=1080, HEIGHT=1350;
export const FINAL_ACTIONS=['Curta','Compartilhe','Comente','Salve'] as const;
const evidence=z.object({claim:z.string().min(1),quote:z.string().min(8),start:z.number().int().min(0),kind:z.enum(['observation','estimate','measurement','context'])});
export const slideSchema=z.object({title:z.string().trim().min(1).max(100),body:z.string().trim().min(1).max(320),layout:z.enum(['opening','review','comparison','numbers','diagram','conclusion']),theme:z.enum(['petroleum','deep','light']),bikeIds:z.array(z.string()).max(2),scene:z.string().max(400).nullable(),alt:z.string().min(1).max(500),evidence:z.array(evidence).min(1)}).strict();
export const scriptSchema=z.object({topic:z.string().min(1).max(120),caption:z.string().min(1).max(2200),slides:z.array(slideSchema).min(3).max(6),captionEvidence:z.array(evidence).min(1)}).strict();
export type Script=z.infer<typeof scriptSchema>; export type Slide=z.infer<typeof slideSchema>;
export type Source={videoId:string;videoTitle:string;videoDate:string;transcript:string;articleId:string;articleTitle:string;articleSlug:string;publishedAt:string;bikeIds:string[];eligibleAt:string};
export type Asset={position:number;path:string;alt:string;sha256:string;missingBikeIds:string[]};
export type State='queued'|'scripting'|'scene'|'rendering'|'review'|'approved'|'publishing'|'uncertain'|'published'|'blocked';
export type Job={id:string;video_id:string;article_id:string;state:State;revision:number;source:Source;script:Script|null;assets:Asset[];scene_path:string|null;scene_attempted:boolean;script_attempted:boolean;scene_omitted:boolean;approved_revision:number|null;approved_by:string|null;lease_token:string|null;lease_until:string|null;error_code:string|null;error_message:string|null;children:string[];album_id:string|null;publish_attempted:boolean;media_id:string|null;permalink:string|null;media_token_hash:string|null;media_expires_at:string|null;created_at:string};
export type Snapshot={available:boolean;generationEnabled:boolean;publishingEnabled:boolean;automationEnabled:boolean;source:Source|null;jobs:Job[]};
const external=/https?:|www\.|link\s+(?:da|na)\s+bio|\b(?:acesse|leia|ouça)\b.*\b(?:podcast|site|artigo)\b/i;
export function validateScript(raw:unknown,source:Source):Script{
 const s=scriptSchema.parse(raw);
 if(s.slides[0]?.layout!=='opening'||s.slides.at(-1)?.layout!=='conclusion')throw Error('instagram_narrative_incomplete');
 if(s.slides.filter(x=>x.scene).length>1)throw Error('instagram_scene_limit');
 for(const slide of s.slides){
  if(external.test(`${slide.title} ${slide.body}`))throw Error('instagram_external_cta');
  if(slide.bikeIds.some(id=>!source.bikeIds.includes(id)))throw Error('instagram_unrelated_bike');
  checkEvidence(slide.evidence,`${slide.title} ${slide.body}`,source);
 }
 if(external.test(s.caption))throw Error('instagram_external_cta');
 checkEvidence(s.captionEvidence,s.caption,source);return s;
}
function checkEvidence(items:z.infer<typeof evidence>[],text:string,source:Source){
 for(const e of items){
  if(source.transcript.slice(e.start,e.start+e.quote.length)!==e.quote||!text.includes(e.claim))throw Error('instagram_evidence_invalid');
  if(e.kind==='measurement'&&/estimad|até|aproximad/i.test(e.quote))throw Error('instagram_estimate_as_measurement');
  if(e.kind==='estimate'&&!/estimad|até|aproximad/i.test(e.claim))throw Error('instagram_estimate_unqualified');
  if((e.claim.match(/\d+(?:[.,]\d+)?/g)??[]).some(n=>!e.quote.includes(n)))throw Error('instagram_number_unsupported');
 }
}
export function eligibleSource(videos:Array<{youtube_id:string;title:string;published_on:string|null;transcript:string|null;status:string;primary_bike_id?:string|null;related_bike_ids?:string[]}>,articles:Array<{id:string;video_id:string;title:string;slug:string|null;status:string;published_at:string|null}>,now:string):Source|null{
 const pairs:Source[]=[];
 for(const v of videos)for(const a of articles){
  if(v.youtube_id!==a.video_id||v.status!=='active'||!v.transcript?.trim()||!v.published_on||!Number.isFinite(Date.parse(v.published_on))||Date.parse(v.published_on)>Date.parse(now)||a.status!=='published'||!a.slug||!a.published_at||!Number.isFinite(Date.parse(a.published_at))||Date.parse(a.published_at)>Date.parse(now))continue;
  pairs.push({videoId:v.youtube_id,videoTitle:v.title,videoDate:v.published_on,transcript:v.transcript,articleId:a.id,articleTitle:a.title,articleSlug:a.slug,publishedAt:a.published_at,bikeIds:[...new Set([v.primary_bike_id,...(v.related_bike_ids??[])].filter((id):id is string=>!!id))],eligibleAt:a.published_at});
 }
 return pairs.sort((a,b)=>b.videoDate.localeCompare(a.videoDate)||a.videoId.localeCompare(b.videoId)||a.articleId.localeCompare(b.articleId))[0]??null;
}
export function afterActivation(s:Source,cut:string|null,seen:string[]){return !!cut&&Date.parse(s.eligibleAt)>Date.parse(cut)&&!seen.includes(`${s.videoId}:${s.articleId}`);}
export async function hash(input:Uint8Array|string){const bytes=typeof input==='string'?new TextEncoder().encode(input):input;return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes).buffer))].map(b=>b.toString(16).padStart(2,'0')).join('');}
