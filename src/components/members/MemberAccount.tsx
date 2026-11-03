import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";
import { newsletterReferralsEnabled } from "@/lib/newsletter-referrals";
import { supabase } from "@/integrations/supabase/client";
import { useMemberSession } from "@/hooks/use-member-session";
import { communityAccount, memberCall } from "@/lib/member-community-api";
import {
  communitySignupMetadata,
  hasCommunityConsent,
} from "@/lib/community-membership";
import {
  displayNameSchema,
  memberError,
  memberProfileSchema,
  passwordSchema,
  type MemberProfile,
} from "@/lib/member-community";

const field = "mt-1 w-full rounded-lg border border-line bg-white p-3 text-ink";
const button =
  "min-h-11 rounded-lg bg-ink px-5 py-3 font-bold text-white disabled:opacity-50";
type Mode = "entrar" | "cadastro" | "recuperar" | "senha";
const IdentityPanel = lazy(() =>
  import("./IdentityPanel").then((module) => ({
    default: module.IdentityPanel,
  })),
);
const ReferralPanel = lazy(() =>
  import("./ReferralPanel").then((module) => ({
    default: module.ReferralPanel,
  })),
);

type Props = { returnTo: string; initialMode: string; invitationCode?: string };
export function MemberAccount(props: Props) {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    if (!newsletterReferralsEnabled || !props.invitationCode) return;
    void supabase.functions
      .invoke("newsletter-interest", {
        body: {
          action: "community_referral_visit",
          referralCode: props.invitationCode,
        },
      })
      .catch(() => {
        /* Visits never block membership. */
      });
  }, [props.invitationCode]);

  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setAvailable(null);
    void memberCall("status")
      .then((data) => {
        if (active)
          setAvailable(
            Boolean(
              data &&
              typeof data === "object" &&
              !Array.isArray(data) &&
              data.enabled === true,
            ),
          );
      })
      .catch(() => {
        if (active) setAvailable(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);
  if (available === null) return <p role="status">Carregando comunidade…</p>;
  if (!available)
    return (
      <section>
        <h1 className="text-3xl font-bold">Minha conta</h1>
        <p role="status" className="mt-4">
          A comunidade está temporariamente indisponível.
        </p>
        <button
          onClick={() => setRetry((n) => n + 1)}
          className="mt-4 min-h-11 underline"
        >
          Tentar novamente
        </button>
        <a href="/conteudos" className="ml-4 underline">
          Explorar os artigos
        </a>
      </section>
    );
  return <AccountWorkspace {...props} />;
}

function AccountWorkspace({ returnTo, initialMode, invitationCode }: Props) {
  const { session, loading } = useMemberSession();
  const [mode, setMode] = useState<Mode>(initialMode as Mode);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const userId = session?.user.id;

  useEffect(() => {
    let active = true;
    setReady(false);
    setProfile(null);
    if (!userId) return;
    let readSucceeded = false;
    void (async () => {
      let next = memberProfileSchema
        .nullable()
        .parse(await communityAccount("profile"));
      readSucceeded = true;
      const metadata = session?.user.user_metadata;
      const initialName =
        next?.displayName ?? String(metadata?.display_name ?? "");
      if (active) {
        setProfile(next);
        setName(initialName);
      }
      if (
        !next?.communityJoinedAt &&
        hasCommunityConsent(metadata) &&
        displayNameSchema.safeParse(initialName).success
      ) {
        next = memberProfileSchema.parse(
          await communityAccount("join", {
            displayName: initialName,
            ...(invitationCode ? { invitationCode } : {}),
          }),
        );
      }
      if (active) {
        setProfile(next);
        setPrivacy(Boolean(next?.communityJoinedAt));
        setReady(true);
        setError("");
      }
    })().catch((e) => {
      if (active) {
        setReady(readSucceeded);
        setError(memberError(e));
      }
    });
    return () => {
      active = false;
    };
    // Only identity changes reset the form; token refresh must not overwrite typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, retry, invitationCode]);

  function changeMode(next: Mode) {
    setMode(next);
    setError("");
    setMessage("");
    setPassword("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (session && mode === "senha") {
        if (!passwordSchema.safeParse(password).success)
          throw new Error("password_invalid");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        const { error: revokeError } = await supabase.auth.signOut({
          scope: "others",
        });
        if (revokeError) {
          setMessage(
            "Senha atualizada. Não foi possível encerrar outras sessões; tente sair dos outros dispositivos.",
          );
        } else {
          setMessage("Senha atualizada. As outras sessões foram encerradas.");
        }
        setMode("entrar");
      } else if (session) {
        if (!displayNameSchema.safeParse(name).success)
          throw new Error("invalid_name");
        if (!privacy) throw new Error("privacy_required");
        if (!profile?.communityJoinedAt) {
          const data = await communityAccount("join", {
            displayName: name.trim(),
            acknowledged: true,
            ...(invitationCode ? { invitationCode } : {}),
          });
          setProfile(memberProfileSchema.parse(data));
          setMessage(
            "Você entrou na comunidade Vitale. Confira abaixo o estado da sua assinatura da newsletter.",
          );
        } else {
          const data = await memberCall("save_profile", {
            displayName: name.trim(),
            privacyAcknowledged: true,
          });
          setProfile({ ...profile, ...memberProfileSchema.parse(data) });
          setMessage("Perfil salvo.");
        }
      } else if (mode === "recuperar" || mode === "senha") {
        const { error } = await supabase.functions.invoke(
          "member-password-recovery",
          {
            body: { email: email.trim(), website: "" },
          },
        );
        if (error) throw error;
        setMessage(
          "Se houver uma conta com este e-mail, você receberá um link para definir uma nova senha.",
        );
      } else if (mode === "cadastro") {
        if (!displayNameSchema.safeParse(name).success)
          throw new Error("invalid_name");
        if (!passwordSchema.safeParse(password).success)
          throw new Error("password_invalid");
        if (!privacy) throw new Error("privacy_required");
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/conta?retorno=${encodeURIComponent(returnTo)}`,
            data: communitySignupMetadata(name.trim(), invitationCode),
          },
        });
        if (error) throw error;
        if (!data.session) {
          setMessage(
            "Não foi possível iniciar seu acesso. Se já tem conta, entre ou use a recuperação de senha.",
          );
        } else {
          setMode("entrar");
          setMessage("Conta criada. Bem-vindo à comunidade Vitale!");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setError(
            "Não foi possível entrar. Confira seu e-mail e senha ou use a recuperação de acesso.",
          );
          return;
        }
        setMode("entrar");
      }
    } catch (e) {
      const code =
        e && typeof e === "object" && "message" in e ? e.message : "";
      setError(
        code === "password_invalid"
          ? "Use uma senha de 12 a 128 caracteres."
          : code === "privacy_required"
            ? "Confirme a leitura do aviso de privacidade."
            : memberError(e),
      );
    } finally {
      setBusy(false);
      setPassword("");
    }
  }
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      setMode("entrar");
      setMessage("");
      setEmail("");
      setName("");
      setPrivacy(false);
    } catch (e) {
      setError(memberError(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <p role="status">Carregando sua conta…</p>;
  const editing = Boolean(session) && mode !== "senha";
  const signup = !session && mode === "cadastro";
  const recovery = !session && (mode === "recuperar" || mode === "senha");
  return (
    <>
      <section className="rounded-2xl border border-line bg-white p-5 sm:p-8">
        <h1 className="text-3xl font-bold text-ink">
          {session
            ? mode === "senha"
              ? "Definir nova senha"
              : "Minha conta"
            : signup
              ? "Entre para a comunidade Vitale"
              : recovery
                ? "Recuperar acesso"
                : "Entre na comunidade Vitale"}
        </h1>
        <p className="mt-3 text-muted-foreground">
          Sua conta inclui a newsletter. Para curtir artigos, comentar e
          anunciar, valide seu e-mail e celular.
        </p>
        {session && (
          <p className="mt-4 break-all text-sm">
            Conectado como {session.user.email}
          </p>
        )}
        {profile?.communityJoinedAt && (
          <p className="mt-4 rounded-lg bg-surface p-3 text-sm">
            Você faz parte da comunidade Vitale. Newsletter:{" "}
            <strong>
              {profile.newsletterSubscribed
                ? "assinatura ativa"
                : "assinatura cancelada"}
            </strong>
            .{" "}
            {profile.newsletterSubscribed
              ? "Você pode cancelar o recebimento pelo link nos e-mails."
              : "Mantivemos seu pedido de descadastro. Sua participação na comunidade continua ativa."}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 p-3 text-red-900"
          >
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="mt-4 rounded-lg bg-emerald-50 p-3 text-emerald-950"
          >
            {message}
          </p>
        )}
        {editing && !ready ? (
          <div className="mt-5">
            <p>
              {error
                ? "Não foi possível carregar seu perfil."
                : "Carregando perfil…"}
            </p>
            {error && (
              <button onClick={() => setRetry((n) => n + 1)} className={button}>
                Tentar novamente
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-5">
            {(editing || signup) && (
              <div className="block font-semibold">
                <label htmlFor="member-name">Nome público</label>
                <input
                  id="member-name"
                  aria-describedby="member-name-help"
                  className={field}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  maxLength={60}
                  required
                  autoComplete="nickname"
                />
                <span
                  id="member-name-help"
                  className="mt-1 block text-sm font-normal text-muted-foreground"
                >
                  Esse nome aparece nos seus novos comentários. Seu e-mail fica
                  privado.
                </span>
              </div>
            )}
            {!session && (
              <label className="block font-semibold" htmlFor="member-email">
                E-mail
                <input
                  id="member-email"
                  className={field}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  maxLength={254}
                />
              </label>
            )}
            {!recovery && !editing && (
              <div className="block font-semibold">
                <label htmlFor="member-password">
                  {session ? "Nova senha" : "Senha"}
                </label>
                <input
                  id="member-password"
                  aria-describedby={
                    signup || session ? "member-password-help" : undefined
                  }
                  className={field}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={signup || session ? 12 : 1}
                  maxLength={128}
                  autoComplete={
                    signup || session ? "new-password" : "current-password"
                  }
                />
                {(signup || session) && (
                  <span
                    id="member-password-help"
                    className="text-sm font-normal"
                  >
                    Use de 12 a 128 caracteres.
                  </span>
                )}
              </div>
            )}
            {(editing || signup) && (
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0"
                  checked={privacy}
                  onChange={(e) => setPrivacy(e.target.checked)}
                  required
                />
                <span>
                  {(signup || !profile?.communityJoinedAt) && (
                    <>
                      Quero fazer parte da comunidade Vitale Mobilidade e
                      receber sua newsletter. Autorizo o uso do meu nome e
                      e-mail para essa participação e comunicação.{" "}
                    </>
                  )}
                  Li o{" "}
                  <a
                    href="/privacidade"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    aviso de privacidade
                  </a>{" "}
                  e entendo que meu nome público e comentários aprovados ficam
                  visíveis no site.
                </span>
              </label>
            )}
            {profile?.suspended && (
              <p role="status">
                Seu acesso a comentários está suspenso. Para pedir revisão,
                contate{" "}
                <a href="mailto:wowbmo@gmail.com" className="underline">
                  a Vitale
                </a>
                .
              </p>
            )}
            <button className={button} disabled={busy}>
              {busy
                ? "Aguarde…"
                : editing
                  ? profile?.communityJoinedAt
                    ? "Salvar perfil"
                    : "Entrar na comunidade"
                  : session
                    ? "Salvar nova senha"
                    : signup
                      ? "Criar conta"
                      : recovery
                        ? "Enviar link de recuperação"
                        : "Entrar"}
            </button>
          </form>
        )}
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          {session ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  changeMode(mode === "senha" ? "entrar" : "senha")
                }
                className="min-h-11 underline"
              >
                {mode === "senha" ? "Voltar ao perfil" : "Alterar senha"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={signOut}
                className="min-h-11 underline"
              >
                Sair desta conta
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  changeMode(signup || recovery ? "entrar" : "cadastro")
                }
                className="min-h-11 underline"
              >
                {signup || recovery ? "Já tenho conta" : "Criar conta gratuita"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => changeMode("recuperar")}
                className="min-h-11 underline"
              >
                Esqueci minha senha
              </button>
            </>
          )}
        </div>
        {(!session || ready) && (
          <a
            href={returnTo}
            className="mt-5 inline-flex min-h-11 items-center font-semibold underline"
          >
            {returnTo === "/conteudos"
              ? "Explorar os artigos"
              : "Voltar ao artigo"}
          </a>
        )}
        {session && (
          <p className="mt-5 text-sm text-muted-foreground">
            Para solicitar exclusão da conta e dos seus dados, contate{" "}
            <a href="mailto:wowbmo@gmail.com" className="underline">
              a Vitale
            </a>{" "}
            pelo e-mail cadastrado.
          </p>
        )}
      </section>
      {ready && profile?.communityJoinedAt && userId && (
        <Suspense
          fallback={
            <p role="status" className="mt-6">
              Carregando validação de acesso…
            </p>
          }
        >
          <IdentityPanel key={userId} email={session?.user.email ?? ""} />
        </Suspense>
      )}
      {newsletterReferralsEnabled &&
        ready &&
        profile?.communityJoinedAt &&
        userId && (
          <Suspense
            fallback={
              <p role="status" className="mt-6">
                Carregando suas indicações…
              </p>
            }
          >
            <ReferralPanel key={userId} />
          </Suspense>
        )}
    </>
  );
}
