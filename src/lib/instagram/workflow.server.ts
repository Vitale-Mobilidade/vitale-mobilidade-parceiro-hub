import { validateScript,hash,type Job,type Source,type Script,type Asset } from './contract';
import { decodePhoto,renderSlide,type Raster } from './render.server';
export const BUCKET='instagram-carousels';
export type Store={save:(patch:Partial<Job>)=>Promise<void>;upload:(path:string,bytes:Uint8Array,mime:string)=>Promise<void>;download:(path:string)=>Promise<Uint8Array>;photo:(id:string)=>Promise<Raster|null>};
export type Generator={script:(source:Source)=>Promise<Script>;scene:(prompt:string)=>Promise<Uint8Array>};
export async function prepare(job:Job,store:Store,ai:Generator,omitScene=false){
 const save=async(patch:Partial<Job>)=>{await store.save(patch);Object.assign(job,patch);};
 if(['approved','publishing','uncertain','published'].includes(job.state))return;
 if(omitScene)await save({scene_omitted:true});
 if(!job.script){
  if(job.script_attempted)throw Error('instagram_script_uncertain_no_replay');
  await save({state:'scripting',script_attempted:true});
  const script=validateScript(await ai.script(job.source),job.source);
  await save({script,state:'scene'});
 }
 const script=validateScript(job.script,job.source),sceneSlide=script.slides.find(s=>s.scene);let scene:Raster|null=null;
 if(sceneSlide?.scene&&!job.scene_omitted){
  if(!job.scene_path){
   if(job.scene_attempted)throw Error('instagram_scene_uncertain_continue_without_scene');
   await save({state:'scene',scene_attempted:true});
   const bytes=await ai.scene(sceneSlide.scene);decodePhoto(bytes,'image/png');
   const path=`${job.id}/r${job.revision}/scene.png`;
   await store.upload(path,bytes,'image/png');await save({scene_path:path});
  }
  if(!job.scene_path)throw Error('instagram_scene_checkpoint_missing');
  scene=decodePhoto(await store.download(job.scene_path),'image/png');
 }
 await save({state:'rendering'});
 for(let i=0;i<=script.slides.length;i++){
  const position=i+1;if(job.assets.some(a=>a.position===position))continue;
  const slide=script.slides[i]??null;const photos:Raster[]=[],missingBikeIds:string[]=[];
  for(const id of slide?.bikeIds??[]){const photo=await store.photo(id);if(photo)photos.push(photo);else missingBikeIds.push(id);}
  const rendered=renderSlide(slide,photos,slide?.scene?scene:null),path=`${job.id}/r${job.revision}/${String(position).padStart(2,'0')}.jpg`;
  await store.upload(path,rendered.bytes,'image/jpeg');
  const asset:Asset={position,path,sha256:await hash(rendered.bytes),alt:slide?.alt??'Curta, Compartilhe, Comente e Salve. @vitalemobilidade.',missingBikeIds};
  await save({assets:[...job.assets,asset].sort((a,b)=>a.position-b.position)});
 }
 await save({state:'review',error_code:null,error_message:null});
}
export function approvable(job:Job){
 return job.state==='review'&&!!job.script&&job.assets.length>=4&&job.assets.length<=7&&job.assets.length===job.script.slides.length+1&&job.assets.every((a,i)=>a.position===i+1&&a.path===`${job.id}/r${job.revision}/${String(i+1).padStart(2,'0')}.jpg`&&/^[a-f0-9]{64}$/.test(a.sha256));
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
 await persist({publish_attempted:true,state:'uncertain'});
 const media_id=await publisher.publish(account,job.album_id);await persist({media_id,state:'published',media_token_hash:null,media_expires_at:null});
 const permalink=await publisher.permalink(media_id);await persist({permalink,error_code:null,error_message:null});
}
