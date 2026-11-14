import {it,expect,vi} from 'vitest';
import {source,videoEligibility} from './repository.server';
import {selectedJobId} from './video-selection';
function database(rows:Record<string,unknown>[],jobs:Record<string,unknown>[]=[]){
 const calls:{table:string;projection:string;filters:Record<string,unknown>;orders:string[]}[]=[];
 const db={from(table:string){const call={table,projection:'',filters:{} as Record<string,unknown>,orders:[] as string[]};calls.push(call);
 const q:any={select:(p:string)=>{call.projection=p;return q;},eq:(k:string,v:unknown)=>{call.filters[k]=v;return q;},in:(k:string,v:unknown[])=>{call.filters[k]=v;return q;},order:(k:string)=>{call.orders.push(k);return q;},limit:()=>q,
 then(resolve:(v:unknown)=>unknown){return Promise.resolve({data:table==='instagram_carousel_sources'?rows:jobs,error:null}).then(resolve);},maybeSingle:async()=>({data:rows.find(r=>!call.filters.video_id||r.video_id===call.filters.video_id)??null,error:null}),single:async()=>({data:{blocks:[],summary:null,og_image_url:null},error:null})};return q;}};
 return {db:db as any,calls};
}
const articleId='00000000-0000-0000-0000-000000000001';
it('an older chosen video is filtered independently of the newest global source',async()=>{
 const {db,calls}=database([{video_id:'newerVIDEO1',article_id:articleId},{video_id:'olderVIDEO1',article_id:articleId,transcript:'real',published_at:'2025-01-01'}]);
 const result=await source(db,'olderVIDEO1',articleId);expect(result?.videoId).toBe('olderVIDEO1');expect(calls[0].filters.video_id).toBe('olderVIDEO1');expect(calls[0].orders).toEqual(['video_date','video_id','published_at','article_id']);
});
it('batch chooses the latest published article per video and projects no transcript',async()=>{
 const newer='00000000-0000-0000-0000-000000000009';const {db,calls}=database([{video_id:'olderVIDEO1',article_id:newer,published_at:'2026-01-01'},{video_id:'olderVIDEO1',article_id:articleId,published_at:'2025-01-01'}],[{video_id:'olderVIDEO1',article_id:newer,id:articleId,revision:3,state:'published'}]);
 expect(await videoEligibility(db,['olderVIDEO1'])).toEqual([{videoId:'olderVIDEO1',articleId:newer,jobId:articleId,revision:3,state:'published'}]);expect(calls[0].projection).toBe('video_id,article_id,published_at');expect(calls[0].orders).toEqual(['published_at','article_id']);
});
for(const reason of ['inactive','no published article','no transcript'])it(`view-excluded ${reason} is ineligible and cannot load full article`,async()=>{
 const {db,calls}=database([]);expect(await source(db,'olderVIDEO1')).toBeNull();expect(await videoEligibility(db,['olderVIDEO1'])).toEqual([]);expect(calls.some(c=>c.table==='editorial_articles')).toBe(false);
});
it('mismatched supplied article and malformed video are rejected',async()=>{
 const {db}=database([{video_id:'olderVIDEO1',article_id:articleId}]);await expect(source(db,'olderVIDEO1','00000000-0000-0000-0000-000000000009')).rejects.toThrow('instagram_source_changed');await expect(source(db,'bad')).rejects.toThrow('instagram_video_invalid');
});
it('batch rejects more than 40 ids before database reads',async()=>{const {db,calls}=database([]);await expect(videoEligibility(db,Array(41).fill('olderVIDEO1'))).rejects.toThrow('instagram_video_batch_invalid');expect(calls).toHaveLength(0);});
it('exact draft URL accepts uuid and rejects malformed or external selections',()=>{expect(selectedJobId(articleId)).toBe(articleId);expect(selectedJobId('bad')).toBeUndefined();expect(selectedJobId('https://example.com')).toBeUndefined();});