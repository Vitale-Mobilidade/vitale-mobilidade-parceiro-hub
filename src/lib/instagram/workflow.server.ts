import { validateScript,type Job,type Asset } from './contract';
import { assetPath,scenePathPattern } from '../../../supabase/functions/_shared/instagram-render/contract';
import type { RenderedAsset,Runtime } from './edge.server';
export const BUCKET='instagram-carousels';
export type Store={save:(patch:Partial<Job>)=>Promise<void>;download:(path:string)=>Promise<Uint8Array>};
/** Edge studio: paid AI and JPEG composition run in the Supabase Edge runtime; checkpoints stay here. */
export type Studio={runtime:(probe?:boolean)=>Promise<Runtime>;script:(job:Job)=>Promise<unknown>;scene:(job:Job)=>Promise<string>;render:(job:Job,position:number)=>Promise<RenderedAsset>};
export async function prepare(job:Job,store:Store,studio:Studio,omitScene=false){
 const save=async(patch:Partial<Job>)=>{await store.save(patch);Object.assign(job,patch);};
 if(['approved','publishing','uncertain','published'].includes(job.state))return;
 // Fail closed before any paid request unless Edge confirms release, AI key and a working compositor.
 if(!job.script){const rt=await studio.runtime(true);if(!rt.release)throw Error('instagram_release_disabled');if(!rt.renderer)throw Error('instagram_render_runtime_unavailable');if(!rt.ai)throw Error('ai_not_configured');}
 if(omitScene)await save({scene_omitted:true});
 if(!job.script){
  if(job.script_attempted)throw Error('instagram_script_uncertain_no_replay');
  await save({state:'scripting',script_attempted:true});
  const script=validateScript(await studio.script(job),job.source);
  await save({script,state:'scene'});
 }
 const script=validateScript(job.script,job.source),sceneSlide=script.slides.find(s=>s.scene);
 if(sceneSlide?.scene&&!job.scene_omitted&&!job.scene_path){
  if(job.scene_attempted)throw Error('instagram_scene_uncertain_continue_without_scene');
  await save({state:'scene',scene_attempted:true});
  const path=await studio.scene(job);
  if(!scenePathPattern(job.id,job.revision).test(path))throw Error('instagram_scene_path_invalid');
  await save({scene_path:path});
 }
 await save({state:'rendering'});
 for(let position=1;position<=script.slides.length+1;position++){
  if(job.assets.some(a=>a.position===position))continue;
  const r=await studio.render(job,position);
  if(r?.position!==position||r.path!==assetPath(job.id,job.revision,position)||!/^[a-f0-9]{64}$/.test(r.sha256)||typeof r.alt!=='string'||!Array.isArray(r.missingBikeIds)||!Array.isArray(r.photoHashes))throw Error('instagram_render_invalid');
  const asset:Asset={position,path:r.path,sha256:r.sha256,alt:script.artVersion? r.alt:script.slides[position-1]?.alt??r.alt,missingBikeIds:r.missingBikeIds.map(String),photoHashes:r.photoHashes.map(String)};
  await save({assets:[...job.assets,asset].sort((a,b)=>a.position-b.position)});
 }
 await save({state:'review',error_code:null,error_message:null});
}
export function approvable(job:Job){
 if(job.script?.artVersion===4&&job.assets.length<5)return false;
 return job.state==='review'&&!!job.script&&job.assets.length>=4&&job.assets.length<=7&&job.assets.length===job.script.slides.length+1&&job.assets.every((a,i)=>a.position===i+1&&a.path===assetPath(job.id,job.revision,i+1)&&/^[a-f0-9]{64}$/.test(a.sha256));
}
export type Publisher={account:()=>Promise<string>;access:(id:string)=>Promise<void>;child:(account:string,url:string,alt:string)=>Promise<string>;album:(account:string,children:string[],caption:string)=>Promise<string>;status:(id:string)=>Promise<unknown>;publish:(account:string,album:string)=>Promise<string>;permalink:(id:string)=>Promise<string|null>};
export async function publish(job:Job,save:(patch:Partial<Job>)=>Promise<void>,publisher:Publisher,mediaUrl:(position:number)=>string){
 const persist=async(patch:Partial<Job>)=>{await save(patch);Object.assign(job,patch);};
 if(job.state==='published')return;
 if(job.approved_revision!==job.revision||!job.approved_by||!job.script||!['approved','publishing','uncertain'].includes(job.state))throw Error('instagram_approval_required');
 if(job.publish_attempted)throw Error('instagram_publish_uncertain_reconcile_only');
 const account=await publisher.account();await publisher.access(account);
 await persist({state:'publishing'});
 for(let i=job.children.length;i<job.assets.length;i++){
  const asset=job.assets[i];if(!asset)throw Error('instagram_asset_missing');
  const child=await publisher.child(account,mediaUrl(asset.position),asset.alt);
  await persist({children:[...job.children,child]});
 }
 if(!job.album_id){const album=await publisher.album(account,job.children,job.script.caption);await persist({album_id:album});}
 for(const id of job.children)if(await publisher.status(id)!=='FINISHED')throw Error('meta_processing');
 if(!job.album_id||await publisher.status(job.album_id)!=='FINISHED')throw Error('meta_processing');
 // Persist intent BEFORE the only publish request. On timeout, never replay.
 await persist({publish_attempted:true,publish_attempted_at:new Date().toISOString(),state:'uncertain'});
 const media_id=await publisher.publish(account,job.album_id);await persist({media_id,state:'published',media_token_hash:null,media_expires_at:null});
 try{const permalink=await publisher.permalink(media_id);await persist({permalink,error_code:null,error_message:null});}
 catch{await persist({error_code:'meta_permalink_pending',error_message:'Publicação confirmada; link ainda indisponível.'});}
}
export function publicationFailureState(job:Job){return job.state==='published'?'published':job.publish_attempted?'uncertain':job.state;}
