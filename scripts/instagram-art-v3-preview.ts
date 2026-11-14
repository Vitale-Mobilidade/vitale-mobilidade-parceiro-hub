/** Offline deterministic export: only local verified assets, no job, DB, Gemini or Meta. */
import { decodePhoto,renderSlide } from '../supabase/functions/_shared/instagram-render/index.ts';
import { previewScript,previewSource } from '../src/lib/instagram/art-v3.fixture.ts';
import { validateScript } from '../src/lib/instagram/contract.ts';
const input=Deno.args[0]??'src/assets/bikes/v9-max.jpg',destination=Deno.args[1]??'docs/preview/instagram-art-v3';
const environment=Deno.args[2]?await decodePhoto(await Deno.readFile(Deno.args[2])):null;
validateScript(structuredClone(previewScript),previewSource);
await Deno.mkdir(destination,{recursive:true});
const photo=await decodePhoto(await Deno.readFile(input));
const ms:number[]=[];
renderSlide(null,[],null,{artVersion:3}); // warm cached font once
for(let i=0;i<=previewScript.slides.length;i++){
 const t=performance.now();
 const rendered=renderSlide(previewScript.slides[i]??null,i===0?[photo]:[],i===0?environment:null,{artVersion:3,endingQuestion:previewScript.endingQuestion});
 ms.push(Math.round(performance.now()-t));
 await Deno.writeFile(`${destination}/${String(i+1).padStart(2,'0')}.jpg`,rendered.bytes);
}
console.log(JSON.stringify({dimensions:[1080,1350],slides:6,ms,aiCalls:0,environment:!!environment}));