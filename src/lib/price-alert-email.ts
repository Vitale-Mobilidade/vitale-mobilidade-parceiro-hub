import { z } from "zod";

const https = z
  .string()
  .url()
  .refine((value) => {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password;
  });
export const priceAlertEmailSchema = z.object({
  id: z.string().uuid(),
  lease_token: z.string().uuid(),
  kind: z.enum(["registered", "price_reached"]),
  delivery_from: z.string().email(),
  delivery_to: z.string().email(),
  reply_to: z.string().email(),
  payload: z.object({
    name: z.string().min(2).max(160),
    bikeId: z.string().regex(/^[a-z0-9_]{1,64}$/),
    bikeName: z.string().min(1).max(160),
    currentPrice: z.number().positive(),
    referencePrice: z.number().positive(),
    targetPrice: z.number().positive().nullable(),
    image: https.nullable(),
    link: https.refine((s) => /^https:\/\/meli\.la\/[A-Za-z0-9_-]+$/.test(s)),
    observedAt: z.string().datetime({ offset: true }),
  }),
});
export type PriceAlertEmail = z.infer<typeof priceAlertEmailSchema>;
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const money = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const GROUP = "https://vitalemobilidade.com/grupodeofertas";
/** No model calls, remote image fetch, invented scarcity or affiliate redirect. */
export function priceAlertEmailMessage(raw: unknown) {
  const alert = priceAlertEmailSchema.parse(raw),
    p = alert.payload;
  const reached = alert.kind === "price_reached";
  const radar = `https://vitalemobilidade.com/radar/${p.bikeId}`;
  const title = reached
    ? `O preço da ${p.bikeName} chegou ao seu alerta!`
    : `Seu alerta para a ${p.bikeName} foi registrado`;
  const target =
    p.targetPrice == null ? "Qualquer queda de preço" : money(p.targetPrice);
  const intro = reached
    ? `Olá, ${p.name}! A oferta da ${p.bikeName} chegou a ${money(p.currentPrice)}, dentro da condição que você escolheu.`
    : `Olá, ${p.name}! Seu alerta para a ${p.bikeName} foi registrado. ${p.targetPrice == null ? "Assim que identificarmos uma queda de preço" : `Assim que identificarmos uma oferta de até ${money(p.targetPrice)}`}, vamos te avisar por e-mail e WhatsApp.`;
  const observed = new Date(p.observedAt).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
  const groupCopy =
    "Enquanto isso, participe do nosso grupo de ofertas para acompanhar promoções e oportunidades de bikes elétricas. A entrada é opcional.";
  const note = `Preço verificado em ${observed} (São Paulo). Preço e disponibilidade podem mudar; confira as condições no anúncio. A Vitale pode receber comissão pela compra, sem custo extra para você.`;
  const footer =
    "Você recebeu este e-mail porque cadastrou um alerta na Vitale Mobilidade. Para cancelar este alerta, responda este e-mail pedindo o cancelamento.";
  const link = (url: string, label: string, primary = false) =>
    `<a href="${escape(url)}" style="display:inline-block;margin:8px 8px 8px 0;padding:14px 20px;border-radius:10px;${primary ? "background:#087b57;color:#fff" : "background:#edf5f0;color:#14513d"};font-weight:bold;text-decoration:none">${label}</a>`;
  return {
    from: alert.delivery_from,
    to: [alert.delivery_to],
    reply_to: alert.reply_to,
    subject: `Vitale: ${title}`,
    text: `${title}\n\n${intro}\n\nPreço atual: ${money(p.currentPrice)}\nSeu preço desejado: ${target}\nPreço no cadastro: ${money(p.referencePrice)}\n\nVer oferta atual: ${p.link}\nAcompanhar no Radar: ${radar}\n\n${groupCopy}\n${GROUP}\n\n${note}\n\n${footer}`,
    html: `<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width, initial-scale=1"><meta charset="utf-8"></head><body style="margin:0;background:#f4f7f5;color:#163c30;font-family:Arial,sans-serif"><table role="presentation" style="width:100%;max-width:600px;margin:auto;background:#fff"><tr><td style="padding:24px"><p style="font-weight:bold;letter-spacing:1px">VITALE MOBILIDADE</p><h1 style="font-size:26px;line-height:1.25">${escape(title)}</h1><p style="line-height:1.65">${escape(intro)}</p>${p.image ? `<img src="${escape(p.image)}" alt="${escape(p.bikeName)}" width="540" style="display:block;width:100%;max-width:540px;height:auto;border-radius:12px">` : ""}<h2 style="font-size:21px">${escape(p.bikeName)}</h2><table role="presentation" style="width:100%;background:#edf5f0;border-radius:10px;padding:12px;line-height:1.8"><tr><td>Preço atual</td><td style="font-weight:bold;text-align:right">${escape(money(p.currentPrice))}</td></tr><tr><td>Seu preço desejado</td><td style="font-weight:bold;text-align:right">${escape(target)}</td></tr></table><p>${link(p.link, "Ver oferta atual", true)}${link(radar, "Acompanhar no Radar")}</p><p style="line-height:1.6">${escape(groupCopy)}</p>${link(GROUP, "Participar do grupo de ofertas")}<p style="font-size:12px;line-height:1.6;color:#52675e">${escape(note)}</p><hr style="border:0;border-top:1px solid #dce7e1"><p style="font-size:12px;line-height:1.6;color:#52675e">${escape(footer)}</p></td></tr></table></body></html>`,
    tags: [
      { name: "flow", value: "price_alert" },
      { name: "kind", value: alert.kind },
    ],
  };
}
