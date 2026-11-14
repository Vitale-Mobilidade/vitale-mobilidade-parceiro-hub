import {expect,it,vi} from 'vitest';
import {validateScript} from './contract';
import {previewScript,previewSource} from './editorial-system.fixture';
import {previewScript as old2,previewSource as oldSource} from './art-v2.fixture';
import {previewScript as old3} from './art-v3.fixture';
import {gateway} from '../../../supabase/functions/_shared/instagram-gateway';
import {EDITORIAL_SYSTEM} from '../../../supabase/functions/_shared/instagram-render/editorial-system';
import {articleCoverParts} from '../../../supabase/functions/_shared/instagram-render/provenance';
it('accepts six progressive assets and leaves v2/v3 saved scripts unchanged',()=>{
 expect(validateScript(structuredClone(previewScript),previewSource).slides).toHaveLength(5);
 expect(validateScript(structuredClone(old2),oldSource).artVersion).toBe(2);expect(validateScript(structuredClone(old3),oldSource).artVersion).toBe(3);
});
it('enforces five to seven total assets and final grounded verdict',()=>{
 const s=structuredClone(previewScript);s.slides=s.slides.slice(0,3);s.slides[2].layout='conclusion';expect(()=>validateScript(s,previewSource)).toThrow('slide_count');
 const v=structuredClone(previewScript);delete v.endingEvidence;expect(()=>validateScript(v,previewSource)).toThrow('verdict_required');
});
it('requires full article and never treats article evidence as test measurement',()=>{
 expect(()=>validateScript(previewScript,{...previewSource,articleBlocks:[]})).toThrow('full_article_required');
 const s=structuredClone(previewScript);s.slides[1].evidence=[{claim:'se alimentam',quote:'energia da própria bateria',origin:'article',blockIndex:0,kind:'measurement'}];expect(()=>validateScript(s,previewSource)).toThrow('article_not_test');
});
it('enforces equivalent comparison cards and final-only signature',()=>{
 const s=structuredClone(previewScript);s.slides[3].cards?.pop();expect(()=>validateScript(s,previewSource)).toThrow('comparison_symmetry');
 const v=structuredClone(previewScript);v.slides[1].body+=' @vitalemobilidade';expect(()=>validateScript(v,previewSource)).toThrow('signature_only_final');
 expect(EDITORIAL_SYSTEM.actions).toEqual(['Curta','Comente','Salve','Compartilhe']);
});
it('rejects card content not in grounded development and unsupported divergence',()=>{
 const s=structuredClone(previewScript);const c=s.slides[3].cards?.[0];if(!c)throw Error('fixture');c.text='200 km de alcance';expect(()=>validateScript(s,previewSource)).toThrow('card_unsupported');
 const v=structuredClone(previewScript);v.divergences=[{articleQuote:'missing',transcriptQuote:'missing',resolution:'Ignore'}];expect(()=>validateScript(v,previewSource)).toThrow('divergence_invalid');
});
it('script mock receives complete article blocks and exact existing script model',async()=>{
 let payload:any;const send=vi.fn(async(_url:unknown,init:RequestInit)=>{payload=JSON.parse(String(init.body));return new Response('data: '+JSON.stringify({choices:[{delta:{content:JSON.stringify(previewScript)},finish_reason:'stop'}]})+'\n\n');});
 await gateway('mock',undefined,send as typeof fetch).script(previewSource);
 expect(payload.model).toBe('google/gemini-3.8-flash');expect(JSON.parse(payload.messages[1].content).articleContext.blocks).toEqual(previewSource.articleBlocks);expect(send).toHaveBeenCalledTimes(1);
});
it('cover mock preserves model/thumb/catalog and separately labels published cover',async()=>{
 let payload:any;const send=vi.fn(async(_url:unknown,init:RequestInit)=>{payload=JSON.parse(String(init.body));return new Response('data: {"type":"image_generation.completed","b64_json":"AQID"}\n\n');});
 const refs=[{type:'text',text:'Official catalog'},{type:'image_url',image_url:{url:'data:image/png;base64,AQ=='}}],cover=[{type:'text',text:'Published article cover: visual only'},{type:'image_url',image_url:{url:'data:image/jpeg;base64,Ag=='}}];
 await gateway('mock',undefined,send as typeof fetch).cover('T','C',new Uint8Array([3]),refs,cover);
 expect(payload.model).toBe('google/gemini-3.1-flash-image');expect(payload.messages[0].content.slice(2)).toEqual([...refs,...cover]);expect(payload.messages[0].content[0].text).toContain('ENVIRONMENT ONLY');expect(send).toHaveBeenCalledTimes(1);
});
it('article cover accepts exact internal linked asset only',()=>{
 const id=previewSource.articleId,file='c0c53e98-ce3e-4a23-bdd6-7fd808dec83e',query=`?type=editorial-cover&id=${id}&file=${file}`;
 expect(articleCoverParts(id,`https://ipectfejftfcikvozoyu.supabase.co/functions/v1/bike-image${query}`)).toBe(`${id}/${file}.jpg`);
 expect(articleCoverParts(id,`https://evil.invalid/functions/v1/bike-image${query}`)).toBeNull();
});