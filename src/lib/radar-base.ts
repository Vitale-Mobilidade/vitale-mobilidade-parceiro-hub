// Base de URL do Radar. `/acompanhamento` é o Radar legado (funcional); `/radar` é a rota-alvo.
// As duas usam os mesmos loaders/componentes — só os links internos mudam de base.
import { useLocation } from "@/lib/router-compat";

export type RadarBase = "/acompanhamento" | "/radar";
export const LEGACY_RADAR_BASE: RadarBase = "/acompanhamento";
export const RADAR_PATH: RadarBase = "/radar";
export const SITE_ORIGIN = "https://vitalemobilidade.com";

export function radarBaseFromPath(pathname: string): RadarBase {
  return pathname === "/radar" || pathname.startsWith("/radar/") ? "/radar" : pathname === "/acompanhamento" || pathname.startsWith("/acompanhamento/") ? LEGACY_RADAR_BASE : RADAR_PATH;
}

/** Fora das páginas do Radar (Home, /bikes…) usa /radar (cutover). */
export function useRadarBase(): RadarBase {
  return radarBaseFromPath(useLocation().pathname);
}

/**
 * Cutover Etapa 9: /acompanhamento[/{bikeId}] → /radar[/{bikeId}] (301).
 * bikeId literal (sem decodificar/normalizar) e query/UTM preservados. Sem DB.
 */
export function legacyRadarRedirect(pathname: string, search: string): string | null {
  const m = /^\/acompanhamento(?:\/([^/]+))?\/?$/.exec(pathname);
  if (!m) return null;
  return `/radar${m[1] ? `/${m[1]}` : ""}${search}`;
}
