// Read-only local crawler smoke. Synthetic public RPC, no Auth, upload or sharing message.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
const id='00000000-0000-4000-8000-000000000781',cover='00000000-0000-4000-8000-000000000782';
const listing={id,title:'Bicicleta com capa compartilhada',brand:'Marca',model:'Modelo',priceCents:500000,city:'São Paulo',state:'SP',modelYear:2025,mileageKm:200,condition:'good',battery:'original',invoice:true,description:'Descrição sintética da bicicleta para conferir o compartilhamento no HTML do servidor.',maintenance:'',whatsappMessage:'',status:'published',feeCents:15000,feeStatus:'paid',displayExpiresAt:'2027-02-03T00:00:00Z',sellerType:'individual',publishedAt:'2026-11-05T00:00:00Z',updatedAt:'2026-11-05T00:00:00Z',sellerName:'Vendedor sintético',avatarPath:null,whatsapp:'5511999999999',images:[{id:cover,path:`${id}/listings/${id}/${cover}.webp`,position:0,status:'ready'}]};
const server=createServer(async(req,res)=>{for await(const _ of req){};res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(req.url.endsWith('/member_bike_listings_public')?{items:[listing],total:1}:[]));});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(54321,'127.0.0.1',resolve)});
try{
 for(const agent of ['WhatsApp/2.0','facebookexternalhit/1.1']){
  const response=await fetch(`http://127.0.0.1:4318/venda-sua-bike/${id}?foto=${cover}`,{headers:{'user-agent':agent}});
  assert.equal(response.status,200);const html=await response.text();const head=html.slice(0,html.indexOf('</head>'));
  const image=`https://vitalemobilidade.com/api/public/bike-image?id=${cover}`;
  assert(head.includes(`<meta property="og:image" content="${image}"`),'cover must be in SSR head');
  assert(head.includes(`<meta name="twitter:image" content="${image}"`),'Twitter uses same cover');
  assert(head.includes(`rel="canonical" href="https://vitalemobilidade.com/venda-sua-bike/${id}"`),'canonical excludes photo version');
  assert(head.length<300000,'head stays bounded for crawlers');
  assert(html.includes(listing.title),'listing title rendered without browser JS');
  assert(decodeURIComponent(html).includes(`?foto=${cover}`),'share action includes cover version');
  console.log(`PASS local ${agent}: SSR cover metadata, canonical and versioned share action; ${head.length} character head; no client JavaScript`);
 }
}finally{await new Promise(resolve=>server.close(resolve))}
