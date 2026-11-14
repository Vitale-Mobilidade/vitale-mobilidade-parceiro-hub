import type {SupabaseClient} from 'npm:@supabase/supabase-js@2';
import {MOBYLETTE_PILOT,mobyletteCaption,type MobylettePilot} from '../_shared/mobylette-pilot.ts';
import {COVER_BUCKET,inspectJpeg} from '../_shared/editorial-cover.ts';
/** Called only after actorFor and admin role. Read-only; no tables beyond existing article/source. */
export async function readMobylettePilot(db:SupabaseClient):Promise<MobylettePilot>{
 const p=MOBYLETTE_PILOT;
 const article=await db.from('editorial_articles').select('id,title,blocks').eq('id',p.articleId).eq('video_id',p.videoId).eq('status','published').maybeSingle();
 if(article.error||article.data?.title!==p.title)throw Error('pilot_article_changed');
 const caption=mobyletteCaption(article.data.blocks);
 const source=await db.from('youtube_editorial_sources').select('background:capture->coverBackground').eq('article_id',p.articleId).eq('video_id',p.videoId).maybeSingle();
 const background=source.data?.background;
 if(source.error||!background||typeof background!=='object'||Array.isArray(background)||background.path!==p.path||background.mime!=='image/png')throw Error('pilot_original_changed');
 const file=await db.storage.from(COVER_BUCKET).download(p.path);
 if(file.error||!file.data||file.data.size>12*1024*1024)throw Error('pilot_original_unavailable');
 const bytes=new Uint8Array(await file.data.arrayBuffer());
 const {composeFullBleedCover}=await import('../_shared/cover-renderer/index.ts');
 const images:MobylettePilot['images']=[];
 for(const format of ['podcast','instagram'] as const){
  const out=await composeFullBleedCover({bytes,mime:'image/png'},p.title,format,{focus:{...p.evidence.focus},subjects:p.evidence.subjects.map(s=>({...s}))});
  const dimensions=inspectJpeg(out.bytes),width=format==='podcast'?1400:1080,height=format==='podcast'?1400:1350;
  if(dimensions?.width!==width||dimensions.height!==height)throw Error('pilot_dimensions_invalid');
  let binary='';for(let i=0;i<out.bytes.length;i+=8192)binary+=String.fromCharCode(...out.bytes.subarray(i,i+8192));
  images.push({format,width,height,dataUrl:`data:image/jpeg;base64,${btoa(binary)}`});
 }
 return {title:p.title,caption,state:'review',images};
}