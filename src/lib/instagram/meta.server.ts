import { instagramPublisher, readInstagramSettings, type InstagramSettings } from '../../../supabase/functions/_shared/podcast-instagram';
export class MetaError extends Error { constructor(public code:string){super(code);} }
export function carouselPublisher(settings:InstagramSettings,fetcher=fetch){
 const base=instagramPublisher(settings,fetcher),host=settings.accountId?'graph.facebook.com':'graph.instagram.com';
 async function request(path:string,payload?:Record<string,string>,fields?:string){
  const url=new URL(`https://${host}/${settings.version}/${path}`);if(fields)url.searchParams.set('fields',fields);
  let response:Response;try{response=await fetcher(url,{method:payload?'POST':'GET',headers:{Authorization:`Bearer ${settings.token}`},body:payload?new URLSearchParams(payload):undefined,redirect:'error'});}catch{throw new MetaError('meta_transport_uncertain');}
  const data=await response.json().catch(()=>{throw new MetaError('meta_response_uncertain');});
  if(!response.ok||data.error)throw new MetaError([401,403].includes(response.status)?'meta_authorization':'meta_rejected');return data;
 }
 const id=(data:{id?:string})=>{if(!data.id||!/^\d{1,30}$/.test(data.id))throw new MetaError('meta_id_uncertain');return data.id;};
 return {
  account:base.account,access:base.checkPublishingAccess,status:base.status,publish:base.publish,permalink:base.permalink,
  async image(account:string,url:string,caption:string,alt:string){return id(await request(`${account}/media`,{image_url:url,caption,alt_text:alt}));},
  async child(account:string,url:string,alt:string){return id(await request(`${account}/media`,{image_url:url,is_carousel_item:'true',alt_text:alt}));},
  async album(account:string,children:string[],caption:string){return id(await request(`${account}/media`,{media_type:'CAROUSEL',children:children.join(','),caption}));},
  async reconcile(account:string,album:string){const status=await base.status(album);if(status!=='PUBLISHED')return null;
   // Creation id is not a media id; reconcile through approved carousel children.
   const container=await request(album,undefined,'id');if(container.id!==album)throw new MetaError('meta_reconcile_invalid');
   const media=await request(`${account}/media`,undefined,'id,caption,permalink,children{id}');return {published:true,items:Array.isArray(media.data)?media.data:[]};
  },
 };
}
export { readInstagramSettings };
