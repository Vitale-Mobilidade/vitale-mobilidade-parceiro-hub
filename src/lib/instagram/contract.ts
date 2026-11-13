import { z } from 'zod';
export { WIDTH,HEIGHT,FINAL_ACTIONS } from '../../../supabase/functions/_shared/instagram-render/contract';
const evidence=z.object({claim:z.string().min(1),quote:z.string().min(8),start:z.number().int().min(0).optional(),kind:z.enum(['observation','estimate','measurement','context'])});
const concept=z.object({module:z.enum(['cover','beam','load','route','battery','comparison','decision']),intent:z.string().trim().min(1).max(180),metric:z.object({value:z.string().trim().min(1).max(24),label:z.string().trim().min(1).max(80)}).strict().optional()}).strict();
export const slideSchema=z.object({title:z.string().trim().min(1).max(100),body:z.string().trim().max(650),layout:z.enum(['opening','review','comparison','numbers','diagram','conclusion']),theme:z.enum(['petroleum','deep','light','warm']),bikeIds:z.array(z.string()).max(2),scene:z.string().max(400).nullable(),alt:z.string().min(1).max(500),evidence:z.array(evidence).min(1),concept:concept.optional()}).strict();
export const scriptSchema=z.object({artVersion:z.union([z.literal(2),z.literal(3)]).optional(),topic:z.string().min(1).max(120),caption:z.string().min(1).max(2200),slides:z.array(slideSchema).min(3).max(6),captionEvidence:z.array(evidence).min(1)}).strict();
export type Script=z.infer<typeof scriptSchema>; export type Slide=z.infer<typeof slideSchema>;
export type Source={videoId:string;videoTitle:string;videoDate:string;transcript:string;articleId:string;articleTitle:string;articleSlug:string;publishedAt:string;bikeIds:string[];eligibleAt:string};
export type Asset={position:number;path:string;alt:string;sha256:string;missingBikeIds:string[];photoHashes?:string[]};
export type State='queued'|'scripting'|'scene'|'rendering'|'review'|'approved'|'publishing'|'uncertain'|'published'|'blocked';
export type Job={id:string;video_id:string;article_id:string;state:State;revision:number;source:Source;script:Script|null;assets:Asset[];scene_path:string|null;scene_attempted:boolean;script_attempted:boolean;scene_omitted:boolean;approved_revision:number|null;approved_by:string|null;lease_token:string|null;lease_until:string|null;error_code:string|null;error_message:string|null;children:string[];album_id:string|null;publish_attempted:boolean;publish_attempted_at?:string|null;media_id:string|null;permalink:string|null;media_token_hash:string|null;media_expires_at:string|null;created_at:string};
export type Snapshot={available:boolean;generationEnabled:boolean;publishingEnabled:boolean;automationEnabled:boolean;source:Source|null;jobs:Job[]};
const external=/https?:|www\.|link\s+(?:da|na)\s+bio|\b(?:acesse|leia|ouça)\b.*\b(?:podcast|site|artigo)\b/i;
export function validateScript(raw:unknown,source:Source):Script{
 const s=scriptSchema.parse(raw);
 // Cover gets a real catalog photo when an eligible bike exists (Edge resolves the stored photo).
 if(s.slides[0]&&!s.slides[0].bikeIds.length&&source.bikeIds[0])s.slides[0].bikeIds=[source.bikeIds[0]];
 if(s.slides[0]?.layout!=='opening'||s.slides.at(-1)?.layout!=='conclusion')throw Error('instagram_narrative_incomplete');
 if(s.slides.filter(x=>x.scene).length>1)throw Error('instagram_scene_limit');
 if(s.artVersion===2||s.artVersion===3){
  const words=(text:string)=>text.trim()?text.trim().split(/\s+/).length:0;
  const photoIds=new Set<string>();
  for(const [i,slide] of s.slides.entries()){
   if(!slide.concept)throw Error('instagram_concept_required');
   if(i===0&&(slide.concept.module!=='cover'||words(slide.title)>7||slide.body))throw Error('instagram_cover_density');
   if(i>0&&(slide.concept.module==='cover'||words(slide.title)>8||words(slide.body)>(s.artVersion===3?70:25)))throw Error('instagram_slide_density');
   if(slide.scene&&(s.artVersion===2||i!==0))throw Error('instagram_v2_scene_disabled');
   for(const id of slide.bikeIds){if(photoIds.has(id))throw Error('instagram_repeated_photo');photoIds.add(id);}
   if(i>0&&slide.bikeIds.length)throw Error('instagram_graphic_photo_unsupported');
   const metric=slide.concept.metric;
   if(slide.concept.module==='load'&&!metric)throw Error('instagram_metric_required');
   if(slide.concept.module==='route'&&(metric||/\d+\s*(?:°|graus|kg)/i.test(`${slide.title} ${slide.body}`)))throw Error('instagram_route_unquantified');
   if(metric){
    if(!['load','battery','comparison'].includes(slide.concept.module))throw Error('instagram_metric_module');
    if(!`${slide.title} ${slide.body}`.includes(metric.value)||!`${slide.title} ${slide.body}`.includes(metric.label)||!slide.evidence.some(e=>e.claim.includes(metric.value)&&e.claim.includes(metric.label)))throw Error('instagram_metric_evidence');
   }
   if(i>0&&!slide.bikeIds.length&&/\b(?:foto|fotografia|close|detalhe do banco)\b/i.test(slide.alt))throw Error('instagram_alt_unfaithful');
  }
 }else if(s.slides.some(x=>!x.body||x.body.length>320||x.concept||x.theme==='warm'))throw Error('instagram_art_version_required');
 for(const slide of s.slides){
  if(external.test(`${slide.title} ${slide.body}`))throw Error('instagram_external_cta');
  if(slide.bikeIds.some(id=>!source.bikeIds.includes(id)))throw Error('instagram_unrelated_bike');
  checkEvidence(slide.evidence,`${slide.title} ${slide.body}`,source);
 }
 if(external.test(s.caption))throw Error('instagram_external_cta');
 checkEvidence(s.captionEvidence,s.caption,source);return s;
}
/** Server-side offset: keep the hinted start only on an exact literal match, else first exact indexOf; never fuzzy. */
export function locateQuote(transcript:string,quote:string,hint?:number){
 if(typeof hint==='number'&&hint>=0&&transcript.slice(hint,hint+quote.length)===quote)return hint;
 return transcript.indexOf(quote);
}
function checkEvidence(items:z.infer<typeof evidence>[],text:string,source:Source){
 for(const e of items){
  const start=locateQuote(source.transcript,e.quote,e.start);
  if(start<0||!text.includes(e.claim))throw Error('instagram_evidence_invalid');
  e.start=start;
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
