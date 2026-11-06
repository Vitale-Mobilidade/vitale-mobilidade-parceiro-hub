// Synthetic reproduction of the live mismatch: a reserved empty row, no visible bike.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {periodMetricsFixture} from './fixtures/community-period-metrics.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin='http://127.0.0.1:4319',backend='http://127.0.0.1:54321';
const artifacts=new URL('../artifacts/empty-drafts/',import.meta.url);await mkdir(artifacts,{recursive:true});
const user={id:randomUUID(),email:'team@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()};const exp=Math.floor(Date.now()/1000)+3600;const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:user.id,exp,aud:'authenticated',role:'authenticated'})}.fake`;
const session={user,access_token:token,refresh_token:'fake',expires_in:3600,expires_at:exp,token_type:'bearer'};
const empty={id:randomUUID(),title:'Minha bike',brand:'',model:'',priceCents:0,city:'',state:'',modelYear:null,mileageKm:null,condition:'good',battery:'unknown',invoice:false,description:'',maintenance:'',status:'draft',feeCents:15000,feeStatus:'required',images:[],sellerType:'channel',channelWhatsapp:null,publishedAt:null,updatedAt:new Date().toISOString()};
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.setDefaultTimeout(15000);const errors=[],calls=[];page.on('pageerror',e=>errors.push(e.message));
await context.addInitScript(s=>{if(location.origin==='http://127.0.0.1:4319')localStorage.setItem('sb-127-auth-token',JSON.stringify(s));},session);
await context.route('**/*',async route=>{
 const r=route.request(),u=new URL(r.url());const reply=(v,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'*'},body:JSON.stringify(v)});
 if(r.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'*'}});
 if(u.pathname==='/api/admin/classifieds'){
  const {action,payload={}}=r.postDataJSON();calls.push(action);
  if(action==='list')return reply([empty]);
  if(action==='period_metrics'){const current={members:1,listings:0,channelListings:0,publications:0,payments:0,grossCents:0,reversedPayments:0};return reply(periodMetricsFixture(payload,{trackingSince:'2026-11-06',effectiveStart:'2026-11-06',comparable:false,previous:null,activeNow:0,current,daily:[{...current,day:'2026-11-06'}]}));}
  throw Error(`Unexpected mutation ${action}`);
 }
 if(u.origin===backend){if(u.pathname.endsWith('/functions/v1/editorial-admin'))return reply({role:'admin',email:user.email});if(u.pathname.endsWith('/auth/v1/user'))return reply(user);throw Error(`Unexpected backend ${u.pathname}`);}
 if(u.origin===origin)return route.continue();return route.abort();
});
try{
 await page.goto(`${origin}/admin/comunidade`);const created=page.getByRole('heading',{name:'Anúncios criados',exact:true}).locator('..');await created.waitFor();assert.match(await created.innerText(),/\n0\s+0 do canal/);assert.match(await created.innerText(),/rascunhos com conteúdo/);
 await page.screenshot({path:new URL('zero-created-desktop.png',artifacts).pathname});
 await page.getByRole('button',{name:'Bikes do canal',exact:true}).click();await page.getByRole('heading',{name:'Cadastre a primeira bike do canal'}).waitFor();assert.equal(await page.getByText('Minha bike',{exact:true}).count(),0);assert(await page.getByRole('button',{name:'Nova bike do canal',exact:true}).isEnabled());
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:new URL('empty-channel-mobile.png',artifacts).pathname});
 assert(calls.every(a=>['list','period_metrics'].includes(a)));assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS zero created KPI and empty channel list for same blank reservation; desktop/mobile; draft preserved; no mutation or external request');
}finally{await context.close();await browser.close();}
