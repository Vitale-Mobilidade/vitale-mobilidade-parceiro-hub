import type {Post} from './post';
import {controlledReferences,composeCaption,fallbackCaption,postDecision} from './post';
export type PostStudio={caption:(p:Post)=>Promise<unknown>;render:(p:Post)=>Promise<NonNullable<Post['asset']>>};
export async function preparePost(post:Post,save:(patch:Partial<Post>&{caption_attempted?:boolean})=>Promise<void>,studio:PostStudio,captionAttempted=false){
 const persist=async(patch:Partial<Post>&{caption_attempted?:boolean})=>{await save(patch);Object.assign(post,patch);};
 if(['approved','scheduled','publishing','published','uncertain'].includes(post.state))return;
 await persist({state:'preparing'});
 if(!post.caption){
  if(captionAttempted)throw Error('instagram_post_caption_uncertain');
  await persist({caption_attempted:true});const raw=await studio.caption(post),refs=controlledReferences(post.source);
  let caption;try{caption=composeCaption(raw,refs);}catch{caption=fallbackCaption(refs);}
  await persist({caption});
 }
 if(!post.asset){const asset=await studio.render(post);if(asset.path!==`posts/${post.id}/r${post.revision}/01.jpg`||!/^[a-f0-9]{64}$/.test(asset.sha256))throw Error('instagram_post_asset_invalid');await persist({asset});}
 await persist({state:'review',error_code:null});
}
export type SinglePublisher={account:()=>Promise<string>;access:(id:string)=>Promise<void>;image:(account:string,url:string,caption:string,alt:string)=>Promise<string>;status:(id:string)=>Promise<unknown>;publish:(account:string,id:string)=>Promise<string>;permalink:(id:string)=>Promise<string|null>};
export async function publishPost(post:Post,save:(patch:Partial<Post>)=>Promise<void>,meta:SinglePublisher,url:string,now:()=>number=Date.now){
 const persist=async(patch:Partial<Post>)=>{await save(patch);Object.assign(post,patch);};
 const decision=await postDecision(post,now());if(decision==='published')return;if(decision!=='send')throw Error(`instagram_post_${decision}`);
 if(!post.asset||!post.caption)throw Error('instagram_post_review_required');
 const account=await meta.account();await meta.access(account);
 if(!post.container_id){await persist({create_attempted:true});const container_id=await meta.image(account,url,post.caption.caption,post.asset.alt);await persist({container_id});}
 const container=post.container_id;if(!container)throw Error('instagram_post_container_uncertain');
 if(await meta.status(container)!=='FINISHED')throw Error('meta_processing');
 if(await postDecision(post,now())!=='send')throw Error('instagram_post_window_closed');
 await persist({publish_attempted:true,state:'uncertain'});
 const media_id=await meta.publish(account,container);await persist({media_id,state:'published',media_token_hash:null,media_expires_at:null});
 const permalink=await meta.permalink(media_id).catch(()=>null);await persist({permalink,error_code:permalink?null:'meta_permalink_pending'});
}