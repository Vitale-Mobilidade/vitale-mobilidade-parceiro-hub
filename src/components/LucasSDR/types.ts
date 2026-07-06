import type { Bike } from "@/data/bikes";

export type SDRRole = "user" | "assistant" | "system";

export interface SDRMessage {
  id: string;
  role: SDRRole;
  content: string;
  createdAt: number;
  /** Se a resposta do assistente veio com uma bike sugerida para link. */
  bikeForLink?: string | null;
  /** Se deve mostrar aviso de afiliado logo antes do botão. */
  showAffiliateDisclosure?: boolean;
  /** Ações auxiliares que o painel deve renderizar embaixo da mensagem. */
  offerGroup?: boolean;
  offerList?: boolean;
  offerHandoff?: boolean;
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
  bike_for_link?: string | null;
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
