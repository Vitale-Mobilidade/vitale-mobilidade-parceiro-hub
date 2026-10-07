import { supabase } from "@/integrations/supabase/client";
export type NewsletterAdminState = {
  settings: {
    enabled: boolean;
    from_email: string;
    reply_to: string;
    last_error: string | null;
    segments: Record<string, string>;
  };
  configured: boolean;
  webhookConfigured: boolean;
  audience: { eligible: number; legacy: number; suppressed: number };
  campaigns: {
    id: string;
    recipients: number;
    delivered: number;
    failed: number;
    edition_day: string;
    segment: string;
    status: string;
    last_error: string | null;
    resend_id: string | null;
  }[];
};
export async function newsletterCall<T>(
  action?: string,
  payload: Record<string, unknown> = {},
) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");
  const response = await fetch("/api/admin/newsletter", {
    method: action ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: action ? JSON.stringify({ action, ...payload }) : undefined,
  });
  const result = await response
    .json()
    .catch(() => ({ error: "newsletter_unavailable" }));
  if (!response.ok) {
    const messages: Record<string, string> = {
      newsletter_writer_auth_failed:
        "O gateway de IA rejeitou a autenticação do servidor.",
      newsletter_writer_budget_limit:
        "O gateway de IA informou limite de uso ou saldo. Nenhum e-mail foi enviado.",
      newsletter_writer_gateway_failed:
        "O gateway de IA retornou erro. Nenhum e-mail foi enviado.",
      newsletter_writer_network_failed:
        "A conexão do servidor com a IA falhou. Nenhum e-mail foi enviado.",
      newsletter_writer_evidence_invalid:
        "O rascunho não apresentou citações literais válidas das fontes.",
      newsletter_writer_curiosity_invalid:
        "A curiosidade não apresentou uma citação válida da fonte.",
      newsletter_writer_length_invalid:
        "O redator ultrapassou o tamanho editorial permitido.",
      newsletter_writer_timeout:
        "O redator excedeu o tempo de geração. Nenhum e-mail foi enviado.",
      newsletter_writer_unavailable:
        "O serviço de IA não respondeu. Nenhum e-mail foi enviado.",
      newsletter_writer_invalid_output:
        "O redator retornou um texto fora do formato esperado. Nenhum e-mail foi enviado.",
      newsletter_writer_review_failed:
        "A revisão editorial rejeitou o rascunho. Nenhum e-mail foi enviado.",
      newsletter_sources_insufficient_diversity:
        "Não há pautas inéditas com diversidade suficiente nesta seleção.",
      resend_not_configured: "Conecte o Resend ao servidor da Vitale.",
      sender_not_verified:
        "O domínio de envio ainda não foi verificado no Resend.",
      sender_sending_disabled:
        "O envio do domínio ainda está desativado no Resend.",
      database_not_configured:
        "A configuração do servidor ainda não está disponível.",
      newsletter_database_failed:
        "A estrutura da newsletter ainda não está disponível no banco.",
      free_contact_limit:
        "A conta alcançou o limite gratuito de contatos. O envio foi pausado.",
      free_segment_limit: "Não há segmentos gratuitos disponíveis na conta.",
      webhook_not_configured: "Configure o webhook do Resend antes de ativar.",
      prepare_segments_first: "Prepare os segmentos antes de ativar.",
      manual_reconciliation_required:
        "Há uma campanha que precisa de conferência antes de retomar.",
      newsletter_busy:
        "Há uma operação em andamento. Tente novamente em alguns instantes.",
      pause_before_configuring:
        "Pause a automação antes de alterar a configuração.",
      invalid_action: "Ação inválida.",
      newsletter_sources_unavailable:
        "Conteúdo indisponível. Nenhuma edição foi enviada.",
      resend_401: "A conexão Resend não autorizou a operação.",
      resend_403:
        "A chave Resend precisa permitir acesso a Broadcasts, contatos, segmentos, uso e domínios.",
      resend_429: "O Resend pediu uma pausa. Aguarde e tente novamente.",
    };
    throw new Error(
      messages[result.error] ??
        "Não foi possível completar esta operação. Confira a configuração da newsletter.",
    );
  }
  return result as T;
}
