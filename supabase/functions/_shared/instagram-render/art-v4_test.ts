import {assert,assertEquals} from 'jsr:@std/assert@1';
import {decodePhoto,renderSlide} from './index.ts';
import {previewScript} from '../../../../src/lib/instagram/editorial-system.fixture.ts';
import {EDITORIAL_SYSTEM as S} from './editorial-system.ts';
Deno.test('fixed v4 masters render six JPEGs within CPU guard and preserve v1–v3',async()=>{
 const photo=await decodePhoto(await Deno.readFile(new URL('../../../../src/assets/bikes/v9-max.jpg',import.meta.url)));
 const before=[renderSlide(null).bytes,renderSlide(null,[],null,{artVersion:2}).bytes,renderSlide(null,[],null,{artVersion:3}).bytes];
 for(let i=0;i<=previewScript.slides.length;i++){const t=performance.now(),r=renderSlide(previewScript.slides[i]??null,i===0?[photo]:[],null,{artVersion:4,endingTitle:previewScript.endingTitle,endingBody:previewScript.endingBody,endingQuestion:previewScript.endingQuestion});assert(performance.now()-t<1000);assertEquals([r.width,r.height],[1080,1350]);if(i===5)assertEquals(r.actions,[...S.actions]);}
 assertEquals(renderSlide(null).bytes,before[0]);assertEquals(renderSlide(null,[],null,{artVersion:2}).bytes,before[1]);assertEquals(renderSlide(null,[],null,{artVersion:3}).bytes,before[2]);
 assertEquals(S.margin,64);assertEquals(S.cardRadius,24);assertEquals(S.type.support,42);
});