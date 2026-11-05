import { startGoogleMemberSignIn } from "@/lib/member-google-auth";
import { memberGoogleAuthEnabled } from "@/lib/member-accounts-feature";
import { memberPhone } from "@/lib/member-identity";
import {
  requestSignupIdentityCodes,
  type IdentityDelivery,
} from "@/lib/member-identity-delivery";
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  rememberMemberReturn,
  rememberedMemberReturn,
  clearMemberReturn,
} from "@/lib/member-auth-return";
import { newsletterReferralsEnabled } from "@/lib/newsletter-referrals";
import { supabase } from "@/integrations/supabase/client";
import { useMemberSession } from "@/hooks/use-member-session";
import {
  acceptGoogleMemberEmail,
  communityAccount,
  memberCall,
} from "@/lib/member-community-api";
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

const ProfilePhoto = lazy(() =>
  import("./ProfilePhoto").then((module) => ({ default: module.ProfilePhoto })),
);
const SellerPanel = lazy(() =>
  import("./SellerPanel").then((m) => ({ default: m.SellerPanel })),
);
const field = "mt-1 w-full rounded-lg border border-line bg-white p-3 text-ink";
const button =
  "min-h-11 rounded-lg bg-ink px-5 py-3 font-bold text-white disabled:opacity-50";
type Mode =
  "entrar" | "cadastro" | "recuperar" | "senha" | "perfil" | "validar";
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
      </section>
    );
  return <AccountWorkspace {...props} />;
}

function AccountWorkspace({ returnTo, initialMode, invitationCode }: Props) {
  const { session, loading } = useMemberSession();
  const [mode, setMode] = useState<Mode>(initialMode as Mode);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const creatingAccount = useRef(false);
  const [signupFlow, setSignupFlow] = useState(false);
  const [googleEmailVerified, setGoogleEmailVerified] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const googleAccount = Boolean(
    session?.user.identities?.some((i) => i.provider === "google") ||
    session?.user.app_metadata?.provider === "google",
  );
  const [phone, setPhone] = useState("");
  const [phoneConsent, setPhoneConsent] = useState(false);
  const [delivery, setDelivery] = useState<IdentityDelivery>();
  const [privacy, setPrivacy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const userId = session?.user.id;
  const profileRequested = initialMode === "perfil";
  const [recoveryReturn, setRecoveryReturn] = useState(returnTo);
  useEffect(() => {
    if (initialMode === "senha")
      setRecoveryReturn(rememberedMemberReturn(returnTo));
  }, [initialMode, returnTo]);
  const destination = initialMode === "senha" ? recoveryReturn : returnTo;
  useEffect(() => {
    if (
      session &&
      ready &&
      profileUserId === userId &&
      profile?.communityJoinedAt &&
      !profileRequested &&
      !signupFlow &&
      (mode === "entrar" || mode === "cadastro")
    ) {
      clearMemberReturn();
      window.location.replace(destination);
    }
  }, [
    session,
    ready,
    profileUserId,
    userId,
    profile?.communityJoinedAt,
    profileRequested,
    signupFlow,
    mode,
    destination,
  ]);

  useEffect(() => {
    let active = true;
    setReady(false);
    setProfileUserId(undefined);
    setProfile(null);
    if (!userId || creatingAccount.current) return;
    let readSucceeded = false;
    void (async () => {
      let next = memberProfileSchema
        .nullable()
        .parse(await communityAccount("profile"));
      readSucceeded = true;
      const metadata = session?.user.user_metadata;
      const initialName =
        next?.displayName ??
        String(
          metadata?.display_name ?? metadata?.full_name ?? metadata?.name ?? "",
        )
          .trim()
          .slice(0, 60);
      if (active) {
        setProfile(next);
        setName(initialName);
      }
      if (
        !creatingAccount.current &&
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
      if (googleAccount && next?.communityJoinedAt) {
        const verified = await acceptGoogleMemberEmail().catch(() => false);
        if (active) setGoogleEmailVerified(verified);
      }
      if (active) {
        setProfile(next);
        setPrivacy(Boolean(next?.communityJoinedAt));
        setReady(true);
        setProfileUserId(userId);
        setError("");
      }
    })().catch((e) => {
      if (active) {
        setReady(readSucceeded);
        if (readSucceeded) setProfileUserId(userId);
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
  async function googleSignIn() {
    setGoogleBusy(true);
    setError("");
    setMessage("");
    try {
      await startGoogleMemberSignIn(returnTo, invitationCode);
    } catch {
      setGoogleBusy(false);
      setError(
        "Não foi possível entrar com Google. Tente novamente ou use seu e-mail e senha.",
      );
    }
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
        if (!revokeError) setMode(profileRequested ? "perfil" : "entrar");
      } else if (session && mode !== "recuperar") {
        if (!displayNameSchema.safeParse(name).success)
          throw new Error("invalid_name");
        if (!privacy) throw new Error("privacy_required");
        if (!profile?.communityJoinedAt) {
          if (googleAccount && (!memberPhone(phone) || !phoneConsent))
            throw new Error("invalid_phone");
          const data = await communityAccount("join", {
            displayName: name.trim(),
            acknowledged: true,
            ...(invitationCode ? { invitationCode } : {}),
          });
          setProfile(memberProfileSchema.parse(data));
          setMessage("Cadastro concluído.");
          if (googleAccount) {
            setSignupFlow(true);
            const verified = await acceptGoogleMemberEmail().catch(() => false);
            setGoogleEmailVerified(verified);
            setDelivery(await requestSignupIdentityCodes(phone, verified));
            setMode("validar");
            setMessage("");
          }
        } else {
          const data = await memberCall("save_profile", {
            displayName: name.trim(),
            privacyAcknowledged: true,
          });
          setProfile({ ...profile, ...memberProfileSchema.parse(data) });
          setMessage("Perfil salvo.");
          window.dispatchEvent(new Event("vitale-profile-updated"));
        }
      } else if (mode === "recuperar" || mode === "senha") {
        rememberMemberReturn(returnTo);
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
        if (!memberPhone(phone) || !phoneConsent)
          throw new Error("invalid_phone");
        creatingAccount.current = true;
        setSignupFlow(true);
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
          setSignupFlow(false);
          setMessage(
            "Não foi possível iniciar seu acesso. Se já tem conta, entre ou use a recuperação de senha.",
          );
        } else {
          const joined = memberProfileSchema.parse(
            await communityAccount("join", {
              displayName: name.trim(),
              acknowledged: true,
              ...(invitationCode ? { invitationCode } : {}),
            }),
          );
          setProfile(joined);
          setProfileUserId(data.session.user.id);
          setReady(true);
          setDelivery(await requestSignupIdentityCodes(phone));
          setMode("validar");
          setMessage("");
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
        setMode(profileRequested ? "perfil" : "entrar");
      }
    } catch (e) {
      if (creatingAccount.current) setSignupFlow(false);
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
      creatingAccount.current = false;
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
      setSignupFlow(false);
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
  const validatingSignup = Boolean(session) && mode === "validar";
  const passwordUpdate = Boolean(session) && mode === "senha";
  const recovery =
    (!session && (mode === "recuperar" || mode === "senha")) ||
    mode === "recuperar";
  const joining =
    Boolean(session) &&
    ready &&
    !profile?.communityJoinedAt &&
    !passwordUpdate &&
    !recovery;
  const editing =
    Boolean(session) &&
    !passwordUpdate &&
    !recovery &&
    !validatingSignup &&
    (profileRequested || joining);
  const signup = !session && mode === "cadastro";
  if (validatingSignup)
    return (
      <section className="rounded-2xl border border-line bg-white p-5 sm:p-8">
        <h1 className="text-3xl font-bold text-ink">
          {googleEmailVerified
            ? "Confirme seu WhatsApp"
            : "Confirme seu e-mail e WhatsApp"}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {googleEmailVerified
            ? "Seu e-mail já foi confirmado pelo Google. Digite o código recebido no WhatsApp para liberar curtidas, comentários e anúncios."
            : "Sua conta foi criada. Digite os dois códigos para liberar curtidas, comentários e a publicação de bikes."}
        </p>
        <Suspense fallback={<p role="status">Carregando validação…</p>}>
          <IdentityPanel
            embedded
            email={session?.user.email ?? ""}
            initialPhone={phone}
            initialDelivery={delivery}
            onVerified={() => {
              clearMemberReturn();
              window.location.replace(destination);
            }}
          />
        </Suspense>
        <a
          href={destination}
          className="mt-5 inline-flex min-h-11 items-center text-sm underline"
        >
          Confirmar depois e continuar no site
        </a>
      </section>
    );
  if (session && !passwordUpdate && !recovery && !editing)
    return (
      <section className="rounded-2xl border border-line bg-white p-7">
        <p role="status">
          {error ? "Não foi possível concluir seu acesso." : "Entrando…"}
        </p>
        {error && (
          <>
            <p role="alert" className="mt-3">
              {error}
            </p>
            <button
              onClick={() => setRetry((n) => n + 1)}
              className={`${button} mt-4`}
            >
              Tentar novamente
            </button>
          </>
        )}
      </section>
    );
  return (
    <>
      <section className="rounded-2xl border border-line bg-white p-5 sm:p-8">
        <h1 className="text-3xl font-bold text-ink">
          {recovery
            ? "Recuperar acesso"
            : session
              ? passwordUpdate
                ? "Definir nova senha"
                : joining
                  ? "Concluir cadastro"
                  : "Editar meu perfil"
              : signup
                ? "Entre para a comunidade Vitale"
                : recovery
                  ? "Recuperar acesso"
                  : "Entre na comunidade Vitale"}
        </h1>
        {editing && ready && profile?.communityJoinedAt && userId && (
          <Suspense fallback={<p role="status">Carregando foto do perfil…</p>}>
            <ProfilePhoto key={userId} embedded />
          </Suspense>
        )}
        {session && passwordUpdate && (
          <p className="mt-4 break-all text-sm">{session.user.email}</p>
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
        {!session && !recovery && memberGoogleAuthEnabled && (
          <div className="mt-6">
            <button
              type="button"
              disabled={busy || googleBusy}
              onClick={() => void googleSignIn()}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-line bg-white px-5 py-3 font-semibold text-ink hover:bg-surface disabled:opacity-50"
            >
              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#4285F4"
                  d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"
                />
                <path
                  fill="#34A853"
                  d="M12 22c2.7 0 4.96-.9 6.61-2.41l-3.24-2.51c-.9.6-2.05.96-3.37.96-2.6 0-4.81-1.76-5.6-4.12H3.05v2.59A10 10 0 0 0 12 22Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.4 13.92a6 6 0 0 1 0-3.84V7.49H3.05a10 10 0 0 0 0 9.02l3.35-2.59Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.96c1.47 0 2.79.51 3.83 1.51l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.95 5.49l3.35 2.59c.79-2.36 3-4.12 5.6-4.12Z"
                />
              </svg>
              {googleBusy ? "Conectando ao Google…" : "Continuar com Google"}
            </button>
            <p className="mt-5 text-center text-sm text-muted-foreground">
              ou continue com e-mail
            </p>
          </div>
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
                  {name.length}/60 caracteres · mínimo de 2. Esse nome aparece
                  nos seus comentários. Seu e-mail fica privado.
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
            {joining && googleAccount && (
              <p className="break-all text-sm">
                E-mail da sua conta Google: {session?.user.email}
              </p>
            )}
            {(signup || (joining && googleAccount)) && (
              <div>
                <label htmlFor="signup-phone" className="block font-semibold">
                  Celular com WhatsApp e DDD
                </label>
                <input
                  id="signup-phone"
                  type="tel"
                  autoComplete="tel"
                  className={field}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  maxLength={22}
                  aria-describedby="signup-phone-help"
                  required
                />
                <p
                  id="signup-phone-help"
                  className="mt-2 text-sm text-muted-foreground"
                >
                  {phone.length}/22 caracteres. Informe DDD e os 9 dígitos do
                  celular.
                </p>
                <label className="mt-3 flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 shrink-0"
                    checked={phoneConsent}
                    onChange={(e) => setPhoneConsent(e.target.checked)}
                    required
                  />
                  <span>
                    {googleAccount
                      ? "Aceito receber um código de validação no WhatsApp informado."
                      : "Aceito receber os códigos de validação por e-mail e no WhatsApp informado."}{" "}
                    Se eu anunciar uma bike, esse WhatsApp será o contato para
                    compradores, após minha autorização.
                  </span>
                </label>
              </div>
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
            {(joining || signup) && (
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
            <button className={button} disabled={busy || googleBusy}>
              {busy
                ? "Aguarde…"
                : editing
                  ? profile?.communityJoinedAt
                    ? "Salvar perfil"
                    : "Entrar na comunidade"
                  : passwordUpdate
                    ? "Salvar nova senha"
                    : recovery
                      ? "Enviar link de recuperação"
                      : signup
                        ? "Criar conta"
                        : "Entrar"}
            </button>
          </form>
        )}
        {editing && ready && profile?.communityJoinedAt && userId && (
          <Suspense fallback={<p role="status">Carregando contatos…</p>}>
            <IdentityPanel
              key={userId}
              embedded
              email={session?.user.email ?? ""}
            />
          </Suspense>
        )}
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          {passwordUpdate ? (
            <a href={destination} className="min-h-11 underline">
              Cancelar
            </a>
          ) : session && !recovery ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  changeMode(
                    mode === "senha"
                      ? profileRequested
                        ? "perfil"
                        : "entrar"
                      : "senha",
                  )
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
                {recovery
                  ? "Voltar para entrar"
                  : signup
                    ? "Já tenho conta"
                    : "Criar conta gratuita"}
              </button>
              {!recovery && !signup && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => changeMode("recuperar")}
                  className="min-h-11 underline"
                >
                  Esqueci minha senha
                </button>
              )}
            </>
          )}
        </div>
        {editing && profileRequested && (
          <a
            href={destination}
            className="mt-5 inline-flex min-h-11 items-center font-semibold underline"
          >
            Voltar
          </a>
        )}
        {editing && (
          <p className="mt-5 text-sm text-muted-foreground">
            Para solicitar exclusão da conta e dos seus dados, contate{" "}
            <a href="mailto:wowbmo@gmail.com" className="underline">
              a Vitale
            </a>{" "}
            pelo e-mail cadastrado.
          </p>
        )}
      </section>
      {editing && ready && profile?.communityJoinedAt && userId && (
        <Suspense
          fallback={<p role="status">Carregando sua área de anúncios…</p>}
        >
          <SellerPanel key={userId} />
        </Suspense>
      )}
      {newsletterReferralsEnabled &&
        editing &&
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
