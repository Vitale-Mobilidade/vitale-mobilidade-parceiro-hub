/** Hub → Edge server-to-server client. The service key stays in server env; never sent to the browser. */
import type { Job } from './contract';
export class EdgeAiError extends Error{constructor(code:string,public status:number,public safeMessage:string,public providerDenial=false){super(code);}}
export type Runtime={release:boolean;ai:boolean;renderer:boolean};
export type RenderedAsset={position:number;path:string;sha256:string;alt:string;missingBikeIds:string[];photoHashes:string[]};
export function edgeConfigured(){return !!process.env.SUPABASE_URL&&!!process.env.SUPABASE_SERVICE_ROLE_KEY;}
export function edge(runId?:string,fetcher:typeof fetch=fetch){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 async function call(op:string,extra:Record<string,unknown>,timeoutMs:number){
  if(!url||!key)throw Error('database_not_configured');
  let response:Response;
  try{response=await fetcher(`${url}/functions/v1/editorial-admin`,{method:'POST',signal:AbortSignal.timeout(timeoutMs),headers:{'Content-Type':'application/json','x-instagram-internal-key':key},body:JSON.stringify({action:'instagram-internal',op,...extra})});}
  catch{throw Error(op==='render'?'instagram_render_unreachable':'instagram_edge_unreachable');}
  const data=await response.json().catch(()=>null) as Record<string,unknown>|null;
  if(!response.ok||!data){
   const code=typeof data?.error==='string'&&/^[a-z0-9_]{3,80}$/.test(data.error)?data.error:`instagram_edge_http_${response.status}`;
   if(typeof data?.aiStatus==='number')throw new EdgeAiError(code,data.aiStatus,typeof data.safeMessage==='string'?data.safeMessage.slice(0,300):code,data.providerDenial===true);
   throw Error(code);
  }
  return data;
 }
 const lease=(job:Job)=>({jobId:job.id,revision:job.revision,lease:job.lease_token});
 return {
  async runtime(probe=false):Promise<Runtime>{const d=await call('runtime',{probe},20000);return {release:d.release===true,ai:d.ai===true,renderer:d.renderer===true};},
  async script(job:Job):Promise<unknown>{return (await call('script',{...lease(job),runId},170000)).script;},
  async scene(job:Job):Promise<string>{const d=await call('scene',{...lease(job),runId},170000);if(typeof d.path!=='string')throw Error('instagram_scene_checkpoint_missing');return d.path;},
  async render(job:Job,position:number):Promise<RenderedAsset>{return await call('render',{...lease(job),position},60000) as unknown as RenderedAsset;},
 };
}
