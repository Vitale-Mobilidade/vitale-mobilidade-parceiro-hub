import {expect,it,vi} from 'vitest';
const f=vi.hoisted(()=>({authorize:vi.fn(),createDb:vi.fn()}));
vi.mock('./repository.server',()=>f);
import {instagramSandbox} from './sandbox.server';
it('published builds never expose development manifest even with authorization',async()=>{
 const r=await instagramSandbox(new Request('https://local/api',{headers:{Authorization:'Bearer mock'}}),f.createDb,false);expect(r.status).toBe(404);expect(f.createDb).not.toHaveBeenCalled();
});
it('anonymous access fails before DB/file reads',async()=>{
 const r=await instagramSandbox(new Request('https://local/api'),f.createDb,true);expect(r.status).toBe(401);expect(r.headers.get('content-type')).toContain('json');expect(f.createDb).not.toHaveBeenCalled();
});
it('non-admin cannot see sandbox files',async()=>{
 f.authorize.mockResolvedValue(null);const r=await instagramSandbox(new Request('https://local/api',{headers:{Authorization:'Bearer mock'}}),f.createDb,true);expect(r.status).toBe(403);
});
it('admin cannot resolve arbitrary file paths',async()=>{
 f.authorize.mockResolvedValue('admin');const r=await instagramSandbox(new Request('https://local/api?position=../../secret',{headers:{Authorization:'Bearer mock'}}),f.createDb,true);expect(r.status).toBe(400);
});