// Local-only public-launch smoke. Synthetic Auth, HTTP database/Storage fixture and canvas
// photos. No email, WhatsApp, production database, payment or real listing.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir,readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin='http://127.0.0.1:4319', backend='http://127.0.0.1:54321';
const userId='00000000-0000-4000-8000-000000000090';
const user={id:userId,aud:'authenticated',role:'authenticated',email:'pilot@example.invalid',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{display_name:'Conta piloto'},identities:[],created_at:new Date().toISOString()};
const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const expires=Math.floor(Date.now()/1000)+3600;
const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:userId,exp:expires,aud:'authenticated',role:'authenticated'})}.fake`;
const session={access_token:token,token_type:'bearer',expires_in:3600,expires_at:expires,refresh_token:'local-fake-refresh',user};
let canAdvertise=true,canPublish=true,avatar=null;
let failNextSave=false;let listings=[];const blobs=new Map();const requests=[];
const profile={displayName:'Conta piloto',suspended:false,createdAt:user.created_at,communityJoinedAt:user.created_at,newsletterSubscribed:true};
const account=()=>({sellerType:'individual',displayName:profile.displayName,verifiedPhone:canPublish?"5511999999999":null,communityJoined:true,canAdvertise,canPublish,canUploadAvatar:true,avatarId:avatar?.id??null,avatarPath:avatar?.path??null});
const publicItems=()=>listings.filter(l=>l.status==='published').map(l=>({...l,sellerName:profile.displayName,avatarPath:avatar?.path??null,whatsapp:'5511999999999'}));
const server=createServer(async(req,res)=>{
 res.setHeader('access-control-allow-origin',origin);res.setHeader('access-control-allow-headers','*');res.setHeader('access-control-allow-methods','POST,GET,PUT,DELETE,OPTIONS');
 if(req.method==='OPTIONS'){res.writeHead(204).end();return}
 const url=new URL(req.url,backend);const chunks=[];for await(const c of req)chunks.push(c);const raw=Buffer.concat(chunks);let input={};try{input=JSON.parse(raw.toString())}catch{}
 requests.push({path:url.pathname,input});
 const reply=(data,status=200)=>{res.writeHead(status,{'content-type':'application/json'}).end(JSON.stringify(data))};
 if(url.pathname.endsWith('/auth/v1/user'))return reply(user);
 if(url.pathname.endsWith('/auth/v1/logout'))return reply({});
 if(url.pathname.endsWith('/member_community_account'))return reply(profile);
 if(url.pathname.endsWith('/member_referrals'))return reply({enabled:true,code:'a'.repeat(32),visits:0,pending:0,confirmed:0,history:[]});
 if(url.pathname.endsWith('/member_identity'))return reply({emailVerified:canPublish,phoneVerified:canPublish,phoneMasked:canPublish?'+55 •• •••••-9999':null,canInteract:canPublish});
 if(url.pathname.endsWith('/member_community')){if(input.p_action==='save_profile'){profile.displayName=input.p_payload.displayName;return reply(profile)}return reply({enabled:true})}
 if(url.pathname.endsWith('/member_bike_listings_public')){let items=publicItems();if(input.p_id)items=items.filter(l=>l.id===input.p_id);return reply({total:items.length,items:items.slice(input.p_offset||0,(input.p_offset||0)+(input.p_limit||12))})}
 if(url.pathname.endsWith('/member_bike_image_public')){const paths=publicItems().flatMap(l=>l.images);const image=paths.find(i=>i.id===input.p_id)??(publicItems().length&&avatar?.id===input.p_id?avatar:null);return reply(image?.path??null)}
 if(url.pathname.endsWith('/member_listing_track'))return reply(null);
 if(url.pathname.endsWith('/member_classifieds')){
  const p=input.p_payload||{};const l=listings.find(l=>l.id===p.id);const action=input.p_action;
  if(action==='account')return reply(account());
  if(!canAdvertise)return reply({message:'classifieds_pilot_only'},403);
  if(action==='mine')return reply(listings);
  if(action==='periods')return reply([{id:'00000000-0000-4000-8000-000000000881',kind:'courtesy',listingTitle:'Cortesia de parceiro',paidUntil:null}]);
  if(action==='claim_period'){assert.equal(p.orderId,'00000000-0000-4000-8000-000000000881');l.feeStatus='courtesy';return reply(l);}
  if(action==='create'){const empty=listings.find(l=>l.status==='draft'&&!l.brand&&!l.model&&!l.description&&!l.images.length);if(empty)return reply(empty);const l={id:randomUUID(),title:'Minha bike',brand:'',model:'',priceCents:0,city:'',state:'',modelYear:null,mileageKm:null,condition:'good',battery:'unknown',invoice:false,description:'',maintenance:'',status:'draft',feeCents:15000,feeStatus:'pilot_exempt',images:[],publishedAt:null,updatedAt:new Date().toISOString(),whatsappMessage:'',contactConfirmed:false,metrics:{impressions:12,visits:7,whatsappClicks:3}};listings.unshift(l);return reply(l)}
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
  else if(action==='publish'){assert(canPublish&&p.contactConsent===true);l.status='published';l.publishedAt=new Date().toISOString();l.displayExpiresAt=new Date(Date.now()+90*86400000).toISOString()}
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
 if(input.action==='cancel'&&order)order.status='cancelled';
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({configured:true,amountCents:15000,displayDays:90,billingModel:"one_time_90d",serverNow:new Date().toISOString(),order})});
});
await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.hostname==='asaas.com')return route.fulfill({status:200,contentType:'text/html',body:'<h1>Checkout Asaas hospedado (simulado)</h1>'});return url.pathname==='/api/member/listing-billing'?route.fallback():[origin,backend].includes(url.origin)?route.continue():route.abort()});
await context.addInitScript(session=>{if(location.hostname==='127.0.0.1'&&location.port==='4319')localStorage.setItem('sb-127-auth-token',JSON.stringify(session))},session);
const page=await context.newPage();page.setDefaultTimeout(15000);
const artifacts=new URL(process.env.CLASSIFIEDS_TEST_ARTIFACTS||'../artifacts/bike-classifieds/',import.meta.url);await mkdir(artifacts,{recursive:true});
const imageId=randomUUID(),listingId=randomUUID(),path=`${userId}/listings/${listingId}/${imageId}.webp`;
blobs.set(path,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jI1sAAAAASUVORK5CYII=','base64'));
listings=[{id:listingId,title:'Bike do parceiro revisada',brand:'Marca',model:'Modelo',priceCents:700000,city:'São Paulo',state:'SP',mileageKm:123,modelYear:2025,condition:'good',battery:'original',invoice:true,description:'Uma bicicleta de demonstração completamente sintética.',maintenance:'Revisada',whatsappMessage:'',contactConfirmed:true,status:'draft',feeCents:15000,feeStatus:'required',sellerType:'individual',publishedAt:null,updatedAt:new Date().toISOString(),images:[{id:imageId,path,position:0,status:'ready'}]}];
billingOrders.set(listingId,{id:randomUUID(),method:'hosted',status:'pending',paymentUrl:'https://asaas.com/checkoutSession/show?id=30000000-0000-4000-8000-000000000001',displayStartedAt:null,paidUntil:null,checkoutExpiresAt:new Date(Date.now()+600000).toISOString(),hold:false});
try{
 await page.goto(`${origin}/conta/anuncios`);await page.getByRole('button',{name:'Editar anúncio',exact:true}).click();
 await page.getByRole('button',{name:'Continuar para informações',exact:true}).click();
 // Contact was already verified and confirmed in the synthetic profile and listing.
 await page.getByRole('button',{name:'Salvar e continuar',exact:true}).click();
 await page.getByRole('heading',{name:'Cortesia para anunciar por 90 dias',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Seguir para pagamento de R$150',exact:true}).count(),0);
 await page.getByText('Você tem uma cortesia disponível. Cancele o pagamento pendente abaixo antes de usá-la.',{exact:false}).waitFor();
 assert.equal(await page.getByRole('link',{name:'Seguir para pagamento de R$150',exact:true}).count(),0);
 await page.getByRole('button',{name:'Cancelar pagamento pendente',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Cancelar pagamento',exact:true}).click();await page.getByRole('button',{name:'Publicar com cortesia de 90 dias',exact:true}).waitFor();

 const checkbox=page.getByTestId('publication-consent').getByRole('checkbox');await checkbox.check();
 assert(!/Aceito o pagamento único/.test(await page.getByTestId('publication-consent').innerText()));
 await page.getByRole('button',{name:'Publicar com cortesia de 90 dias',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Anúncio publicado com cortesia'}).waitFor();
 assert.equal(listings[0].status,'published');assert.equal(listings[0].feeStatus,'courtesy');assert(!billingRequests.some(r=>r.action==='checkout'));
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.getByRole('heading',{name:'Cortesia para anunciar por 90 dias',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:new URL('courtesy-published-mobile.png',artifacts).pathname});
 assert.equal(errors.length,0,errors.join('\n'));console.log('PASS partner journey: verified owner reviews, publishes with courtesy, no payment consent/checkout or provider navigation; mobile');
}finally{await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));}
