import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";
import { newsletterReferralsEnabled } from "@/lib/newsletter-referrals";
import { supabase } from "@/integrations/supabase/client";
import { useMemberSession } from "@/hooks/use-member-session";
import { memberCall } from "@/lib/member-community-api";
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
const ReferralPanel = lazy(() =>
  import("./ReferralPanel").then((module) => ({
    default: module.ReferralPanel,
  })),
);

type Props = { returnTo: string; initialMode: string };
export function MemberAccount(props: Props) {
  const [available, setAvailable] = useState<boolean | null>(null);
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
  if (available === null)
    return <p role="status">Carregando área de leitores…</p>;
  if (!available)
    return (
      <section>
        <h1 className="text-3xl font-bold">Minha conta</h1>
        <p role="status" className="mt-4">
          A área de leitores está temporariamente indisponível.
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

function AccountWorkspace({ returnTo, initialMode }: Props) {
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
    void memberCall("profile")
      .then((data) => {
        const next = memberProfileSchema.nullable().parse(data);
        if (active) {
          setProfile(next);
          setName(
            next?.displayName ??
              String(session?.user.user_metadata?.display_name ?? ""),
          );
          setPrivacy(Boolean(next));
          setReady(true);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(memberError(e));
      });
    return () => {
      active = false;
    };
    // Only identity changes reset the form; token refresh must not overwrite typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, retry]);

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
        setMode("entrar");
        setMessage("Senha atualizada.");
      } else if (session) {
        if (!displayNameSchema.safeParse(name).success)
          throw new Error("invalid_name");
        if (!privacy) throw new Error("privacy_required");
        const data = await memberCall("save_profile", {
          displayName: name.trim(),
          privacyAcknowledged: true,
        });
        setProfile(memberProfileSchema.parse(data));
        setMessage("Perfil salvo.");
      } else if (mode === "recuperar" || mode === "senha") {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: `${window.location.origin}/conta?modo=senha` },
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
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/conta?retorno=${encodeURIComponent(returnTo)}`,
            data: { display_name: name.trim() },
          },
        });
        if (error) throw error;
        setMessage(
          "Confira seu e-mail para confirmar o cadastro. Se já tiver conta, entre ou recupere sua senha.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setError(
            "Não foi possível entrar. Confira e-mail, senha e confirmação do cadastro.",
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
  async function resendConfirmation() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/conta?retorno=${encodeURIComponent(returnTo)}`,
        },
      });
      if (error) throw error;
      setMessage(
        "Se houver um cadastro aguardando confirmação, enviaremos um novo link. Confira também a caixa de spam.",
      );
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
              ? "Crie sua conta gratuita"
              : recovery
                ? "Recuperar acesso"
                : "Entre na Vitale"}
        </h1>
        <p className="mt-3 text-muted-foreground">
          Seu perfil para participar das conversas sobre bikes elétricas.
        </p>
        {session && (
          <p className="mt-4 break-all text-sm">
            Conectado como {session.user.email}
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
                  visíveis no site. A newsletter tem inscrição separada.
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
                  ? "Salvar perfil"
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
        {signup && (
          <button
            type="button"
            disabled={busy || !email.trim()}
            onClick={resendConfirmation}
            className="mt-3 min-h-11 text-sm underline disabled:opacity-40"
          >
            Reenviar confirmação de e-mail
          </button>
        )}
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
      {newsletterReferralsEnabled && ready && profile && userId && (
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
