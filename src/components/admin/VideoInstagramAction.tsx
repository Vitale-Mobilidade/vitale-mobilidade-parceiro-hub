import { Link } from '@tanstack/react-router';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { VideoEligibility } from '@/lib/instagram/video-selection';
export function VideoInstagramAction({source}: {source?:VideoEligibility;enabled:boolean;refresh:()=>Promise<unknown>}) {
 return <section className="border-t border-border pt-3">
  <Button asChild variant="outline"><Link to="/admin/podcasts"><ExternalLink/>Posts do Instagram no Podcast</Link></Button>
  {source?.jobId && <Button asChild variant="ghost"><Link to="/admin/instagram" search={prev=>({...prev,id:source.jobId??undefined,artPreview:prev.artPreview})}>Ver carrossel histórico</Link></Button>}
 </section>;
}
