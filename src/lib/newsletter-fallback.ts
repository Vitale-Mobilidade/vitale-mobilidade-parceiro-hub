import type {
  NewsletterEvidence,
  NewsletterDraft,
} from "./newsletter-writer.server";
/** No model output, rejected copy, inferred claims or stale editions enter this template. */
export function sourceNewsletterFallback(
  sources: NewsletterEvidence[],
): NewsletterDraft {
  const subject = "O Giro da Vitale: leituras e bikes para acompanhar";
  return {
    subject,
    headline: subject,
    preheader:
      "Artigos publicados, vídeos do canal e uma bike para conhecer no Radar.",
    opening: [
      "Tem leitura e vídeo para acompanhar o próximo pedal. Nesta edição, reunimos conteúdos publicados pela Vitale e uma bike para conhecer no Radar. Preços e disponibilidade podem mudar; consulte as páginas para ver os dados atuais.",
    ],
    sections: sources.map((source) => ({
      id: source.id,
      paragraphs: [
        source.id === "bike"
          ? "Conheça a ficha deste modelo no Radar, com os dados disponíveis e o histórico de preços. Consulte a oferta vigente antes de comprar."
          : source.id.startsWith("video-")
            ? "Assista ao vídeo completo no canal da Vitale para acompanhar o assunto apresentado no título."
            : "Leia o artigo completo publicado pela Vitale para acompanhar o assunto apresentado no título.",
      ],
      bullets: [],
      evidence: [],
    })),
  };
}
