import {authorize,createDb} from './repository.server';
import {selectSingleSources} from './single-image';
const headers={'Cache-Control':'private, no-store','Vary':'Authorization','X-Robots-Tag':'noindex, nofollow'};
/** Metadata-only independent eligibility. Podcast is consulted solely for published dedupe. */
export async function singleImageAdmin(request:Request,dbFactory=createDb){
 const reply=(v:unknown,status=200)=>Response.json(v,{status,headers});
 if(!request.headers.get('Authorization')?.match(/^Bearer .+$/))return reply({error:'authentication_required'},401);
 try{
  const db=dbFactory();if(!await authorize(request,db))return reply({error:'Acesso restrito a administradores.'},403);
  const text=await request.text();if(text.length>4096)return reply({error:'Requisição inválida.'},413);
  const body=JSON.parse(text);if(body.action!=='snapshot')return reply({error:'Geração e agenda independentes aguardam migração e revisão. Nenhum envio foi iniciado.'},409);
  const [rows,legacy,carousel]=await Promise.all([
   db.from('instagram_carousel_sources').select('video_id,article_id,article_title,published_at,video_date').order('video_date',{ascending:false}).order('published_at',{ascending:false}).order('article_id',{ascending:false}).limit(80),
   db.from('podcast_instagram_deliveries').select('youtube_id').eq('status','published'),
   db.from('instagram_carousel_jobs').select('video_id,article_id').eq('state','published'),
  ]);
  if(rows.error||legacy.error||carousel.error)throw Error('source_read_failed');
  const sources=selectSingleSources((rows.data??[]).map(r=>({videoId:r.video_id,articleId:r.article_id,title:r.article_title,publishedAt:r.published_at,videoDate:r.video_date})),[
   ...(legacy.data??[]).map(r=>({videoId:r.youtube_id,articleId:null})),...(carousel.data??[]).map(r=>({videoId:r.video_id,articleId:r.article_id})),
  ]);
  return reply({available:true,generationEnabled:false,publishingEnabled:false,automationEnabled:false,sources,blockedReason:'migration_pending'});
 }catch{return reply({error:'Não foi possível consultar as fontes independentes.'},503);}
}