/** Runtime-neutral single-image editorial contract; no codecs, secrets or slide concepts. */
export type Reference={id:string;text:string;origin:'transcript';start:number;kind:'observation'|'estimate'};
export type Caption={version:1;benefits:string[];analysis:string[];verdict:string[];cta?:string;caption:string;references:Reference[];fallback:boolean};
export function controlledReferences(source:{transcript:string;articleBlocks?:Array<{text?:string;sourceExcerpt?:string}>}):Reference[]{
 const excerpts=(source.articleBlocks??[]).map(b=>b.sourceExcerpt).filter((q):q is string=>!!q&&source.transcript.includes(q));
 const candidates=excerpts.length?excerpts:source.transcript.split(/(?<=[.!?])\s+|\n+/);
 const seen=new Set<string>();return candidates.flatMap(q=>q.split(/(?<=[.!?])\s+|\n+/)).filter(q=>q.length>=20&&q.length<=330&&source.transcript.includes(q)&&!seen.has(q)&&!!seen.add(q)).slice(0,60).map((text,i)=>({id:`t${i}`,text,origin:'transcript',start:source.transcript.indexOf(text),kind:/estimad|aproximad|até\s+\d/i.test(text)?'estimate':'observation'}));
}
export function composeCaption(raw:unknown,refs:Reference[],fallback=false):Caption{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('instagram_post_caption_invalid');
 const r=raw as Record<string,unknown>;
 if(Object.keys(r).some(k=>!['benefits','analysis','verdict','cta'].includes(k)))throw Error('instagram_post_caption_invalid');
 const groups=['benefits','analysis','verdict'] as const,used=new Set<string>();
 const values=Object.fromEntries(groups.map(group=>{const ids=r[group];if(!Array.isArray(ids)||ids.length<1||ids.length>2||ids.some(id=>typeof id!=='string'||!refs.some(ref=>ref.id===id)||used.has(id)||!used.add(id)))throw Error('instagram_post_evidence_invalid');return [group,ids];})) as Record<typeof groups[number],string[]>;
 const cta=r.cta;if(cta!==undefined&&cta!=='Qual ponto pesa mais na sua decisão?')throw Error('instagram_post_cta_invalid');
 const evidence=[...used].map(id=>refs.find(ref=>ref.id===id)).filter((ref):ref is Reference=>!!ref);
 const text=(ids:string[])=>ids.map(id=>{const ref=refs.find(ref=>ref.id===id);if(!ref)throw Error('instagram_post_evidence_invalid');return ref.kind==='estimate'?`Estimativa declarada: ${ref.text}`:ref.text;}).join(' ');
 const caption=[`Benefícios\n${text(values.benefits)}`,`Análise e ressalvas\n${text(values.analysis)}`,`Veredito\n${text(values.verdict)}`,cta].filter(Boolean).join('\n\n');
 if(caption.length>2200)throw Error('instagram_post_caption_too_long');return {version:1,...values,...(cta?{cta}:{}),caption,references:evidence,fallback};
}
export function fallbackCaption(refs:Reference[]){
 if(refs.length<3)throw Error('instagram_post_evidence_insufficient');
 // Exact source excerpts, transparently marked as extractive review; no invented benefits/verdict.
 const result=composeCaption({benefits:[refs[0]?.id],analysis:[refs[Math.floor(refs.length/2)]?.id],verdict:[refs.at(-1)?.id]},refs,true);
 return {...result,caption:['Trechos da análise',...result.references.map(ref=>ref.kind==='estimate'?`Estimativa declarada: ${ref.text}`:ref.text)].join('\n\n')};
}
export function confirmedOriginal(articleId:string,title:string,background:unknown){
 if(!background||typeof background!=='object')return null;const b=background as Record<string,unknown>;
 return b.title===title&&typeof b.path==='string'&&new RegExp(`^${articleId}/backgrounds/[a-f0-9-]{36}\\.(png|jpg)$`).test(b.path)&&['image/png','image/jpeg'].includes(String(b.mime))?{path:b.path,mime:b.mime as 'image/png'|'image/jpeg'}:null;
}