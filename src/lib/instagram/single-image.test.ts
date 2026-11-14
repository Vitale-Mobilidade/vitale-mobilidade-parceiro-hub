import {expect,it} from 'vitest';
import {fullBleedFrame} from '../../../supabase/functions/_shared/cover-framing';
import {planNextSinglePreparation,selectSingleSources,singlePublishDecision,SINGLE_IMAGE_SLOTS,type SingleDraft} from './single-image';
const source=(videoId:string,articleId:string,publishedAt='2026-11-13T12:00:00Z')=>({videoId,articleId,publishedAt,videoDate:'2026-11-13',title:'verified'});
it('selects latest article on date tie independent of podcast readiness',()=>{expect(selectSingleSources([source('V9','a'),source('Mobylette','b','2026-11-13T21:00:00Z')],[]).map(s=>s.videoId)).toEqual(['Mobylette','V9']);});
it('excludes published videos and articles across both paths without falling back to old article',()=>{expect(selectSingleSources([source('one','a'),source('two','b'),source('one','old')],[{videoId:'one',articleId:null},{videoId:'other',articleId:'b'}])).toEqual([]);});
it('blocks portrait when either comparison bike is outside crop',()=>{expect(()=>fullBleedFrame(1280,720,1080,1350,{focus:{x:.5,y:.5},subjects:[{left:.1,top:.2,right:.4,bottom:.8},{left:.6,top:.2,right:.9,bottom:.8}]})).toThrow('single_image_scene_expansion_required');});
it('preserves whole Mobylette in all three exact formats',()=>{for(const [w,h] of [[1280,720],[1400,1400],[1080,1350]])expect(fullBleedFrame(1376,768,w,h,{focus:{x:.5,y:.5},subjects:[{left:.335,top:.24,right:.67,bottom:.755}]}).scale).toBeGreaterThan(0);});
const draft:SingleDraft={id:'id',revision:1,state:'scheduled',reviewHold:false,caption:'Evidence',assetHash:'hash',approvedHash:'hash',dueAt:'2026-11-14T09:15:00Z',createAttempted:false,publishAttempted:false};
it('existing São Paulo slots are exactly 06:15, 11:45, 17:45',()=>expect(SINGLE_IMAGE_SLOTS).toEqual(['06:15','11:45','17:45']));
it('OUXI hold always blocks automatic sending',()=>expect(singlePublishDecision({...draft,reviewHold:true},Date.parse(draft.dueAt??''),true)).toBe('blocked'));
it('uncertain create never replays',()=>expect(singlePublishDecision({...draft,createAttempted:true},Date.parse(draft.dueAt??''),true)).toBe('reconcile'));
it('late beyond 15 minutes blocks catch-up',()=>expect(singlePublishDecision(draft,Date.parse(draft.dueAt??'')+15*60_000+1,true)).toBe('late'));
it('never sends before slot or with gates off',()=>{expect(singlePublishDecision(draft,Date.parse(draft.dueAt??'')-1,true)).toBe('wait');expect(singlePublishDecision(draft,Date.parse(draft.dueAt??''),false)).toBe('blocked');});
it('plans only ONE latest pilot for next window with zero AI and no backlog',()=>{
 const plan=planNextSinglePreparation([source('Mobylette','b'),source('V9','a')],[],Date.parse('2026-11-14T04:46:00Z'));
 expect(plan).toEqual({source:source('Mobylette','b'),dueAt:'2026-11-14T09:15:00.000Z',maxPosts:1,maxAiCalls:0,backfill:false});
});
it('occupied next window prevents further preparation instead of filling later windows',()=>{
 expect(planNextSinglePreparation([source('Mobylette','b')],['2026-11-14T09:15:00.000Z'],Date.parse('2026-11-14T04:46:00Z'))).toBeNull();
});
it('missed windows are skipped rather than backfilled',()=>{
 expect(planNextSinglePreparation([source('Mobylette','b')],[],Date.parse('2026-11-14T21:00:00Z'))?.dueAt).toBe('2026-11-15T09:15:00.000Z');
});