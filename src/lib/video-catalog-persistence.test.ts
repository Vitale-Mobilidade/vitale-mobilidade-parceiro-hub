import {afterEach,expect,it,vi} from 'vitest';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.restoreAllMocks();vi.resetModules();});
it('reads persisted metadata and retains the full stale catalog on an upstream failure without reading the sheet',async()=>{
 vi.stubEnv('SUPABASE_URL','https://example.supabase.co');vi.stubEnv('SUPABASE_PUBLISHABLE_KEY','test-public');
 const items=Array.from({length:119},(_,i)=>({videoId:String(i),title:'Video '+i,date:'2026-10-08',url:'https://youtube.com/watch?v='+i,thumbnail:'',bikeIds:[],unmatched:[]}));
 const fetcher=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(items))).mockResolvedValueOnce(new Response('',{status:503}));vi.stubGlobal('fetch',fetcher);const clock=vi.spyOn(Date,'now').mockReturnValue(1000);vi.spyOn(console,'error').mockImplementation(()=>{});
 const {fetchVideoCatalog}=await import('./video-catalog.server');expect(await fetchVideoCatalog()).toHaveLength(119);clock.mockReturnValue(700000);expect(await fetchVideoCatalog()).toHaveLength(119);
 expect(fetcher.mock.calls.every(([url])=>url==='https://example.supabase.co/rest/v1/rpc/public_video_catalog')).toBe(true);
});
