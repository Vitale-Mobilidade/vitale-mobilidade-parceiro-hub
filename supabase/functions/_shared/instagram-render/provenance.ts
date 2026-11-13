/** Association alone is insufficient: only explicit catalog-reference identity proof can unlock an original. */
export function trustedArticleOriginal(articleId:string,bikeId:string,background:unknown):string|null{
 if(!background||typeof background!=='object')return null;
 const b=background as Record<string,unknown>,proof=b.identityProof as Record<string,unknown>|undefined;
 if(typeof b.path!=='string'||!new RegExp(`^${articleId}/backgrounds/[a-f0-9-]+\\.(png|jpg|webp)$`).test(b.path))return null;
 if(!proof||proof.bikeId!==bikeId||proof.verified!==true||proof.method!=='catalog_reference'||typeof proof.catalogSha256!=='string'||!/^([a-f0-9]{64})$/.test(proof.catalogSha256))return null;
 return b.path;
}