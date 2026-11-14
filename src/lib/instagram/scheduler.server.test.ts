import {beforeEach,it,expect,vi} from 'vitest';
const f=vi.hoisted(()=>({release:vi.fn(),membership:vi.fn()}));
vi.mock('./repository.server',()=>({releaseEnabled:f.release,createDb:()=>({from:()=>({select:()=>({eq:()=>({maybeSingle:f.membership})})})})}));
import {verifyInstagramTick} from './scheduler.server';
beforeEach(()=>{vi.unstubAllEnvs();f.release.mockResolvedValue(true);f.membership.mockResolvedValue({data:{role:'admin',active:true}});});
it('rejects unsigned callback',async()=>{expect(await verifyInstagramTick(new Request('https://test.invalid'),'instagram-publish')).toBeNull();});
it('purpose signature cannot authorize publication using discovery signature',async()=>{
 vi.stubEnv('INSTAGRAM_SCHEDULER_SIGNING_KEY','test-only-not-real');vi.stubEnv('INSTAGRAM_SCHEDULER_OWNER_ID','test-owner');
 const issued=String(Math.floor(Date.now()/1000));const key=await crypto.subtle.importKey('raw',new TextEncoder().encode('test-only-not-real'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${issued}:instagram-discover`));
 const signature=Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
 const request=new Request('https://test.invalid',{headers:{'x-instagram-issued-at':issued,'x-instagram-signature':signature}});
 expect(await verifyInstagramTick(request,'instagram-publish')).toBeNull();expect(await verifyInstagramTick(request,'instagram-discover')).toBe('test-owner');vi.unstubAllEnvs();
});