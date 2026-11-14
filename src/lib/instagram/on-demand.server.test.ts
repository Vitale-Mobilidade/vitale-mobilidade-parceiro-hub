import {beforeEach,it,expect,vi} from 'vitest';
import {jobFixture,sourceFixture} from './fixtures.test-support';
const f=vi.hoisted(()=>({prepare:vi.fn(),claim:vi.fn(),source:vi.fn(),save:vi.fn(),from:vi.fn()}));
vi.mock('./repository.server',()=>({createDb:()=>({from:f.from}),authorize:async()=> 'admin',releaseEnabled:async()=>true,settings:async()=>({generation_enabled:true,paused_reason:null}),source:f.source,claim:f.claim,store:()=>({save:f.save}),videoEligibility:vi.fn()}));
vi.mock('./workflow.server',()=>({prepare:f.prepare}));vi.mock('./edge.server',()=>({edge:()=>({}),EdgeAiError:class extends Error{}}));
import {instagramAdmin} from './admin.server';
const request=()=>new Request('https://test.invalid',{method:'POST',headers:{Authorization:'Bearer mock'},body:JSON.stringify({action:'generate',videoId:sourceFixture.videoId,articleId:sourceFixture.articleId})});
beforeEach(()=>{vi.clearAllMocks();f.source.mockResolvedValue(sourceFixture);f.claim.mockResolvedValue(jobFixture());f.save.mockResolvedValue(undefined);});
it('the latest eligible source still generates through the existing pipeline after explicit action',async()=>{
 const row={id:jobFixture().id,revision:1,state:'queued'};const q:any={upsert:()=>q,select:()=>q,maybeSingle:async()=>({data:row,error:null})};f.from.mockReturnValue(q);
 const r=await instagramAdmin(request());expect(r.headers.get('content-type')).toContain('ndjson');expect(await r.text()).toContain('"done":true');expect(f.prepare).toHaveBeenCalledTimes(1);expect(f.claim).toHaveBeenCalledWith(expect.anything(),row.id,1);
});
it('concurrent new-pair requests have one unique winner and one reopen, never duplicate preparation',async()=>{
 let inserted=false;const row={id:jobFixture().id,revision:1,state:'queued'};const q:any={upsert:()=>q,select:()=>q,eq:()=>q,maybeSingle:async()=>{if(inserted)return {data:null};inserted=true;return {data:row};},single:async()=>({data:row})};f.from.mockReturnValue(q);
 const rs=await Promise.all([instagramAdmin(request()),instagramAdmin(request())]);const bodies=await Promise.all(rs.map(r=>r.text()));expect(bodies.filter(b=>b.includes('"done":true'))).toHaveLength(1);expect(bodies.filter(b=>b.includes('"existing":true'))).toHaveLength(1);expect(f.prepare).toHaveBeenCalledTimes(1);expect(f.claim).toHaveBeenCalledTimes(1);
});