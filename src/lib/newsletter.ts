import { SOCIAL_LINKS, YOUTUBE_SUBSCRIBE } from "./social-links";
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
  category: z
    .enum([
      "Comparativo",
      "Teste na prática",
      "Conheça a bike",
      "Guia e dicas",
      "Preço de maluco",
      "Preços e mercado",
      "Variedades",
    ])
    .optional(),
  previousPrice: z.string().max(40).optional(),
  currentPrice: z.string().max(40).optional(),
  dropLabel: z.string().max(30).optional(),
  checkedAt: z.string().max(60).optional(),
  baselineDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
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
  editionNumber: z.number().int().min(1).optional(),
  headline: z.string().trim().min(10).max(100).optional(),
  preheader: z.string().trim().min(20).max(150).optional(),
  radar: item.optional(),
  drops: z.array(item).max(3).optional(),
  articles: z.array(item).min(1).max(3),
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
  thursday: {
    subject: "Vitale no fim de semana: bikes e vídeos para conferir",
    intro:
      "Olá! Aqui estão os destaques para acompanhar com calma no fim de semana. Os preços podem mudar: confira a oferta vigente no Radar.",
  },
};
export function newsletterEmphasis(text: string): string {
  let count = 0;
  return escapeNewsletter(text).replace(/\*\*([^*\n]{1,120})\*\*/g, (_match, value: string) =>
    count++ < 3 ? `<strong>${value}</strong>` : value,
  );
}
const plainNewsletter = (text: string) => text.replace(/\*\*([^*\n]+)\*\*/g, "$1");

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
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeNewsletter(data.subject)}</title></head><body style="margin:0;background:#f5f7f4;font-family:Arial,sans-serif;color:#18382a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:white"><tr><td style="padding:24px"><img src="https://vitalemobilidade.com/vitale-logo-email.png" alt="Vitale Mobilidade" width="232" height="76" style="display:block;width:232px;max-width:100%;height:auto;background:#ffffff;border-radius:6px;margin:0 0 18px"><p><strong>VITALE MOBILIDADE</strong></p><h1 style="font-size:24px">${escapeNewsletter(data.subject)}</h1><p>${escapeNewsletter(data.intro)}</p><h2 style="font-size:20px">Leituras da vez</h2>${rows(data.articles)}<h2 style="font-size:20px">Radar de preços</h2><p>Consulte preços e histórico antes de decidir. As ofertas podem mudar.</p><p><a href="https://vitalemobilidade.com/radar">Conferir o Radar</a></p><h2 style="font-size:20px">Bike em destaque</h2>${rows([data.bike])}<h2 style="font-size:20px">Vídeos recentes</h2>${rows(data.videos)}<hr><p style="font-size:12px">Você recebeu esta edição porque se inscreveu na newsletter da Vitale Mobilidade. Equipe Vitale Mobilidade. Responda este e-mail para falar conosco.</p><p><a href="${escapeNewsletter(data.unsubscribeUrl)}">Cancelar inscrição</a></p></td></tr></table></td></tr></table></body></html>`;
  const list = (items: Newsletter["articles"]) =>
    items.map((x) => `${x.title}\n${x.url}`).join("\n\n");
  const text = `${data.subject}\n\n${data.intro}\n\nLEITURAS\n${list(data.articles)}\n\nRADAR DE PREÇOS\nConsulte preços e histórico; as ofertas podem mudar.\nhttps://vitalemobilidade.com/radar\n\nBIKE EM DESTAQUE\n${list([data.bike])}\n\nVÍDEOS RECENTES\n${list(data.videos)}\n\nVocê se inscreveu na newsletter da Vitale Mobilidade. Equipe Vitale Mobilidade. Responda este e-mail para falar conosco.\nCancelar inscrição: ${data.unsubscribeUrl}`;
  return { html, text: plainNewsletter(text) };
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
      (!Number.isFinite(last) || now.getTime() - last < 70 * 60 * 60_000)
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
      "<p>Salve {{{FIRST_NAME|}}}</p><h1 style=",
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
      "Salve {{{FIRST_NAME|}}}\n\n" +
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
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (key: string) => parts.find((p) => p.type === key)!.value;
  const day = `${value("year")}-${value("month")}-${value("day")}`;
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  const minuteOfDay = Number(value("hour")) * 60 + Number(value("minute"));
  return {
    day,
    weekday,
    due: [1, 4].includes(weekday) && minuteOfDay >= 390 && minuteOfDay < 510,
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
  const campaign = `giro_${data.editionNumber ?? "preview"}`;
  const tracked = (url: string, section: string) =>
    newsletterUtmUrl(url, campaign, section, segment);
  data.articles = data.articles.map((x, i) => ({
    ...x,
    url: tracked(x.url, `article_${i + 1}`),
  }));
  data.videos = data.videos.map((x, i) => ({
    ...x,
    url: tracked(x.url, `video_${i + 1}`),
  }));
  data.bike.url = tracked(data.bike.url, "bike");
  if (data.radar) data.radar.url = tracked(data.radar.url, "radar");
  data.drops = data.drops?.map((x, i) => ({
    ...x,
    url: tracked(x.url, `radar_drop_${i + 1}`),
  }));
  const quizUrl = tracked("https://vitalemobilidade.com/quiz", "quiz");
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
          `<p style="margin:14px 0;font-size:16px;line-height:1.65">${newsletterEmphasis(p)}</p>`,
      )
      .join("") +
    (item.bullets?.length
      ? `<ul style="padding-left:22px;margin:16px 0;font-size:15px;line-height:1.7">${item.bullets.map((b) => `<li style="margin:7px 0">${newsletterEmphasis(b)}</li>`).join("")}</ul>`
      : "");
  const section = (label: string, body: string) =>
    `<tr><td style="padding:28px 24px;border-top:1px solid #e0e8e2"><p style="font-size:11px;letter-spacing:2px;font-weight:bold;color:#476756;margin:0 0 16px;text-transform:uppercase">${label}</p>${body}</td></tr>`;
  const articleRows = data.articles
    .map((a, i) =>
      section(
        i === 0
          ? "01 / A leitura em destaque"
          : i === 1
            ? "02 / Para aprofundar"
            : "03 / Do acervo",
        `${a.category ? `<p style="display:inline-block;background:#e6f0e8;color:#165b42;padding:6px 10px;border-radius:20px;font-size:12px;font-weight:bold">${e(a.category)}</p>` : ""}${photo(a)}<h2 style="font-size:25px;line-height:1.3;margin:20px 0 12px"><a href="${e(a.url)}" style="color:#173d2a;text-decoration:none">${e(a.title)}</a></h2>${prose(a)}${button(a.url, "Leia mais no artigo")}`,
      ),
    )
    .join("");
  const radar: NewsletterContent["bike"] = {
    title: "Radar de preços",
    url:
      data.radar?.url ?? tracked("https://vitalemobilidade.com/radar", "radar"),
  };
  const drops = data.drops ?? [];
  const context = (key: "baselineDate" | "checkedAt", label: string) => {
    const values = [...new Set(drops.map((d) => d[key]).filter(Boolean))];
    if (!values.length) return "";
    return `${label}: ${values.length === 1 ? values[0] : drops.map((d) => `${d.title}: ${d[key] ?? "não informada"}`).join("; ")}.`;
  };
  const radarNote = [
    context("baselineDate", "Fechamentos anteriores"),
    context("checkedAt", "Verificação"),
    "Preços e disponibilidade podem mudar.",
  ]
    .filter(Boolean)
    .join(" ");
  const dropCards = drops
    .map(
      (d) =>
        `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 10px;border:1px solid #e0e8e2;border-radius:8px"><tr>${d.image ? `<td width="120" valign="middle" bgcolor="#f2f7f4" style="width:120px;padding:8px"><a href="${e(d.url)}"><img src="${e(d.image)}" alt="${e(d.title)}" width="120" height="96" style="display:block;width:120px;max-width:100%;height:96px;object-fit:contain;border:0"></a></td>` : ""}<td valign="middle" style="padding:12px"><h3 style="font-size:15px;line-height:1.35;margin:0 0 5px;color:#173d2a"><a href="${e(d.url)}" style="color:#173d2a;text-decoration:none">${e(d.title)}</a></h3>${d.previousPrice ? `<p style="margin:0 0 2px;color:#526658;font-size:12px"><s>${e(d.previousPrice)}</s></p>` : ""}${d.currentPrice ? `<p style="margin:0 0 4px;font-size:22px;line-height:1.2;font-weight:bold;color:#165b42">${e(d.currentPrice)}</p>` : ""}${d.dropLabel ? `<span style="display:inline-block;background:#d6f5e6;color:#165b42;border-radius:4px;padding:3px 6px;font-size:12px;font-weight:bold;margin:0 6px 4px 0">${e(d.dropLabel)}</span>` : ""}<a href="${e(d.url)}" style="display:inline-block;color:#476756;font-size:12px;text-decoration:underline">Ver histórico →</a></td></tr></table>`,
    )
    .join("");
  const radarRow = section(
    "Radar de preços",
    `${dropCards || '<p style="font-size:15px;line-height:1.6">Nenhuma queda recente confirmada nesta edição.</p>'}<p style="font-size:12px;line-height:1.6;color:#526658;margin:12px 0">${e(radarNote)}</p><a href="${e(radar.url)}" style="color:#476756;font-size:14px;text-decoration:underline">Explorar o Radar →</a>`,
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
          `<div style="margin-bottom:28px">${v.category ? `<p style="font-size:12px;color:#165b42;font-weight:bold">${e(v.category)}</p>` : ""}${photo(v)}<h2 style="font-size:21px;line-height:1.4;margin:16px 0 10px">${e(v.title)}</h2>${prose(v)}${button(v.url, "Assistir ao vídeo")}</div>`,
      )
      .join(""),
  );
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(data.subject)}</title></head><body style="margin:0;background:#f1f4ef;color:#243c30;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${e(data.preheader ?? data.subject)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:20px 0"><table role="presentation" width="616" cellspacing="0" cellpadding="0" style="width:100%;max-width:616px;background:white"><tr><td bgcolor="#173d2a" style="padding:28px 24px;color:#ffffff"><img src="https://vitalemobilidade.com/vitale-logo-email.png" alt="Vitale Mobilidade" width="232" height="76" style="display:block;width:232px;max-width:100%;height:auto;background:#ffffff;border-radius:6px;margin:0 0 18px"><p style="font-weight:bold;letter-spacing:3px;font-size:15px;margin:0">VITALE MOBILIDADE</p><p style="font-size:12px;letter-spacing:2px;margin:9px 0 0;color:#c4d9bc">UM GIRO PELA MOBILIDADE ELÉTRICA</p></td></tr><tr><td style="padding:32px 24px"><p style="font-size:14px;color:#476756">Salve {{{FIRST_NAME|}}}</p><h1 style="font-size:32px;line-height:1.18;margin:18px 0">${e(data.editionNumber ? numberNewsletterSubject(data.headline ?? data.subject, data.editionNumber) : (data.headline ?? data.subject))}</h1>${data.intro
    .split(/\n\n/)
    .map(
      (p) =>
        `<p style="font-size:17px;line-height:1.7;margin:16px 0">${newsletterEmphasis(p)}</p>`,
    )
    .join(
      "",
    )}<p style="font-size:12px;color:#476756;margin:24px 0 0">NESTA EDIÇÃO · LEITURAS · RADAR · BIKE · VÍDEOS</p></td></tr>${segment === "radar" ? radarRow + bikeRow + articleRows : articleRows + radarRow + bikeRow}${videosRow}${section("Encontre a bike para o seu perfil", `<table role="presentation" width="100%" bgcolor="#edf4ee"><tr><td style="padding:22px"><a href="${e(quizUrl)}"><img src="https://vitalemobilidade.com/og/vitale-quiz-20260930-1200x630.jpg" alt="Quiz Vitale: encontre a bike para seu perfil" width="568" style="width:100%;height:auto;display:block;border:0"></a><h2 style="font-size:24px">Qual bike combina com a sua rotina?</h2><p style="font-size:16px;line-height:1.65">Responda sobre seu uso, trajeto e orçamento. O Quiz da Vitale ajuda a conectar seu perfil às bikes compatíveis; depois, confira os detalhes e os preços no Radar.</p>${button(quizUrl, "Fazer o Quiz")}</td></tr></table>`)}${section("Siga a gente no YouTube", `<h2 style="font-size:24px">A conversa continua no canal</h2><p style="font-size:16px;line-height:1.65">A Vitale Mobilidade é um canal no YouTube. Tem teste na prática, comparativo e muita conversa sobre mobilidade elétrica. Inscreva-se para acompanhar os próximos vídeos!</p>${button(tracked(YOUTUBE_SUBSCRIBE, "youtube_subscribe"), "Inscreva-se no YouTube") }<p style="font-size:14px;line-height:1.8">${SOCIAL_LINKS.map((profile) => `<a href="${e(tracked(profile.url, `social_${profile.label.toLowerCase()}`))}" style="color:#165b42;font-weight:bold">${e(profile.label)}</a>`).join(" · ")}</p>`)}<tr><td bgcolor="#173d2a" style="padding:28px 24px;color:#d9e6d5;font-size:12px;line-height:1.7"><p style="font-size:16px;color:white;font-weight:bold">Vamos conversar sobre mobilidade?</p><p>Responda este e-mail para falar com a equipe Vitale Mobilidade.</p><p>Você recebeu esta edição porque se inscreveu na newsletter. Preços e disponibilidade podem mudar; confira os dados atuais no Radar.</p><p><a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#ffffff">Cancelar inscrição</a> · <a href="${e(tracked("https://vitalemobilidade.com/privacidade", "privacy"))}" style="color:#ffffff">Privacidade</a></p></td></tr></table></td></tr></table></body></html>`;
  const items =
    segment === "radar"
      ? [radar, data.bike, ...data.articles, ...data.videos]
      : [...data.articles, radar, data.bike, ...data.videos];

  const text =
    `Salve {{{FIRST_NAME|}}}\n\n${data.headline ?? data.subject}\n\n${data.intro}\n\n` +
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
    "\n\nRADAR — QUEDAS\n" +
    drops
      .map((d) =>
        [
          d.title,
          d.dropLabel,
          d.previousPrice ? `Anterior: ${d.previousPrice}` : "",
          d.currentPrice ? `Atual: ${d.currentPrice}` : "",
          d.url,
        ]
          .filter(Boolean)
          .join("\n"),
      )
      .join("\n\n") +
    `\n${radarNote}\n\nQUIZ — Qual bike combina com a sua rotina? ${quizUrl}\n\nVocê se inscreveu na newsletter Vitale Mobilidade. Responda para falar conosco.\nCancelar inscrição: {{{RESEND_UNSUBSCRIBE_URL}}}`;
  if (new TextEncoder().encode(html).length > 85_000)
    throw new Error("newsletter_html_too_large");
  return { html, text: plainNewsletter(text) };
}

export function numberNewsletterSubject(title: string, editionNumber: number) {
  if (!Number.isSafeInteger(editionNumber) || editionNumber < 1)
    throw new Error("newsletter_number_invalid");
  return `#${editionNumber} — ${title.trim().replace(/^#\d+\s*[—:-]?\s*/, "")}`;
}

export function newsletterUtmUrl(
  value: string,
  campaign: string,
  content: string,
  segment: NewsletterSegment = "general",
) {
  const url = new URL(value);
  url.searchParams.set("utm_source", "vitale_newsletter");
  url.searchParams.set("utm_medium", "email");
  url.searchParams.set("utm_campaign", campaign);
  url.searchParams.set("utm_content", `${segment}_${content}`);
  return url.toString();
}
