/** Transactional operations alert; credentials and destination are server-owned. */
export const EDITORIAL_ALERT_RECIPIENT = "guilherme@hotpipe.com.br";
export async function sendEditorialAlert(input: {
  videoId: string; recipient: string; from: string; key: string; gatewayKey?: string;
  reason: string; eventId?: string; articleId?: string; request?: typeof fetch;
}): Promise<void> {
  if ((input.eventId !== undefined && !/^[0-9TZ:.+ -]{1,80}$/.test(input.eventId)) ||
      (input.articleId !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.articleId)) ||
      !/^[A-Za-z0-9_-]{11}$/.test(input.videoId) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.recipient) || !input.from || !input.key)
    throw new Error("editorial_alert_not_configured");
  const response = await (input.request ?? fetch)(
    input.gatewayKey ? "https://connector-gateway.lovable.dev/resend/emails" : "https://api.resend.com/emails",
    { method: "POST", redirect: "manual", signal: AbortSignal.timeout(12_000), headers: {
      Authorization: `Bearer ${input.gatewayKey ?? input.key}`,
      ...(input.gatewayKey ? { "X-Connection-Api-Key": input.key } : {}),
      "Content-Type": "application/json",
      "Idempotency-Key": `editorial-review-${input.videoId}${input.eventId ? "-" + input.eventId.replace(/[^0-9TZ]/g, "") : ""}`,
    }, body: JSON.stringify({ from: input.from, to: [input.recipient],
      subject: "Vitale: artigo automático precisa de atenção",
      text: `A geração do artigo do vídeo ${input.videoId} foi interrompida.\nMotivo: ${input.reason}\nConfira o artigo e o estado da automação antes de tentar novamente:\nhttps://vitalemobilidade.com/admin/conteudos/${input.articleId ?? `novo?video=${input.videoId}`}\nVídeo: https://www.youtube.com/watch?v=${input.videoId}`,
    }) });
  if (!response.ok) throw new Error("editorial_alert_delivery_failed");
}
