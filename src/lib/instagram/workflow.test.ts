import { expect,it,vi } from 'vitest';
import { prepare,publish,approvable,publicationFailureState,type Store,type Publisher } from './workflow.server';
import { renderSlide,containPhoto } from './render.server';
import { inspectJpeg } from '../../../supabase/functions/_shared/editorial-cover';
import { sourceFixture,scriptFixture,jobFixture } from './fixtures.test-support';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
function setup(){const job=jobFixture(),files=new Map<string,Uint8Array>();const store:Store={save:vi.fn(async()=>{}),upload:vi.fn(async(path,bytes)=>{files.set(path,bytes);}),download:vi.fn(async path=>{const file=files.get(path);if(!file)throw Error('missing');return file;}),photo:vi.fn(async()=>null)};return {job,files,store,ai:{script:vi.fn(async()=>structuredClone(scriptFixture)),scene:vi.fn(async()=>new Uint8Array())}};}
it('gera quatro JPEGs sRGB 1080×1350 com final fixo e fotos ausentes explícitas',async()=>{const f=setup();await prepare(f.job,f.store,f.ai);expect(f.job.state).toBe('review');expect(f.job.assets).toHaveLength(4);for(const bytes of f.files.values()){expect(inspectJpeg(bytes)).toEqual({width:1080,height:1350});expect(Buffer.from(bytes).includes(Buffer.from('Exif'))).toBe(true);}expect(f.job.assets[0].missingBikeIds).toEqual(['bike1']);expect(renderSlide(null).actions).toEqual(['Curta','Compartilhe','Comente','Salve']);expect(approvable(f.job)).toBe(true);await mkdir('/tmp/browser/instagram',{recursive:true});await writeFile('/tmp/browser/instagram/04-final.jpg',renderSlide(null).bytes);});
it('contém a foto inteira, incluindo os quatro cantos, sem crop',()=>{const out=new Uint8Array(1080*1350*4),p={width:2,height:1,buffer:Uint8Array.from([255,0,0,255,0,255,0,255])};const box=containPhoto(out,p,0,0,100,100);expect(box).toEqual({x:0,y:25,width:100,height:50});expect([...out.slice(25*1080*4,25*1080*4+3)]).toEqual([255,0,0]);expect([...out.slice((25*1080+99)*4,(25*1080+99)*4+3)]).toEqual([0,255,0]);});
it('retoma render sem nova cobrança de roteiro ou cenário',async()=>{const f=setup();await prepare(f.job,f.store,f.ai);await prepare(f.job,f.store,f.ai);expect(f.ai.script).toHaveBeenCalledTimes(1);expect(f.ai.scene).not.toHaveBeenCalled();expect(f.store.upload).toHaveBeenCalledTimes(4);});
it('resultado pago desconhecido não repete chamada',async()=>{const f=setup();f.job.script_attempted=true;await expect(prepare(f.job,f.store,f.ai)).rejects.toThrow('no_replay');expect(f.ai.script).not.toHaveBeenCalled();});
it('cenário do mesmo job é reutilizado uma vez e não repetido em slides',async()=>{const f=setup(),png=new Uint8Array(await readFile('supabase/functions/_shared/cover-renderer/fixture.png'));f.ai.scene.mockResolvedValue(png);f.ai.script.mockImplementation(async()=>{const s=structuredClone(scriptFixture);s.slides[1].scene='Ladeira vazia';return s;});await prepare(f.job,f.store,f.ai);f.job.assets=[];await prepare(f.job,f.store,f.ai);expect(f.ai.scene).toHaveBeenCalledTimes(1);});
it('cenário incerto permite concluir sem cenário, sem nova geração',async()=>{const f=setup();f.job.script=structuredClone(scriptFixture);f.job.script.slides[1].scene='Rua vazia';f.job.scene_attempted=true;await prepare(f.job,f.store,f.ai,true);expect(f.job.state).toBe('review');expect(f.ai.scene).not.toHaveBeenCalled();});
function publisher():Publisher{return {account:vi.fn(async()=> '12'),access:vi.fn(async()=>{}),child:vi.fn(async(_account,url)=>String(100+Number(url.split('/').at(-1)))),album:vi.fn(async()=> '200'),status:vi.fn(async()=> 'FINISHED'),publish:vi.fn(async()=> '300'),permalink:vi.fn(async()=> 'https://www.instagram.com/p/mock/')};}
it('proíbe envio sem aprovação da revisão',async()=>{const f=setup(),meta=publisher();await expect(publish(f.job,async()=>{},meta,i=>`https://approved/${i}`)).rejects.toThrow('approval_required');expect(meta.child).not.toHaveBeenCalled();});
it('cria itens e álbum na ordem e publica somente após aprovação',async()=>{const f=setup(),meta=publisher();await prepare(f.job,f.store,f.ai);f.job.state='approved';f.job.approved_revision=1;f.job.approved_by='admin';await publish(f.job,async()=>{},meta,i=>`https://approved/${i}`);expect(meta.album).toHaveBeenCalledWith('12',['101','102','103','104'],scriptFixture.caption);expect(f.job.state).toBe('published');await publish(f.job,async()=>{},meta,i=>`https://approved/${i}`);expect(meta.publish).toHaveBeenCalledTimes(1);});
it('timeout após media_publish exige reconciliação, nunca repost',async()=>{const f=setup(),meta=publisher();await prepare(f.job,f.store,f.ai);Object.assign(f.job,{state:'approved',approved_revision:1,approved_by:'admin'});vi.mocked(meta.publish).mockRejectedValue(Error('timeout'));await expect(publish(f.job,async()=>{},meta,i=>`https://approved/${i}`)).rejects.toThrow('timeout');expect(f.job.publish_attempted).toBe(true);await expect(publish(f.job,async()=>{},meta,i=>`https://approved/${i}`)).rejects.toThrow('reconcile_only');expect(meta.publish).toHaveBeenCalledTimes(1);});
it('permalink failure preserves confirmed publication and never reposts',async()=>{
 const f=setup(),meta=publisher();await prepare(f.job,f.store,f.ai);Object.assign(f.job,{state:'approved',approved_revision:1,approved_by:'admin'});
 vi.mocked(meta.permalink).mockRejectedValue(Error('lookup failed'));await publish(f.job,async()=>{},meta,i=>`https://approved/${i}`);
 expect(f.job.state).toBe('published');expect(f.job.media_id).toBe('300');expect(f.job.error_code).toBe('meta_permalink_pending');expect(publicationFailureState(f.job)).toBe('published');
 await publish(f.job,async()=>{},meta,i=>`https://approved/${i}`);expect(meta.publish).toHaveBeenCalledTimes(1);
});
it('never repeats the same photo within a carousel or after resume',async()=>{
 const f=setup();vi.mocked(f.store.photo).mockResolvedValue({width:1,height:1,buffer:Uint8Array.from([80,120,60,255])});
 await prepare(f.job,f.store,f.ai);expect(f.job.assets.flatMap(a=>a.photoHashes??[])).toHaveLength(1);
 f.job.assets=f.job.assets.slice(0,1);await prepare(f.job,f.store,f.ai);
 expect(f.job.assets.flatMap(a=>a.photoHashes??[])).toHaveLength(1);expect(f.ai.script).toHaveBeenCalledTimes(1);
});
it('JPEG scene checkpoint resumes without another paid request',async()=>{
 const f=setup();f.ai.scene.mockResolvedValue(renderSlide(null).bytes);f.ai.script.mockImplementation(async()=>{const s=structuredClone(scriptFixture);s.slides[1].scene='Rua vazia';return s;});
 await prepare(f.job,f.store,f.ai);expect(f.job.scene_path).toMatch(/scene.jpg$/);f.job.assets=[];await prepare(f.job,f.store,f.ai);expect(f.ai.scene).toHaveBeenCalledTimes(1);
 expect(f.store.upload).toHaveBeenCalledWith(f.job.scene_path,expect.any(Uint8Array),'image/jpeg');
});
