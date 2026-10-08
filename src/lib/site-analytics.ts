import {
  publicAnalyticsPath,
  type SiteAnalyticsHit,
} from "../../supabase/functions/_shared/site-analytics";

type Send = typeof fetch;

function productionUrl(href: string): URL | null {
  try {
    const url = new URL(href);
    return url.hostname === "vitalemobilidade.com" ||
      url.hostname === "www.vitalemobilidade.com"
      ? url
      : null;
  } catch {
    return null;
  }
}

export function makeSiteAnalytics(
  endpoint: string,
  enabled: boolean,
  send: Send = fetch,
) {
  let lastPage: string | null = null;

  const emit = (hit: SiteAnalyticsHit) => {
    if (!enabled || !endpoint) return;
    try {
      void send(endpoint, {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hit),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* Analytics never interrupts rendering or navigation. */
    }
  };

  return {
    pageView(href: string) {
      if (!enabled) return;
      const url = productionUrl(href);
      const sourcePath = url && publicAnalyticsPath(url.pathname);
      if (!sourcePath || sourcePath === lastPage) return;
      lastPage = sourcePath;
      emit({ event: "page_view", sourcePath });
    },
    bikeClick(sourceHref: string, targetHref: string) {
      if (!enabled) return;
      const source = productionUrl(sourceHref);
      const target = productionUrl(targetHref);
      const sourcePath = source && publicAnalyticsPath(source.pathname);
      const targetPath = target && publicAnalyticsPath(target.pathname);
      const match = targetPath?.match(/^\/radar\/([a-z0-9_]{1,64})$/);
      if (!sourcePath || !targetPath || !match) return;
      emit({ event: "bike_click", sourcePath, targetPath, bikeId: match[1] });
    },
    affiliateClick(sourceHref: string, bikeId: string, position: string) {
      if (!enabled) return;
      const source = productionUrl(sourceHref);
      const sourcePath = source && publicAnalyticsPath(source.pathname);
      if (
        !sourcePath ||
        !/^[a-z0-9_]{1,64}$/.test(bikeId) ||
        !/^[a-z0-9_]{1,64}$/.test(position)
      )
        return;
      emit({ event: "affiliate_click", sourcePath, bikeId, position });
    },
  };
}

export function siteAnalyticsClientEnabled(
  production: boolean,
  publicFlag?: string,
) {
  return production && publicFlag !== "false";
}

export const siteAnalytics = makeSiteAnalytics(
  `${import.meta.env.VITE_SUPABASE_URL ?? ""}/functions/v1/site-analytics`,
  siteAnalyticsClientEnabled(
    import.meta.env.PROD,
    import.meta.env.VITE_SITE_ANALYTICS_ENABLED,
  ),
);
