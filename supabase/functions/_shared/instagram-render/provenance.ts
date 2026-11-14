/** Association alone is insufficient: only explicit catalog-reference identity proof can unlock an original. */
export function articleCoverParts(articleId:string,url:unknown):string|null{
 if(typeof url!=='string'||!/^https:\/\//.test(url))return null;
 try{const u=new URL(url);if(u.hostname!=='ipectfejftfcikvozoyu.supabase.co'||u.pathname!=='/functions/v1/bike-image'||u.searchParams.get('type')!=='editorial-cover')return null;const id=u.searchParams.get('id'),file=u.searchParams.get('file');if(id===articleId&&file&&/^[a-f0-9-]{36}$/.test(file))return `${articleId}/${file}.jpg`;const path=u.searchParams.get('path');if(!path||!new RegExp(`^${articleId}/[a-f0-9-]+\\.(jpg|png|webp)$`).test(path))return null;return path;}catch{return null;}
}
export function trustedArticleOriginal(articleId:string,bikeId:string,background:unknown):string|null{
 if(!background||typeof background!=='object')return null;
 const b=background as Record<string,unknown>,proof=b.identityProof as Record<string,unknown>|undefined;
 if(typeof b.path!=='string'||!new RegExp(`^${articleId}/backgrounds/[a-f0-9-]+\\.(png|jpg|webp)$`).test(b.path))return null;
 if(!proof||proof.bikeId!==bikeId||proof.verified!==true||proof.method!=='catalog_reference'||typeof proof.catalogSha256!=='string'||!/^([a-f0-9]{64})$/.test(proof.catalogSha256))return null;
 return b.path;
}