import { createFileRoute } from '@tanstack/react-router';
export const Route=createFileRoute('/api/public/instagram/tick')({server:{handlers:{POST:async({request})=>{const {instagramTick}=await import('@/lib/instagram/scheduler.server');return instagramTick(request);}}}});
