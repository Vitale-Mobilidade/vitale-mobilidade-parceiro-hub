// Synthetic local Admin overview: no messages, production auth or external providers.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin='http://127.0.0.1:4319',backend='http://127.0.0.1:54321';
const folder=new URL('../artifacts/community-reporting/overview/',import.meta.url);await mkdir(folder,{recursive:true});
const catalog=Array.from({length:154},(_,i)=>({videoId:'synthetic01',title:'Vídeo sintético '+i,date:null,url:'https://youtube.com/watch?v=synthetic01',thumbnail:''}));
const fake=createServer(async(req,res)=>{for await(const _ of req){}res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(req.url.endsWith('/public_video_catalog')?catalog:[]));});
await new Promise((resolve,reject)=>{fake.once('error',reject);fake.listen(54321,'127.0.0.1',resolve)});
const user={id:randomUUID(),email:'admin@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()};
const exp=Math.floor(Date.now()/1000)+3600,encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const session={user,access_token:`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:user.id,exp,aud:'authenticated',role:'authenticated'})}.fake`,refresh_token:'fake',expires_in:3600,expires_at:exp,token_type:'bearer'};
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.setDefaultTimeout(15000);
let fail=false,role='admin',count=7,metricCalls=0;const errors=[];
page.on('pageerror',e=>errors.push(e.message));
await context.addInitScript(s=>{if(location.origin==='http://127.0.0.1:4319')localStorage.setItem('sb-127-auth-token',JSON.stringify(s));},session);
await context.route('**/*',async route=>{
 const r=route.request(),u=new URL(r.url()),reply=(v,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'*'},body:JSON.stringify(v)});
 if(r.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'*'}});
 if(u.pathname==='/api/admin/classifieds'){
  metricCalls++;assert.equal(role,'admin');assert.deepEqual(r.postDataJSON(),{action:'metrics',days:1});
  return fail?reply({error:'metrics_unavailable'},503):reply({generatedAt:new Date().toISOString(),trackingSince:"2026-11-06",excludedOrders:2,days:1,members:count,listings:2,channelListings:0,activeListings:0,grossCents:0,reversedPayments:0,daily:[]});
 }
 if(u.pathname==='/api/admin/newsletter')return reply(r.method()==='GET'?{audience:{total:98},settings:{},campaigns:[]}:{radarPeople:29});
 if(u.origin===backend){
  if(u.pathname.endsWith('/auth/v1/user'))return reply(user);
  if(u.pathname.endsWith('/functions/v1/editorial-admin')){
   const {action}=r.postDataJSON();
   if(action==='session')return reply({role,email:user.email});
   if(action==='overview')return reply({bikes:36,videos:154,videosWithArticle:154,articles:{published:154},generationErrors:0,sync:{status:'ok',last_success_at:'2026-11-06T01:07:00Z',last_attempt_at:'2026-11-06T01:07:00Z'}});
   if(action==='youtube-status')return reply({enabled:true,queued:0,running:0,review:0,done:47});
  }
  throw Error('unexpected local backend request '+u.pathname);
 }
 if(u.origin===origin)return route.continue();
 return route.abort();
});
try{
 await page.goto(origin+'/admin');
 const card=page.getByText('Usuários cadastrados',{exact:true}).locator('..');
 await card.getByText('7',{exact:true}).waitFor();
 await page.getByText('Usuários cadastrados: perfis que concluíram o cadastro na comunidade desde 06/11/2026.',{exact:false}).waitFor();
 assert.equal(await page.getByText('Com artigo',{exact:true}).count(),0);
 const labels=await card.evaluate(el=>Array.from(el.parentElement.children).map(c=>c.querySelector('p')?.textContent));
 assert.deepEqual(labels,['Vídeos na planilha','Artigos publicados','Bikes no catálogo','Newsletter · total de cadastros','Radar · pessoas com alertas ativos','Usuários cadastrados']);
 await page.screenshot({path:new URL('overview-desktop.png',folder).pathname,fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await card.scrollIntoViewIfNeeded();
 await page.screenshot({path:new URL('overview-mobile.png',folder).pathname,fullPage:false});
 fail=true;await page.reload();
 await page.getByRole('alert').filter({hasText:'Não foi possível carregar os usuários cadastrados.'}).waitFor();
 await card.getByText('—',{exact:true}).waitFor();fail=false;count=0;
 await page.getByRole('alert').filter({hasText:'usuários cadastrados'}).getByRole('button',{name:'Tentar novamente'}).click();
 await card.getByText('0',{exact:true}).waitFor();
 role='operation';const prior=metricCalls;await page.reload();
 await page.getByRole('heading',{name:'Visão geral',exact:true}).waitFor();
 await page.getByText('Último sucesso',{exact:true}).waitFor();
 assert.equal(await page.getByText('Usuários cadastrados',{exact:true}).count(),0);
 assert.equal(metricCalls,prior);assert.deepEqual(errors,[]);
 console.log('PASS Admin overview: six ordered cards without Com artigo, existing private member count, actual zero, failure/retry, Admin-only query, desktop/mobile; zero external messages or production data');
}finally{await context.close();await browser.close();await new Promise(resolve=>fake.close(resolve))}
