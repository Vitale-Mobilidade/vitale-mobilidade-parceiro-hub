import {authorize,createDb} from './repository.server';
import {hash} from './contract';
export async function privatePostPreview(request:Request,dbFactory=createDb,allowed=import.meta.env.DEV){
 const headers={'Cache-Control':'private, no-store','Vary':'Authorization','X-Robots-Tag':'noindex, nofollow'};
 if(!allowed)return new Response(null,{status:404,headers});
 if(!request.headers.get('Authorization')?.startsWith('Bearer '))return new Response(null,{status:401,headers});
 try{if(!await authorize(request,dbFactory()))return new Response(null,{status:403,headers});
  const {readFile}=await import('node:fs/promises');const root='/tmp/instagram-single-post/review',manifest=JSON.parse(await readFile(`${root}/manifest.json`,'utf8')),bytes=await readFile(`${root}/01.jpg`);
  if(await hash(bytes)!==manifest.sha256)throw Error('integrity');return new Response(bytes,{headers:{...headers,'Content-Type':'image/jpeg'}});
 }catch{return new Response(null,{status:404,headers});}
}