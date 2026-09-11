import { MessageCircle } from "lucide-react";
import { OFFERS_GROUP_URL, trackRadar } from "@/lib/radar-analytics";

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

  return (
    <a
      href={OFFERS_GROUP_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackRadar("radar_group_click", { source })}
      className="flex flex-col gap-1 rounded-2xl border border-primary/20 bg-green-50/70 px-5 py-4 transition hover:border-primary/40 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex-row sm:items-center sm:justify-between"
    >
      <span>
        <span className="flex items-center gap-2 text-base font-semibold">
          <MessageCircle className="h-5 w-5 text-primary" aria-hidden="true" />
          Entre no grupo de ofertas da Vitale
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">
          Receba oportunidades selecionadas de bikes elétricas no WhatsApp.
        </span>
      </span>
      <span className="mt-1 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground sm:mt-0">
        Entrar no grupo
      </span>
    </a>
  );
}
