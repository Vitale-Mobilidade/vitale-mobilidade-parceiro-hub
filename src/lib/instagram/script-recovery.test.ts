import { expect,it,vi } from 'vitest';
import { prepare,type Store,type Studio } from './workflow.server';
import { jobFixture } from './fixtures.test-support';
import { previewScript,previewSource } from './editorial-system.fixture';
import { normalizeFreshScript,INTERNAL_ENDING_QUESTION } from './normalize';
import { validateScript } from './contract';
import { instagramErrorMessage,safeErrorCode } from './errors';
// Shape observed in the owner's capture of draft 0ff04355…: objects instead of arrays,
// scene missing, modules outside the enum and emphasis > 45 characters.
function screenshotShape(){
 const s=structuredClone(previewScript) as unknown as Record<string,any>;
 s.captionEvidence=s.captionEvidence[0];s.endingEvidence=s.endingEvidence[0];
 const mods=['performance','mechanics','usability','tradeoff','performance'];
 s.slides.forEach((slide:Record<string,any>,i:number)=>{slide.evidence=slide.evidence[0];delete slide.scene;if(i>0)slide.concept.module=mods[i-1];});
 s.slides[1].emphasis='A luz vem da própria bike e entra no conjunto elétrico inteiro';
 return s;
}
function setup(raw:()=>unknown=screenshotShape){
 const job=jobFixture();job.source=structuredClone(previewSource);job.state='blocked';
 const saves:any[]=[];const store:Store={save:vi.fn(async p=>{saves.push(p);}),download:vi.fn(async()=>new Uint8Array())};
 const studio={runtime:vi.fn(async()=>({release:true,ai:true,renderer:true})),script:vi.fn(async()=>raw()),scene:vi.fn(async()=>''),
  render:vi.fn(async(j:{id:string;revision:number},position:number)=>({position,path:`${j.id}/r${j.revision}/${String(position).padStart(2,'0')}.jpg`,sha256:'a'.repeat(64),alt:'alt',missingBikeIds:[],photoHashes:[]}))} satisfies Studio;
 return {job,store,studio,saves};
}
it('formato do screenshot é normalizado sem alterar textos/fatos e passa validação estrita',async()=>{
 const raw=screenshotShape(),n=normalizeFreshScript(raw) as any;
 expect(Array.isArray(n.captionEvidence)&&Array.isArray(n.endingEvidence)).toBe(true);
 expect(n.slides.every((s:any)=>s.scene===null&&Array.isArray(s.evidence))).toBe(true);
 expect(n.slides[1].emphasis).toBeUndefined();expect(n.slides.slice(1).every((s:any)=>s.concept.module==='decision')).toBe(true);
 expect(n.slides.map((s:any)=>[s.title,s.body,s.evidence[0].quote])).toEqual(raw.slides.map((s:any)=>[s.title,s.body,s.evidence.quote]));
 expect(()=>validateScript(raw,previewSource)).toThrow();
 const f=setup();await prepare(f.job,f.store,f.studio);expect(f.job.state).toBe('review');expect(f.studio.script).toHaveBeenCalledTimes(1);
});
it('evidência inválida continua bloqueada e libera somente nova tentativa explícita',async()=>{
 const f=setup(()=>{const s=screenshotShape();s.slides[1].evidence.quote='frase que não existe na transcrição';return s;});
 await expect(prepare(f.job,f.store,f.studio)).rejects.toThrow('instagram_script_rejected');
 expect(f.job).toMatchObject({state:'blocked',script:null,script_attempted:false,error_code:'instagram_script_rejected'});
 expect(f.job.error_message).not.toMatch(/[[{]/);expect(f.job.assets).toEqual([]);
 f.studio.script.mockImplementation(async()=>screenshotShape());await prepare(f.job,f.store,f.studio);
 expect(f.studio.script).toHaveBeenCalledTimes(2);expect(f.job.state).toBe('review');
});
it('objeto de evidência incompleto não é convertido',()=>{const s=screenshotShape();s.captionEvidence={quote:'x'};expect((normalizeFreshScript(s) as any).captionEvidence).toEqual({quote:'x'});});
it.each([undefined,'4'])('incidente sem versão ou string %s e CTA final: infere v4 e preserva fatos',async version=>{
 const raw=screenshotShape();if(version===undefined)delete raw.artVersion;else raw.artVersion=version;
 raw.endingQuestion='Saiba mais no link da Bio';
 // Reproduce the exact conditional failure before this fix (normalization otherwise succeeds).
 const before=normalizeFreshScript(screenshotShape()) as any;delete before.artVersion;before.endingQuestion=raw.endingQuestion;
 expect(()=>validateScript(before,previewSource)).toThrow('instagram_ending_question_invalid');
 const n=normalizeFreshScript(raw) as any;
 expect(n.artVersion).toBe(4);expect(n.endingQuestion).toBe(INTERNAL_ENDING_QUESTION);
 expect(n.endingTitle).toBe(raw.endingTitle);expect(n.endingBody).toBe(raw.endingBody);
 expect(n.endingEvidence).toEqual([raw.endingEvidence]);
 expect(n.slides.map((s:any)=>[s.title,s.body,s.evidence])).toEqual(raw.slides.map((s:any)=>[s.title,s.body,[s.evidence]]));
 const f=setup(()=>raw);await prepare(f.job,f.store,f.studio);expect(f.job.state).toBe('review');expect(f.studio.script).toHaveBeenCalledTimes(1);
});
it.each([undefined,'','   ','x'.repeat(101),'https://example.com','Acesse o site','Leia o artigo','Ouça o podcast'])('v4: pergunta ausente/insegura %s recebe fallback não factual',question=>{
 const s=screenshotShape();s.endingQuestion=question;const n=normalizeFreshScript(s) as any;
 expect(n.endingQuestion).toBe('Qual é a sua dúvida?');expect(()=>validateScript(n,previewSource)).not.toThrow();
});
it('pergunta interna segura é preservada inclusive na inferência sem versão',()=>{
 const before=normalizeFreshScript(screenshotShape()) as any;delete before.artVersion;
 expect(()=>validateScript(before,previewSource)).toThrow('instagram_ending_question_invalid');
 const s=screenshotShape();delete s.artVersion;const n=normalizeFreshScript(s) as any;
 expect(n.endingQuestion).toBe(previewScript.endingQuestion);expect(()=>validateScript(n,previewSource)).not.toThrow();
});
it('não infere versões explícitas erradas/legadas ou estrutura ambígua',()=>{
 for(const version of [1,2,3,5,'3','04',null]){const s=screenshotShape();s.artVersion=version;s.endingQuestion='Acesse o site';const n=normalizeFreshScript(s) as any;expect(n.artVersion).toBe(version);expect(n.endingQuestion).toBe(s.endingQuestion);}
 for(const missing of ['master','verdict']){const s=screenshotShape();delete s.artVersion;if(missing==='master')delete s.slides[2].master;else delete s.endingBody;expect((normalizeFreshScript(s) as any).artVersion).toBeUndefined();}
});
it('fallback final não autoriza outro CTA nem evidência inválida',()=>{
 const s=screenshotShape();delete s.artVersion;s.endingQuestion='Acesse o site';s.slides[1].body+=' Leia o artigo';
 expect(()=>validateScript(normalizeFreshScript(s),previewSource)).toThrow('instagram_external_cta');
 const bad=screenshotShape();delete bad.artVersion;bad.endingQuestion='Acesse o site';bad.endingEvidence.quote='uma evidência inventada';
 expect(()=>validateScript(normalizeFreshScript(bad),previewSource)).toThrow('instagram_evidence_invalid');
});
it('normalização não toca versões antigas: módulo desconhecido v3 permanece',()=>{const s:any=screenshotShape();s.artVersion=3;expect((normalizeFreshScript(s) as any).slides[1].concept.module).toBe('performance');});
it('falha ao gravar a rejeição não habilita retry',async()=>{
 const f=setup(()=>({topic:'x'}));vi.mocked(f.store.save).mockImplementation(async p=>{if(p.error_code==='instagram_script_rejected')throw Error('instagram_save_failed');});
 await expect(prepare(f.job,f.store,f.studio)).rejects.toThrow('instagram_save_failed');expect(f.job.script_attempted).toBe(true);
 await expect(prepare(f.job,f.store,f.studio)).rejects.toThrow('instagram_script_uncertain_no_replay');expect(f.studio.script).toHaveBeenCalledTimes(1);
});
it('timeout/transporte ou retorno incompleto nunca repete',async()=>{
 for(const code of ['instagram_edge_unreachable','ai_empty_response']){const f=setup();f.studio.script.mockRejectedValue(Error(code));
  await expect(prepare(f.job,f.store,f.studio)).rejects.toThrow(code);expect(f.job.script_attempted).toBe(true);
  await expect(prepare(f.job,f.store,f.studio)).rejects.toThrow('no_replay');expect(f.studio.script).toHaveBeenCalledTimes(1);}
});
it('novo roteiro proibido se já existe arte, cenário ou publicação',async()=>{const f=setup();f.job.scene_attempted=true;await expect(prepare(f.job,f.store,f.studio)).rejects.toThrow('retry_unsafe');expect(f.studio.script).not.toHaveBeenCalled();});
it('concluir sem cenário sem roteiro não marca omissão',async()=>{const f=setup(()=>({}));await expect(prepare(f.job,f.store,f.studio,true)).rejects.toThrow();expect(f.saves.some(p=>p.scene_omitted)).toBe(false);});
it('UX: nunca mostra JSON cru e usa português',()=>{
 const old='Roteiro recebido e reprovado na validação (instagram_ending_question_invalid). Use Retomar para pedir um novo roteiro.';
 expect(instagramErrorMessage('instagram_script_rejected',old)).toContain('pergunta final tem versão incompatível ou convite externo');
 expect(instagramErrorMessage('instagram_script_rejected',old)).toContain('Use Retomar');
 expect(instagramErrorMessage('instagram_script_rejected','[{"payload":"segredo"}]')).not.toContain('segredo');
 expect(instagramErrorMessage('instagram_generation_failed','[{"code":"invalid_type"}]')).not.toMatch(/[[{]/);
 expect(instagramErrorMessage('instagram_script_uncertain_no_replay')).toMatch(/não será repetido/);
 expect(safeErrorCode('[{"x":1}]')).toBe('instagram_generation_failed');
});
