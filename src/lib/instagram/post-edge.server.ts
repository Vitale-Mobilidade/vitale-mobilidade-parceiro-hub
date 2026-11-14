import type {Post} from './post';
export function postStudio(fetcher=fetch){
 async function call(op:string,p:Post){const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw Error('database_not_configured');
  const response=await fetcher(`${url}/functions/v1/editorial-admin`,{method:'POST',headers:{'Content-Type':'application/json','x-instagram-internal-key':key},body:JSON.stringify({action:'instagram-internal',op,jobId:p.id,revision:p.revision,lease:p.lease_token}),signal:AbortSignal.timeout(op==='post-caption'?170000:60000)});
  const data=await response.json().catch(()=>null);if(!response.ok||!data)throw Error('instagram_post_edge_unavailable');return data;
 }
 return {async caption(p:Post){return (await call('post-caption',p)).caption;},async render(p:Post){return (await call('post-render',p)).asset;}};
}