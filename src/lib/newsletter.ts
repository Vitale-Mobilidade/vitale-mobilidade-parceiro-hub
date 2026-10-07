import { z } from "zod";

const linkSchema = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      [
        "vitalemobilidade.com",
        "www.youtube.com",
        "youtube.com",
        "youtu.be",
      ].includes(url.hostname)
    );
  }, "Use um link HTTPS da Vitale ou do YouTube.");
const item = z.object({
  title: z.string().trim().min(1).max(180),
  url: linkSchema,
});
export const newsletterSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine((s) => !/[\r\n]/.test(s)),
  intro: z.string().trim().min(1).max(400),
  articles: z.array(item).min(1).max(2),
  bike: item,
  videos: z.array(item).min(1).max(2),
  unsubscribeUrl: z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    }, "Informe o descadastro HTTPS do provedor."),
});
export type Newsletter = z.infer<typeof newsletterSchema>;
export const NEWSLETTER_OPENINGS = {
  monday: {
    subject: "Vitale na semana: leituras, bike e Radar",
    intro:
      "Olá! Separamos duas leituras, uma bike para conhecer e os vídeos recentes. Confira os destaques e consulte o Radar antes de decidir.",
  },
  friday: {
    subject: "Vitale no fim de semana: bikes e vídeos para conferir",
    intro:
      "Olá! Aqui estão os destaques para acompanhar com calma no fim de semana. Os preços podem mudar: confira a oferta vigente no Radar.",
  },
};
export function escapeNewsletter(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
export function renderNewsletter(input: unknown): {
  html: string;
  text: string;
} {
  const data = newsletterSchema.parse(input);
  const rows = (items: Newsletter["articles"]) =>
    items
      .map(
        (x) =>
          `<p><a href="${escapeNewsletter(x.url)}">${escapeNewsletter(x.title)}</a></p>`,
      )
      .join("");
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeNewsletter(data.subject)}</title></head><body style="margin:0;background:#f5f7f4;font-family:Arial,sans-serif;color:#18382a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:white"><tr><td style="padding:24px"><p><strong>VITALE MOBILIDADE</strong></p><h1 style="font-size:24px">${escapeNewsletter(data.subject)}</h1><p>${escapeNewsletter(data.intro)}</p><h2 style="font-size:20px">Leituras da vez</h2>${rows(data.articles)}<h2 style="font-size:20px">Radar de preços</h2><p>Consulte preços e histórico antes de decidir. As ofertas podem mudar.</p><p><a href="https://vitalemobilidade.com/radar">Conferir o Radar</a></p><h2 style="font-size:20px">Bike em destaque</h2>${rows([data.bike])}<h2 style="font-size:20px">Vídeos recentes</h2>${rows(data.videos)}<hr><p style="font-size:12px">Você recebeu esta edição porque se inscreveu na newsletter da Vitale Mobilidade. Equipe Vitale Mobilidade. Responda este e-mail para falar conosco.</p><p><a href="${escapeNewsletter(data.unsubscribeUrl)}">Cancelar inscrição</a></p></td></tr></table></td></tr></table></body></html>`;
  const list = (items: Newsletter["articles"]) =>
    items.map((x) => `${x.title}\n${x.url}`).join("\n\n");
  const text = `${data.subject}\n\n${data.intro}\n\nLEITURAS\n${list(data.articles)}\n\nRADAR DE PREÇOS\nConsulte preços e histórico; as ofertas podem mudar.\nhttps://vitalemobilidade.com/radar\n\nBIKE EM DESTAQUE\n${list([data.bike])}\n\nVÍDEOS RECENTES\n${list(data.videos)}\n\nVocê se inscreveu na newsletter da Vitale Mobilidade. Equipe Vitale Mobilidade. Responda este e-mail para falar conosco.\nCancelar inscrição: ${data.unsubscribeUrl}`;
  return { html, text };
}

export type NewsletterRecipient = {
  id: string;
  consent: boolean;
  suppressed: boolean;
  lastSentAt: string | null;
  interest: "radar" | "content" | null;
};
/** One mutually exclusive audience per recipient; no Quiz/alert consent inference. */
export function segmentNewsletterRecipients(
  recipients: NewsletterRecipient[],
  now: Date,
) {
  if (!Number.isFinite(now.getTime()))
    throw new Error("Data de envio inválida");
  const segments: Record<"radar" | "content" | "general", string[]> = {
    radar: [],
    content: [],
    general: [],
  };
  const seen = new Set<string>();
  const blocked = new Set(
    recipients.filter((r) => !r.consent || r.suppressed).map((r) => r.id),
  );
  for (const recipient of recipients) {
    if (
      blocked.has(recipient.id) ||
      seen.has(recipient.id) ||
      !recipient.consent ||
      recipient.suppressed
    )
      continue;
    const last = recipient.lastSentAt ? Date.parse(recipient.lastSentAt) : null;
    if (
      last !== null &&
      (!Number.isFinite(last) || now.getTime() - last < 72 * 60 * 60_000)
    )
      continue;
    seen.add(recipient.id);
    segments[recipient.interest ?? "general"].push(recipient.id);
  }
  return segments;
}

export type NewsletterContent = Omit<Newsletter, "unsubscribeUrl">;
export type NewsletterSegment = "general" | "radar" | "content";
export function renderResendNewsletter(
  input: NewsletterContent,
  segment: NewsletterSegment = "general",
) {
  const marker =
    "https://vitalemobilidade.com/__newsletter_provider_unsubscribe__";
  const rendered = renderNewsletter({ ...input, unsubscribeUrl: marker });
  let html = rendered.html
    .replace(marker, "{{{RESEND_UNSUBSCRIBE_URL}}}")
    .replace(
      "<h1 style=",
      "<p>Olá, {{{contact.first_name|amigo(a)}}}!</p><h1 style=",
    );
  if (segment === "radar") {
    const start = html.indexOf('<h2 style="font-size:20px">Radar de preços');
    const end = html.indexOf('<h2 style="font-size:20px">Vídeos recentes');
    const radar = html.slice(start, end);
    html = html.slice(0, start) + html.slice(end);
    html = html.replace(
      '<h2 style="font-size:20px">Leituras da vez',
      radar + '<h2 style="font-size:20px">Leituras da vez',
    );
  }
  return {
    html,
    text:
      "Olá, {{{contact.first_name|amigo(a)}}}!\n\n" +
      rendered.text.replace(marker, "{{{RESEND_UNSUBSCRIBE_URL}}}"),
  };
}

export function newsletterWindow(now: Date): {
  day: string;
  weekday: number;
  due: boolean;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (key: string) => parts.find((p) => p.type === key)!.value;
  const day = `${value("year")}-${value("month")}-${value("day")}`;
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  const hour = Number(value("hour"));
  return {
    day,
    weekday,
    due: [1, 5].includes(weekday) && hour >= 10 && hour < 12,
  };
}
