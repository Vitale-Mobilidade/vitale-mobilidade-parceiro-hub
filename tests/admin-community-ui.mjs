// Local synthetic Admin. No community profile, live database, messages or financial provider.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin='http://127.0.0.1:4318',backend='http://127.0.0.1:54321';
const artifacts=new URL(process.env.ADMIN_COMMUNITY_ARTIFACTS||'../artifacts/admin-community/',import.meta.url);await mkdir(artifacts,{recursive:true});
const user={id:randomUUID(),email:'team@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()};const exp=Math.floor(Date.now()/1000)+3600;const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:user.id,exp,aud:'authenticated',role:'authenticated'})}.fake`;
const session={user,access_token:token,refresh_token:'fake',expires_in:3600,expires_at:exp,token_type:'bearer'};
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.setDefaultTimeout(15000);
const calls=[],errors=[];let listings=[];const bytes=new Map();page.on('pageerror',e=>errors.push(e.message));
await context.addInitScript(s=>{if(location.origin==='http://127.0.0.1:4318')localStorage.setItem('sb-127-auth-token',JSON.stringify(s));},session);
await context.route('**/*',async route=>{
 const r=route.request(),u=new URL(r.url());const reply=(v,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'*'},body:JSON.stringify(v)});
 if(r.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'*'}});
 if(u.pathname==='/api/admin/classifieds'){
  const {action,payload:p={id:null},days=30}=r.postDataJSON();calls.push(action);const l=listings.find(l=>l.id===p.id);
  if(action==='metrics')return reply({generatedAt:new Date().toISOString(),days,members:3,listings:listings.length+2,channelListings:listings.length,activeListings:listings.filter(l=>l.status==='published').length,grossCents:15000,reversedPayments:0,daily:Array.from({length:days},(_,i)=>({day:new Date(Date.UTC(2026,10,5-i)).toISOString().slice(0,10),members:i===0?1:0,listings:i===0?2:0,payments:i===0?1:0,grossCents:i===0?15000:0}))});
  if(action==='list')return reply(listings.map(l=>({...l,images:l.images.map(a=>({...a,url:a.status==='ready'?`${backend}/photo/${a.id}`:undefined}))})));
  if(action==='create'){const l={id:randomUUID(),title:'Minha bike',brand:'',model:'',priceCents:0,city:'',state:'',modelYear:null,mileageKm:null,condition:'good',battery:'unknown',invoice:false,description:'',maintenance:'',status:'draft',feeCents:15000,feeStatus:'required',images:[],sellerType:'channel',channelWhatsapp:null,publishedAt:null,updatedAt:new Date().toISOString()};listings.push(l);return reply(l);}
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
 await page.goto(`${origin}/admin/comunidade`);await page.getByRole('heading',{name:'Faturamento por dia',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'Perfis cadastrados',exact:true}).count(),1);await page.getByLabel('Período do painel').selectOption('7');await page.waitForFunction(()=>document.querySelectorAll('tbody tr').length===7);await page.screenshot({path:new URL('admin-dashboard-desktop.png',artifacts).pathname,fullPage:true});
 await page.getByRole('button',{name:'Nova bike do canal',exact:true}).click();await page.getByRole('heading',{name:'1. Fotos da bike · 0/5',exact:true}).waitFor();
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=640;c.height=480;c.getContext('2d').fillRect(0,0,640,480);return c.toDataURL('image/png').split(',')[1];});await page.getByLabel('Adicionar fotos da bike').setInputFiles({name:'bike.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.getByRole('heading',{name:'1. Fotos da bike · 1/5',exact:true}).waitFor();await page.getByRole('button',{name:'Continuar para informações',exact:true}).click();
 for(const [label,value] of [['Título do anúncio','Bike do canal revisada'],['Marca','OuXi'],['Modelo','V8 Pro'],['Preço de venda (R$)','6000'],['Quilometragem (km)','384'],['Cidade','São Paulo'],['Descrição da bike','Bike do canal em ótimo estado, revisada e disponível para retirada.']])await page.getByLabel(label,{exact:true}).fill(value);
 await page.getByLabel('Estado',{exact:true}).selectOption('SP');await page.getByRole('button',{name:'Salvar e continuar',exact:true}).click();await page.getByLabel('WhatsApp da Vitale para este anúncio').waitFor();assert.equal(await page.getByRole('button',{name:'Seguir para pagamento de R$150'}).count(),0);assert.equal(await page.getByText('valide seu e-mail e celular na Minha conta',{exact:false}).count(),0);
 await page.getByLabel('WhatsApp da Vitale para este anúncio').fill('11999999999');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Publicar bike do canal',exact:true}).click();await page.getByRole('status').filter({hasText:'Bike do canal publicada.'}).waitFor();assert.equal(listings[0].status,'published');
 await page.screenshot({path:new URL('channel-published-desktop.png',artifacts).pathname,fullPage:true});await page.getByRole('button',{name:'Voltar ao painel',exact:true}).click();await page.getByRole('button',{name:'Desativar',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Desativar anúncio',exact:true}).click();await page.getByRole('button',{name:'Desativados 1',exact:true}).click();assert.equal(listings[0].status,'archived');
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:new URL('admin-dashboard-mobile.png',artifacts).pathname,fullPage:true});
 assert(calls.includes('publish'));assert(!calls.includes('checkout'));assert.equal(errors.length,0,errors.join('\n'));console.log('PASS Admin without community account: metrics/range, channel create, reencoded signed upload, sequential editor, contact/consent, publish without billing/OTP, archive, desktop/mobile; zero external calls');
}finally{await context.close();await browser.close();}
