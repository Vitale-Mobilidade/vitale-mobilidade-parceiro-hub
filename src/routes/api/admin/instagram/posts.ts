import {createFileRoute} from '@tanstack/react-router';
export const Route=createFileRoute('/api/admin/instagram/posts')({server:{handlers:{POST:async({request})=>{
 const {singleImageAdmin}=await import('@/lib/instagram/single-image.server');return singleImageAdmin(request);
}}}});