import { siteAnalytics } from "@/lib/site-analytics";
import { WOSI_URL } from "../../../supabase/functions/_shared/wosi-campaign";
import { useState } from "react";
import { Pause, Play } from "lucide-react";

const ALT =
  "Seguro para sua bike elétrica em parceria com a Wosi. 5% de desconto com o cupom VITALE. Simular seguro (abre em nova aba).";

/** Publicidade SSR: o navegador escolhe uma única arte, sem consultar a viewport em JS. */
export function WosiBanner({
  article = false,
  className = "",
}: {
  article?: boolean;
  className?: string;
}) {
  const [paused, setPaused] = useState(false);
  return (
    <aside aria-label="Publicidade Wosi" className={`min-w-0 ${className}`}>
      <div className="group relative">
        {!article && (
          <button
            type="button"
            onClick={() => setPaused(!paused)}
            aria-label={paused ? "Retomar animação" : "Pausar animação"}
            aria-pressed={paused}
            className="wosi-motion-control absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/75 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
          >
            {paused ? (
              <Play className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Pause className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
        <a
          href={WOSI_URL}
          onClick={() =>
            siteAnalytics.wosiClick(
              window.location.href,
              article ? "article" : "site",
            )
          }
          onAuxClick={(event) => {
            if (event.button === 1)
              siteAnalytics.wosiClick(
                window.location.href,
                article ? "article" : "site",
              );
          }}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action"
        >
          {article ? (
            <img
              src="/ads/wosi/article.png"
              alt={ALT}
              width={793}
              height={214}
              loading="lazy"
              decoding="async"
              className="block h-auto w-full"
            />
          ) : (
            <picture>
              <source
                media="(prefers-reduced-motion: reduce) and (max-width: 767px)"
                srcSet="/ads/wosi/site-mobile-still.png"
                width={793}
                height={495}
              />
              <source
                media="(prefers-reduced-motion: reduce)"
                srcSet="/ads/wosi/site-desktop-still.png"
                width={2168}
                height={176}
              />
              <source
                media="(max-width: 767px)"
                srcSet={`/ads/wosi/site-mobile${paused ? "-still.png" : ".gif"}`}
                width={793}
                height={495}
              />
              <img
                src={`/ads/wosi/site-desktop${paused ? "-still.png" : ".gif"}`}
                alt={ALT}
                width={2168}
                height={176}
                loading="lazy"
                decoding="async"
                className="block h-auto w-full"
              />
            </picture>
          )}
        </a>
      </div>
    </aside>
  );
}
