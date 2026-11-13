/** Deno-only deterministic art kit. Two fonts cached once; single RGBA output and Uint32 fills. */
import { Font, Layout } from '../cover-renderer/vendor/font.js';
import { displayFont, bodyFont } from './fonts.ts';
import { WIDTH, HEIGHT, FINAL_ACTIONS, type RenderSlide } from './contract.ts';
type Raster={width:number;height:number;buffer:Uint8Array};
export const ART_PALETTE={warm:[251,249,248],light:[242,247,244],petroleum:[17,45,42],deep:[8,43,41],mint:[55,230,163],action:[11,121,81]} as const;
let display:Font|undefined,regular:Font|undefined,shared:Layout|undefined;
function fonts(){display??=new Font(64,Uint8Array.from(atob(displayFont),c=>c.charCodeAt(0)));regular??=new Font(64,Uint8Array.from(atob(bodyFont),c=>c.charCodeAt(0)));shared??=new Layout();return {display,regular,shared};}
const le=new Uint8Array(new Uint32Array([1]).buffer)[0]===1;
const color=(c:readonly number[])=>le?((255<<24)|(c[2]<<16)|(c[1]<<8)|c[0])>>>0:((c[0]<<24)|(c[1]<<16)|(c[2]<<8)|255)>>>0;

/** Remove only near-white pixels connected to image edges; never crop or erase enclosed light bike details. */
export function catalogCutout(photo:Raster):Raster{
 const {width:w,height:h}=photo,n=w*h;
 const seen=new Uint8Array(n),queue=new Int32Array(n);let tail=0,head=0;
 const add=(p:number)=>{if(seen[p])return;const a=p*4,b=photo.buffer;if(b[a]>242&&b[a+1]>242&&b[a+2]>242){seen[p]=1;queue[tail++]=p;}};
 for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
 while(head<tail){const p=queue[head++],x=p%w;if(x)add(p-1);if(x<w-1)add(p+1);if(p>=w)add(p-w);if(p<n-w)add(p+w);}
 const buffer=new Uint8Array(photo.buffer);for(let p=0;p<n;p++)if(seen[p])buffer[p*4+3]=0;
 // Ignore tiny disconnected edge UI residue, never interior components or the bike silhouette.
 seen.fill(0);
 for(let p=0;p<n;p++){
  if(seen[p]||!buffer[p*4+3])continue;tail=1;head=0;queue[0]=p;seen[p]=1;let edge=false;
  while(head<tail){const at=queue[head++],x=at%w,y=Math.floor(at/w);edge||=x===0||x===w-1||y===0||y===h-1;
   for(const next of [x?at-1:-1,x<w-1?at+1:-1,y?at-w:-1,y<h-1?at+w:-1])if(next>=0&&!seen[next]&&buffer[next*4+3]){seen[next]=1;queue[tail++]=next;}
  }
  if(edge&&tail<=256)for(let i=0;i<tail;i++)buffer[queue[i]*4+3]=0;
 }
 return {width:w,height:h,buffer};
}

export function renderArtV3(slide:RenderSlide|null,photos:Raster[],original:Raster|null,contain:(out:Uint8Array,p:Raster,x:number,y:number,w:number,h:number)=>unknown){
 const theme=slide?.theme??'warm',light=theme==='light'||theme==='warm',bg=ART_PALETTE[theme],ink=light?ART_PALETTE.deep:ART_PALETTE.warm,accent=light?ART_PALETTE.action:ART_PALETTE.mint;
 const out=new Uint8Array(WIDTH*HEIGHT*4),u32=new Uint32Array(out.buffer);u32.fill(color(bg));
 const f=fonts();
 function rect(x:number,y:number,w:number,h:number,c:readonly number[]){const x0=Math.max(0,Math.round(x)),x1=Math.min(WIDTH,Math.round(x+w));if(x1<=x0)return;for(let yy=Math.max(0,Math.round(y));yy<Math.min(HEIGHT,Math.round(y+h));yy++)u32.fill(color(c),yy*WIDTH+x0,yy*WIDTH+x1);}
 function line(x:number,y:number,xx:number,yy:number,c:readonly number[]=accent,thick=8){const n=Math.ceil(Math.hypot(xx-x,yy-y));for(let i=0;i<=n;i++)rect(x+(xx-x)*i/n,y+(yy-y)*i/n,thick,thick,c);}
 function text(value:string,x:number,y:number,w:number,h:number,size:number,c:readonly number[]=ink,bold=false){
  if(!value)return;const font=bold?f.display:f.regular;
  for(let s=size;s>=(bold?42:40);s-=2){
   const width=(v:string)=>[...v].reduce((n,ch)=>n+font.metrics(ch,s).advance_width,0);const lines:string[]=[];let row='';
   for(const word of value.split(/\s+/)){if(width(word)>w){lines.length=1000;break;}const next=row?row+' '+word:word;if(width(next)>w){lines.push(row);row=word;}else row=next;}if(row)lines.push(row);
   if(lines.length*s*1.25>h)continue;
   let fits=true;const rs=lines.map(v=>{f.shared.reset({wrap_style:'word',vertical_align:'top',horizontal_align:'left'});f.shared.append(font,v,{scale:s});const r=f.shared.rasterize(c[0],c[1],c[2]);if(r.width>w)fits=false;return r;});if(!fits)continue;
   rs.forEach((r,i)=>{const yy=Math.round(y+i*s*1.25);for(let py=0;py<r.height&&yy+py<HEIGHT;py++)for(let px=0;px<r.width&&x+px<WIDTH;px++){const at=(py*r.width+px)*4,to=((yy+py)*WIDTH+x+px)*4,a=r.buffer[at+3]/255;if(!a)continue;for(let c=0;c<3;c++)out[to+c]=out[to+c]*(1-a)+r.buffer[at+c]*a;}});return;
  }throw Error('instagram_text_does_not_fit');
 }
 function circle(cx:number,cy:number,r:number,c=accent){for(let y=-r;y<=r;y++){const dx=Math.sqrt(r*r-y*y);rect(cx-dx,cy+y,dx*2,1,c);}}
 const module=slide?.concept?.module;
 if(module==='cover'&&slide){
  if(original){
   // Contain original in full; never crop wheels/parts. Text is outside the photo, not duplicated.
   contain(out,original,0,450,1080,790);
  }else if(photos[0]){
   // Contextual ground and night-road line, not a fabricated photographic environment.
   for(let y=400;y<1210;y++){const t=(y-400)/810;rect(0,y,1080,1,bg.map((v,i)=>Math.round(v*(1-t)+ART_PALETTE.deep[i]*t)));}
   line(50,1170,1020,1080,ART_PALETTE.petroleum,12);
   contain(out,catalogCutout(photos[0]),24,405,1032,790);
   // A deterministic street perspective, not a claimed photograph or component close-up.
   line(70,1230,420,1170,ART_PALETTE.mint,5);line(650,1170,1010,1230,ART_PALETTE.mint,5);
  }
  text('TESTE REAL · À NOITE',72,70,900,70,42,accent);
  text(slide.title,72,160,936,300,160,ink,true);
 }else if(!slide){
  text('O que pesa mais à noite?',72,105,936,300,112,ink,true);
  text('Iluminação, subida ou sinalização?',72,392,936,90,46,ink);
  FINAL_ACTIONS.forEach((label,i)=>{const x=72+i%2*480,y=545+Math.floor(i/2)*295;
   if(i===0){line(x+10,y+25,x+42,y+60);line(x+42,y+60,x+76,y+25);line(x+10,y+25,x+20,y+8);line(x+20,y+8,x+42,y+22);line(x+42,y+22,x+65,y+8);line(x+65,y+8,x+76,y+25);}
   if(i===1){line(x+8,y+42,x+80,y+4);line(x+80,y+4,x+55,y+67);line(x+80,y+4,x+8,y+18);}
   if(i===2){line(x+8,y+5,x+80,y+5);line(x+80,y+5,x+80,y+48);line(x+80,y+48,x+32,y+48);line(x+32,y+48,x+8,y+68);line(x+8,y+68,x+8,y+5);}
   if(i===3){line(x+10,y+5,x+68,y+5);line(x+10,y+5,x+10,y+70);line(x+68,y+5,x+68,y+70);line(x+10,y+70,x+39,y+50);line(x+39,y+50,x+68,y+70);}
   text(label,x,y+103,430,100,60,ink,true);
  });
 }else{
  text(slide.title,72,100,936,240,106,ink,true);
  if(module==='beam'){
   text('FRENTE',72,380,390,70,48,accent,true);text('TRASEIRA',630,380,390,70,48,accent,true);
   rect(105,500,48,105,accent);rect(750,520,38,65,accent);
   line(180,550,525,465,accent,5);line(180,550,525,635,accent,5);line(180,550,525,550,accent,5);
   line(815,550,945,510,accent,5);line(815,550,945,595,accent,5);
   text('Mesma bateria da bike',72,695,936,90,48,ink,true);
   text('Esquema ilustrativo · sem medição de alcance',72,794,936,70,40,accent);
  }else if(module==='load'){
   text(slide.concept?.metric?.value??'',72,345,936,220,194,accent,true);
   text('CAPACIDADE DECLARADA',72,599,936,70,48,accent,true);
   line(72,710,1000,710,accent,4);
   text('Não é o peso testado',72,760,936,85,54,ink,true);
  }else if(module==='route'){
   const pts=[[92,677],[300,677],[540,578],[745,578],[962,420]];
   pts.slice(1).forEach((p,i)=>line(pts[i][0],pts[i][1],p[0],p[1],accent,12));circle(92,677,14);circle(962,420,14);
   text('Só acelerando',72,365,680,75,50,ink,true);
   text('Relato do percurso · sem escala de inclinação',72,777,936,100,40,accent);
  }else if(module==='decision'||module==='comparison'){
   text('FUNCIONOU NO RELATO',72,365,936,75,46,accent,true);
   text('Luzes e trecho de subida',72,445,936,90,54,ink,true);
   line(72,605,1000,605,accent,4);
   text('RESSALVA DE USO',72,675,936,70,46,accent,true);
   text('Sinalização merece atenção',72,760,936,100,54,ink,true);
  }else{
   text(slide.concept?.metric?.value??'NA PRÁTICA',72,445,936,170,116,accent,true);
   text(slide.concept?.metric?.label??'',72,665,936,170,50,ink);
  }
  text(slide.body,72,922,936,310,44,ink);
 }
 text('@vitalemobilidade',672,1263,350,50,26,ink);
 return out;
}