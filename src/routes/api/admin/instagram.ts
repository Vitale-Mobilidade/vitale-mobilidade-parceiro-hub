import { createFileRoute } from '@tanstack/react-router';
export const Route=createFileRoute('/api/admin/instagram')({server:{handlers:{POST:async({request})=>{const {instagramAdmin}=await import('@/lib/instagram/admin.server');return instagramAdmin(request);}}}});
