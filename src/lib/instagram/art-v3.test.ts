import {expect,it,vi} from 'vitest';
import {coverPayload,catalogCoverParts,validatedCoverReference} from '../../../supabase/functions/_shared/editorial-cover-payload';
import {COVER_PROMPT} from '../../../supabase/functions/_shared/editorial-cover';
import {gateway} from '../../../supabase/functions/_shared/instagram-gateway';
import {validateScript} from './contract';
import {previewScript,previewSource} from './art-v3.fixture';
it('shared article payload preserves exact model, direction, input order and non-streaming default',()=>{
 const thumb=new Uint8Array([1,2,3]),refs=catalogCoverParts('bike','Official',true,new Uint8Array([4,5,6]),'image/webp');
 expect(coverPayload('Title','Context',thumb,refs)).toEqual({model:'google/gemini-3.1-flash-image',modalities:['image','text'],messages:[{role:'user',content:[{type:'text',text:`${COVER_PROMPT}\n<untrusted_editorial_subject>{"title":"Title","summary":"Context"}</untrusted_editorial_subject>`},{type:'image_url',image_url:{url:'data:image/jpeg;base64,AQID'}},...refs]}]});
});
it('Instagram cover mock uses exact shared model, thumbnail and official catalog with portrait environment-only direction',async()=>{
 let payload:ReturnType<typeof coverPayload>|undefined;
 const send=vi.fn(async(_url:unknown,init:RequestInit)=>{payload=JSON.parse(String(init.body));return new Response('data: {"type":"image_generation.completed","b64_json":"AQID"}\n\n');});
 const refs=catalogCoverParts('bike','Official',true,new Uint8Array([4]),'image/png');
 expect(await gateway('mock',undefined,send as typeof fetch).cover('Test','Night',new Uint8Array([1]),refs)).toEqual(new Uint8Array([1,2,3]));
 expect(send).toHaveBeenCalledTimes(1);expect(payload?.model).toBe('google/gemini-3.1-flash-image');expect(payload?.image_config).toEqual({aspect_ratio:'4:5'});
 expect(payload?.messages[0].content.slice(1)).toEqual([{type:'image_url',image_url:{url:'data:image/jpeg;base64,AQ=='}},...refs]);
 const prompt=payload?.messages[0].content[0].text;expect(prompt).toContain('ENVIRONMENT ONLY');expect(prompt).toContain('NO text');expect(prompt).toContain('never redraw or duplicate');
});
it('thumbnail resolution rejects external and other-video references',async()=>{
 const resolve=vi.fn(async()=>({url:'https://i.ytimg.com/vi/XXXXXXXXXXX/maxresdefault.jpg'}));
 expect(await validatedCoverReference('AHHPeeQE11k','https://external.invalid/image.jpg',resolve)).toBeNull();
 expect(await validatedCoverReference('AHHPeeQE11k','https://i.ytimg.com/vi/AHHPeeQE11k/maxresdefault.jpg',resolve)).toBe('https://i.ytimg.com/vi/AHHPeeQE11k/maxresdefault.jpg');expect(resolve).toHaveBeenCalledTimes(1);
});
it('v3 validates five explanatory slides and a topic question',()=>{
 const s=validateScript(structuredClone(previewScript),previewSource);expect(s.slides).toHaveLength(5);expect(s.artVersion).toBe(3);
 for(const slide of s.slides.slice(1))expect(slide.body.split(/\s+/).length).toBeGreaterThanOrEqual(30);
});
it('annotations cannot introduce unsupported content or external ending CTA',()=>{
 const s=structuredClone(previewScript);const note=s.slides[1]?.concept?.annotations?.[0];if(!note)throw Error('missing fixture annotation');note.text='Luz com 200 metros de alcance';expect(()=>validateScript(s,previewSource)).toThrow('annotation_unsupported');
 s.slides[1]=structuredClone(previewScript.slides[1]);s.endingQuestion='Acesse o site';expect(()=>validateScript(s,previewSource)).toThrow('ending_question_invalid');
});
it('v3 accepts useful short support instead of requiring a blind 30-word minimum',()=>{
 const s=structuredClone(previewScript);s.slides[1].body='se alimentam da própria bateria';s.slides[1].concept={module:'beam',intent:'Grounded short finding'};s.slides[1].evidence=s.slides[1].evidence.slice(0,1);expect(validateScript(s,previewSource).slides[1].body).toBe('se alimentam da própria bateria');
});