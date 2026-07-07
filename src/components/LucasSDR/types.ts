import type { Bike } from "@/data/bikes";

export type SDRRole = "user" | "assistant" | "system";

export interface SDRMessage {
  id: string;
  role: SDRRole;
  content: string;
  createdAt: number;
  /** Bike principal para botão de compra. */
  bikeForLink?: string | null;
  /** Bike secundária opcional para mostrar como alternativa. */
  secondaryBikeForLink?: string | null;
  showAffiliateDisclosure?: boolean;
  offerGroup?: boolean;
  offerList?: boolean;
  offerHandoff?: boolean;
  /** Renderiza CTA de consultoria paga. */
  offerConsultoria?: boolean;
  /** Quick replies contextuais a mostrar depois desta mensagem. */
  quickReplies?: { label: string; text: string }[];
}

export interface SDRApiResponse {
  reply: string;
  intent_level?: "low" | "medium" | "high" | null;
  preferred_bike?: string | null;
  main_objection?: string | null;
  main_objection_label?: string | null;
  purchase_timing?: string | null;
  suggested_action?: string | null;
  offer_link?: boolean;
  offer_group?: boolean;
  offer_list?: boolean;
  offer_handoff?: boolean;
  offer_consultoria?: boolean;
  bike_for_link?: string | null;
  secondary_bike_for_link?: string | null;
  show_affiliate_disclosure?: boolean;
}

export interface SDRContext {
  leadId: string | null;
  name?: string;
  phone?: string;
  answers?: Record<string, any>;
  labels?: Record<string, any>;
  clusters?: Record<string, any>;
  recommendation?: {
    primary?: Bike | null;
    secondary?: Bike | null;
    reasonPrimary?: string;
    reasonSecondary?: string;
  };
  origin?: Record<string, any>;
  baseLeadData?: Record<string, any>;
}

