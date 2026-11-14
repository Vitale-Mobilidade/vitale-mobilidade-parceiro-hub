// Local-only public-launch smoke. Synthetic Auth, HTTP database/Storage fixture and canvas
// photos. No email, WhatsApp, production database, payment or real listing.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir,readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin='http://127.0.0.1:4318', backend='http://127.0.0.1:54321';
const userId='00000000-0000-4000-8000-000000000090';
const user={id:userId,aud:'authenticated',role:'authenticated',email:'pilot@example.invalid',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{display_name:'Conta piloto'},identities:[],created_at:new Date().toISOString()};
const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const expires=Math.floor(Date.now()/1000)+3600;
const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:userId,exp:expires,aud:'authenticated',role:'authenticated'})}.fake`;
const session={access_token:token,token_type:'bearer',expires_in:3600,expires_at:expires,refresh_token:'local-fake-refresh',user};
let canAdvertise=true,canPublish=false,avatar=null;
const identityChannels=new Set();
let failNextSave=false;let listings=[];const blobs=new Map();const requests=[];
const profile={displayName:'Conta piloto',suspended:false,createdAt:user.created_at,communityJoinedAt:user.created_at,newsletterSubscribed:true};
const account=()=>({sellerType:'individual',displayName:profile.displayName,verifiedPhone:canPublish?"5511999999999":null,communityJoined:Boolean(profile.communityJoinedAt),canAdvertise,canPublish,canUploadAvatar:true,avatarId:avatar?.id??null,avatarPath:avatar?.path??null});
const publicItems=()=>listings.filter(l=>l.status==='published').map(l=>({...l,sellerName:profile.displayName,avatarPath:avatar?.path??null,whatsapp:'5511999999999'}));
const server=createServer(async(req,res)=>{
 res.setHeader('access-control-allow-origin',origin);res.setHeader('access-control-allow-headers','*');res.setHeader('access-control-allow-methods','POST,GET,PUT,DELETE,OPTIONS');
 if(req.method==='OPTIONS'){res.writeHead(204).end();return}
 const url=new URL(req.url,backend);const chunks=[];for await(const c of req)chunks.push(c);const raw=Buffer.concat(chunks);let input={};try{input=JSON.parse(raw.toString())}catch{}
 requests.push({path:url.pathname,input});
 const reply=(data,status=200)=>{res.writeHead(status,{'content-type':'application/json'}).end(JSON.stringify(data))};
 if(url.pathname.endsWith('/auth/v1/user'))return reply(user);
 if(url.pathname.endsWith('/auth/v1/logout'))return reply({});
 if(url.pathname.endsWith('/member_community_account')){
  if(input.p_action==='join'){profile.displayName=input.p_payload.displayName;profile.communityJoinedAt=new Date().toISOString();}
  return reply(profile.communityJoinedAt?profile:null);
 }
 if(url.pathname.endsWith('/functions/v1/member-identity-code'))return reply({ok:true});
 if(url.pathname.endsWith('/member_referrals'))return reply({enabled:true,code:'a'.repeat(32),visits:0,pending:0,confirmed:0,history:[]});
 if(url.pathname.endsWith('/member_identity')){
  if(input.p_action==='verify'){identityChannels.add(input.p_payload.channel);canPublish=identityChannels.size===2;}
  return reply({emailVerified:canPublish||identityChannels.has('email'),phoneVerified:canPublish||identityChannels.has('phone'),phoneMasked:canPublish?'+55 •• •••••-9999':null,canInteract:canPublish});
 }
 if(url.pathname.endsWith('/member_community')){if(input.p_action==='save_profile'){profile.displayName=input.p_payload.displayName;return reply(profile)}return reply({enabled:true})}
 if(url.pathname.endsWith('/member_bike_listings_public')){let items=publicItems();if(input.p_id)items=items.filter(l=>l.id===input.p_id);return reply({total:items.length,items:items.slice(input.p_offset||0,(input.p_offset||0)+(input.p_limit||12))})}
 if(url.pathname.endsWith('/member_bike_image_public')){const paths=publicItems().flatMap(l=>l.images);const image=paths.find(i=>i.id===input.p_id)??(publicItems().length&&avatar?.id===input.p_id?avatar:null);return reply(image?.path??null)}
 if(url.pathname.endsWith('/member_listing_track'))return reply(null);
 if(url.pathname.endsWith('/member_classifieds')){
  const p=input.p_payload||{};const l=listings.find(l=>l.id===p.id);const action=input.p_action;
  if(action==='account')return reply(account());
  if(!canAdvertise)return reply({message:'classifieds_pilot_only'},403);
  if(action==='mine')return reply(listings);
  if(action==='periods')return reply([...billingOrders.entries()].filter(([id,o])=>id!==p.id&&o.status==='active'&&listings.find(l=>l.id===id)?.status!=='published'&&Date.parse(o.paidUntil)>Date.now()).map(([id,o])=>({id:o.id,listingTitle:listings.find(l=>l.id===id).title,paidUntil:o.paidUntil})));
  if(action==='claim_period'){const source=[...billingOrders.entries()].find(([id,o])=>o.id===p.orderId);assert(source);const [oldId,o]=source;assert.notEqual(listings.find(l=>l.id===oldId).status,'published');billingOrders.delete(oldId);billingOrders.set(p.id,o);listings.find(l=>l.id===oldId).feeStatus='required';l.feeStatus='paid';l.displayExpiresAt=o.paidUntil;return reply(l);}
  if(action==='create'){const empty=listings.find(l=>l.status==='draft'&&!l.brand&&!l.model&&!l.description&&!l.images.length);if(empty)return reply(empty);const l={id:randomUUID(),title:'Minha bike',brand:'',model:'',priceCents:0,city:'',state:'',modelYear:null,mileageKm:null,condition:'good',battery:'unknown',invoice:false,description:'',maintenance:'',status:'draft',feeCents:5000,feeStatus:'pilot_exempt',images:[],publishedAt:null,updatedAt:new Date().toISOString(),whatsappMessage:'',contactConfirmed:false,metrics:{impressions:12,visits:7,whatsappClicks:3}};listings.unshift(l);return reply(l)}
  if(action==='reserve_avatar'){avatar={id:randomUUID(),path:''};avatar.path=`${userId}/avatar/${avatar.id}.webp`;return reply(avatar)}
  if(action==='finalize_avatar')return reply({ok:true});
  if(action==='remove_avatar'){avatar=null;return reply({ok:true})}
  assert(l,`missing listing ${action}`);
  if(action==='save'){if(failNextSave){failNextSave=false;return reply({message:'unavailable'},503)}Object.assign(l,p);if(p.confirmContact)l.contactConfirmed=true;delete l.contactConsent}
  else if(action==='reorder'){l.images=p.imageIds.map((id,position)=>({...l.images.find(i=>i.id===id),position}));}
  else if(action==='reserve_image'){const id=randomUUID();const image={id,path:`${userId}/listings/${l.id}/${id}.webp`,position:l.images.length,status:'reserved'};l.images.push(image);return reply(image)}
  else if(action==='finalize_image')l.images.find(i=>i.id===p.assetId).status='ready';
  else if(action==='remove_image')l.images=l.images.filter(i=>i.id!==p.assetId);
  else if(action==='cover'){const index=l.images.findIndex(i=>i.id===p.assetId);const [image]=l.images.splice(index,1);l.images.unshift(image);l.images.forEach((i,index)=>i.position=index)}
  else if(action==='publish'){assert(canPublish&&p.contactConsent===true);l.status='published';l.publishedAt=new Date().toISOString()}
  else if(action==='withdraw')l.status='draft';
  else if(action==='sold')l.status='sold';
  else if(action==='archive')l.status='archived';
  else throw Error(`unexpected action ${action}`);
  l.updatedAt=new Date().toISOString();return reply(l);
 }
 if(url.pathname==='/storage/v1/object/sign/member-media')return reply(input.paths.map(path=>({path,signedURL:`/object/sign/member-media/${path}?token=mock`})));
 if(url.pathname.startsWith('/storage/v1/object/')){
  if(req.method==='POST'){const path=decodeURIComponent(url.pathname.split('/member-media/')[1]);const start=raw.indexOf(Buffer.from('RIFF'));assert(start>=0,'upload reencoded to WebP');const length=raw.readUInt32LE(start+4)+8;blobs.set(path,raw.subarray(start,start+length));return reply({Key:`member-media/${path}`})}
  if(req.method==='DELETE'){for(const path of input.prefixes||[])blobs.delete(path);return reply([])}
  const path=decodeURIComponent(url.pathname.split('/member-media/')[1]||'');const blob=blobs.get(path);if(!blob)return reply({},404);res.writeHead(200,{'content-type':'image/webp'}).end(blob);return;
 }
 return reply([]);
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(54321,'127.0.0.1',resolve)});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const errors=[];context.on('page',page=>page.on('pageerror',e=>errors.push(e.message)));
const billingOrders=new Map(),billingRequests=[];
await context.route('**/api/member/listing-billing',async route=>{
 const input=route.request().postDataJSON();billingRequests.push(input);let order=billingOrders.get(input.listingId)??null;
 if(input.action==='checkout'){
  assert(input.purchaseAccepted&&input.contactConsent,'explicit purchase/contact consent');assert(!('document' in input)&&!('customerData' in input),'no payer data enters Vitale');
  const listing=listings.find(l=>l.id===input.listingId);listing.feeStatus='required';
  order={id:randomUUID(),method:'hosted',status:'pending',paymentUrl:'https://asaas.com/checkoutSession/show?id=30000000-0000-4000-8000-000000000001',displayStartedAt:null,paidUntil:null,checkoutExpiresAt:new Date(Date.now()+600000).toISOString(),hold:false};billingOrders.set(input.listingId,order);
 }
 if(input.action==='cancel'&&order)order.status='cancel_pending';
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({configured:true,amountCents:5000,displayDays:90,billingModel:"one_time_90d",serverNow:new Date().toISOString(),order})});
});
await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.hostname==='asaas.com')return route.fulfill({status:200,contentType:'text/html',body:'<h1>Checkout Asaas hospedado (simulado)</h1>'});return url.pathname==='/api/member/listing-billing'?route.fallback():[origin,backend].includes(url.origin)?route.continue():route.abort()});
await context.addInitScript(session=>{if(location.hostname==='127.0.0.1'&&location.port==='4318')localStorage.setItem('sb-127-auth-token',JSON.stringify(session))},session);
const page=await context.newPage();page.setDefaultTimeout(15000);
const artifacts=new URL(process.env.CLASSIFIEDS_TEST_ARTIFACTS||'../artifacts/bike-classifieds/',import.meta.url);await mkdir(artifacts,{recursive:true});
try{
 if(process.env.CLASSIFIEDS_TEST_ONBOARDING==='true'){
  profile.communityJoinedAt=null;canPublish=false;
  await page.goto(`${origin}/anuncie-sua-bike`);
  await page.getByRole('heading',{name:'R$50 por 90 dias de exposição',exact:true}).waitFor();
  await page.getByRole('link',{name:'Começar meu anúncio',exact:true}).click();
  await page.getByRole('tab',{name:'1. Fotos',exact:true}).waitFor();
  assert.equal(listings.length,1);
  const file=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=800;c.height=600;const x=c.getContext('2d');x.fillStyle='#d9f4e5';x.fillRect(0,0,800,600);return c.toDataURL('image/png').split(',')[1]});
  await page.locator('input[type="file"]').setInputFiles({name:'bike.png',mimeType:'image/png',buffer:Buffer.from(file,'base64')});
  await page.getByRole('button',{name:'Continuar para informações',exact:true}).click();
  for(const [label,value] of [
    ['Título do anúncio','Bike de teste'],['Marca','Marca'],['Modelo','Modelo'],['Cidade','São Paulo'],['Descrição da bike','Descrição sintética da bike de teste.'],
  ])await page.getByLabel(label,{exact:true}).fill(value);
  await page.getByLabel('Preço de venda (R$)',{exact:true}).fill('2500');
  await page.getByLabel('Quilometragem (km)',{exact:true}).fill('30');
  await page.getByLabel('Estado',{exact:true}).selectOption('SP');
  await page.getByRole('button',{name:'Salvar e continuar',exact:true}).click();
  const finish=page.getByRole('link',{name:'Concluir meu cadastro',exact:true});
  await finish.waitFor();
  assert.equal(listings[0].title,'Bike de teste');
  assert.equal(billingRequests.length,0);
  const returnTo='/conta/anuncios?anuncio='+listings[0].id;
  assert.equal(new URL(await finish.getAttribute('href'),origin).searchParams.get('retorno'),returnTo);
  await finish.click();
  await page.getByRole('heading',{name:'Concluir cadastro',exact:true}).waitFor();
  await page.getByLabel('Nome público',{exact:true}).fill('Anunciante de teste');
  await page.getByLabel('Celular com WhatsApp e DDD',{exact:true}).fill('11999999999');
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'Entrar na comunidade',exact:true}).click();
  await page.getByRole('link',{name:'Confirmar depois e continuar no site',exact:true}).click();
  await page.getByRole('link',{name:'Validar e-mail e WhatsApp',exact:true}).waitFor();
  assert.equal(new URL(page.url()).searchParams.get('anuncio'),listings[0].id);
  await page.getByRole('link',{name:'Validar e-mail e WhatsApp',exact:true}).click();
  await page.getByRole('button',{name:'Enviar código por e-mail',exact:true}).click();
  await page.getByLabel('Código recebido por e-mail',{exact:true}).fill('123456');
  await page.getByRole('button',{name:'Validar e-mail',exact:true}).click();
  await page.getByLabel('Celular com DDD',{exact:true}).fill('11999999999');
  await page.getByRole('checkbox',{name:/Aceito receber um código no WhatsApp/}).check();
  await page.getByRole('button',{name:'Enviar código pelo WhatsApp',exact:true}).click();
  await page.getByLabel('Código recebido no WhatsApp',{exact:true}).fill('123456');
  await page.getByRole('button',{name:'Validar celular',exact:true}).click();
  await page.getByRole('button',{name:'Usar meu WhatsApp validado',exact:true}).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'Seguir para pagamento de R$50',exact:true}).waitFor();
  assert(await page.getByRole('button',{name:'Seguir para pagamento de R$50',exact:true}).isEnabled());
  assert.equal(listings.length,1);
  assert.equal(listings[0].images.length,1);
  assert.equal(billingRequests.filter(r=>r.action==='checkout').length,0);
  assert.deepEqual(errors,[]);
  console.log('PASS private draft before profile; gated final step; same draft and photo after signup; contact confirmation enables R$50 checkout');
 } else {
 let response=await page.goto(`${origin}/conta/anuncios`);assert.equal(response.headers()['cache-control'],'private, no-store');assert.match(await page.locator('meta[name="robots"]').last().getAttribute('content'),/noindex/);
 await page.getByRole('heading',{name:'Meus anúncios',exact:true}).waitFor();assert.equal(await page.getByRole('group',{name:'Filtrar anúncios por status'}).count(),0,'first use hides empty filters');assert(!/gestão do canal|Bikes do canal|Nova bike do canal/.test(await page.locator('body').innerText()),'channel owner uses ordinary advertiser controls');await page.getByRole('button',{name:'Criar meu primeiro anúncio'}).click();await page.getByRole('heading',{name:'R$50 por 90 dias de exposição',exact:true}).waitFor();await page.screenshot({path:new URL('seller-conditions-desktop.png',artifacts).pathname,fullPage:true});await page.getByRole('link',{name:'Começar meu anúncio',exact:true}).click();await page.getByRole('button',{name:'Voltar aos anúncios'}).click();assert.equal(await page.getByText('Minha bike',{exact:true}).count(),0,'blank draft hidden');await page.getByRole('button',{name:'Criar meu primeiro anúncio'}).click();await page.getByRole('heading',{name:'R$50 por 90 dias de exposição',exact:true}).waitFor();await page.getByRole('link',{name:'Começar meu anúncio',exact:true}).click();assert.equal(listings.length,1,'new action reuses blank draft');assert(await page.getByRole('tab',{name:'2. Informações',exact:true}).isDisabled(),'cannot skip photos');assert(await page.getByRole('tab',{name:'3. Publicar',exact:true}).isDisabled(),'cannot skip directly to payment');assert(await page.getByRole('button',{name:'Continuar para informações',exact:true}).isDisabled());
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:new URL('new-editor-desktop.png',artifacts).pathname,fullPage:true});
 const file=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=800;c.height=600;const x=c.getContext('2d');x.fillStyle='#d9f4e5';x.fillRect(0,0,800,600);x.fillStyle='#123a30';x.font='bold 40px sans-serif';x.fillText('Foto de teste · bicicleta',100,290);return c.toDataURL('image/png').split(',')[1]});
 const upload=n=>Array.from({length:n},(_,i)=>({name:`foto-${i}.png`,mimeType:'image/png',buffer:Buffer.from(file,'base64')}));
 if(process.env.CLASSIFIEDS_TEST_LARGE_PHOTOS==='true') {
   await page.evaluate(()=>{
     const native=HTMLCanvasElement.prototype.toBlob;
     HTMLCanvasElement.prototype.toBlob=function(cb,type,q){return native.call(this,cb,type==='image/webp'?'image/png':type,q)};
   });
   const oversized={name:'camera-too-large.png',mimeType:'image/png',buffer:Buffer.concat([Buffer.from(file,'base64'),Buffer.alloc(15*1024*1024+1-Buffer.from(file,'base64').length)])};
   await page.getByLabel('Adicionar fotos da bike').setInputFiles([oversized]);
   await page.getByRole('alert').filter({hasText:'Essa foto ultrapassa 15 MB'}).waitFor();
   assert.equal(blobs.size,0,'oversized original never uploaded or reserved');
 }

 const firstBatch=upload(4);
 if(process.env.CLASSIFIEDS_TEST_LARGE_PHOTOS==='true') firstBatch[0].buffer=Buffer.concat([firstBatch[0].buffer,Buffer.alloc(12*1024*1024-firstBatch[0].buffer.length)]);
 await page.getByLabel('Adicionar fotos da bike').setInputFiles(firstBatch);
 if(process.env.CLASSIFIEDS_TEST_LARGE_PHOTOS==='true') {
   await page.getByRole('status').filter({hasText:'Preparando e enviando foto 1 de 4'}).waitFor();
   await page.setViewportSize({width:390,height:844});
   await page.screenshot({path:new URL('large-photo-progress-mobile.png',artifacts).pathname,fullPage:true});
   await page.setViewportSize({width:1440,height:1000});
 }
 await page.getByRole('heading',{name:'1. Fotos da bike · 4/5'}).waitFor();
 const photoRow=page.getByTestId('photo-step-actions');const addBox=await photoRow.getByText('Adicionar fotos',{exact:true}).boundingBox();const nextBox=await photoRow.getByRole('button',{name:'Continuar para informações'}).boundingBox();assert(nextBox.x>addBox.x+addBox.width+8,'photo controls separated, next on right');assert(Math.abs(addBox.y+addBox.height/2-nextBox.y-nextBox.height/2)<12,'photo controls aligned');
 const beforeOrder=listings[0].images.map(i=>i.id);await page.getByRole('button',{name:'Mover foto 2 para antes',exact:true}).click();await page.getByRole('status').filter({hasText:'Ordem das fotos atualizada'}).waitFor();assert.equal(listings[0].images[0].id,beforeOrder[1]);assert.equal(listings[0].images[1].id,beforeOrder[0]);for(const width of [320,390]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'photo ordering fits narrow screens');}await page.getByRole('tabpanel',{name:'1. Fotos',exact:true}).screenshot({path:new URL('photo-order-mobile.png',artifacts).pathname});await page.setViewportSize({width:1440,height:1000});
 await page.screenshot({path:new URL('photo-actions-desktop.png',artifacts).pathname,fullPage:true});await page.getByRole('button',{name:'Continuar para informações',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.id==='listing-panel-details');
 await page.getByLabel('Marca',{exact:true}).fill('Marca parcial');await page.getByRole('button',{name:'Salvar rascunho',exact:true}).click();await page.getByRole('status').filter({hasText:'Rascunho salvo'}).waitFor();assert.equal(listings[0].brand,'Marca parcial');await page.getByRole('button',{name:'Salvar e continuar',exact:true}).click();await page.getByRole('alert').filter({hasText:'Descrição da bike'}).waitFor();assert(await page.getByRole('tab',{name:'3. Publicar',exact:true}).isDisabled(),'partial save does not unlock review');assert.equal(billingRequests.length,0,'no checkout for incomplete bike');

 await page.getByRole('tab',{name:'2. Informações',exact:true}).click();await page.getByLabel('Título do anúncio').fill('V9 Max revisada — anúncio de teste');await page.getByLabel('Marca',{exact:true}).fill('Marca teste');await page.getByLabel('Modelo',{exact:true}).fill('V9 Max');await page.getByLabel('Preço de venda (R$)').fill('4800');await page.getByLabel('Quilometragem (km)').fill('1234');await page.getByLabel('Cidade',{exact:true}).fill('São Paulo');await page.getByLabel('Estado',{exact:true}).selectOption('SP');await page.getByLabel('Ano do modelo (opcional)').fill('2025');await page.getByLabel('Descrição da bike').fill('Curta');await page.getByRole('button',{name:'Salvar e continuar',exact:true}).click();await page.getByRole('alert').filter({hasText:'Descrição da bike (ao menos 20 caracteres)'}).waitFor();assert.equal(await page.getByLabel('Descrição da bike').getAttribute('aria-invalid'),'true');assert.equal(await page.locator('#listing-panel-details [data-character-count]').count(),8,'all bounded fields including phone and message show counters');assert.match(await page.locator('#listing-field-description-limits').innerText(),/5 \/ 4\.000 caracteres/);assert.match(await page.locator('#listing-field-description-limits').innerText(),/Faltam 15 caracteres/);await page.getByLabel('Descrição da bike').fill('   Curta  ');assert.match(await page.locator('#listing-field-description-limits').innerText(),/10 \/ 4\.000 caracteres/);assert.match(await page.locator('#listing-field-description-limits').innerText(),/Faltam 15 caracteres.*sem espaços/);await page.getByLabel('Manutenção, acessórios e defeitos conhecidos (opcional)').fill('x'.repeat(1001));assert.equal((await page.getByLabel('Manutenção, acessórios e defeitos conhecidos (opcional)').inputValue()).length,1000);assert.match(await page.locator('#listing-field-maintenance-limits').innerText(),/1\.000 \/ 1\.000 caracteres/);assert.match(await page.locator('#listing-field-maintenance-limits').innerText(),/Limite máximo atingido/);await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'bounded fields and counters fit mobile');await page.getByRole('tabpanel',{name:'2. Informações',exact:true}).screenshot({path:new URL('field-counters-mobile.png',artifacts).pathname});await page.setViewportSize({width:1440,height:1000});await page.getByLabel('Descrição da bike').fill('Bike de demonstração local. Nunca será anunciada em produção. Usada por um ano, revisão em dia.');await page.getByLabel('Manutenção, acessórios e defeitos conhecidos (opcional)').fill('Pastilhas novas. Pequeno risco no paralama.');
 await page.getByRole('button',{name:'Voltar aos anúncios',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Continuar editando',exact:true}).click();assert.equal(await page.getByLabel('Título do anúncio').inputValue(),'V9 Max revisada — anúncio de teste','cancel discard keeps typing');
 assert.equal(await page.getByRole('tab').first().innerText(),'1. Fotos','photos are first');await page.getByRole('tab',{name:'1. Fotos',exact:true}).click();
 await page.getByLabel('Adicionar fotos da bike').setInputFiles(upload(1));await page.getByRole('heading',{name:'1. Fotos da bike · 5/5'}).waitFor();assert.equal(await page.getByLabel('Título do anúncio').inputValue(),'V9 Max revisada — anúncio de teste');assert.equal(await page.getByLabel('Adicionar fotos da bike').count(),0);
 await page.getByRole('button',{name:'Ver prévia',exact:true}).click();await page.getByRole('heading',{name:'V9 Max revisada — anúncio de teste',level:2,exact:true}).waitFor();assert.notEqual(listings[0].title,'V9 Max revisada — anúncio de teste','preview uses unsaved values');await page.screenshot({path:new URL('live-preview-desktop.png',artifacts).pathname,fullPage:true});await page.getByRole('button',{name:'Voltar à edição'}).click();await page.getByRole('tab',{name:'2. Informações',exact:true}).click();assert.equal(await page.getByLabel('Título do anúncio').inputValue(),'V9 Max revisada — anúncio de teste');
 assert.equal(listings[0].title,'V9 Max revisada — anúncio de teste','forward navigation auto-saves pending details');
 await page.getByRole('tab',{name:'1. Fotos',exact:true}).click();await page.getByRole('button',{name:'Usar como capa'}).nth(1).click();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:new URL('photo-step-desktop.png',artifacts).pathname,fullPage:true});await page.getByRole('status').filter({hasText:'Capa atualizada'}).waitFor();
 await page.getByRole('button',{name:'Continuar para informações',exact:true}).click();await page.getByRole('button',{name:'Salvar e continuar',exact:true}).click();await page.getByRole('link',{name:'Validar e-mail e WhatsApp',exact:true}).waitFor();assert.equal(billingRequests.filter(r=>r.action==='checkout').length,0,'unverified WhatsApp cannot reach payment');canPublish=true;await page.reload();await page.getByRole('button',{name:'Editar anúncio',exact:true}).click();await page.getByRole('button',{name:'Continuar para informações',exact:true}).click();await page.getByLabel('Mensagem que gostaria de receber').fill('Quero saber mais sobre *{bike}*. {link}');assert.match(await page.getByLabel('Prévia da mensagem de contato').innerText(),/V9 Max revisada/);failNextSave=true;await page.getByRole('button',{name:'Salvar e continuar',exact:true}).click();await page.getByRole('alert').waitFor();assert(await page.getByRole('tabpanel',{name:'2. Informações',exact:true}).isVisible(),'save failure stays on details');await page.getByRole('button',{name:'Salvar e continuar',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.id==='listing-panel-publish');await page.getByRole('checkbox').first().check();await page.getByRole('button',{name:'Seguir para pagamento de R$50'}).waitFor();
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:new URL('editor-desktop.png',artifacts).pathname,fullPage:true});
 await page.getByRole('button',{name:'Ver prévia'}).click();await page.getByText('Prévia do anúncio com os dados que você está preenchendo.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:/Ver foto/}).count(),5);await page.getByRole('button',{name:'Ver foto 5',exact:true}).click();await page.getByRole('button',{name:'Voltar à edição'}).click();
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:new URL('editor-mobile.png',artifacts).pathname,fullPage:true});
 canPublish=true;await page.reload();await page.getByRole('listitem').filter({has:page.getByRole('heading',{name:'V9 Max revisada — anúncio de teste',exact:true})}).getByRole('button',{name:'Editar anúncio',exact:true}).click();await page.getByRole('button',{name:'Continuar para informações',exact:true}).click();await page.getByRole('button',{name:'Salvar e continuar',exact:true}).click();
 assert.equal(await page.getByLabel('CPF ou CNPJ do pagador').count(),0,'no payer form');assert.equal(await page.getByRole('button',{name:'Publicar com isenção',exact:true}).count(),0,'same paid journey for the channel account');
 await page.getByRole('checkbox').waitFor();assert.equal(await page.getByRole('checkbox').count(),1,'one combined publication and purchase consent');assert(await page.getByRole('button',{name:'Seguir para pagamento de R$50',exact:true}).isDisabled(),'explicit consent required');await page.getByRole('checkbox').check();assert(await page.getByRole('button',{name:'Seguir para pagamento de R$50',exact:true}).isEnabled());
 const paymentTabPromise=context.waitForEvent('page');await page.getByRole('button',{name:'Seguir para pagamento de R$50',exact:true}).click();const paymentTab=await paymentTabPromise;await paymentTab.getByRole('heading',{name:'Checkout Asaas hospedado (simulado)',exact:true}).waitFor();assert(new URL(paymentTab.url()).hostname==='asaas.com');assert(page.url().startsWith(origin),'Vitale stays open');await paymentTab.close();
 const published=listings[0];assert.equal(published.status,'draft','hosted checkout does not publish');assert.equal(published.priceCents,480000);assert.equal(published.images.length,5);assert.equal(blobs.size,5);
 await page.getByRole('status').filter({hasText:'Aguardando pagamento no Asaas'}).waitFor();assert.equal(await page.getByRole('button',{name:'Atualizar pagamento',exact:true}).count(),0,'no manual refresh');assert.equal(await page.getByRole('checkbox').count(),0,'pending purchase needs no second consent');await page.getByRole('link',{name:'Seguir para pagamento de R$50',exact:true}).waitFor();const timer=page.getByRole('timer');await timer.waitFor();assert.match(await timer.innerText(),/^0[9]:[0-5][0-9]$|^10:00$/);const firstClock=await timer.innerText();await page.waitForFunction(first=>document.querySelector('[role=timer]')?.textContent!==first,firstClock);const pendingOrder=billingOrders.get(published.id);const originalExpiry=pendingOrder.checkoutExpiresAt;pendingOrder.checkoutExpiresAt=new Date(Date.now()-1000).toISOString();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByText('O prazo deste checkout terminou.',{exact:false}).waitFor();assert.equal(published.status,'draft','expired clock never grants publication');assert.equal(await page.getByRole('link',{name:'Seguir para pagamento de R$50',exact:true}).count(),0,'expired checkout cannot resume');pendingOrder.checkoutExpiresAt=originalExpiry;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByRole('link',{name:'Seguir para pagamento de R$50',exact:true}).waitFor();await page.getByRole('tab',{name:'2. Informações',exact:true}).click();assert(await page.getByLabel('Título do anúncio').isDisabled(),'pending payment freezes consented revision');await page.getByRole('tab',{name:'3. Publicar',exact:true}).click();
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:new URL('billing-hosted-mobile.png',artifacts).pathname,fullPage:true});
 const paidOrder=billingOrders.get(published.id);paidOrder.status='active';paidOrder.paidUntil=new Date(Date.now()+90*86400000).toISOString();paidOrder.displayStartedAt=new Date().toISOString();published.status='published';published.feeStatus='paid';published.displayExpiresAt=paidOrder.paidUntil;
 await page.getByRole('dialog').getByRole('heading',{name:'Parabéns! Pagamento confirmado 🎉'}).waitFor();assert(await page.getByRole('dialog').getByRole('link',{name:'Ver meu anúncio'}).isVisible());await page.screenshot({path:new URL('paid-success-modal.png',artifacts).pathname,fullPage:true});await page.keyboard.press('Escape');await page.getByRole('status').filter({hasText:'Pagamento confirmado'}).waitFor();assert.equal(await page.getByTestId('payment-countdown').count(),0,'countdown stops after payment confirmation');
 assert.equal(await page.getByRole('button',{name:/Encerrar assinatura/}).count(),0,'no recurring controls');
 const deadline=paidOrder.paidUntil;
 await page.getByRole('button',{name:'Retirar do ar para editar',exact:true}).click();await page.getByRole('status').filter({hasText:'Anúncio em rascunho'}).waitFor();
 await page.getByRole('tab',{name:'2. Informações',exact:true}).click();assert(await page.getByLabel('Título do anúncio').isEnabled(),'paid ads can be edited after pause');await page.getByLabel('Manutenção, acessórios e defeitos conhecidos (opcional)').fill('Revisão realizada após pausa.');await page.getByRole('button',{name:'Salvar rascunho',exact:true}).click();await page.getByRole('status').filter({hasText:'Rascunho salvo'}).waitFor();
 await page.getByRole('tab',{name:'3. Publicar',exact:true}).click();await page.getByRole('checkbox').first().check();await page.getByRole('button',{name:'Republicar no período pago',exact:true}).click();await page.getByRole('link',{name:'Ver anúncio no site',exact:true}).waitFor();assert.equal(paidOrder.paidUntil,deadline,'republication preserves 90-day expiry');assert.equal(billingRequests.filter(r=>r.action==='checkout').length,1,'one hosted checkout per explicit purchase');
 await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:new URL('billing-hosted-desktop.png',artifacts).pathname,fullPage:true});
 paidOrder.displayStartedAt=new Date().toISOString();published.status='published';published.feeStatus='paid';published.displayExpiresAt=paidOrder.paidUntil;

 // Reuse an inactive paid slot in another bike, without creating a second checkout.
 const originalId=published.id;const paidCheckoutCount=billingRequests.filter(r=>r.action==='checkout').length;
 await page.goto(`${origin}/conta/anuncios`);await page.getByRole('heading',{name:'Meus anúncios',exact:true}).waitFor();
 const originalRow=()=>page.getByRole('listitem').filter({has:page.getByRole('heading',{name:published.title,exact:true})});
 assert.match(await originalRow().innerText(),/Na vitrine/);assert.match(await originalRow().innerText(),/Cliques no WhatsApp/);
 await originalRow().getByRole('button',{name:'Desativar',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Desativar anúncio',exact:true}).click();await page.getByRole('status').filter({hasText:'Anúncio desativado'}).waitFor();assert.equal(await originalRow().count(),1,'archived ad remains in Todos');
 await originalRow().getByRole('button',{name:'Reativar anúncio',exact:true}).click();await originalRow().getByRole('link',{name:'Ver anúncio',exact:true}).waitFor();assert.equal(published.status,'published');assert.equal(paidOrder.paidUntil,deadline);
 await page.goto(`${origin}/conta/anuncios`);await originalRow().getByRole('button',{name:'Desativar',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Desativar anúncio',exact:true}).click();await page.getByRole('status').filter({hasText:'Anúncio desativado'}).waitFor();
 await page.getByRole('button',{name:'Anuncie sua bike',exact:true}).click();await page.getByRole('heading',{name:'R$50 por 90 dias de exposição',exact:true}).waitFor();await page.getByRole('link',{name:'Começar meu anúncio',exact:true}).click();
 await page.getByLabel('Adicionar fotos da bike').setInputFiles(upload(1));await page.getByRole('heading',{name:'1. Fotos da bike · 1/5'}).waitFor();await page.getByRole('button',{name:'Continuar para informações',exact:true}).click();
 for(const [label,value] of [['Título do anúncio','Outra bike para o período'],['Marca','Marca'],['Modelo','Outro modelo'],['Preço de venda (R$)','3000'],['Quilometragem (km)','20'],['Cidade','São Paulo'],['Descrição da bike','Esta é uma outra bike inteiramente sintética para reusar o período pago.']]) await page.getByLabel(label,{exact:true}).fill(value);
 await page.getByLabel('Estado',{exact:true}).selectOption('SP');await page.getByRole('button',{name:'Salvar e continuar',exact:true}).click();await page.getByRole('checkbox').check();await page.getByText('Você já tem um período pago disponível',{exact:true}).waitFor();assert(await page.getByRole('button',{name:'Seguir para pagamento de R$50',exact:true}).isDisabled());
 await page.getByRole('button',{name:/Publicar no período pago até/}).click();await page.getByRole('link',{name:'Ver anúncio no site',exact:true}).waitFor();const replacement=listings.find(l=>l.id!==originalId);assert(replacement&&replacement.status==='published');assert.equal(published.status,'archived');assert.equal(billingOrders.get(replacement.id).paidUntil,deadline);assert.equal(billingRequests.filter(r=>r.action==='checkout').length,paidCheckoutCount,'reactivation and replacement never create another charge');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:new URL('reused-paid-period-mobile.png',artifacts).pathname,fullPage:true});
 // Restore synthetic fixtures only, for independent public projection checks below.
 billingOrders.delete(replacement.id);billingOrders.set(originalId,paidOrder);listings=listings.filter(l=>l.id!==replacement.id);published.status='published';published.feeStatus='paid';
 // Four synthetic listings prove SSR featured-three + all and pagination contract.
 for(let i=0;i<3;i++)listings.push({...structuredClone(published),id:randomUUID(),title:`Outra bike de teste ${i+1}`,publishedAt:new Date(Date.now()-1000*(i+1)).toISOString()});
 await page.goto(`${origin}/conta/anuncios`);await page.getByRole('heading',{name:'Meus anúncios',exact:true}).waitFor();await page.getByRole('searchbox',{name:'Pesquisar suas bikes'}).fill('Outra bike de teste 3');assert.equal(await page.locator('section[aria-labelledby="listing-dashboard-title"] article').count(),1);await page.getByRole('searchbox',{name:'Pesquisar suas bikes'}).fill('');
 const row=()=>page.getByRole('listitem').filter({has:page.getByRole('heading',{name:'Outra bike de teste 3',exact:true})});await row().getByRole('button',{name:'Desativar',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Desativar anúncio',exact:true}).click();await page.getByRole('status').filter({hasText:'Anúncio desativado'}).waitFor();assert.equal(await row().count(),1,'Todos includes archived ads');await page.getByRole('button',{name:'Desativados 1',exact:true}).click();await row().getByRole('button',{name:'Reativar anúncio'}).click();await page.getByRole('status').filter({hasText:'Anúncio reativado'}).waitFor();await page.getByRole('button',{name:'Ativos 4',exact:true}).click();const soldRow=page.getByRole('listitem').filter({has:page.getByRole('heading',{name:'Outra bike de teste 2',exact:true})});await soldRow.getByRole('button',{name:'Marcar como vendida'}).click();await page.getByRole('status').filter({hasText:'Bike marcada como vendida'}).waitFor();await page.getByRole('button',{name:'Vendidas 1',exact:true}).click();await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:new URL('dashboard-desktop.png',artifacts).pathname,fullPage:true});await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:new URL('dashboard-mobile.png',artifacts).pathname,fullPage:true});
 // Restore only synthetic fixtures for the independent public projection checks.
 for(const item of listings)item.status='published';
 response=await page.goto(`${origin}/venda-sua-bike`);const ssr=await response.text();assert(ssr.includes('V9 Max revisada'),'SSR title');assert(ssr.includes('Outra bike de teste 3'),'SSR all listings');await page.getByRole('heading',{name:'Todas as bikes',exact:true}).waitFor();assert(!/R\$\s*150/.test(await page.locator('body').innerText()));assert.equal(await page.locator('section[aria-labelledby="classificados-destaque"] article').count(),3);assert.equal(await page.locator('section[aria-labelledby="classificados-todos"] article').count(),4);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:new URL('hub-mobile.png',artifacts).pathname,fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:new URL('hub-desktop.png',artifacts).pathname,fullPage:true});
 await page.getByRole('button',{name:'Abrir menu da minha conta'}).waitFor();assert(!(await page.getByRole('button',{name:'Abrir menu da minha conta'}).innerText()).includes('Minha conta'));assert.equal(await page.locator('nav[aria-label="Principal"] a').first().evaluate(e=>getComputedStyle(e).fontSize),'16px');const quiz=await page.getByRole('link',{name:'Faça o Quiz e descubra a bike ideal',exact:true}).first().boundingBox();const menu=await page.getByRole('button',{name:'Abrir menu da minha conta'}).boundingBox();assert(menu.x>=quiz.x+quiz.width,`account after quiz ${JSON.stringify({menu,quiz})}`);await page.getByRole('button',{name:'Abrir menu da minha conta'}).click();await page.getByRole('menuitem',{name:'Anuncie sua bike'}).waitFor();await page.keyboard.press('Escape');
 await page.goto(`${origin}/venda-sua-bike/${published.id}`);await page.getByRole('heading',{name:published.title,exact:true}).waitFor();assert.match(await page.getByRole('link',{name:'Conversar pelo WhatsApp'}).getAttribute('href'),/^https:\/\/wa.me\/5511999999999/);assert(await page.locator('img').first().evaluate(img=>img.complete&&img.naturalWidth>0));assert.match(await page.locator('meta[property="og:image"]').getAttribute('content'),new RegExp(published.images[0].id));assert(await page.getByRole('button',{name:'Compartilhar',exact:true}).isVisible());assert(await page.getByRole('button',{name:'Copiar link',exact:true}).isVisible());
 await page.screenshot({path:new URL('listing-desktop.png',artifacts).pathname,fullPage:true});
 await page.goto(`${origin}/`);assert.equal(await page.locator('section[aria-labelledby="classificados-home"]').count(),1,'public Home section visible');assert.equal(await page.locator('section[aria-labelledby="classificados-home"] article').count(),3,'three real fixture ads on Home');assert.equal(await page.locator('header a[href="/venda-sua-bike"]').count(),2,'desktop and mobile navigation visible');await page.getByRole('button',{name:'Abrir menu da minha conta'}).waitFor();
 await page.getByRole('button',{name:'Abrir menu da minha conta'}).click();for(const name of ['Editar meu perfil','Anuncie sua bike','Meus anúncios']) assert(await page.getByRole('menuitem',{name,exact:true}).isVisible());await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'Cadastrar e-mail',exact:true}).count(),0,'logged-in newsletter capture hidden');
 for(const width of [320,390,1024,1280,1440]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`header/home width ${width}`)}
 await page.goto(`${origin}/conta?modo=perfil`);await page.getByRole('heading',{name:'Anuncie sua bike na Vitale Mobilidade',exact:true}).waitFor();await page.getByRole('region',{name:'E-mail e WhatsApp',exact:true}).waitFor();await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:new URL('profile-before-desktop.png',artifacts).pathname,fullPage:true});await page.getByLabel('Adicionar foto de perfil').setInputFiles(upload(1));await page.getByRole('status').filter({hasText:'Foto salva.'}).waitFor();assert(avatar&&blobs.has(avatar.path));await page.getByLabel('Nome público',{exact:true}).fill('Meu novo perfil');await page.getByRole('button',{name:'Salvar perfil'}).click();await page.getByRole('status').filter({hasText:'Perfil salvo.'}).waitFor();await page.getByRole('button',{name:'Abrir menu da minha conta'}).click();assert.equal(await page.locator('header img').count(),2);await page.keyboard.press('Escape');await page.screenshot({path:new URL('profile-desktop.png',artifacts).pathname,fullPage:true});
 canAdvertise=false;await page.goto(`${origin}/conta/anuncios`);await page.getByText('Não foi possível liberar a criação de anúncios nesta conta.',{exact:false}).waitFor();assert.equal(await page.getByRole('button',{name:'Criar meu primeiro anúncio',exact:true}).count(),0);
 // Hiding discovery must preserve direct login and existing authenticated access.
 await page.getByRole('button',{name:'Abrir menu da minha conta'}).click();await page.getByRole('menuitem',{name:'Sair',exact:true}).click();await page.getByRole('button',{name:'Abrir menu da minha conta'}).waitFor({state:'hidden'});await page.getByRole('link',{name:'Entrar',exact:true}).waitFor();assert.equal(await page.locator('header a[href="/venda-sua-bike"]').count(),2);
 const guestContext=await browser.newContext();await guestContext.route('**/*',route=>[origin,backend].includes(new URL(route.request().url()).origin)?route.continue():route.abort());const guest=await guestContext.newPage();await guest.goto(`${origin}/conta?modo=entrar`);await guest.getByLabel('E-mail',{exact:true}).waitFor();await guest.getByLabel('Senha',{exact:true}).waitFor();await guest.getByRole('link',{name:'Entrar',exact:true}).waitFor();assert.equal(await guest.locator('header a[href="/venda-sua-bike"]').count(),2,'public visitor can discover classifieds');listings.forEach(item=>item.status='draft');await guest.goto(`${origin}/`);await guest.getByRole('heading',{name:'Venda sua bike aqui',exact:true}).waitFor();await guest.getByRole('link',{name:'Quer vender sua bike aqui?',exact:true}).waitFor();assert.equal(await guest.locator('section[aria-labelledby="classificados-home"] article').count(),0,'empty launch does not invent listings');assert(!(await guest.locator('section[aria-labelledby="classificados-home"]').innerText()).includes('R$50'),'space fee private');await guest.setViewportSize({width:1440,height:1000});await guest.screenshot({path:new URL('public-empty-home-desktop.png',artifacts).pathname,fullPage:true});await guest.setViewportSize({width:390,height:844});await guest.locator('header details').evaluate(el=>el.open=true);await guest.getByRole('navigation',{name:'Principal (celular)',exact:true}).getByRole('link',{name:'Venda sua bike aqui',exact:true}).waitFor();assert(await guest.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await guest.screenshot({path:new URL('public-empty-home-mobile.png',artifacts).pathname,fullPage:true});await guestContext.close();
 assert(!requests.some(r=>/newsletter-interest|member-identity-code|recover|stripe|payment/.test(r.path)),'no marketing, identity transport or payment sends');console.log('PASS seller UX: conditions before draft, validated contact and custom bold message, photo ordering at 320/390px, paid confirmation modal, Todos includes archived, immediate reactivation and paid slot reassignment without second checkout, menu shortcuts, logged-in newsletter suppression, cover OG/share controls and private metric labels');assert.equal(errors.length,0,errors.join('\n'));console.log('PASS local UI: single consent, matching initial/resume CTA, ten-minute countdown based on persisted deadline, expiry never publishes, automatic paid confirmation without refresh, counters for all bounded text fields, trimmed minimum, hard maximum visible, sequential 1>2>3, aligned photo actions, save-and-advance with focus, partial/missing fields and save failure blocked before payment, draft/save, five reencoded uploads, cover/preview, verification gate, hosted Asaas one-time 90-day checkout in new tab, no payer form, confirmation, paid pause/edit/republication, SSR featured-three/all/detail, Home discovery visible with three bikes, public signin visible, responsive header after Quiz, profile photo/name, restricted-account denial; zero real messages or charges');
 }
}catch(error){console.error("DEBUG URL",page.url(),"BODY",(await page.locator("body").innerText()).slice(0,2500),"LAST REQUESTS",requests.slice(-5));await page.screenshot({path:new URL("failure.png",artifacts).pathname,fullPage:true});throw error;}finally{await context.close();await browser.close();await new Promise(resolve=>server.close(resolve))}
