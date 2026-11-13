import { readFile } from 'node:fs/promises';
import { expect,it } from 'vitest';
import { decodePhoto,photoFormat,containPhoto,slideGeometry,renderSlide } from './render.server';
import { scriptFixture } from './fixtures.test-support';

it('decodes a real catalog WebP with its complete dimensions despite stale MIME',async()=>{
 const bytes=new Uint8Array(await readFile('src/assets/bikes/v20-ultra-landing.webp'));
 expect(photoFormat(bytes)).toBe('image/webp');
 const p=await decodePhoto(bytes,'image/jpeg');
 expect(p.width).toBe(600);expect(p.height).toBe(600);
 expect(p.buffer.length).toBe(600*600*4);
 const out=new Uint8Array(1080*1350*4);expect(containPhoto(out,p,0,0,600,800)).toEqual({x:0,y:100,width:600,height:600});
 for(const [x,y] of [[0,0],[599,0],[0,599],[599,599]]){
  const from=(y*p.width+x)*4,to=((y+100)*1080+x)*4;
  for(let c=0;c<3;c++)expect(out[to+c]).toBe(Math.trunc(p.buffer[from+c]*p.buffer[from+3]/255));
 }
});
it('rejects oversized files before decoding',async()=>{await expect(decodePhoto(new Uint8Array(12*1024*1024+1))).rejects.toThrow('too_large');});
it('rejects oversized PNG dimensions before allocation',async()=>{
 const b=new Uint8Array(24);b.set([137,80,78,71,13,10,26,10]);const v=new DataView(b.buffer);v.setUint32(16,10000);v.setUint32(20,10000);
 await expect(decodePhoto(b)).rejects.toThrow('dimensions');
});
it('rejects oversized WebP dimensions before decoder allocation',async()=>{
 const b=new Uint8Array(await readFile('src/assets/bikes/v20-ultra-landing.webp'));
 const p=Buffer.from(b).indexOf('VP8 ')+8;new DataView(b.buffer).setUint16(p+6,10000,true);
 await expect(decodePhoto(b)).rejects.toThrow('dimensions');
});
it('detects real JPEG and PNG scene formats independently of declared MIME',async()=>{
 const jpg=renderSlide(null).bytes,png=new Uint8Array(await readFile('supabase/functions/_shared/cover-renderer/fixture.png'));
 expect(photoFormat(jpg)).toBe('image/jpeg');expect((await decodePhoto(jpg,'image/png')).width).toBe(1080);
 expect(photoFormat(png)).toBe('image/png');expect((await decodePhoto(png,'image/jpeg')).width).toBeGreaterThan(0);
});
it('varies layout geometry by topic without changing final actions',()=>{
 expect(slideGeometry('opening',true)).not.toEqual(slideGeometry('numbers',true));
 expect(slideGeometry('conclusion',true)).not.toEqual(slideGeometry('review',true));
 for(const theme of ['petroleum','deep','light'] as const){expect(renderSlide({...scriptFixture.slides[0],theme}).actions).toEqual([]);}
 expect(renderSlide(null).actions).toEqual(['Curta','Compartilhe','Comente','Salve']);
});