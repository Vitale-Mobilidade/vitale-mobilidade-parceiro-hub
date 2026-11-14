import { createFileRoute } from '@tanstack/react-router';
import AdminInstagram from '@/pages/AdminInstagram';
import {selectedJobId} from '@/lib/instagram/video-selection';
export const Route=createFileRoute('/admin/instagram')({validateSearch:(search:Record<string,unknown>)=>({id:selectedJobId(search.id),artPreview:['2','3'].includes(String(search.artPreview))?String(search.artPreview):undefined}),head:()=>({meta:[{title:'Instagram · Admin Vitale Mobilidade'},{name:'description',content:'Gestão privada dos posts de imagem única da Vitale Mobilidade.'},{property:'og:title',content:'Instagram · Admin Vitale Mobilidade'},{property:'og:description',content:'Fila, revisão de capa e legenda e histórico confirmado do Instagram.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'},{name:'robots',content:'noindex, nofollow'}]}),component:InstagramRoute});
// All review modes now pass through the same AdminShell; search never bypasses auth.
function InstagramRoute(){return <AdminInstagram/>;}
