import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {periodMetricsFixture} from './fixtures/community-period-metrics.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin='http://127.0.0.1:4319',backend='http://127.0.0.1:54321';
const artifacts=new URL('../artifacts/admin-workspace/',import.meta.url);await mkdir(artifacts,{recursive:true});
const user={id:randomUUID(),email:'team@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()};const exp=Math.floor(Date.now()/1000)+3600;const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:user.id,exp,aud:'authenticated',role:'authenticated'})}.fake`;
const session={user,access_token:token,refresh_token:'fake',expires_in:3600,expires_at:exp,token_type:'bearer'};
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.setDefaultTimeout(15000);
await context.addInitScript(s=>{if(location.origin==='http://127.0.0.1:4319')localStorage.setItem('sb-127-auth-token',JSON.stringify(s));},session);
let failMetrics=true,failRemove=true;const calls=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
let members=Array.from({length:25},(_,i)=>({id:randomUUID(),name:`Usuário sintético ${String(i+1).padStart(2,'0')}`,email:`member${i+1}@example.invalid`,phone:'+5511999999999',joinedAt:new Date(Date.UTC(2026,10,1,12,i)).toISOString(),suspended:false,emailVerified:true,phoneVerified:true,listings:i,activeListings:0,availableCourtesies:0}));
await context.route('**/*',async route=>{
 const r=route.request(),u=new URL(r.url());const reply=(v,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'*'},body:JSON.stringify(v)});
 if(r.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'*'}});
 if(u.pathname==='/api/admin/classifieds'){
  const {action,payload:p={}}=r.postDataJSON();calls.push({action,...p});
  if(action==='list')return reply([]);
  if(action==='period_metrics'){
   if(failMetrics){return reply({error:'metrics_unavailable'},503);}
   return reply(periodMetricsFixture(p,p.period==='last7'?{trackingSince:'2026-11-01',comparable:false,previous:null,effectiveStart:'2026-11-01'}:{}));
  }
  if(action==='members'){
   const matches=members.filter(m=>!p.query||`${m.name} ${m.email} ${m.phone}`.includes(p.query));
   matches.sort((a,b)=>{const f=p.orderBy==='name'?'name':p.orderBy==='listings'?'listings':'joinedAt';return (typeof a[f]==='number'?a[f]-b[f]:a[f].localeCompare(b[f]))*(p.direction==='asc'?1:-1);});
   return reply({total:matches.length,offset:p.offset,items:matches.slice(p.offset,p.offset+20)});
  }
  if(action==='member')return reply({member:members.find(m=>m.id===p.id),listings:[],courtesies:[]});
  if(action==='remove_member'){
   assert(p.confirmed);assert.equal(p.email,members.find(m=>m.id===p.userId).email);
   if(failRemove){failRemove=false;return reply({error:'removal_pending'},503);}
   members=members.filter(m=>m.id!==p.userId);return reply({removed:true});
  }
  throw Error(`Unexpected admin action ${action}`);
 }
 if(u.origin===backend){if(u.pathname.endsWith('/functions/v1/editorial-admin'))return reply({role:'admin',email:user.email});if(u.pathname.endsWith('/auth/v1/user'))return reply(user);throw Error(`Unexpected backend ${u.pathname}`);}
 if(u.origin===origin)return route.continue();return route.abort();
});
try{
 await page.goto(`${origin}/admin/comunidade`);await page.getByRole('alert').filter({hasText:'Não foi possível carregar este período'}).waitFor();failMetrics=false;await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();
 await page.getByRole('heading',{name:'Faturamento confirmado'}).waitFor();
 for(const value of ['today','yesterday','week','month','last7','last30','last90']){await page.getByLabel('Período do painel').selectOption(value);await page.getByRole('heading',{name:'Faturamento confirmado'}).waitFor();assert.equal(calls.filter(c=>c.action==='period_metrics').at(-1).period,value);}
 await page.getByLabel('Período do painel').selectOption('last7');await page.getByText('Sem base comparável antes do marco de apuração.').first().waitFor();
 await page.getByLabel('Período do painel').selectOption('today');await page.getByRole('heading',{name:'Faturamento confirmado'}).waitFor();assert.match(await page.getByRole('heading',{name:'Perfis cadastrados'}).locator('..').innerText(),/\+100%/);
 await page.screenshot({path:new URL('period-comparison-desktop.png',artifacts).pathname,fullPage:true});
 await page.getByLabel('Período do painel').selectOption('custom');await page.getByLabel('Data inicial').fill('2026-11-01');await page.getByLabel('Data final').fill('2026-11-02');await page.getByRole('button',{name:'Aplicar período'}).click();await page.getByRole('status').filter({hasText:'01/11/2026 a 02/11/2026'}).waitFor();assert.deepEqual(calls.filter(c=>c.action==='period_metrics').at(-1),{action:'period_metrics',period:'custom',start:'2026-11-01',end:'2026-11-02'});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:new URL('period-comparison-mobile.png',artifacts).pathname,fullPage:true});
 await page.getByRole('button',{name:'Usuários e anúncios',exact:true}).click();await page.getByRole('table').getByRole('columnheader',{name:'Nome'}).waitFor();
 await page.getByRole('button',{name:'Ordenar por nome',exact:true}).click();await page.getByRole('button',{name:'Ver usuário Usuário sintético 01',exact:true}).waitFor();assert.equal(await page.getByRole('columnheader',{name:'Nome'}).getAttribute('aria-sort'),'ascending');
 await page.getByRole('button',{name:'Próxima',exact:true}).click();await page.getByRole('button',{name:'Ver usuário Usuário sintético 21',exact:true}).waitFor();assert.equal(calls.filter(c=>c.action==='members').at(-1).offset,20);
 await page.getByRole('button',{name:'Ordenar por anúncios',exact:true}).click();await page.getByRole('button',{name:'Ver usuário Usuário sintético 25',exact:true}).waitFor();assert.equal(calls.filter(c=>c.action==='members').at(-1).offset,0);
 await page.setViewportSize({width:1440,height:1000});await page.getByRole('region',{name:'Tabela de usuários'}).evaluate(el=>el.scrollLeft=0);await page.screenshot({path:new URL('users-table-desktop.png',artifacts).pathname,fullPage:true});
 await page.getByRole('button',{name:'Ordenar por data de criação',exact:true}).click();await page.getByRole('button',{name:'Ver usuário Usuário sintético 25',exact:true}).waitFor();
 await page.getByRole('searchbox').fill('member25@example.invalid');await page.getByRole('button',{name:'Buscar',exact:true}).click();await page.getByRole('button',{name:'Ver usuário Usuário sintético 25',exact:true}).click();await page.getByRole('button',{name:'Remover usuário',exact:true}).click();
 const dialog=page.getByRole('dialog');assert(await dialog.getByRole('button',{name:'Remover definitivamente'}).isDisabled());await page.getByLabel('E-mail para confirmar remoção').fill('other@example.invalid');assert(await dialog.getByRole('button',{name:'Remover definitivamente'}).isDisabled());await page.getByLabel('E-mail para confirmar remoção').fill('member25@example.invalid');await dialog.getByRole('button',{name:'Remover definitivamente'}).click();await dialog.getByRole('alert').waitFor();await dialog.getByRole('button',{name:'Remover definitivamente'}).click();await page.getByRole('status').filter({hasText:'Usuário removido'}).waitFor();assert.equal(members.length,24);
 await page.getByRole('button',{name:'Limpar busca',exact:true}).click();await page.getByRole('button',{name:'Ver usuário Usuário sintético 24',exact:true}).waitFor();
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.getByRole('region',{name:'Tabela de usuários'}).evaluate(el=>el.scrollLeft=el.scrollWidth);await page.screenshot({path:new URL('users-table-mobile.png',artifacts).pathname,fullPage:true});assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS periods/comparison/coverage/error retry/custom; sortable paginated table/search; exact deletion review/partial retry; desktop/mobile, all external requests blocked');
}catch(error){console.log(JSON.stringify({calls,errors,text:(await page.locator('body').innerText()).slice(0,5000)}));await page.screenshot({path:'/tmp/vitale-workspace-ui-failure.png',fullPage:true});throw error;}finally{await context.close();await browser.close();}
