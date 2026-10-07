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
export const newsletterImageSchema = z
  .string()
  .url()
  .refine((value) => {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      [
        "vitalemobilidade.com",
        "ipectfejftfcikvozoyu.supabase.co",
        "i.ytimg.com",
      ].includes(u.hostname)
    );
  }, "Imagem precisa vir do acervo Vitale ou YouTube.");
const item = z.object({
  title: z.string().trim().min(1).max(180),
  url: linkSchema,
  image: newsletterImageSchema.optional(),
  paragraphs: z.array(z.string().trim().min(20).max(900)).max(2).optional(),
  bullets: z.array(z.string().trim().min(10).max(180)).max(3).optional(),
});
export const newsletterSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine((s) => !/[\r\n]/.test(s)),
  intro: z.string().trim().min(1).max(1800),
  headline: z.string().trim().min(10).max(100).optional(),
  preheader: z.string().trim().min(20).max(150).optional(),
  radar: item.optional(),
  drops: z.array(item).max(3).optional(),
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
  if (input.headline) return renderEditorialNewsletter(input, segment);
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

/** Email-safe tables and inline styles; the model never creates markup or URLs. */
export function renderEditorialNewsletter(
  input: NewsletterContent,
  segment: NewsletterSegment = "general",
) {
  const data = newsletterSchema.parse({
    ...input,
    unsubscribeUrl: "https://vitalemobilidade.com/privacidade",
  });
  const e = escapeNewsletter;
  const button = (url: string, label: string) =>
    `<table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="#165b42" style="border-radius:6px"><a href="${e(url)}" style="display:inline-block;padding:13px 20px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:14px">${label} →</a></td></tr></table>`;
  const photo = (item: NewsletterContent["bike"], size = 568) =>
    item.image
      ? `<a href="${e(item.url)}"><img src="${e(item.image)}" alt="${e(item.title)}" width="${size}" style="display:block;width:100%;max-width:${size}px;height:auto;border:0;border-radius:8px"></a>`
      : "";
  const prose = (item: NewsletterContent["bike"]) =>
    (item.paragraphs ?? [])
      .map(
        (p) =>
          `<p style="margin:14px 0;font-size:16px;line-height:1.65">${e(p)}</p>`,
      )
      .join("") +
    (item.bullets?.length
      ? `<ul style="padding-left:22px;margin:16px 0;font-size:15px;line-height:1.7">${item.bullets.map((b) => `<li style="margin:7px 0">${e(b)}</li>`).join("")}</ul>`
      : "");
  const section = (label: string, body: string) =>
    `<tr><td style="padding:28px 24px;border-top:1px solid #e0e8e2"><p style="font-size:11px;letter-spacing:2px;font-weight:bold;color:#476756;margin:0 0 16px;text-transform:uppercase">${label}</p>${body}</td></tr>`;
  const articleRows = data.articles
    .map((a, i) =>
      section(
        i === 0 ? "01 / A leitura em destaque" : "02 / Para aprofundar",
        `${photo(a)}<h2 style="font-size:25px;line-height:1.3;margin:20px 0 12px"><a href="${e(a.url)}" style="color:#173d2a;text-decoration:none">${e(a.title)}</a></h2>${prose(a)}${button(a.url, "Leia mais no artigo")}`,
      ),
    )
    .join("");
  const radar = data.radar ?? {
    title: "O preço de hoje merece atenção",
    url: "https://vitalemobilidade.com/radar",
    paragraphs: [
      "Antes de decidir, consulte o preço atual e o histórico no Radar. As ofertas podem mudar entre esta edição e a sua visita.",
    ],
  };
  const radarRow = section(
    "Radar de preços",
    `<table role="presentation" width="100%" bgcolor="#edf4ee" style="border-radius:10px"><tr><td style="padding:22px"><h2 style="font-size:24px;line-height:1.3;margin:0">${e(radar.title)}</h2>${prose(radar)}${(data.drops ?? []).map((d) => `<div style="margin:18px 0;padding-top:16px;border-top:1px solid #c8d8cb"><h3 style="font-size:18px;margin:0"><a href="${e(d.url)}" style="color:#173d2a">${e(d.title)}</a></h3>${prose(d)}</div>`).join("")}${button(radar.url, "Explorar o Radar")}</td></tr></table>`,
  );
  const bikeRow = section(
    "Bike em destaque",
    `${photo(data.bike)}<h2 style="font-size:27px;margin:20px 0 12px">${e(data.bike.title)}</h2>${prose(data.bike)}${button(data.bike.url, "Conhecer a bike no Radar")}`,
  );
  const videosRow = section(
    "Vídeos em destaque",
    data.videos
      .map(
        (v) =>
          `<div style="margin-bottom:28px">${photo(v)}<h2 style="font-size:21px;line-height:1.4;margin:16px 0 10px">${e(v.title)}</h2>${prose(v)}${button(v.url, "Assistir ao vídeo")}</div>`,
      )
      .join(""),
  );
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(data.subject)}</title></head><body style="margin:0;background:#f1f4ef;color:#243c30;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${e(data.preheader ?? data.subject)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:20px 0"><table role="presentation" width="616" cellspacing="0" cellpadding="0" style="width:100%;max-width:616px;background:white"><tr><td bgcolor="#173d2a" style="padding:28px 24px;color:#ffffff"><p style="font-weight:bold;letter-spacing:3px;font-size:15px;margin:0">VITALE MOBILIDADE</p><p style="font-size:12px;letter-spacing:2px;margin:9px 0 0;color:#c4d9bc">A SUA PRÓXIMA ESCOLHA COMEÇA AQUI</p></td></tr><tr><td style="padding:32px 24px"><p style="font-size:14px;color:#476756">Olá, {{{contact.first_name|amigo(a)}}}!</p><h1 style="font-size:32px;line-height:1.18;margin:18px 0">${e(data.headline ?? data.subject)}</h1>${data.intro
    .split(/\n\n/)
    .map(
      (p) =>
        `<p style="font-size:17px;line-height:1.7;margin:16px 0">${e(p)}</p>`,
    )
    .join(
      "",
    )}<p style="font-size:12px;color:#476756;margin:24px 0 0">NESTA EDIÇÃO · LEITURAS · RADAR · BIKE · VÍDEOS</p></td></tr>${segment === "radar" ? radarRow + bikeRow + articleRows : articleRows + radarRow + bikeRow}${videosRow}<tr><td bgcolor="#173d2a" style="padding:28px 24px;color:#d9e6d5;font-size:12px;line-height:1.7"><p style="font-size:16px;color:white;font-weight:bold">Vamos conversar sobre mobilidade?</p><p>Responda este e-mail para falar com a equipe Vitale Mobilidade.</p><p>Você recebeu esta edição porque se inscreveu na newsletter. Preços e disponibilidade podem mudar; confira os dados atuais no Radar.</p><p><a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#ffffff">Cancelar inscrição</a> · <a href="https://vitalemobilidade.com/privacidade" style="color:#ffffff">Privacidade</a></p></td></tr></table></td></tr></table></body></html>`;
  const items =
    segment === "radar"
      ? [radar, data.bike, ...data.articles, ...data.videos]
      : [...data.articles, radar, data.bike, ...data.videos];
  if (data.drops?.length) items.push(...data.drops);
  const text =
    `Olá, {{{contact.first_name|amigo(a)}}}!\n\n${data.headline ?? data.subject}\n\n${data.intro}\n\n` +
    items
      .map((x) =>
        [
          x.title,
          ...(x.paragraphs ?? []),
          ...(x.bullets ?? []).map((b) => `• ${b}`),
          x.url,
        ].join("\n\n"),
      )
      .join("\n\n---\n\n") +
    "\n\nVocê se inscreveu na newsletter Vitale Mobilidade. Responda para falar conosco.\nCancelar inscrição: {{{RESEND_UNSUBSCRIBE_URL}}}";
  if (new TextEncoder().encode(html).length > 85_000)
    throw new Error("newsletter_html_too_large");
  return { html, text };
}
