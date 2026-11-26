export const WOSI_CAMPAIGN = "wosi" as const;
export const WOSI_URL =
  "https://wosi.com.br/mobilidade-eletrica/multimarcas?cupom=VITALE";
export type WosiSurface = "site" | "article";
export type WosiCampaignReport = {
  startDate: string;
  endDate: string;
  clicks: number;
  surfaces: { site: number; article: number };
  days: Array<{ date: string; clicks: number }>;
};
