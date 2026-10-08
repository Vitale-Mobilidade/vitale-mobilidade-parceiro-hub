import { z } from "zod";
import { newsletterSchema, type NewsletterContent } from "./newsletter";
export const newsletterDraftContentSchema = newsletterSchema.omit({
  unsubscribeUrl: true,
});
const copy = z
  .object({
    title: z.string().trim().min(3).max(200),
    paragraphs: z.array(z.string().trim().min(20).max(900)).max(2),
    bullets: z.array(z.string().trim().min(10).max(180)).max(3),
  })
  .strict();
export const newsletterEditSchema = z
  .object({
    subject: z
      .string()
      .trim()
      .min(10)
      .max(120)
      .refine((s) => !/[\r\n]/.test(s)),
    headline: z.string().trim().min(10).max(100),
    intro: z.string().trim().min(1).max(1800),
    articles: z.array(copy).min(1).max(3),
    bike: copy,
    videos: z.array(copy).min(1).max(3),
  })
  .strict();
export type NewsletterEdit = z.infer<typeof newsletterEditSchema>;
export type NewsletterDraft = {
  id: string;
  revision: number;
  origin: string;
  updated_at: string;
  content: NewsletterContent;
};
export function editableNewsletter(content: NewsletterContent): NewsletterEdit {
  const fields = (item: NewsletterContent["bike"]) => ({
    title: item.title,
    paragraphs: item.paragraphs ?? [],
    bullets: item.bullets ?? [],
  });
  return {
    subject: content.subject,
    headline: content.headline ?? content.subject,
    intro: content.intro,
    articles: content.articles.map(fields),
    bike: fields(content.bike),
    videos: content.videos.map(fields),
  };
}
export function applyNewsletterEdit(
  content: NewsletterContent,
  input: unknown,
): NewsletterContent {
  const edit = newsletterEditSchema.parse(input);
  if (
    edit.articles.length !== content.articles.length ||
    edit.videos.length !== content.videos.length
  )
    throw new Error("newsletter_edit_structure_changed");
  return newsletterDraftContentSchema.parse({
    ...content,
    ...edit,
    articles: content.articles.map((item, i) => ({
      ...item,
      ...edit.articles[i],
    })),
    bike: { ...content.bike, ...edit.bike },
    videos: content.videos.map((item, i) => ({ ...item, ...edit.videos[i] })),
  });
}
