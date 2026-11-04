/** Codes come only from the private DB RPC; never log provider bodies or OTPs. */
export async function sendMemberIdentityEmail(input: {
  to:string; from:string; code:string; key:string; gatewayKey?:string; request?:typeof fetch;
}) {
  if (!/^\d{6}$/.test(input.code) || !input.key || !input.from || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.to)) throw new Error("invalid_delivery_input");
  const response=await (input.request ?? fetch)(input.gatewayKey ? "https://connector-gateway.lovable.dev/resend/emails" : "https://api.resend.com/emails",{
    method:"POST",redirect:"manual",signal:AbortSignal.timeout(12000),headers:{"Content-Type":"application/json",Authorization:`Bearer ${input.gatewayKey ?? input.key}`,...(input.gatewayKey ? {"X-Connection-Api-Key":input.key}: {})},
    body:JSON.stringify({from:input.from,to:[input.to],subject:"Seu código de validação da comunidade Vitale",
      text:`Seu código para validar o e-mail na comunidade Vitale Mobilidade é ${input.code}. Ele vale por dez minutos. Não compartilhe este código. Se não pediu a validação, ignore esta mensagem. A inscrição na newsletter não depende desta validação.`,
      html:`<div lang="pt-BR" style="font-family:Arial,sans-serif;color:#143d33;padding:32px;max-width:560px;margin:auto"><p>Vitale Mobilidade</p><h1>Valide seu e-mail</h1><p>Digite este código na sua conta da comunidade:</p><p style="font-size:32px;font-weight:bold;letter-spacing:6px">${input.code}</p><p>Válido por dez minutos. Não compartilhe este código.</p><p>Se não pediu a validação, ignore esta mensagem. A newsletter não depende desta validação.</p></div>`}),
  });
  if (!response.ok) throw new Error("identity_delivery_failed");
}
export async function sendMemberIdentityWhatsApp(input:{phone:string;code:string;id:string;key:string;templateId:string;variables:string[];request?:typeof fetch}) {
  if (!/^\+55[1-9][0-9]9\d{8}$/.test(input.phone) || !/^\d{6}$/.test(input.code) || !/^hp_[a-f0-9]{48}$/.test(input.key) || !/^[a-f0-9-]{36}$/.test(input.templateId) || !/^[a-f0-9-]{36}$/.test(input.id) || !input.variables.length || input.variables.length>5 || input.variables.some(key=>!/^[a-zA-Z0-9_]{1,40}$/.test(key))) throw new Error("invalid_delivery_input");
  const response=await (input.request ?? fetch)("https://smixxobbszyxqauysvor.supabase.co/functions/v1/api-template-send",{
    method:"POST",redirect:"manual",signal:AbortSignal.timeout(45000),headers:{"Content-Type":"application/json","x-api-key":input.key,"Idempotency-Key":`vitale-identity-${input.id}`},
    body:JSON.stringify({template_id:input.templateId,to:{phone:input.phone.slice(1)},variables:Object.fromEntries(input.variables.map(key=>[key,input.code]))}),
  });
  if (!response.ok) throw new Error("identity_delivery_failed");
  const ack=await response.json();
  if (ack?.ok!==true || ack.code!=="sent" || typeof ack.provider_message_id!=="string" || !ack.provider_message_id || ack.phone!==input.phone.slice(1) || ack.template?.template_id!==input.templateId) throw new Error("identity_delivery_failed");
}
