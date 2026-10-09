export const SITE_ANALYTICS_EVENTS = [
  "page_view",
  "bike_click",
  "affiliate_click",
] as const;
export type SiteAnalyticsEvent = (typeof SITE_ANALYTICS_EVENTS)[number];

export type SiteAnalyticsHit =
  | { event: "page_view"; sourcePath: string }
  | {
      event: "bike_click";
      sourcePath: string;
      targetPath: string;
      bikeId: string;
    }
  | {
      event: "affiliate_click";
      sourcePath: string;
      bikeId: string;
      position: string;
    };

const BIKE_ID_RE = /^[a-z0-9_]{1,64}$/;
const POSITION_RE = /^[a-z0-9_]{1,64}$/;
const STATIC_PATHS = new Set([
  "/",
  "/radar",
  "/quiz",
  "/escolherbike",
  "/conteudos",
  "/ferramentas",
  "/privacidade",
  "/grupodeofertas",
  "/bikes",
  "/acompanhamento",
  "/calculadoras/carro-vs-bike",
  "/calculadoras/custo-anual-mobilidade",
  "/calculadoras/economia",
  "/calculadoras/moto-vs-bike",
  "/calculadoras/payback",
  "/calculadoras/tempo-no-transito",
  "/calculadoras/tempo-recuperado",
  "/calculadoras/transporte-publico-vs-bike",
  "/calculadoras/uber-vs-bike",
  "/ferramentas/aplicativos-vs-bike",
  "/ferramentas/carro-vs-bike",
  "/ferramentas/economia-de-tempo",
  "/ferramentas/meta-entregas",
  "/ferramentas/moto-vs-bike",
  "/ferramentas/transporte-publico-vs-bike",
  "/ferramentas/veiculo-alugado-vs-bike-propria",
]);

/** Public pathname only: never accepts query, hash, admin or technical paths. */
export function publicAnalyticsPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 220) return null;
  const path = value.replace(/\/+$/, "") || "/";
  if (STATIC_PATHS.has(path)) return path;
  if (/^\/radar\/[a-z0-9_]{1,64}$/.test(path)) return path;
  if (/^\/acompanhamento\/[a-z0-9_]{1,64}$/.test(path)) return path;
  if (/^\/bikes\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path)) return path;
  if (/^\/conteudos\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path)) return path;
  return null;
}

/** Inclusive calendar-day window in America/Sao_Paulo. */
export function siteAnalyticsStartDay(now: Date, rangeDays: number): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const day = new Date(
    Date.UTC(value("year"), value("month") - 1, value("day"), 12),
  );
  day.setUTCDate(day.getUTCDate() - Math.max(1, rangeDays) + 1);
  return day.toISOString().slice(0, 10);
}

function exactKeys(value: Record<string, unknown>, expected: string[]) {
  return Object.keys(value).sort().join(",") === [...expected].sort().join(",");
}

export function validateSiteAnalyticsHit(
  value: unknown,
): SiteAnalyticsHit | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const event = input.event;
  const sourcePath = publicAnalyticsPath(input.sourcePath);
  if (
    !sourcePath ||
    !SITE_ANALYTICS_EVENTS.includes(event as SiteAnalyticsEvent)
  )
    return null;
  if (event === "page_view") {
    return exactKeys(input, ["event", "sourcePath"])
      ? { event, sourcePath }
      : null;
  }
  const bikeId = typeof input.bikeId === "string" ? input.bikeId : "";
  if (!BIKE_ID_RE.test(bikeId)) return null;
  if (event === "bike_click") {
    const targetPath = publicAnalyticsPath(input.targetPath);
    if (!targetPath || targetPath !== `/radar/${bikeId}`) return null;
    return exactKeys(input, ["bikeId", "event", "sourcePath", "targetPath"])
      ? { event, sourcePath, targetPath, bikeId }
      : null;
  }
  const position = typeof input.position === "string" ? input.position : "";
  if (!POSITION_RE.test(position)) return null;
  return exactKeys(input, ["bikeId", "event", "position", "sourcePath"])
    ? { event: "affiliate_click", sourcePath, bikeId, position }
    : null;
}
