/** Pure raster compositor; photos are contained, never regenerated or cropped. */
import * as jpeg from './codecs/jpeg.server.js';
import * as png from './codecs/png.server.js';
import { Font, Layout } from './codecs/font.server.js';
import { interFontBase64 } from '../../../supabase/functions/_shared/cover-renderer/assets.ts';
import { inspectJpeg } from '../../../supabase/functions/_shared/editorial-cover';
import { WIDTH,HEIGHT,FINAL_ACTIONS,type Slide } from './contract';
import decodeWebp, { init as initWebp } from '@jsquash/webp/decode';
import webpModule from './codecs/webp.wasm?module';
export const palette={petroleum:[17,45,42],deep:[8,43,41],light:[248,252,250],mint:[55,230,163],action:[11,121,81]} as const;
export type Raster={width:number;height:number;buffer:Uint8Array};
let webpReady:Promise<void>|undefined;
export function photoFormat(bytes:Uint8Array):'image/png'|'image/jpeg'|'image/webp'{
 if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'image/png';
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 const ascii=(at:number,value:string)=>[...value].every((c,i)=>bytes[at+i]===c.charCodeAt(0));
 if(bytes.length>=12&&ascii(0,'RIFF')&&ascii(8,'WEBP'))return 'image/webp';
 throw Error('instagram_photo_format');
}
function bounded(width:number,height:number){
 if(width<1||height<1||width>8192||height>8192||width*height>4200000)throw Error('instagram_photo_dimensions');
}
function webpDimensions(bytes:Uint8Array){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(view.getUint32(4,true)+8!==bytes.length)throw Error('instagram_photo_format');
 const u24=(at:number)=>bytes[at]+bytes[at+1]*256+bytes[at+2]*65536;
 for(let at=12;at+8<=bytes.length;){
  const kind=String.fromCharCode(...bytes.subarray(at,at+4)),size=view.getUint32(at+4,true),p=at+8;
  if(p+size>bytes.length)throw Error('instagram_photo_format');
  if(kind==='ANIM'||kind==='ANMF')throw Error('instagram_photo_animation');
  if(kind==='VP8X'&&size>=10){if(bytes[p]&2)throw Error('instagram_photo_animation');bounded(u24(p+4)+1,u24(p+7)+1);}
  if(kind==='VP8 '&&size>=10){if(bytes[p+3]!==157||bytes[p+4]!==1||bytes[p+5]!==42)throw Error('instagram_photo_format');return {width:view.getUint16(p+6,true)&16383,height:view.getUint16(p+8,true)&16383};}
  if(kind==='VP8L'&&size>=5&&bytes[p]===47){const bits=view.getUint32(p+1,true);return {width:(bits&16383)+1,height:((bits>>>14)&16383)+1};}
  at=p+size+(size%2);
 }
 throw Error('instagram_photo_format');
}
export async function decodePhoto(bytes:Uint8Array,_mime?:string):Promise<Raster>{
 if(bytes.length>12*1024*1024)throw Error('instagram_photo_too_large');
 const mime=photoFormat(bytes);
 if(mime==='image/webp'){
  const d=webpDimensions(bytes);bounded(d.width,d.height);
  webpReady??=initWebp({instantiateWasm(imports:WebAssembly.Imports,callback:(instance:WebAssembly.Instance)=>void){const instance=new WebAssembly.Instance(webpModule,imports);callback(instance);return instance.exports;}});
  await webpReady;
  const img=await decodeWebp(new Uint8Array(bytes).buffer);bounded(img.width,img.height);
  if(img.width!==d.width||img.height!==d.height)throw Error('instagram_photo_dimensions');
  return {width:img.width,height:img.height,buffer:new Uint8Array(img.data)};
 }
 if(mime==='image/png'){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(bytes.length<24)throw Error('instagram_photo_dimensions');bounded(view.getUint32(16),view.getUint32(20));
  const img=png.decode(bytes);return {width:img.width,height:img.height,buffer:img.framebuffer};
 }
 const d=inspectJpeg(bytes);if(!d)throw Error('instagram_photo_format');bounded(d.width,d.height);
 const img=jpeg.decode(bytes,0,0);if(![0,1].includes(img.format))throw Error('instagram_photo_color');
 const channels=img.format===0?1:3;const buffer=new Uint8Array(img.width*img.height*4);
 for(let i=0;i<img.width*img.height;i++){for(let c=0;c<3;c++)buffer[i*4+c]=img.buffer[i*channels+(channels===1?0:c)];buffer[i*4+3]=255;}
 return {width:img.width,height:img.height,buffer};
}
export function containPhoto(out:Uint8Array,photo:Raster,x:number,y:number,w:number,h:number){
 const scale=Math.min(w/photo.width,h/photo.height),rw=Math.max(1,Math.floor(photo.width*scale)),rh=Math.max(1,Math.floor(photo.height*scale));
 const ox=x+Math.floor((w-rw)/2),oy=y+Math.floor((h-rh)/2);
 for(let py=0;py<rh;py++)for(let px=0;px<rw;px++){
  const at=(Math.min(photo.height-1,Math.floor(py/scale))*photo.width+Math.min(photo.width-1,Math.floor(px/scale)))*4;
  const to=((oy+py)*WIDTH+ox+px)*4,a=photo.buffer[at+3]/255;
  for(let c=0;c<3;c++)out[to+c]=out[to+c]*(1-a)+photo.buffer[at+c]*a;
 }
 return {x:ox,y:oy,width:rw,height:rh};
}
export function renderSlide(slide:Slide|null,photos:Raster[]=[],scene:Raster|null=null){
 const theme=slide?.theme??'deep',color=palette[theme],ink=theme==='light'?palette.deep:palette.light;
 const out=new Uint8Array(WIDTH*HEIGHT*4);for(let p=0;p<out.length;p+=4)out.set([...color,255],p);
 const fontBytes=Uint8Array.from(atob(interFontBase64),c=>c.charCodeAt(0));const fonts:Font[]=[];
 function rectangle(x:number,y:number,w:number,h:number,c:readonly number[]){for(let py=Math.max(0,y);py<Math.min(HEIGHT,y+h);py++)for(let px=Math.max(0,x);px<Math.min(WIDTH,x+w);px++)out.set([...c,255],(py*WIDTH+px)*4);}
 function text(value:string,x:number,y:number,maxWidth:number,maxHeight:number,preferred:number,c:readonly number[]){
  for(let size=preferred;size>=22;size-=2){
   const f=new Font(size,fontBytes);fonts.push(f);const words=value.split(/\s+/),lines:string[]=[];let line='';
   const width=(s:string)=>[...s].reduce((n,ch)=>n+f.metrics(ch,size).advance_width,0);
   for(const word of words){if(width(word)>maxWidth){line='';lines.length=1000;break;}const candidate=line?`${line} ${word}`:word;if(width(candidate)>maxWidth){lines.push(line);line=word;}else line=candidate;}
   if(line)lines.push(line);if(lines.length*size*1.22>maxHeight)continue;
   const rasters=lines.map(s=>{const l=new Layout();try{l.reset({wrap_style:'word',vertical_align:'top',horizontal_align:'left'});l.append(f,s,{scale:size});return l.rasterize(c[0],c[1],c[2]);}finally{l.free();}});
   if(rasters.some(r=>r.width>maxWidth))continue;
   for(let i=0;i<rasters.length;i++){const r=rasters[i];const yy=Math.round(y+i*size*1.22);for(let py=0;py<r.height;py++)for(let px=0;px<r.width;px++){const at=(py*r.width+px)*4,to=((yy+py)*WIDTH+x+px)*4,a=r.buffer[at+3]/255;if(yy+py>=HEIGHT||x+px>=WIDTH)continue;for(let ch=0;ch<3;ch++)out[to+ch]=out[to+ch]*(1-a)+r.buffer[at+ch]*a;}}
   return;
  }throw Error('instagram_text_does_not_fit');
 }
 function line(x1:number,y1:number,x2:number,y2:number){const steps=Math.ceil(Math.hypot(x2-x1,y2-y1));for(let i=0;i<=steps;i++)rectangle(Math.round(x1+(x2-x1)*i/steps),Math.round(y1+(y2-y1)*i/steps),5,5,palette.mint);}
 try{
  rectangle(72,74,76,6,palette.mint);
  text('@vitalemobilidade',655,1250,350,50,27,ink);
  if(!slide){
   text('A conversa continua com você.',72,145,936,290,90,ink);
   FINAL_ACTIONS.forEach((label,i)=>{
    const x=72+(i%2)*480,y=560+Math.floor(i/2)*280;
    // Familiar deterministic icons, not model text or an alternative CTA.
    if(i===0){line(x+15,y+28,x+40,y+50);line(x+40,y+50,x+66,y+28);line(x+15,y+28,x+25,y+12);line(x+25,y+12,x+40,y+24);line(x+40,y+24,x+55,y+12);line(x+55,y+12,x+66,y+28);}
    if(i===1){line(x+8,y+45,x+70,y+8);line(x+70,y+8,x+56,y+55);line(x+70,y+8,x+8,y+18);}
    if(i===2){line(x+8,y+8,x+70,y+8);line(x+70,y+8,x+70,y+45);line(x+70,y+45,x+30,y+45);line(x+30,y+45,x+8,y+65);line(x+8,y+65,x+8,y+8);}
    if(i===3){line(x+12,y+8,x+65,y+8);line(x+12,y+8,x+12,y+65);line(x+65,y+8,x+65,y+65);line(x+12,y+65,x+39,y+48);line(x+39,y+48,x+65,y+65);}
    text(label,x,y+92,430,92,48,ink);
   });
  }else{
   text(slide.title,72,125,936,290,slide.layout==='opening'?90:76,ink);
   const withPhoto=photos.length>0;
   const geometry=slideGeometry(slide.layout,withPhoto||!!scene);
   if(scene)containPhoto(out,scene,72,geometry.photoY,936,geometry.photoHeight);
   if(withPhoto)photos.forEach((photo,i)=>containPhoto(out,photo,72+i*(936/photos.length),geometry.photoY,936/photos.length,geometry.photoHeight));
   // Diagram is typographic: never invent a battery/accessory drawing.
   if(slide.layout==='comparison')rectangle(537,450,6,510,palette.mint);
   if(slide.layout==='conclusion')rectangle(72,440,936,6,palette.mint);
   text(slide.body,72,geometry.bodyY,936,geometry.bodyHeight,slide.layout==='numbers'?62:42,ink);
  }
  const bytes=jpeg.encode(out,WIDTH,HEIGHT,88);if(inspectJpeg(bytes)?.width!==WIDTH)throw Error('instagram_render_invalid');
  // JPEG RGB encoding uses sRGB samples; Exif ColorSpace=1 declares sRGB explicitly.
  const exif=Uint8Array.from([255,225,0,46,69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,105,135,4,0,1,0,0,0,26,0,0,0,0,0,0,0,1,0,1,160,3,0,1,0,0,0,1,0]);
  const final=new Uint8Array(bytes.length+exif.length);final.set(bytes.slice(0,2));final.set(exif,2);final.set(bytes.slice(2),2+exif.length);
  return {bytes:final,actions:slide?[]:[...FINAL_ACTIONS],width:WIDTH,height:HEIGHT};
 }finally{fonts.forEach(f=>f.free());}
}
export function slideGeometry(layout:Slide['layout'],media:boolean){
 if(!media)return {photoY:470,photoHeight:480,bodyY:485,bodyHeight:660};
 if(layout==='numbers'||layout==='diagram')return {photoY:785,photoHeight:400,bodyY:465,bodyHeight:280};
 if(layout==='conclusion')return {photoY:790,photoHeight:380,bodyY:480,bodyHeight:260};
 if(layout==='opening')return {photoY:440,photoHeight:510,bodyY:980,bodyHeight:220};
 return {photoY:470,photoHeight:480,bodyY:995,bodyHeight:210};
}
