// Local synthetic Admin. No community profile, live database, messages or financial provider.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:4319',backend='http://127.0.0.1:54321';
const artifacts=new URL(process.env.ADMIN_COMMUNITY_ARTIFACTS||'../artifacts/admin-partners/',import.meta.url);await mkdir(artifacts,{recursive:true});
const user={id:randomUUID(),email:'team@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()};const exp=Math.floor(Date.now()/1000)+3600;const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:user.id,exp,aud:'authenticated',role:'authenticated'})}.fake`;
const session={user,access_token:token,refresh_token:'fake',expires_in:3600,expires_at:exp,token_type:'bearer'};
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.setDefaultTimeout(15000);
const calls=[],errors=[];let listings=[];const bytes=new Map();page.on('pageerror',e=>errors.push(e.message));
await context.addInitScript(s=>{if(location.origin==='http://127.0.0.1:4319')localStorage.setItem('sb-127-auth-token',JSON.stringify(s));},session);
const member={id:randomUUID(),name:'Parceiro sintético',email:'partner@example.invalid',phone:'+5511999999999',joinedAt:new Date().toISOString(),suspended:false,emailVerified:true,phoneVerified:true,listings:1,activeListings:0,availableCourtesies:0};
const ad={id:randomUUID(),title:'Bike do parceiro',brand:'Marca',model:'Modelo',priceCents:700000,city:'São Paulo',state:'SP',mileageKm:123,modelYear:2025,condition:'good',battery:'original',invoice:true,description:'Uma bicicleta de demonstração completamente sintética.',maintenance:'Revisada',whatsappMessage:'',contactConfirmed:true,status:'archived',feeCents:15000,feeStatus:'required',sellerType:'individual',publishedAt:null,updatedAt:new Date().toISOString(),createdAt:new Date().toISOString(),owner:member,entitled:false,images:[],metrics:{impressions:10,visits:6,whatsappClicks:2}};
const courtesies=[],grantRequests=[];let failDirectory=true;const pages=Array.from({length:21},(_,i)=>({...member,id:randomUUID(),name:`Parceiro sintético ${i+1}`}));
await context.route('**/*',async route=>{
 const r=route.request(),u=new URL(r.url());const reply=(v,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'*'},body:JSON.stringify(v)});
 if(r.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'*'}});
 if(u.pathname==='/api/admin/classifieds'){
  const {action,payload:p={id:null},days=30}=r.postDataJSON();calls.push(action);const l=listings.find(l=>l.id===p.id);
  if(action==='metrics')return reply({generatedAt:new Date().toISOString(),days,members:3,listings:listings.length+2,channelListings:listings.length,activeListings:listings.filter(l=>l.status==='published').length,grossCents:15000,reversedPayments:0,daily:Array.from({length:days},(_,i)=>({day:new Date(Date.UTC(2026,10,5-i)).toISOString().slice(0,10),members:i===0?1:0,listings:i===0?2:0,payments:i===0?1:0,grossCents:i===0?15000:0}))});
  if(action==='list')return reply(listings.map(l=>({...l,images:l.images.map(a=>({...a,url:a.status==='ready'?`${backend}/photo/${a.id}`:undefined}))})));
  if(action==='create'){const l={id:randomUUID(),title:'Minha bike',brand:'',model:'',priceCents:0,city:'',state:'',modelYear:null,mileageKm:null,condition:'good',battery:'unknown',invoice:false,description:'',maintenance:'',status:'draft',feeCents:15000,feeStatus:'required',images:[],sellerType:'channel',channelWhatsapp:null,publishedAt:null,updatedAt:new Date().toISOString()};listings.push(l);return reply(l);}
  if(action==='members'&&p.query==='error'&&failDirectory){failDirectory=false;return reply({error:'community_unavailable'},503);}
  if(action==='members'&&p.query==='pages')return reply({total:21,offset:p.offset,items:pages.slice(p.offset,p.offset+20)});
  if(action==='members')return reply({total:p.query==='missing'?0:1,offset:p.offset,items:p.query==='missing'?[]:[member]});
  if(action==='listings')return reply({total:p.status==='published'?0:1,offset:p.offset,items:p.status==='published'?[]:[ad]});
  if(['member','grant','revoke'].includes(action)){
    if(action==='grant'){grantRequests.push(p);assert.equal(p.quantity,2);assert(p.reason.length>=5);if(!courtesies.length){for(let i=0;i<2;i++)courtesies.push({id:randomUUID(),listingId:null,reason:p.reason,grantedAt:new Date().toISOString(),grantedBy:user.email,startedAt:null,expiresAt:null,revokedAt:null,revokeReason:null});member.availableCourtesies=2;}}
    if(action==='revoke'){const c=courtesies.find(c=>c.id===p.courtesyId);c.revokedAt=new Date().toISOString();c.revokeReason=p.reason;member.availableCourtesies--;}
    return reply({member,listings:[ad],courtesies});
  }
  assert(l,`missing listing ${action}`);
  if(action==='save')Object.assign(l,p);
  if(action==='reserve_image'){const a={id:randomUUID(),status:'reserved',position:l.images.length,path:''};a.path=`${user.id}/listings/${l.id}/${a.id}.webp`;l.images.push(a);return reply({...a,token:'synthetic-upload'});}
  if(action==='finalize_image')l.images.find(a=>a.id===p.assetId).status='ready';
  if(action==='publish'){assert.equal(p.whatsapp,'5511999999999');assert(p.contactConsent);l.channelWhatsapp=p.whatsapp;l.status='published';l.publishedAt=new Date().toISOString();l.displayExpiresAt=new Date(Date.now()+90*86400000).toISOString();}
  if(['archive','withdraw','sold'].includes(action))l.status={archive:'archived',withdraw:'draft',sold:'sold'}[action];
  return reply(l);
 }
 if(u.origin===backend){
  if(u.pathname.endsWith('/functions/v1/editorial-admin'))return reply({role:'admin',email:user.email});
  if(u.pathname.endsWith('/auth/v1/user'))return reply(user);
  if(u.pathname.includes('/storage/v1/object/upload/sign/')){const path=decodeURIComponent(u.pathname.split('/member-media/')[1]);const id=path.split('/').at(-1).replace('.webp','');bytes.set(id,r.postDataBuffer());return reply({Key:`member-media/${path}`});}
  if(u.pathname.startsWith('/photo/'))return route.fulfill({status:200,contentType:'image/webp',body:bytes.get(u.pathname.split('/').at(-1))});
  throw new Error(`unexpected backend call ${u.pathname}`);
 }
 if(u.origin===origin)return route.continue();return route.abort();
});
try{
 await page.goto(`${origin}/admin/comunidade`);
 await page.getByRole("button",{name:"Usuários e anúncios",exact:true}).click();
 await page.getByRole('button',{name:'Ver usuário Parceiro sintético'}).waitFor();
 const query=page.getByRole('searchbox',{name:'Buscar por nome, e-mail ou telefone'});
 await query.fill('error');await page.getByRole('button',{name:'Buscar',exact:true}).click();await page.getByRole('alert').filter({hasText:'Não foi possível buscar os registros'}).waitFor();await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await page.getByRole('button',{name:'Ver usuário Parceiro sintético',exact:true}).waitFor();
 await query.fill('pages');await page.getByRole('button',{name:'Buscar',exact:true}).click();await page.getByRole('button',{name:'Ver usuário Parceiro sintético 20',exact:true}).waitFor();await page.getByRole('navigation',{name:'Paginação da comunidade'}).getByRole('button',{name:'Próxima',exact:true}).click();await page.getByRole('button',{name:'Ver usuário Parceiro sintético 21',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Ver usuário Parceiro sintético 20',exact:true}).count(),0);

 for(const term of ['partner@example.invalid','(11) 99999-9999','Parceiro']){await query.fill(term);await page.getByRole('button',{name:'Buscar',exact:true}).click();await page.getByRole('button',{name:'Ver usuário Parceiro sintético'}).waitFor();}
 await page.getByRole('button',{name:'Ver usuário Parceiro sintético'}).click();
 await page.getByRole('heading',{name:'Liberar anúncios grátis',exact:true}).waitFor();
 assert(await page.getByRole('button',{name:'Revisar liberação'}).isDisabled());
 await page.getByLabel('Quantidade de cortesias').selectOption('2');await page.getByLabel('Motivo da liberação').fill('Parceria com loja sintética');await page.getByRole('button',{name:'Revisar liberação'}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Liberar cortesias',exact:true}).click();
 await page.getByRole('status').filter({hasText:'2 cortesia(s) liberada(s)'}).waitFor();assert.equal(grantRequests.length,1);assert.match(grantRequests[0].requestId,/^[a-f0-9-]{36}$/);
 await page.screenshot({path:new URL('member-partner-desktop.png',artifacts).pathname,fullPage:true});
 await page.getByRole('button',{name:'Revogar cortesia',exact:true}).first().click();assert(await page.getByRole('dialog').getByRole('button',{name:'Confirmar revogação'}).isDisabled());await page.getByLabel('Motivo da revogação').fill('Fim da parceria sintética');await page.getByRole('dialog').getByRole('button',{name:'Confirmar revogação'}).click();await page.getByRole('status').filter({hasText:'Cortesia revogada'}).waitFor();assert.equal(member.availableCourtesies,1);
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.getByRole('heading',{name:'Liberar anúncios grátis',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:new URL('member-partner-mobile.png',artifacts).pathname});
 await page.getByRole('button',{name:'← Voltar à listagem'}).click();await page.getByRole('tab',{name:'Todos os anúncios'}).click();await page.getByRole('heading',{name:'Bike do parceiro',exact:true}).waitFor();await page.getByText('Informações do anúncio',{exact:true}).click();assert(await page.getByText('Uma bicicleta de demonstração completamente sintética.').isVisible());
 await page.getByLabel('Status dos anúncios').selectOption('published');await page.getByText('Nenhum registro encontrado. Ajuste sua busca.').waitFor();assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS private directory: name/email/phone search, member contact/listings/metrics, grant/revoke review and counters, status filter, empty states, desktop/mobile, no external calls');
}finally{await context.close();await browser.close();}
