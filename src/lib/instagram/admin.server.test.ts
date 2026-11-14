import { beforeEach,expect,it,vi } from 'vitest';
import { jobFixture,sourceFixture } from './fixtures.test-support';
const f=vi.hoisted(()=>({authorize:vi.fn(),settings:vi.fn(),source:vi.fn(),videoEligibility:vi.fn(),release:vi.fn(),claim:vi.fn(),createDb:vi.fn()}));
vi.mock('./repository.server',()=>({createDb:f.createDb,authorize:f.authorize,settings:f.settings,source:f.source,videoEligibility:f.videoEligibility,releaseEnabled:f.release,claim:f.claim,store:vi.fn()}));
// Any pipeline import before snapshot completes is a regression.
vi.mock('./workflow.server',()=>{throw Error('snapshot_loaded_render_pipeline');});
vi.mock('./edge.server',()=>{throw Error('snapshot_loaded_edge_studio');});
vi.mock('./meta.server',()=>{throw Error('snapshot_loaded_meta');});
import { instagramAdmin } from './admin.server';
beforeEach(()=>{vi.clearAllMocks();f.release.mockResolvedValue(true);f.authorize.mockResolvedValue('admin');f.settings.mockResolvedValue({generation_enabled:true,paused_reason:null});});
it('anonymous snapshot returns JSON 401 before database or pipeline import',async()=>{
 const r=await instagramAdmin(new Request('https://test.invalid/api/admin/instagram',{method:'POST',body:'{"action":"snapshot"}'}));
 expect(r.status).toBe(401);expect(r.headers.get('content-type')).toContain('application/json');expect(await r.json()).toEqual({error:'authentication_required'});expect(f.createDb).not.toHaveBeenCalled();
});
it('verified non-admin is rejected without reading private drafts',async()=>{
 f.createDb.mockReturnValue({});f.authorize.mockResolvedValue(null);
 const r=await instagramAdmin(new Request('https://test.invalid/api/admin/instagram',{method:'POST',headers:{Authorization:'Bearer mock'},body:'{"action":"snapshot"}'}));
 expect(r.status).toBe(403);expect(f.settings).not.toHaveBeenCalled();
});
it('authenticated admin snapshot stays read-only and never imports render, AI or Meta',async()=>{
 const job=jobFixture();const limit=vi.fn().mockResolvedValue({data:[job],error:null});const order=vi.fn(()=>({order,limit}));
 f.createDb.mockReturnValue({from:()=>({select:()=>({order})})});f.authorize.mockResolvedValue('admin');
 f.settings.mockResolvedValue({generation_enabled:false,publishing_enabled:false,automation_enabled:false,paused_reason:null});f.source.mockResolvedValue(sourceFixture);
 const r=await instagramAdmin(new Request('https://test.invalid/api/admin/instagram',{method:'POST',headers:{Authorization:'Bearer mock'},body:'{"action":"snapshot"}'}));
 expect(r.status).toBe(200);const data=await r.json();expect(data.source.videoId).toBe(sourceFixture.videoId);expect(data.generationEnabled).toBe(false);expect(data.publishingEnabled).toBe(false);expect(data.automationEnabled).toBe(false);expect(data.jobs[0].lease_token).toBeNull();expect(data.jobs[0].media_token_hash).toBeNull();
});
function request(body:unknown){return new Request('https://test.invalid/api/admin/instagram',{method:'POST',headers:{Authorization:'Bearer mock'},body:JSON.stringify(body)});}
it('batch eligibility returns only bounded metadata and never imports generation',async()=>{
 f.createDb.mockReturnValue({});f.videoEligibility.mockResolvedValue([{videoId:sourceFixture.videoId,articleId:sourceFixture.articleId,jobId:null,revision:null,state:null}]);
 const r=await instagramAdmin(request({action:'video-eligibility',videoIds:[sourceFixture.videoId]}));const data=await r.json();expect(data.generationEnabled).toBe(false);expect(Object.keys(data.sources[0]).sort()).toEqual(['articleId','jobId','revision','state','videoId']);expect(f.source).not.toHaveBeenCalled();
});
it('invalid video id and oversized batches are rejected before any source read',async()=>{
 f.createDb.mockReturnValue({});
 for(const body of [{action:'generate',videoId:'bad'},{action:'video-eligibility',videoIds:Array(41).fill(sourceFixture.videoId)}])expect((await instagramAdmin(request(body))).status).toBe(409);
 expect(f.source).not.toHaveBeenCalled();expect(f.videoEligibility).not.toHaveBeenCalled();
});
it('every historical mutation is refused before settings, claims, AI or Meta',async()=>{
 f.createDb.mockReturnValue({});
 for(const action of ['generate','resume','approve','publish','discover','reconcile','pause','schedule','cancel-schedule']){
  const r=await instagramAdmin(request({action,videoId:sourceFixture.videoId}));
  expect(r.status).toBe(410);expect((await r.json()).error).toContain('somente leitura');
 }
 expect(f.settings).not.toHaveBeenCalled();expect(f.claim).not.toHaveBeenCalled();expect(f.source).not.toHaveBeenCalled();
});
