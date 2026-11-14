/**
 * Deterministic presentation-only normalization of a FRESH Gemini script, applied
 * before strict validation. Never used on saved scripts (v1–v3 or v4 already persisted).
 * It never creates facts, numbers or evidence; it only:
 *  - wraps a single complete evidence object into a one-item array;
 *  - sets a missing slide `scene` to null;
 *  - drops a decorative `emphasis` longer than 45 characters (title/body untouched);
 *  - on artVersion 4 only, maps an unknown `concept.module` to `decision`
 *    (the v4 renderer only distinguishes `beam`; any other module draws identically).
 */
import {hasExternalCta} from './contract';
const MODULES=['cover','beam','load','route','battery','comparison','decision'];
const MASTERS=['A','B','C','D','E'];
export const INTERNAL_ENDING_QUESTION='Qual é a sua dúvida?';
type Rec=Record<string,unknown>;
const isRec=(v:unknown):v is Rec=>!!v&&typeof v==='object'&&!Array.isArray(v);
/** A complete single evidence: claim, quote and kind strings present. */
export function isCompleteEvidence(v:unknown){return isRec(v)&&typeof v.claim==='string'&&typeof v.quote==='string'&&typeof v.kind==='string';}
function evidenceList(v:unknown){return isCompleteEvidence(v)?[v]:v;}
export function normalizeFreshScript(raw:unknown):unknown{
 if(!isRec(raw))return raw;
 const s:Rec=structuredClone(raw);
 // Infer only an absent version or the unambiguous string "4", never an explicit legacy/wrong version.
 const v4Shape=Array.isArray(s.slides)&&s.slides.length>=4&&s.slides.length<=6&&s.slides.every(slide=>isRec(slide)&&typeof slide.master==='string'&&MASTERS.includes(slide.master))&&typeof s.endingTitle==='string'&&s.endingTitle.trim().length>0&&typeof s.endingBody==='string'&&s.endingBody.trim().length>0&&'endingEvidence' in s;
 if((s.artVersion===undefined||s.artVersion==='4')&&v4Shape)s.artVersion=4;
 if(s.artVersion===4){
  const question=typeof s.endingQuestion==='string'?s.endingQuestion.trim():'';
  if(!question||question.length>100||hasExternalCta(question))s.endingQuestion=INTERNAL_ENDING_QUESTION;
 }
 for(const key of ['captionEvidence','endingEvidence'])if(key in s)s[key]=evidenceList(s[key]);
 if(Array.isArray(s.slides))s.slides=s.slides.map((slide,i)=>{
  if(!isRec(slide))return slide;
  const out:Rec={...slide};
  if('evidence' in out)out.evidence=evidenceList(out.evidence);
  if(!('scene' in out))out.scene=null;
  if(typeof out.emphasis==='string'&&out.emphasis.length>45)delete out.emphasis;
  if(s.artVersion===4&&isRec(out.concept)&&typeof out.concept.module==='string'&&!MODULES.includes(out.concept.module))out.concept={...out.concept,module:i===0?'cover':'decision'};
  return out;
 });
 return s;
}
