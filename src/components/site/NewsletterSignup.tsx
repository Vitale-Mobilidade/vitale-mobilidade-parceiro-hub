import { Mail } from "lucide-react";
import {
  newsletterReferralsEnabled,
  referralCode as validReferralCode,
} from "@/lib/newsletter-referrals";

/** Newsletter is included in community membership: one signup and immediate access. */
export function NewsletterSignup({
  compact = false,
  referralCode,
}: {
  compact?: boolean;
  referralCode?: string;
}) {
  const invitation = newsletterReferralsEnabled
    ? validReferralCode(referralCode)
    : undefined;
  const href = `/conta?modo=cadastro${invitation ? `&convite=${invitation}` : ""}`;
  return (
    <section
      aria-label="Participar da comunidade Vitale"
      className={`grid gap-6 rounded-lg border border-line bg-card p-6 sm:p-8 ${compact ? "" : "md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-center"}`}
    >
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-mint/25 text-action">
          <Mail className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-bold text-ink">
            Faça parte da comunidade Vitale
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie sua conta gratuita para comentar nos artigos e receber a
            newsletter com conteúdos, vídeos e novidades sobre bikes elétricas.
          </p>
        </div>
      </div>
      <div>
        <a
          href={href}
          className="inline-flex min-h-12 items-center justify-center rounded-lg bg-action px-6 py-3 font-bold text-primary-foreground hover:bg-action/90"
        >
          Criar conta e participar
        </a>
        <p className="mt-3 text-sm text-muted-foreground">
          A newsletter está incluída na adesão à comunidade. Seu acesso é
          imediato e você pode cancelar o recebimento pelos e-mails.
        </p>
        <a
          href="/conta"
          className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold underline"
        >
          Já tenho conta
        </a>
      </div>
    </section>
  );
}
