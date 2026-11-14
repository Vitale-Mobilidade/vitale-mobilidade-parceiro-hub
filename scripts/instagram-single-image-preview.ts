/** Offline real stored editorial source only; no network, AI, Storage or jobs. */
import {composeFullBleedCover} from '../supabase/functions/_shared/cover-renderer/index.ts';
const input=Deno.args[0],root=Deno.args[1]??'/tmp/instagram-system/review';
if(!input)throw Error('original_required');
const bytes=await Deno.readFile(input),title='Nova Caloi Mobylette: o lançamento justificava a oportunidade de compra?';
const evidence={focus:{x:.5,y:.5},subjects:[{left:.335,top:.24,right:.67,bottom:.755}]};
await Deno.mkdir(root,{recursive:true});const assets=[];
for(const [i,format] of (['article','podcast','instagram'] as const).entries()){
 const out=await composeFullBleedCover({bytes,mime:'image/png'},title,format,evidence);
 const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',out.bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
 await Deno.writeFile(`${root}/${String(i+1).padStart(2,'0')}.jpg`,out.bytes);assets.push({position:i+1,format,sha256});
}
await Deno.writeTextFile(`${root}/manifest.json`,JSON.stringify({kind:'single-image-v5',title,sourceVideoId:'Mi6l7WhLdT4',sourceArticleId:'b3ab69be-7eb1-4f94-9ac6-4619fb6942d4',sourcePath:'b3ab69be-7eb1-4f94-9ac6-4619fb6942d4/backgrounds/8ce9cdc3-9a4d-41ab-b4a1-e34f9bd335a9.png',aiCalls:0,assets}));
console.log(JSON.stringify({assets,aiCalls:0}));