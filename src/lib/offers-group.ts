/** Entrada única: acompanha alterações feitas no Admin. */
export const OFFERS_GROUP_URL = "/grupodeofertas";
export const DEFAULT_OFFERS_GROUP_DESTINATION =
  "https://chat.whatsapp.com/B69yQkILBc63Nq3x62iQjH?mode=gi_t";
export function validOffersGroupUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{22}(\?mode=gi_t)?$/.test(value)
  );
}
export type OffersGroupSettings = { url: string; revision: number };
