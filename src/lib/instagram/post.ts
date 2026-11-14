import {hash,type Source} from './contract';
export {controlledReferences,composeCaption,fallbackCaption} from '../../../supabase/functions/_shared/instagram-post';
export type {Caption} from '../../../supabase/functions/_shared/instagram-post';
import type {Caption} from '../../../supabase/functions/_shared/instagram-post';
export type Post={id:string;video_id:string;article_id:string;revision:number;source:Source;state:'queued'|'preparing'|'review'|'approved'|'scheduled'|'publishing'|'published'|'blocked'|'uncertain';caption:Caption|null;asset:{path:string;sha256:string;alt:string;sourcePath:string;wholeCover:boolean}|null;approved_revision:number|null;approved_by:string|null;approved_hash:string|null;lease_token:string|null;lease_until:string|null;due_at:string|null;create_attempted:boolean;container_id:string|null;publish_attempted:boolean;media_id:string|null;permalink:string|null;media_token_hash:string|null;media_expires_at:string|null;error_code:string|null;created_at:string};
export const POST_WINDOWS=['06:15','11:45','17:45'] as const;
export const POST_TIMEZONE='America/Sao_Paulo';
export function nextPostSlot(now:number,occupied:string[]=[]){
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:POST_TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
 const base=Date.parse(`${day}T12:00:00Z`);
 for(let d=0;d<366;d++){const date=new Date(base+d*86400000).toISOString().slice(0,10);for(const slot of POST_WINDOWS){const instant=new Date(`${date}T${slot}:00-03:00`).toISOString();if(Date.parse(instant)>now&&!occupied.includes(instant))return instant;}}
 throw Error('instagram_post_slots_full');
}
export function canonicalPostJson(value:unknown):string{
 if(Array.isArray(value))return '['+value.map(canonicalPostJson).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonicalPostJson(v)).join(',')+'}';
 return JSON.stringify(value)??'null';
}
export async function postFingerprint(post:Post){if(!post.asset||!post.caption)throw Error('instagram_post_review_required');return hash(canonicalPostJson({revision:post.revision,video:post.video_id,article:post.article_id,source:post.source,asset:post.asset,caption:post.caption}));}
export async function postDecision(post:Post,now=Date.now()){
 if(post.state==='published')return 'published';if(post.publish_attempted||post.create_attempted&&!post.container_id||post.state==='uncertain')return 'uncertain';
 if(!post.due_at||Date.parse(post.due_at)>now)return 'wait';
 if(now-Date.parse(post.due_at)>5*60000)return 'missed';
 if(!post.approved_by||post.approved_revision!==post.revision||post.approved_hash!==await postFingerprint(post))return 'changed';return 'send';
}