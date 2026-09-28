import { adminCall } from "./admin-api";
import { composeCover } from "./cover-compose";
import type { EditorialArticle } from "../../supabase/functions/_shared/editorial-contract";

export function filterArticleBikes<T extends { bike_id: string; name: string }>(bikes: T[], query: string): T[] {
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .trim();
  const term = normalize(query);
  return bikes.filter((bike) => normalize(`${bike.name} ${bike.bike_id}`).includes(term));
}

/** Only a newly generated private article can get an opt-in cover from this form. */
export async function applyRequestedArticleCover(
  article: EditorialArticle,
  requested: boolean,
  reused: boolean,
): Promise<EditorialArticle> {
  if (!requested || reused || article.status !== "draft") return article;
  const cover = await adminCall<{
    background: string;
    title: string;
    revision: number;
  }>("cover-generate", {
    id: article.id,
    revision: article.revision,
  });
  const image = (await composeCover(cover.background, cover.title)).dataUrl;
  const result = await adminCall<{ article: EditorialArticle }>("cover-apply", {
    id: article.id,
    revision: cover.revision,
    image,
  });
  return result.article;
}

/** Leaving the optional selector blank asks the server to identify bikes from the source. */
export function creationBikeSelection(ids: string[]): { bikeIds?: string[] } {
  return ids.length ? { bikeIds: ids } : {};
}
