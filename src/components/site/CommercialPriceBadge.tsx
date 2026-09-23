import { commercialBadge, type CommercialBadgeKind, type BadgeInput } from "@/lib/commercial-badge";

const TONE: Record<CommercialBadgeKind, string> = {
  unavailable: "bg-ink-foreground/10 text-ink-foreground ring-1 ring-ink-foreground/25",
  neutral: "bg-ink-foreground/10 text-ink-foreground ring-1 ring-ink-foreground/25",
  lowest: "bg-action text-action-foreground",
  opportunity: "bg-mint text-ink",
  typical: "bg-ink-foreground/10 text-ink-foreground ring-1 ring-ink-foreground/25",
  above: "bg-destructive text-destructive-foreground",
};

/**
 * Selo comercial exclusivo da página canônica da bike.
 * Cor é apoio; o texto sozinho já comunica o estado (acessibilidade).
 */
export function CommercialPriceBadge({ hasOffer, classification }: BadgeInput) {
  const badge = commercialBadge({ hasOffer, classification });
  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ${TONE[badge.kind]}`}>
        {badge.label}
      </span>
      <p className="text-xs text-ink-foreground/70">{badge.hint}</p>
    </div>
  );
}
