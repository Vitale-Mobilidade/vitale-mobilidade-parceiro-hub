import {singlePublishDecision,type SingleDraft} from './single-image';
export type SingleMeta={account():Promise<string>;create(account:string,post:{image_url:string;caption:string}):Promise<string>;status(id:string):Promise<unknown>;publish(account:string,id:string):Promise<string>;permalink(id:string):Promise<string|null>};
/** save must be durable revision+lease CAS. No error clears attempted markers. */
export async function publishSingle(draft:SingleDraft,mediaUrl:string,save:(patch:Record<string,unknown>)=>Promise<void>,meta:SingleMeta,now:number,enabled:boolean){
 const decision=singlePublishDecision(draft,now,enabled);if(decision!=='send')return decision;
 const url=new URL(mediaUrl);if(url.origin!=='https://vitalemobilidade.com'||!url.pathname.startsWith('/api/public/instagram/single-media/'))throw Error('single_media_url_invalid');
 const account=await meta.account();
 await save({state:'publishing',createAttempted:true});
 let container:string;
 try{container=await meta.create(account,{image_url:mediaUrl,caption:draft.caption});}
 catch{await save({state:'uncertain'});return 'reconcile';}
 await save({containerId:container});
 if(await meta.status(container)!=='FINISHED'){await save({state:'uncertain'});return 'reconcile';}
 await save({publishAttempted:true});
 let mediaId:string;try{mediaId=await meta.publish(account,container);}catch{await save({state:'uncertain'});return 'reconcile';}
 await save({state:'published',mediaId});
 try{await save({permalink:await meta.permalink(mediaId)});}catch{/* confirmed publication survives permalink/save failure */}
 return 'published';
}