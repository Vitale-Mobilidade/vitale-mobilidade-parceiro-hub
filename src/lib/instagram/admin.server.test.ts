import { beforeEach,expect,it,vi } from 'vitest';
import { jobFixture,sourceFixture } from './fixtures.test-support';
const f=vi.hoisted(()=>({authorize:vi.fn(),settings:vi.fn(),source:vi.fn(),createDb:vi.fn()}));
vi.mock('./repository.server',()=>({createDb:f.createDb,authorize:f.authorize,settings:f.settings,source:f.source,releaseEnabled:async()=>true,claim:vi.fn(),store:vi.fn()}));
// Any pipeline import before snapshot completes is a regression.
vi.mock('./workflow.server',()=>{throw Error('snapshot_loaded_render_pipeline');});
vi.mock('./edge.server',()=>{throw Error('snapshot_loaded_edge_studio');});
vi.mock('./meta.server',()=>{throw Error('snapshot_loaded_meta');});
import { instagramAdmin } from './admin.server';
beforeEach(()=>vi.clearAllMocks());
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