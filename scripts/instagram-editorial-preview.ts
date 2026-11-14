/** Offline same-Edge-compositor preview. Private sandbox files only; no AI, DB writes or Meta. */
import {decodePhoto,renderSlide} from '../supabase/functions/_shared/instagram-render/index.ts';
import {previewScript,previewSource} from '../src/lib/instagram/editorial-system.fixture.ts';
import {validateScript} from '../src/lib/instagram/contract.ts';
const dest=Deno.args[0]??'/tmp/instagram-system/review',sourcePath=Deno.args[1];
if(sourcePath){const source=JSON.parse(await Deno.readTextFile(sourcePath));previewSource.articleBlocks=source.blocks;previewSource.articleSummary=source.summary;previewSource.transcript=source.transcript;}
// The fixture's V9 name quote keeps its exact earlier excerpt. Resolve with existing source only.
const script=validateScript(structuredClone(previewScript),previewSource);
const photo=await decodePhoto(await Deno.readFile('src/assets/bikes/v9-max.jpg'));
const environment=await decodePhoto(await Deno.readFile('docs/preview/instagram-art-v3/environment.png'));
let context=null;
if(Deno.args[2])context=await decodePhoto(await Deno.readFile(Deno.args[2]));
await Deno.mkdir(dest,{recursive:true});const assets=[];
for(let i=0;i<=script.slides.length;i++){
 const t=performance.now();const rendered=renderSlide(script.slides[i]??null,i===0?[photo]:i===1&&context?[context]:[],i===0?environment:null,{artVersion:4,endingTitle:script.endingTitle,endingBody:script.endingBody,endingQuestion:script.endingQuestion});
 await Deno.writeFile(`${dest}/${String(i+1).padStart(2,'0')}.jpg`,rendered.bytes);
 const sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',rendered.bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
 assets.push({position:i+1,alt:script.slides[i]?.alt??'Veredito, pergunta contextual, ícones Lucide Curta, Comente, Salve e Compartilhe e @vitalemobilidade.',sha256,width:1080,height:1350,ms:Math.round(performance.now()-t)});
}
await Deno.writeTextFile(`${dest}/manifest.json`,JSON.stringify({title:script.topic,version:4,label:'Editorial System 1.0 · fixture · zero IA/Meta',assets},null,2));
console.log(JSON.stringify({assets,aiCalls:0,metaCalls:0}));