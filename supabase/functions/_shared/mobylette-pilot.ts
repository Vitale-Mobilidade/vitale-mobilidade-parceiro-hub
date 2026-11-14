/** Pinned single read-only pilot. No jobs, episodes, AI, uploads or publication. */
export const MOBYLETTE_PILOT = {
  articleId:'b3ab69be-7eb1-4f94-9ac6-4619fb6942d4',videoId:'Mi6l7WhLdT4',
  title:'Nova Caloi Mobylette: o lançamento justificava a oportunidade de compra?',
  path:'b3ab69be-7eb1-4f94-9ac6-4619fb6942d4/backgrounds/8ce9cdc3-9a4d-41ab-b4a1-e34f9bd335a9.png',
  evidence:{focus:{x:.5,y:.5},subjects:[{left:.335,top:.24,right:.67,bottom:.755}]},
} as const;
export type MobylettePilot = {title:string;caption:string;state:'review';images:Array<{format:'podcast'|'instagram';width:number;height:number;dataUrl:string}>};
/** Copy only exact published paragraphs, never interpret a price as a current offer. */
export function mobyletteCaption(blocks:unknown):string {
  if(!Array.isArray(blocks))throw Error('pilot_article_invalid');
  const paragraphs=blocks.filter(b=>b?.type==='text'&&typeof b.text==='string').flatMap(b=>b.text.split(/\n\s*\n/).map((p:string)=>p.replace(/\*\*/g,'').trim()));
  const benefits=paragraphs.find((p:string)=>p.startsWith('A bateria removível facilita esse processo'));
  const caveats=paragraphs.find((p:string)=>p.startsWith('Ela era uma escolha menos convincente'));
  const verdict=paragraphs.find((p:string)=>p.startsWith('A oportunidade de lançamento fazia mais sentido'))?.split('. ')[0];
  if(!benefits||!caveats||!verdict)throw Error('pilot_caption_evidence_changed');
  const caption=[benefits.split('. ')[0]+'.',caveats.split('. ')[0]+'.',verdict.replace('percorre cerca de','considera a estimativa de')+'.'].join('\n\n');
  if(caption.length>900)throw Error('pilot_caption_too_long');
  return caption;
}