// Base de URL do Radar. `/acompanhamento` é o Radar legado (funcional); `/radar` é a rota-alvo.
// As duas usam os mesmos loaders/componentes — só os links internos mudam de base.
import { useLocation } from "@/lib/router-compat";

export type RadarBase = "/acompanhamento" | "/radar";
export const LEGACY_RADAR_BASE: RadarBase = "/acompanhamento";
export const SITE_ORIGIN = "https://vitalemobilidade.com";

export function radarBaseFromPath(pathname: string): RadarBase {
  return pathname === "/radar" || pathname.startsWith("/radar/") ? "/radar" : LEGACY_RADAR_BASE;
}

/** Fora das páginas do Radar (Home, /bikes…) mantém o legado até o cutover aprovado. */
export function useRadarBase(): RadarBase {
  return radarBaseFromPath(useLocation().pathname);
}
