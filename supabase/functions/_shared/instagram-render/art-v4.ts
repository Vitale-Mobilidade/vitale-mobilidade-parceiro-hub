/** Edge-only Editorial System 1.0. Fixed Inter weights, Lucide paths and masters A–F.
 * One RGBA output, Uint32 row fills, cached fonts; never imported by the Worker. */
import {Font,Layout} from '../cover-renderer/vendor/font.js';
import {SYSTEM_FONTS} from './system-fonts.ts';
import {SYSTEM_ICONS} from './system-icons.ts';
import {EDITORIAL_SYSTEM as S,type EditorialCard} from './editorial-system.ts';
import {catalogCutout} from './art-v3.ts';
import type {RenderSlide} from './contract.ts';
import {SIGNATURE_BIKE} from './signature-bike.ts';
type Raster={width:number;height:number;buffer:Uint8Array};
const cache=new Map<string,Font>();let shared:Layout|undefined;
function font(weight:keyof typeof SYSTEM_FONTS){let f=cache.get(weight);if(!f){f=new Font(64,Uint8Array.from(atob(SYSTEM_FONTS[weight]),c=>c.charCodeAt(0)));cache.set(weight,f);}return f;}
const le=new Uint8Array(new Uint32Array([1]).buffer)[0]===1;
const packed=(c:readonly number[])=>le?((255<<24)|(c[2]<<16)|(c[1]<<8)|c[0])>>>0:((c[0]<<24)|(c[1]<<16)|(c[2]<<8)|255)>>>0;
export function renderArtV4(slide:RenderSlide|null,photos:Raster[],original:Raster|null,contain:(out:Uint8Array,p:Raster,x:number,y:number,w:number,h:number)=>unknown,environment:Raster|null,ending:{title:string;body:string;question:string}){
 const C=S.colors,W=S.width,H=S.height,out=new Uint8Array(W*H*4),pixels=new Uint32Array(out.buffer);pixels.fill(packed(C.deep));
 const ink=C.white,accent=C.mint,master=slide?.master??'F',photographic=!!environment;
 function rect(x:number,y:number,w:number,h:number,color:readonly number[]){const a=Math.max(0,Math.round(x)),b=Math.min(W,Math.round(x+w));for(let yy=Math.max(0,Math.round(y));yy<Math.min(H,Math.round(y+h));yy++)pixels.fill(packed(color),yy*W+a,yy*W+b);}
 function round(x:number,y:number,w:number,h:number,color:readonly number[],radius=24){for(let yy=0;yy<h;yy++){const dy=yy<radius?radius-yy:yy>=h-radius?yy-(h-radius):0,dx=dy?radius-Math.sqrt(radius*radius-dy*dy):0;rect(x+dx,y+yy,w-2*dx,1,color);}}
 function line(x:number,y:number,xx:number,yy:number,color:readonly number[],thickness=5){const n=Math.max(1,Math.ceil(Math.hypot(xx-x,yy-y)));for(let i=0;i<=n;i++)round(x+(xx-x)*i/n-thickness/2,y+(yy-y)*i/n-thickness/2,thickness,thickness,color,thickness/2);}
 function icon(name:keyof typeof SYSTEM_ICONS,x:number,y:number,size:number,color:readonly number[]=accent){for(const path of SYSTEM_ICONS[name])for(let i=1;i<path.length;i++)line(x+path[i-1][0]*size/24,y+path[i-1][1]*size/24,x+path[i][0]*size/24,y+path[i][1]*size/24,color,size/12);}
 function text(value:string,x:number,y:number,w:number,h:number,size:number,weight:keyof typeof SYSTEM_FONTS='400',color:readonly number[]=ink,leading=1.16){
  if(!value)return;const f=font(weight),rows:string[]=[];let row='';const width=(s:string)=>[...s].reduce((n,ch)=>n+f.metrics(ch,size).advance_width,0);
  for(const word of value.split(/\s+/)){if(width(word)>w)throw Error('instagram_text_does_not_fit');const next=row?row+' '+word:word;if(width(next)>w-48){rows.push(row);row=word;}else row=next;}if(row)rows.push(row);
  if(rows.length*size*leading>h)throw Error('instagram_text_does_not_fit');
  shared??=new Layout();for(const [i,v] of rows.entries()){shared.reset({wrap_style:'word',vertical_align:'top',horizontal_align:'left'});shared.append(f,v,{scale:size});const r=shared.rasterize(...color),yy=Math.round(y+i*size*leading);
   if(r.width>w||yy+r.height>y+h)throw Error(`instagram_text_does_not_fit: ${value} ${r.width}x${r.height} in ${w}x${h}`);
   if(photographic)for(let py=0;py<r.height;py++)for(let px=0;px<r.width;px++){const a=r.buffer[(py*r.width+px)*4+3]/255*.6;if(!a)continue;for(const [dx,dy] of [[-2,0],[2,0],[0,-2],[0,2],[2,4]]){const xx=x+px+dx,y2=yy+py+dy;if(xx<0||xx>=W||y2<0||y2>=H)continue;const to=(y2*W+xx)*4;for(let c=0;c<3;c++)out[to+c]=out[to+c]*(1-a)+C.deep[c]*a;}}
   for(let py=0;py<r.height;py++)for(let px=0;px<r.width;px++){const at=(py*r.width+px)*4,to=((yy+py)*W+x+px)*4,a=r.buffer[at+3]/255;if(a)for(let c=0;c<3;c++)out[to+c]=out[to+c]*(1-a)+r.buffer[at+c]*a;}
  }
 }
 function label(value:string,y=80){round(64,y,Math.min(760,value.length*17+48),58,C.petroleum,24);text(value.toLocaleUpperCase('pt-BR'),88,y+14,720,40,28,'500',accent);}
 function photograph(p:Raster,x:number,y:number,w:number,h:number,fill=false){if(!fill){contain(out,p,x,y,w,h);return;}const scale=Math.max(w/p.width,h/p.height),ox=(p.width-w/scale)/2,oy=(p.height-h/scale)/2;for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const at=(Math.min(p.height-1,Math.floor(oy+yy/scale))*p.width+Math.min(p.width-1,Math.floor(ox+xx/scale)))*4,to=((y+yy)*W+x+xx)*4;out[to]=p.buffer[at];out[to+1]=p.buffer[at+1];out[to+2]=p.buffer[at+2];}}
 function card(c:EditorialCard,x:number,y:number,w:number,h:number){round(x,y,w,h,C.mint);round(x+2,y+2,w-4,h-4,C.petroleum,22);const narrow=w<400,compact=h<320;icon(c.icon,x+32,y+30,40);text(c.title,x+(narrow?32:90),y+(narrow?87:32),w-(narrow?64:122),narrow?130:92,compact?30:36,'700',accent);text(c.text,x+32,y+(narrow?230:128),w-64,h-(narrow?260:158),compact?28:narrow?29:42,'500');}
 if(environment){photograph(environment,0,0,W,H,true);for(let y=0;y<H;y++){const v=Math.max(0,Math.min(1,(y-150)/670)),sm=v*v*(3-2*v),a=master==='F'?.87:.85*(1-sm)+.15*sm;for(let x=0;x<W;x++){const to=(y*W+x)*4;for(let c=0;c<3;c++)out[to+c]=out[to+c]*(1-a)+C.deep[c]*a;}}}
 if(master==='A'&&slide){
  if(original)photograph(original,0,380,1080,890);
  // Only the background may fill/crop. Every authoritative bike remains whole.
  if(photos[0]&&!original)contain(out,catalogCutout(photos[0]),20,420,1040,810);
  for(let yy=0;yy<450;yy++){const a=.92*(1-yy/620);for(let x=0;x<W;x++){const at=(yy*W+x)*4;for(let c=0;c<3;c++)out[at+c]=out[at+c]*(1-a)+C.deep[c]*a;}}
  label(slide.editorialLabel??'Editorial');text(slide.emphasis?slide.title.replace(slide.emphasis,'').trim():slide.title,64,182,952,270,76,'800',ink,1.1);
  if(slide.emphasis)text(slide.emphasis,64,365,952,110,76,'italic',accent,1.1);
  text(slide.body,64,490,952,160,42);icon('arrow-right',952,1228,40);
 }else if(!slide){
  label('O veredito');text(ending.title,64,182,952,235,64,'800',ink,1.1);text(ending.body,64,445,952,380,42);
  rect(64,855,952,2,C.mint);text(ending.question,64,886,952,160,38,'700',accent);
  const names=['heart','message-circle','bookmark','share-2'] as const;
  S.actions.forEach((v,i)=>{const x=64+i*244;icon(names[i],x,1080,42);text(v,x,1140,230,45,27,'600');});
  round(290,1202,500,78,C.mint,39);round(292,1204,496,74,C.deep,37);contain(out,{width:SIGNATURE_BIKE.width,height:SIGNATURE_BIKE.height,buffer:Uint8Array.from(atob(SIGNATURE_BIKE.rgba),c=>c.charCodeAt(0))},296,1208,66,66);text('@vitalemobilidade',380,1224,390,45,30,'600');
 }else{
  label(slide.editorialLabel??S.masters[master]);text(slide.title,64,178,952,230,64,'800',ink,1.1);
  if(slide.emphasis)text(slide.emphasis,64,335,952,100,64,'italic',accent,1.1);
  const cards=slide.cards??[];
  if(master==='B'){
   text(slide.body,64,430,photographic?720:952,photographic?310:430,photographic?36:42);
   if(photos[0])contain(out,photos[0],64,880,952,325);
   else {rect(64,952,952,2,C.mint);text(slide.concept?.intent??'',64,998,952,220,42,'700',accent);}
  }else if(master==='C'){
   text(slide.body,64,420,photographic?520:952,photographic?430:310,photographic?34:42);
   if(cards.length>1){/* Multiple technical cards occupy the visual lane; never overlap a metric/photo. */}
   else if(photos[0])contain(out,photos[0],64,718,952,280);
   else if(slide.concept?.metric){text(slide.concept.metric.value,64,photographic?860:735,952,115,76,'800',accent);text(slide.concept.metric.label,64,photographic?975:862,952,88,36,'500');}
   else {icon(slide.concept?.module==='beam'?'sun':'battery',64,750,76);text(slide.concept?.intent??'',186,744,830,205,42,'700',accent);}
   if(cards.length>1){cards.slice(0,3).forEach((c,i)=>card(c,64+i*(972/cards.length),760,952/cards.length-16,510));}
   else cards.slice(0,1).forEach(c=>card(c,64,photographic&&slide.concept?.metric?1050:1010,952,photographic&&slide.concept?.metric?240:260));
  }else if(master==='D'){
   text(slide.body,64,420,952,photographic?310:340,photographic?34:42);
   // Central lane remains free of cards when a contextual photograph is present.
   cards.slice(0,2).forEach((c,i)=>card(c,64+i*486,photographic?975:800,466,photographic?290:465));
  }else if(master==='E'){
   text(slide.body,64,420,952,cards.length===4?220:310,42);
   const compact=cards.length===4,start=compact?690:775,step=compact?142:163;
   cards.slice(0,4).forEach((c,i)=>{const y=start+i*step;round(64,y,952,compact?132:145,C.petroleum);icon(c.icon,94,y+40,40);text(c.title,166,y+22,814,55,36,'700',accent);text(c.text,166,y+77,814,60,42,'500');});
  }else throw Error('instagram_master_invalid');

 }
 return out;
}