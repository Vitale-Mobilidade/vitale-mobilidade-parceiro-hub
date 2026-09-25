import { MessageCircle } from "lucide-react";
import { OFFERS_GROUP_URL, trackRadar } from "@/lib/radar-analytics";
import { OffersBanner } from "@/components/site/DecisionBanners";

interface Props {
  source: string;
  variant?: "banner" | "inline";
}

/** CTA visual, porém secundário, para o grupo de ofertas da Vitale. */
export function OffersGroupCta({ source, variant = "banner" }: Props) {
  if (variant === "inline") {
    return (
      <a
        href={OFFERS_GROUP_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackRadar("radar_group_click", { source })}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" /> Entre no grupo de ofertas da Vitale
      </a>
    );
  }

  return <OffersBanner />;
}
