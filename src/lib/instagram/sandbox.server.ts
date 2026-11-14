/** Development files are outside Git/runtime assets. Existing admin auth is mandatory.
 * No generation, upload, approval or publishing is available from this endpoint. */
import {authorize,createDb} from './repository.server';
const headers={'Cache-Control':'private, no-store','Vary':'Authorization','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'};
export async function instagramSandbox(request:Request,dbFactory=createDb,allowed=import.meta.env.DEV){
 if(!allowed)return Response.json({error:'sandbox_not_available'},{status:404,headers});
 if(!request.headers.get('Authorization')?.match(/^Bearer .+$/))return Response.json({error:'authentication_required'},{status:401,headers});
 try{
  if(!await authorize(request,dbFactory()))return Response.json({error:'admin_required'},{status:403,headers});
  const url=new URL(request.url),position=url.searchParams.get('position');
  if(position&&!/^[1-7]$/.test(position))return Response.json({error:'invalid_position'},{status:400,headers});
  const {readFile}=await import('node:fs/promises');const root=process.env.INSTAGRAM_SANDBOX_DIRECTORY??'/tmp/instagram-system/review';
  const manifest=JSON.parse(await readFile(`${root}/manifest.json`,'utf8'));
  if(!position)return Response.json(manifest,{headers});
  const asset=manifest.assets.find((a:{position:number})=>a.position===Number(position));if(!asset)return new Response(null,{status:404,headers});
  const bytes=await readFile(`${root}/${position.padStart(2,'0')}.jpg`);
  const {hash}=await import('./contract');if(await hash(bytes)!==asset.sha256)return Response.json({error:'sandbox_integrity_failed'},{status:409,headers});
  return new Response(bytes,{headers:{...headers,'Content-Type':'image/jpeg'}});
 }catch{return Response.json({error:'sandbox_art_unavailable'},{status:404,headers});}
}