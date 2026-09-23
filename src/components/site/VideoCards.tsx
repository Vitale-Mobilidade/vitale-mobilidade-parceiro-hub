import { Youtube } from "lucide-react";
import type { VideoCard } from "@/lib/videos.functions";

function fmtDate(iso: string | null) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Cards de vídeos reais do canal (links diretos ao YouTube). Nada é exibido se a lista estiver vazia. */
export function VideoCards({ videos, className = "" }: { videos: VideoCard[]; className?: string }) {
  if (!videos.length) return null;
  return (
    <ul className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {videos.map((v) => (
        <li key={v.videoId} className="overflow-hidden rounded-2xl bg-card ring-1 ring-line">
          <a href={v.url} target="_blank" rel="noopener noreferrer" className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action">
            <div className="relative aspect-video bg-muted">
              <img src={v.thumbnail} alt="" loading="lazy" decoding="async" width={320} height={180} className="h-full w-full object-cover" />
              <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-xs font-semibold text-ink">
                <Youtube className="h-3.5 w-3.5 text-destructive" aria-hidden="true" /> YouTube
              </span>
            </div>
            <div className="p-4">
              <h3 className="line-clamp-2 text-sm font-bold text-ink group-hover:underline">{v.title}</h3>
              {fmtDate(v.date) && <p className="mt-1 text-xs text-muted-foreground"><time dateTime={v.date!}>{fmtDate(v.date)}</time></p>}
              <span className="sr-only"> (abre o YouTube em nova aba)</span>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
