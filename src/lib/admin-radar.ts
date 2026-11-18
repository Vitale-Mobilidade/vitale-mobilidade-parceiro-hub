import type {
  RadarAlertOverview,
  PriceAlertRemote,
} from "./price-alert-metrics";
export type RadarAlertFilter = {
  page: number;
  scope: "active" | "all";
  search: string;
};
export type AdminRadarAlert = {
  delivery?: PriceAlertRemote;
  id: string;
  personName: string;
  phone: string;
  email: string | null;
  bikeId: string;
  bikeName: string;
  condition: string;
  targetPrice: number | null;
  referencePrice: number | null;
  currentPrice: number | null;
  priceVerifiedAt: string | null;
  status: string;
  consent: boolean;
  deliveryEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};
export type AdminRadarAlerts = {
  overview?: RadarAlertOverview;
  items: AdminRadarAlert[];
  page: number;
  pageSize: number;
  totalAlerts: number;
  updatedAt: string;
};
