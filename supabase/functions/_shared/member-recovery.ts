/** Server-only transactional mail through the project's existing Resend connection. */
export async function sendMemberRecovery(input: {
  email: string; from: string; link: string; key: string; gatewayKey?: string; request?: typeof fetch;
}) {
  const link = new URL(input.link);
  if (!/^https:$/.test(link.protocol) || link.pathname !== "/auth/v1/verify" || link.searchParams.get("type") !== "recovery" || !input.key || !input.from || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new Error("invalid_recovery_mail");
  const safeLink = input.link.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const response = await (input.request ?? fetch)(input.gatewayKey ? "https://connector-gateway.lovable.dev/resend/emails" : "https://api.resend.com/emails", {
    method: "POST", redirect: "manual", signal: AbortSignal.timeout(12000),
    headers: { Authorization: `Bearer ${input.gatewayKey ?? input.key}`, ...(input.gatewayKey ? { "X-Connection-Api-Key": input.key } : {}), "Content-Type": "application/json" },
    body: JSON.stringify({ from: input.from, to: [input.email], subject: "Redefina sua senha na Vitale Mobilidade",
      text: `Recebemos um pedido para redefinir sua senha na comunidade Vitale Mobilidade.\n\nDefina uma nova senha: ${input.link}\n\nSe você não pediu essa alteração, ignore este e-mail. Sua senha permanece a mesma.`,
      html: `<div lang="pt-BR" style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#143d33"><p style="font-weight:bold">Vitale Mobilidade</p><h1 style="font-size:26px">Redefina sua senha</h1><p>Recebemos um pedido para redefinir sua senha na comunidade Vitale Mobilidade.</p><p style="margin:28px 0"><a href="${safeLink}" style="display:inline-block;background:#143d33;color:white;padding:14px 20px;border-radius:8px;text-decoration:none">Definir nova senha</a></p><p>Se você não pediu essa alteração, ignore este e-mail. Sua senha permanece a mesma.</p></div>`,
    }),
  });
  if (!response.ok) throw new Error("member_recovery_delivery_failed");
}
