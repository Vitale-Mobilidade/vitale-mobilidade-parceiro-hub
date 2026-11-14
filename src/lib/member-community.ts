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

export function classifiedsResumeId(value: unknown): string | undefined {
  const parsed = z.string().uuid().safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/** Return to a known internal page, never to credentials, external hosts or auth loops. */
export function memberReturnPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > 2000 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    Array.from(value).some(
      (c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127,
    )
  )
    return "/";
  try {
    const url = new URL(value, "https://vitalemobilidade.com");
    if (url.origin !== "https://vitalemobilidade.com") return "/";
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const allowed =
      [
        "/",
        "/radar",
        "/conteudos",
        "/ferramentas",
        "/quiz",
        "/newsletter",
        "/videos",
        "/grupodeofertas",
        "/privacidade",
        "/venda-sua-bike",
        "/anuncie-sua-bike",
        "/conta/anuncios",
      ].includes(path) ||
      /^\/radar\/[a-z0-9_]+$/.test(path) ||
      /^\/(?:conteudos|ferramentas|calculadoras)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
        path,
      ) ||
      /^\/venda-sua-bike\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
        path,
      );
    if (!allowed) return "/";
    const safe = new URLSearchParams();
    for (const [key, val] of url.searchParams)
      if (
        [
          "pagina",
          "page",
          "compare",
          "q",
          "busca",
          "categoria",
          "sort",
          "ordem",
          "status",
          "perfil",
        ].includes(key) &&
        val.length <= 200 &&
        !/[<>]/.test(val)
      )
        safe.append(key, val);
    if (path === "/radar" && url.searchParams.get("favoritos") === "1")
      safe.set("favoritos", "1");
    if (path === "/conta/anuncios") {
      const listing = classifiedsResumeId(url.searchParams.get("anuncio"));
      if (listing) safe.set("anuncio", listing);
      else if (url.searchParams.get("novo") === "1") safe.set("novo", "1");
    }
    const hash = /^#[a-zA-Z0-9_-]{1,100}$/.test(url.hash) ? url.hash : "";
    return path + (safe.size ? `?${safe.toString()}` : "") + hash;
  } catch {
    return "/";
  }
}
export function memberLoginHref(returnTo: string) {
  return `/conta?retorno=${encodeURIComponent(memberReturnPath(returnTo))}`;
}

export function memberError(error: unknown): string {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";
  const messages: Record<string, string> = {
    identity_verification_required:
      "Valide seu e-mail e celular na Minha conta para participar.",
    identity_invalid_code:
      "Código inválido ou já utilizado. Confira os seis dígitos ou solicite um novo código.",
    identity_code_expired:
      "Esse código expirou. Solicite um novo para continuar.",
    identity_rate_limited:
      "Aguarde antes de solicitar outro código. Há um limite de tentativas por hora.",
    invalid_phone:
      "Informe seu celular com DDD e autorize o recebimento do código pelo WhatsApp.",
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
