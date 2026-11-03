import { z } from "zod";

export { memberAccountsEnabled } from "./member-accounts-feature";
export const displayNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .refine((v) =>
    Array.from(v).every(
      (char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127,
    ),
  );
export const commentBodySchema = z.string().trim().min(3).max(2000);
export const passwordSchema = z.string().min(12).max(128);
export const memberProfileSchema = z.object({
  displayName: displayNameSchema,
  suspended: z.boolean(),
  createdAt: z.string(),
  communityJoinedAt: z.string().nullable().optional(),
  newsletterSubscribed: z.boolean().optional(),
});
export const memberCommentSchema = z.object({
  id: z.string().uuid(),
  body: z.string(),
  authorName: z.string(),
  createdAt: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
  isOwn: z.boolean(),
});
export const moderationCommentSchema = memberCommentSchema
  .omit({ isOwn: true })
  .extend({
    suspended: z.boolean(),
    articleTitle: z.string(),
    articleSlug: z.string().nullable(),
  });
export type MemberProfile = z.infer<typeof memberProfileSchema>;
export type MemberComment = z.infer<typeof memberCommentSchema>;

/** Return only to an editorial article; never accept hosts, auth tokens or arbitrary paths. */
export function memberReturnPath(value: unknown): string {
  return typeof value === "string" &&
    /^\/conteudos\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
    ? value
    : "/conteudos";
}

export function memberError(error: unknown): string {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";
  const messages: Record<string, string> = {
    community_join_required:
      "Entre na comunidade pela Minha conta para participar.",
    community_consent_required:
      "Confirme sua adesão à comunidade, que inclui o recebimento da newsletter.",
    community_disabled: "A comunidade está temporariamente indisponível.",
    email_confirmation_required:
      "Entre na sua conta para continuar. Se tiver dificuldade, use a recuperação de acesso.",
    profile_required: "Complete seu perfil na Minha conta antes de comentar.",
    account_suspended:
      "Seu acesso a comentários foi suspenso. Entre em contato com a Vitale para pedir uma revisão.",
    comment_rate_limited:
      "Aguarde um minuto entre comentários. O limite é de 20 por dia.",
    article_unavailable: "Este artigo não está disponível para comentários.",
    comment_unavailable:
      "Este comentário não está mais disponível. Atualize a lista.",
    invalid_name: "Use um nome público de 2 a 60 caracteres.",
    invalid_comment: "Escreva de 3 a 2.000 caracteres.",
    forbidden: "Sua conta não tem permissão para esta ação.",
  };
  return (
    messages[message] ?? "Não foi possível concluir agora. Tente novamente."
  );
}
