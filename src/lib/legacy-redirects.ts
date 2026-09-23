// Redirects permanentes de slugs abandonados, avaliados antes do SSR (rollback = remover o bloco em src/server.ts).
import { legacyRadarRedirect } from "./radar-base";

/** /calc e /calc/ → /ferramentas, preservando query/UTM. Não captura /calculadoras/*. */
export function legacyToolsRedirect(pathname: string, search: string): string | null {
  return /^\/calc\/?$/.test(pathname) ? `/ferramentas${search}` : null;
}

/** Único ponto de decisão de redirect legado do site. */
export function legacyRedirect(pathname: string, search: string): string | null {
  return legacyRadarRedirect(pathname, search) ?? legacyToolsRedirect(pathname, search);
}
