import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/site-ui";
import { MemberAccount } from "@/components/members/MemberAccount";
import { referralCode } from "@/lib/newsletter-referrals";
import {
  memberAccountsEnabled,
  memberReturnPath,
} from "@/lib/member-community";

export const Route = createFileRoute("/conta")({
  validateSearch: (search: Record<string, unknown>) => ({
    retorno: memberReturnPath(search.retorno),
    convite: referralCode(search.convite),
    modo: ["cadastro", "recuperar", "senha", "perfil"].includes(
      String(search.modo),
    )
      ? String(search.modo)
      : "entrar",
  }),
  headers: () => ({
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
  }),
  head: () => ({
    meta: [
      { title: "Minha conta | Vitale Mobilidade" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { retorno, modo, convite } = Route.useSearch();
  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-12" data-heatmap-private>
        {memberAccountsEnabled ? (
          <MemberAccount
            returnTo={retorno}
            initialMode={modo}
            invitationCode={convite}
          />
        ) : (
          <>
            <h1 className="text-3xl font-bold">Minha conta</h1>
            <p className="mt-4">
              A área de leitores ainda não está disponível.
            </p>
            <a href="/conteudos" className="mt-4 inline-block underline">
              Explorar os artigos
            </a>
          </>
        )}
      </main>
    </div>
  );
}
