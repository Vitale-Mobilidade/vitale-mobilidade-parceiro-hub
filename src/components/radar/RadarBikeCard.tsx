import { Link } from "react-router-dom";
import { BellRing, ExternalLink, LineChart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CLASSIFICATION_LABEL, formatBRL } from "@/lib/price-tracker";
import { CLASSIFICATION_COLOR, shortDiagnosis, type RadarEntry } from "@/lib/radar-rankings";
import { trackRadar } from "@/lib/radar-analytics";

interface Props {
  entry: RadarEntry;
  onAlert: (entry: RadarEntry) => void;
  highlight?: boolean;
}

export function RadarBikeCard({ entry, onAlert, highlight = false }: Props) {
  const cls = entry.metrics.classification;
  const savings = entry.savingsAbs !== null && entry.savingsAbs > 0 ? entry.savingsAbs : null;

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl ${
        highlight ? "border-primary/30" : "border-border/60"
      }`}
    >
      <Link
        to={`/acompanhamento/${entry.id}`}
        aria-label={`Ver análise de preço da ${entry.name}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className={`flex items-center justify-center overflow-hidden bg-green-50/70 ${highlight ? "h-64" : "h-52"}`}>
          {entry.image ? (
            <img
              src={entry.image}
              alt={`Bike elétrica ${entry.name}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            <span className="text-xs text-muted-foreground">Imagem indisponível</span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-base font-semibold leading-tight">
            <Link to={`/acompanhamento/${entry.id}`} className="hover:text-primary focus-visible:outline-none">
              {entry.name}
            </Link>
          </h3>
          <Badge className={`shrink-0 border-0 text-[11px] ${CLASSIFICATION_COLOR[cls]}`}>{CLASSIFICATION_LABEL[cls]}</Badge>
        </div>

        <p className="mt-3 text-3xl font-bold tracking-tight text-primary">{formatBRL(entry.currentPrice)}</p>
        {savings !== null && (
          <p className="text-sm font-medium text-primary">
            {formatBRL(savings)} abaixo do típico ({Math.abs(entry.savingsPct ?? 0).toFixed(1)}%)
          </p>
        )}
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{shortDiagnosis(entry)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Preço típico do período: {formatBRL(entry.metrics.typicalPrice)}
        </p>

        <div className="mt-auto space-y-2 pt-4">
          <Button asChild className="min-h-12 w-full bg-gradient-green text-white hover:opacity-90">
            <a
              href={entry.link}
              target="_blank"
              rel="noopener noreferrer nofollow sponsored"
              onClick={() => trackRadar("radar_ml_click", { bike_id: entry.id, position: highlight ? "highlight" : "catalog" })}
            >
              Ver oferta no Mercado Livre <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="min-h-11 flex-1">
              <Link to={`/acompanhamento/${entry.id}`}>
                <LineChart className="mr-2 h-4 w-4" aria-hidden="true" /> Ver análise
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 px-3"
              aria-label={`Ser avisado quando a ${entry.name} baixar`}
              onClick={() => {
                trackRadar("radar_alert_opened", { bike_id: entry.id, source: "card" });
                onAlert(entry);
              }}
            >
              <BellRing className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Link de afiliado. Preço e disponibilidade podem mudar no Mercado Livre.
          </p>
        </div>
      </div>
    </article>
  );
}
