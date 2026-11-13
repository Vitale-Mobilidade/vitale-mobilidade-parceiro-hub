import { createFileRoute } from '@tanstack/react-router';
import AdminInstagram from '@/pages/AdminInstagram';
import { lazy, Suspense } from 'react';
// Vite removes this import branch in production, including the local review JPEGs.
const InstagramArtPreview=import.meta.env.DEV?lazy(()=>import('@/components/admin/InstagramArtPreview')):null;
export const Route=createFileRoute('/admin/instagram')({validateSearch:(search:Record<string,unknown>)=>({artPreview:String(search.artPreview)==='2'?'2':undefined}),head:()=>({meta:[{title:'Instagram · Admin Vitale Mobilidade'},{name:'description',content:'Revisão privada de carrosséis da Vitale Mobilidade.'},{property:'og:title',content:'Instagram · Admin Vitale Mobilidade'},{property:'og:description',content:'Fontes, artes e aprovação editorial de carrosséis.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'},{name:'robots',content:'noindex, nofollow'}]}),component:InstagramRoute});
function InstagramRoute(){const search=Route.useSearch();return import.meta.env.DEV&&InstagramArtPreview&&search.artPreview==='2'?<Suspense fallback={null}><InstagramArtPreview/></Suspense>:<AdminInstagram/>;}
