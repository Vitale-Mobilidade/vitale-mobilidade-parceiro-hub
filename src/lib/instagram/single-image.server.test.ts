import {expect,it,vi} from 'vitest';
import {createClient} from '@supabase/supabase-js';
import {singleImageAdmin} from './single-image.server';
const request=(action='snapshot')=>new Request('http://local',{method:'POST',headers:{Authorization:'Bearer fake'},body:JSON.stringify({action})});
it('anonymous cannot query any source',async()=>{const db=vi.fn();expect((await singleImageAdmin(new Request('http://local'),db)).status).toBe(401);expect(db).not.toHaveBeenCalled();});
it('reads independent eligible source without transcript or audio dependencies, gates false',async()=>{
 const db=createClient('https://db.invalid','mock',{global:{fetch:async(input,init)=>{
  const url=new URL(String(input)),table=url.pathname.split('/').at(-1);
  expect(init?.method??'GET').toBe('GET');
  if(table==='user')return Response.json({id:'admin'});
  if(table==='editorial_admin_memberships')return Response.json({role:'admin',active:true});
  expect(url.searchParams.get('select')).not.toMatch(/transcript|capture|token|mp3/);
  if(table==='instagram_carousel_sources')return Response.json([{video_id:'Mi6l7WhLdT4',article_id:'article',article_title:'Mobylette',video_date:'2026-11-13',published_at:'2026-11-13T21:00:00Z'}]);
  if(table==='podcast_instagram_deliveries'||table==='instagram_carousel_jobs')return Response.json([]);
  throw Error('unexpected query');
 }}});
 const r=await singleImageAdmin(request(),()=>db);expect(r.status).toBe(200);expect(await r.json()).toMatchObject({sources:[{videoId:'Mi6l7WhLdT4'}],generationEnabled:false,publishingEnabled:false});
});
it('generation fails closed without mutation while migration remains pending',async()=>{
 const db=createClient('https://db.invalid','mock',{global:{fetch:async input=>String(input).includes('/auth/')?Response.json({id:'admin'}):Response.json({role:'admin',active:true})}});
 expect((await singleImageAdmin(request('generate'),()=>db)).status).toBe(409);
});