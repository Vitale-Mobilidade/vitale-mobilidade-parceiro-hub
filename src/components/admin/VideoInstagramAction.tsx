import { Link } from '@tanstack/react-router';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { VideoEligibility } from '@/lib/instagram/video-selection';
export function VideoInstagramAction(_props: {source?:VideoEligibility;enabled:boolean;refresh:()=>Promise<unknown>}) {
 return <section className="border-t border-border pt-3">
  <Button asChild variant="outline"><Link to="/admin/instagram" search={{id:undefined,artPreview:undefined}}><ExternalLink/>Instagram</Link></Button>
 </section>;
}
