// Targeted local browser test of native and Safari-compatible WebP optimization.
import assert from 'node:assert/strict';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.MEMBER_TEST_ORIGIN || 'http://127.0.0.1:4318';
assert.equal(new URL(origin).hostname, '127.0.0.1');
for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await engine.launch({ headless: true, ...(name === 'chromium' ? { channel: 'chrome' } : {}) });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors=[], external=[];let wasmRequests=0;
  page.on('pageerror', e=>errors.push(e.message));
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) {external.push(url.origin);return route.abort();}
    if (url.pathname === '/tests/member-image.html') return route.fulfill({contentType:'text/html',body:'<!doctype html><script type="module" src="/tests/member-image.fixture.ts"></script>'});
    if (url.pathname.includes('.wasm')) wasmRequests++;
    return route.continue();
  });
  try {
    await page.goto(`${origin}/tests/member-image.html`);
    await page.waitForFunction(()=>typeof window.prepareTestImage==='function');
    const result = await page.evaluate(async () => {
      const prepare = window.prepareTestImage;
      const canvas=document.createElement('canvas');canvas.width=4000;canvas.height=3000;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#219653';ctx.fillRect(0,0,4000,3000);ctx.fillStyle='#11332d';ctx.fillRect(2000,0,2000,3000);
      const original=await new Promise(r=>canvas.toBlob(r,'image/jpeg',0.95));
      const jpegBytes=new Uint8Array(await original.arrayBuffer());
      const orientation6=new Uint8Array([255,225,0,34,69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,6,0,0,0,0,0,0,0]);
      const rotatedFile=new File([jpegBytes.slice(0,2),orientation6,jpegBytes.slice(2)],'portrait.jpg',{type:'image/jpeg'});
      const nativeProbe=await new Promise(r=>canvas.toBlob(r,'image/webp',0.82));
      // Valid camera-sized JPEG exactly at the accepted boundary. Its trailing bytes
      // include a marker that must never be copied into the published image.
      const marker=new TextEncoder().encode('PRIVATE-ORIGINAL-METADATA');
      const large=new File([original,marker,new Uint8Array(15*1024*1024-original.size-marker.length)],'camera.jpg',{type:'image/jpeg'});
      const describe=async blob=>{
        const bytes=new Uint8Array(await blob.arrayBuffer());
        const image=new Image();const url=URL.createObjectURL(blob);image.src=url;await image.decode();
        const dimensions=[image.naturalWidth,image.naturalHeight];URL.revokeObjectURL(url);
        return {type:blob.type,size:blob.size,magic:String.fromCharCode(...bytes.slice(0,4),...bytes.slice(8,12)),dimensions,hasOriginalMarker:new TextDecoder().decode(bytes).includes('PRIVATE-ORIGINAL-METADATA')};
      };
      const native=await describe(await prepare(large));
      const nativeWasmLoads=performance.getEntriesByType('resource').filter(r=>r.name.includes('.wasm')).length;
      let adaptive;
      if(nativeProbe.type==='image/webp') {
        const normalToBlob=HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob=function(cb,type,q){
          return normalToBlob.call(this,blob=>cb(type==='image/webp' && this.width===1600 ? new Blob([blob,new Uint8Array(2*1024*1024)],{type:blob.type}):blob),type,q);
        };
        adaptive=await describe(await prepare(large));
        HTMLCanvasElement.prototype.toBlob=normalToBlob;
      }
      let tooLarge;try{await prepare(new File([large,new Uint8Array(1)],'too-big.jpg',{type:'image/jpeg'}));}catch(e){tooLarge=e.message;}
      let invalid;try{await prepare(new File(['broken image'],'bad.jpg',{type:'image/jpeg'}));}catch(e){invalid=e.message;}
      // Exercise the real encoder/worker while canvas behaves like Safari's PNG
      // fallback, and decoding uses the Image path instead of createImageBitmap.
      const realToBlob=HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob=function(cb,type,q){return realToBlob.call(this,cb,type==='image/webp'?'image/png':type,q)};
      Object.defineProperty(window,'createImageBitmap',{value:undefined,configurable:true});
      let ticks=0;const heartbeat=setInterval(()=>ticks++,1);
      const fallback=await describe(await prepare(large));
      clearInterval(heartbeat);
      const avatar=await describe(await prepare(large,true));
      const oriented=await describe(await prepare(rotatedFile));
      // A platform returning null rather than PNG must use the same fallback.
      HTMLCanvasElement.prototype.toBlob=function(cb,type,q){if(type==='image/webp'){cb(null);return}return realToBlob.call(this,cb,type,q)};
      const nullFallback=await describe(await prepare(new File([original],'small.jpg',{type:'image/jpeg'})));
      HTMLCanvasElement.prototype.toBlob=realToBlob;
      canvas.width=canvas.height=0;
      return {nativeWasmLoads,nativeEncoderType:nativeProbe.type,originalSize:large.size,native,adaptive,fallback,avatar,oriented,nullFallback,tooLarge,invalid,ticks};
    });
    for(const key of ['native','fallback','avatar','oriented','nullFallback']) {
      assert.equal(result[key].type,'image/webp');assert.equal(result[key].magic,'RIFFWEBP');
      assert(result[key].size>12 && result[key].size<=2*1024*1024);
      assert(!result[key].hasOriginalMarker);
    }
    if(result.adaptive) {assert.deepEqual(result.adaptive.dimensions,[1280,960]);assert.equal(result.nativeWasmLoads,0,'native encoder never downloads WASM');}
    assert.equal(result.originalSize,15*1024*1024);
    assert.deepEqual(result.native.dimensions,[1600,1200]);assert.deepEqual(result.fallback.dimensions,[1600,1200]);assert.deepEqual(result.avatar.dimensions,[320,320]);assert.deepEqual(result.oriented.dimensions,[1200,1600],'phone EXIF orientation preserved while recoding');
    assert.equal(result.tooLarge,'image_input_too_large');assert.equal(result.invalid,'image_invalid');
    assert(result.ticks>0,'worker leaves UI event loop responsive');assert(wasmRequests>0,'real local WASM used');
    assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
    console.log(`PASS ${name}: 15 MiB input -> bounded WebP, dimensions/crop, invalid and >15 MiB rejected, real PNG/null fallback, no copied metadata, responsive UI, no external requests`,JSON.stringify(result));
  } finally {await browser.close();}
}
