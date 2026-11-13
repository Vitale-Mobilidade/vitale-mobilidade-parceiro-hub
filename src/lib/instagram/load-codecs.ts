import { registerCodec } from './codec-modules';
/** Invoke only from a hydrated browser event/effect; never from SSR or a server handler. */
export async function loadInstagramBrowserCodecs(){
 if(typeof window==='undefined')throw Error('instagram_browser_required');
 for(const name of ['jpeg','png','font','webp']){
  const response=await fetch(`/wasm/instagram/${name}.wasm`,{credentials:'same-origin'});
  if(!response.ok)throw Error('instagram_codec_unavailable');
  registerCodec(name,await WebAssembly.compile(await response.arrayBuffer()));
 }
}