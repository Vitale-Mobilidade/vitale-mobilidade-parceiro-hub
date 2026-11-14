export type SingleSource={videoId:string;articleId:string;title:string;publishedAt:string;videoDate:string};
export const SINGLE_IMAGE_SLOTS=['06:15','11:45','17:45'] as const;
export const SINGLE_IMAGE_ART_VERSION=5;
/** Future automation plans one latest source for one future slot; never walks missed slots. */
export function planNextSinglePreparation(sources:SingleSource[],occupiedWindows:string[],now:number){
 if(!Number.isFinite(now))throw Error('single_image_clock_invalid');
 const local=new Date(now-3*3600000),date=local.toISOString().slice(0,10);
 const tomorrow=new Date(Date.parse(`${date}T00:00:00Z`)+86400000).toISOString().slice(0,10);
 const dueAt=[date,tomorrow].flatMap(day=>SINGLE_IMAGE_SLOTS.map(slot=>`${day}T${slot}:00-03:00`))
  .map(value=>new Date(value).toISOString()).find(value=>Date.parse(value)>now);
 if(!dueAt||!sources[0]||occupiedWindows.includes(dueAt))return null;
 return {source:sources[0],dueAt,maxPosts:1,maxAiCalls:0,backfill:false} as const;
}
export type SingleDraft={id:string;revision:number;state:'draft'|'ready'|'scheduled'|'publishing'|'uncertain'|'published';reviewHold:boolean;caption:string;assetHash:string;approvedHash:string|null;dueAt:string|null;createAttempted:boolean;publishAttempted:boolean};
export function selectSingleSources(rows:SingleSource[],published:Array<{videoId:string;articleId:string|null}>){
 const videos=new Set(published.map(p=>p.videoId)),articles=new Set(published.map(p=>p.articleId));
 const ordered=[...rows].sort((a,b)=>b.videoDate.localeCompare(a.videoDate)||b.publishedAt.localeCompare(a.publishedAt)||b.articleId.localeCompare(a.articleId)||a.videoId.localeCompare(b.videoId));
 const chosen=new Set<string>();return ordered.filter(r=>{if(chosen.has(r.videoId))return false;chosen.add(r.videoId);return !videos.has(r.videoId)&&!articles.has(r.articleId);});
}
export function singlePublishDecision(d:SingleDraft,now:number,enabled:boolean){
 if(d.state==='published')return 'published';
 if(!enabled||d.reviewHold)return 'blocked';
 if(d.createAttempted||d.publishAttempted||d.state==='uncertain')return 'reconcile';
 if(!d.assetHash||d.approvedHash!==d.assetHash||!d.caption.trim())return 'review';
 if(!d.dueAt||Date.parse(d.dueAt)>now)return 'wait';
 if(!Number.isFinite(Date.parse(d.dueAt))||now-Date.parse(d.dueAt)>15*60_000)return 'late';
 return d.state==='scheduled'?'send':'blocked';
}