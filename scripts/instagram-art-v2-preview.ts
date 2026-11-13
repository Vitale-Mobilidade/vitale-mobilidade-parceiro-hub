/** Sandbox only. Input is the read-only catalog photo; no DB, upload, Edge invocation or AI. */
import { decodePhoto,renderSlide } from '../supabase/functions/_shared/instagram-render/index.ts';
import { previewScript } from '../src/lib/instagram/art-v2.fixture.ts';
const input=Deno.args[0],destination=Deno.args[1]??'/tmp/instagram-v2/rendered';
if(!input)throw Error('Provide a verified local catalog photo');
await Deno.mkdir(destination,{recursive:true});
const photo=await decodePhoto(await Deno.readFile(input));
const ms:number[]=[];
for(let i=0;i<=previewScript.slides.length;i++){
 const slide=previewScript.slides[i]??null,t=performance.now();
 const rendered=renderSlide(slide,i===0?[photo]:[],null,{artVersion:2});ms.push(Math.round(performance.now()-t));
 await Deno.writeFile(`${destination}/${String(i+1).padStart(2,'0')}.jpg`,rendered.bytes);
}
console.log(JSON.stringify({photo:{width:photo.width,height:photo.height},slides:6,dimensions:[1080,1350],ms,totalMs:ms.reduce((a,b)=>a+b,0),aiCalls:0}));