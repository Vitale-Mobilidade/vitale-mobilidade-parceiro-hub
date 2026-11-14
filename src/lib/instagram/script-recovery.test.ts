import { expect,it,vi } from 'vitest';
import { prepare,type Store,type Studio } from './workflow.server';
import { jobFixture } from './fixtures.test-support';
import { previewScript,previewSource } from './editorial-system.fixture';
import { normalizeFreshScript } from './normalize';
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
 expect(instagramErrorMessage('instagram_generation_failed','[{"code":"invalid_type"}]')).not.toMatch(/[[{]/);
 expect(instagramErrorMessage('instagram_script_uncertain_no_replay')).toMatch(/não será repetido/);
 expect(safeErrorCode('[{"x":1}]')).toBe('instagram_generation_failed');
});
