import { useState } from 'react';
import { ChevronLeft,ChevronRight,Download,Grid2X2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import a1 from '../../../docs/preview/instagram-art-v2/01.jpg?url';
import a2 from '../../../docs/preview/instagram-art-v2/02.jpg?url';
import a3 from '../../../docs/preview/instagram-art-v2/03.jpg?url';
import a4 from '../../../docs/preview/instagram-art-v2/04.jpg?url';
import a5 from '../../../docs/preview/instagram-art-v2/05.jpg?url';
import a6 from '../../../docs/preview/instagram-art-v2/06.jpg?url';
import { previewScript } from '@/lib/instagram/art-v2.fixture';
import { previewScript as v3Script } from '@/lib/instagram/art-v3.fixture';
import b1 from '../../../docs/preview/instagram-art-v3/01.jpg?url';
import b2 from '../../../docs/preview/instagram-art-v3/02.jpg?url';
import b3 from '../../../docs/preview/instagram-art-v3/03.jpg?url';
import b4 from '../../../docs/preview/instagram-art-v3/04.jpg?url';
import b5 from '../../../docs/preview/instagram-art-v3/05.jpg?url';
import b6 from '../../../docs/preview/instagram-art-v3/06.jpg?url';
const assets=[a1,a2,a3,a4,a5,a6];
/** Development-only gallery: never calls the API or restores/mutates the real draft. */
export default function InstagramArtPreview({version=3}:{version?:2|3}){
 const [selected,setSelected]=useState<number|null>(null);
 const [current,setCurrent]=useState(version);
 const script=current===3?v3Script:previewScript;
 const galleryAssets=current===3?[b1,b2,b3,b4,b5,b6]:assets;
 const alt=(i:number)=>script.slides[i]?.alt??'Ícones Curta, Compartilhe, Comente e Salve em fundo claro.';
 return <main className="min-h-screen bg-background text-foreground"><div className="mx-auto max-w-[1600px] px-0 py-8 sm:px-8">
  <header className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-muted-foreground">Vitale Mobilidade · Prévia sandbox</p><h1 className="mt-1 text-3xl font-bold">V9 Max à noite</h1><p className="mt-2 text-sm text-muted-foreground">Direção de arte v{current} · seis JPEGs · rascunho real preservado</p></div><div className="flex gap-2">{([2,3] as const).map(v=><Button key={v} variant={v===current?'default':'outline'} onClick={()=>{setCurrent(v);setSelected(null);}} aria-pressed={v===current}>v{v}</Button>)}<Button variant="outline" onClick={()=>setSelected(null)} aria-label="Ver seis slides" title="Ver seis slides"><Grid2X2/>Seis slides</Button></div></header>
  {selected===null?<ol className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{galleryAssets.map((asset,i)=><li key={asset}><Button variant="ghost" className="h-auto w-full p-0" aria-label={`Ver slide ${i+1} no feed`} onClick={()=>setSelected(i)}><img src={asset} alt={alt(i)} className="aspect-[4/5] w-full object-contain" width={1080} height={1350}/></Button><p className="mt-2 text-sm text-muted-foreground">{i+1} / 6 · {script.slides[i]?.concept?.module??'Quatro ações'}</p></li>)}</ol>:<section className="mx-auto max-w-[390px]"><div className="mb-3 flex items-center justify-between"><Button variant="ghost" size="icon" disabled={selected===0} onClick={()=>setSelected(selected-1)} aria-label="Slide anterior" title="Anterior"><ChevronLeft/></Button><span className="text-sm">{selected+1} / 6</span><Button variant="ghost" size="icon" disabled={selected===5} onClick={()=>setSelected(selected+1)} aria-label="Próximo slide" title="Próximo"><ChevronRight/></Button></div><img src={galleryAssets[selected]} alt={alt(selected)} width={1080} height={1350} className="aspect-[4/5] w-full object-contain"/><Button asChild variant="outline" className="mt-4 w-full"><a href={galleryAssets[selected]} download={`vitale-v${current}-${selected+1}.jpg`}><Download/>Abrir JPEG</a></Button></section>}
 </div></main>;
}