export type PageMetric = { path: string; views: number };

export type PageRankingItem = PageMetric & {
  area: string;
  label: string;
  share: number;
};

const isRoute = (path: string, root: string) => path === root || path.startsWith(`${root}/`);
const searchable = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-BR");

export function isCanonicalPublicPath(path: string) {
  return path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("\\") &&
    !path.includes("?") &&
    !path.includes("#") &&
    !/[\u0000-\u001f\u007f]/.test(path);
}

function humanizeSegment(value: string) {
  const text = value.replace(/[-_]+/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Página";
}

export function pageArea(path: string) {
  if (path === "/") return "Home";
  if (isRoute(path, "/quiz") || isRoute(path, "/escolherbike")) return "Quiz";
  if (isRoute(path, "/radar")) return "Radar";
  if (isRoute(path, "/conteudos")) return "Conteúdo";
  if (isRoute(path, "/ferramentas")) return "Ferramenta";
  if (isRoute(path, "/calculadoras")) return "Calculadora";
  if (isRoute(path, "/grupodeofertas")) return "Ofertas";
  if (isRoute(path, "/privacidade")) return "Institucional";
  if (isRoute(path, "/bikes") || isRoute(path, "/acompanhamento")) return "Legado";
  return "Outras";
}

export function pageLabel(path: string) {
  if (path === "/") return "Página inicial";
  if (path === "/radar") return "Radar de bikes";
  if (path === "/quiz") return "Quiz — escolher minha bike";
  if (path === "/conteudos") return "Conteúdos";
  if (path === "/ferramentas") return "Ferramentas";
  const segment = path.split("/").filter(Boolean).at(-1) ?? path;
  return humanizeSegment(segment);
}

export function buildPageRanking(
  pages: PageMetric[],
  totalViews: number,
  query = "",
): PageRankingItem[] {
  const normalizedQuery = searchable(query.trim());
  const safeTotal = Number.isFinite(totalViews) && totalViews > 0 ? totalViews : 0;
  return pages
    .filter((page) => (
      typeof page.path === "string" &&
      isCanonicalPublicPath(page.path) &&
      Number.isFinite(page.views) &&
      page.views >= 0
    ))
    .map((page) => ({
      ...page,
      area: pageArea(page.path),
      label: pageLabel(page.path),
      share: safeTotal ? page.views / safeTotal : 0,
    }))
    .sort((left, right) => right.views - left.views || left.path.localeCompare(right.path, "pt-BR"))
    .filter((page) => !normalizedQuery || searchable(`${page.path} ${page.label} ${page.area}`).includes(normalizedQuery));
}
