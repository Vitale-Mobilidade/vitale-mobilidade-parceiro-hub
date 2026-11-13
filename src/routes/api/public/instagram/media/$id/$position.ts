import { createFileRoute } from '@tanstack/react-router';
export const Route=createFileRoute('/api/public/instagram/media/$id/$position')({server:{handlers:{GET:async({request,params})=>{const {instagramAsset}=await import('@/lib/instagram/admin.server');return instagramAsset(request,params.id,params.position,true);}}}});
