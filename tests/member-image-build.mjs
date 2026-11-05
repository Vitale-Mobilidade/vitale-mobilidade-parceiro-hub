// Validate the emitted Worker/WASM, not Vite's development module paths.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve('.output/public');
const worker=(await readdir(`${root}/assets`)).find(n=>/^member-image-worker-.*\.js$/.test(n));assert(worker);
const server=createServer(async(req,res)=>{
 const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(path==='/'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><title>Local built image worker test</title>')}
 const file=resolve(root,'.'+path);if(!file.startsWith(root+'/')){res.statusCode=404;return res.end()}
 try{const bytes=await readFile(file);res.setHeader('Content-Type',extname(file)==='.wasm'?'application/wasm':'text/javascript');res.end(bytes)}catch{res.statusCode=404;res.end()}
});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
try{
 for(const [name,engine]of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch({headless:true,...(name==='chromium'?{channel:'chrome'}:{})});
  try{
   const page=await browser.newPage();const failures=[];
   page.on('pageerror',e=>failures.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push(r.status()+' '+r.url())});
   await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
   await page.goto(origin);
   const result=await page.evaluate(async url=>{
    const worker=new Worker(url,{type:'module'});
    try{return await new Promise((resolve,reject)=>{
     const timer=setTimeout(()=>reject(new Error('built worker timeout')),15000);
     worker.onerror=()=>{clearTimeout(timer);reject(new Error('built worker error'))};
     worker.onmessage=e=>{clearTimeout(timer);if(!e.data.bytes)return reject(new Error('built encoder error'));const b=new Uint8Array(e.data.bytes);resolve({size:b.length,magic:String.fromCharCode(...b.slice(0,4),...b.slice(8,12))})};
     const pixels=new Uint8ClampedArray(32*24*4).fill(255);worker.postMessage({width:32,height:24,pixels:pixels.buffer,quality:82},[pixels.buffer]);
    })}finally{worker.terminate()}
   },`${origin}/assets/${worker}`);
   assert.equal(result.magic,'RIFFWEBP');assert(result.size>12);assert.deepEqual(failures,[]);
   console.log(`PASS ${name}: production-built module Worker, dynamic encoder and same-origin WASM produce real WebP`);
  }finally{await browser.close()}
 }
}finally{await new Promise(r=>server.close(r))}
