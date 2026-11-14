import {assert,assertEquals} from 'jsr:@std/assert@1';
import {decodePhoto,renderSlide} from './index.ts';
import {previewScript} from '../../../../src/lib/instagram/art-v3.fixture.ts';
import {renderArtV3,catalogCutout} from './art-v3.ts';
import {containPhoto} from './index.ts';
Deno.test('six v3 JPEGs stay within per-slide sandbox guard and leave v1/v2 deterministic',async()=>{
 const photo=await decodePhoto(await Deno.readFile(new URL('../../../../src/assets/bikes/v9-max.jpg',import.meta.url)));
 const old=renderSlide(null).bytes,old2=renderSlide(null,[],null,{artVersion:2}).bytes;
 renderSlide(null,[],null,{artVersion:3});
 for(let i=0;i<=previewScript.slides.length;i++){
  const t=performance.now();const r=renderSlide(previewScript.slides[i]??null,i===0?[photo]:[],null,{artVersion:3,endingQuestion:previewScript.endingQuestion});
  assert(performance.now()-t<1000,'per-slide budget exceeded');assertEquals([r.width,r.height],[1080,1350]);
  if(i===5)assertEquals(r.actions,['Curta','Compartilhe','Comente','Salve']);
 }
 assertEquals(renderSlide(null).bytes,old);assertEquals(renderSlide(null,[],null,{artVersion:2}).bytes,old2);
 const cut=catalogCutout(photo);assertEquals([cut.width,cut.height],[photo.width,photo.height]);
 const s=structuredClone(previewScript.slides[1]);s.title='Outro teste';s.body='Achado da fonte.';s.concept={module:'beam',intent:'Another source',annotations:[{label:'ACHADO',text:s.body}]};
 const result=renderArtV3(s,[],null,containPhoto);assertEquals(result.length,1080*1350*4);
});