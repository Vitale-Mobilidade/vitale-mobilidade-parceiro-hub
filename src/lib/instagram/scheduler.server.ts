import { createDb,releaseEnabled } from './repository.server';
import { instagramAdmin } from './admin.server';
export async function verifyInstagramTick(request:Request,purpose:'instagram-discover'|'instagram-publish'){
 if(!await releaseEnabled())return null;
 const key=process.env.INSTAGRAM_SCHEDULER_SIGNING_KEY,owner=process.env.INSTAGRAM_SCHEDULER_OWNER_ID;
 const issued=request.headers.get('x-instagram-issued-at'),signature=request.headers.get('x-instagram-signature');
 if(!key||!owner||!issued||!/^\d{10}$/.test(issued)||!signature||! /^[a-f0-9]{64}$/.test(signature)||Math.abs(Date.now()/1000-Number(issued))>60)return null;
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const bytes=Uint8Array.from(signature.match(/../g)??[],s=>parseInt(s,16));
 if(!await crypto.subtle.verify('HMAC',material,bytes,new TextEncoder().encode(`${issued}:${purpose}`)))return null;
 const db=createDb(),membership=await db.from('editorial_admin_memberships').select('role,active').eq('user_id',owner).maybeSingle();
 if(membership.error||membership.data?.role!=='admin'||!membership.data.active)return null;
 return owner;
}
export async function instagramTick(request:Request){
 const owner=await verifyInstagramTick(request,'instagram-discover');
 if(!owner)return Response.json({error:'unauthorized'},{status:403});
 const db=createDb();
 // DB cursor + unique pair and CAS claim prevent replay/concurrent paid requests.
 const internal=new Request(request.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'discover'})});
 return instagramAdmin(internal,()=>db,owner);
}
