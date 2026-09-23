import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { adminCall, type AdminRole, type AdminSession } from "@/lib/admin-api";

type Props = { children: (role: AdminRole) => ReactNode };

const NAV = [
  { title: "Operação", links: [["Visão geral", "/admin"], ["Bikes", "/admin/bikes"]] },
  { title: "Conteúdo", links: [["Vídeos", "/admin/videos"], ["Artigos", "/admin/conteudos"]] },
  { title: "Sistema", links: [["IA", "/admin/ia"], ["Logs", "/admin/logs"]] },
] as const;

function AdminLogin({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [view, setView] = useState<"login" | "reset">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    if (view === "reset") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin?setup=1`,
      });
      setBusy(false);
      if (resetError) { setError("Não foi possível solicitar o acesso agora. Tente novamente."); return; }
      setMessage("Se este e-mail tiver acesso à Vitale, você receberá um link para definir sua senha.");
      return;
    }
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError("Não foi possível entrar com essas credenciais."); setBusy(false); return; }
    try { await onSuccess(); }
    catch {
      await supabase.auth.signOut();
      setError("Sua conta não possui acesso ao Admin Vitale.");
    } finally { setBusy(false); setPassword(""); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-surface px-4">
    <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-line bg-white p-7 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Vitale Mobilidade</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground">{view === "reset" ? "Definir acesso" : "Admin"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{view === "reset" ? "Informe o e-mail cadastrado para receber um link seguro." : "Acesso individual da equipe editorial e operacional."}</p>
      <label className="mt-6 block text-sm font-medium" htmlFor="admin-email">E-mail</label>
      <input id="admin-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)}
        className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5" />
      {view === "login" && <><label className="mt-4 block text-sm font-medium" htmlFor="admin-password">Senha</label>
        <input id="admin-password" type="password" autoComplete="current-password" required value={password}
          onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5" /></>}
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}
      <button disabled={busy} className="mt-6 w-full rounded-lg bg-primary px-4 py-3 font-semibold text-white disabled:opacity-60">
        {busy ? "Aguarde…" : view === "reset" ? "Enviar link" : "Entrar"}
      </button>
      <button type="button" className="mt-4 w-full text-sm font-medium text-emerald-800 underline"
        onClick={() => { setView(view === "login" ? "reset" : "login"); setError(""); setMessage(""); }}>
        {view === "login" ? "Definir ou recuperar senha" : "Voltar para entrar"}
      </button>
    </form>
  </main>;
}

function AdminPasswordSetup({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (password !== confirmation) { setError("As senhas não coincidem."); return; }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) { setError("Não foi possível definir a senha. Solicite um novo link."); setBusy(false); return; }
    window.history.replaceState(null, "", "/admin");
    setPassword(""); setConfirmation("");
    try { await onSuccess(); }
    catch { setError("Senha definida, mas sua conta ainda não possui acesso ao Admin. Fale com a equipe Vitale."); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-surface px-4">
    <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-line bg-white p-7 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Vitale Mobilidade</p>
      <h1 className="mt-2 text-3xl font-bold">Defina sua senha</h1>
      <p className="mt-2 text-sm text-muted-foreground">Use uma senha individual com pelo menos 12 caracteres.</p>
      <label className="mt-6 block text-sm font-medium" htmlFor="new-admin-password">Nova senha</label>
      <input id="new-admin-password" type="password" autoComplete="new-password" required minLength={12} value={password}
        onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" />
      <label className="mt-4 block text-sm font-medium" htmlFor="confirm-admin-password">Confirme a senha</label>
      <input id="confirm-admin-password" type="password" autoComplete="new-password" required minLength={12} value={confirmation}
        onChange={e => setConfirmation(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" />
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <button disabled={busy} className="mt-6 w-full rounded-lg bg-primary px-4 py-3 font-semibold text-white disabled:opacity-60">
        {busy ? "Salvando…" : "Salvar senha e entrar"}
      </button>
      <a href="/admin" className="mt-4 block text-center text-sm font-medium text-emerald-800 underline">Voltar ao acesso</a>
    </form>
  </main>;
}

export function AdminShell({ children }: Props) {
  const path = useRouterState({ select: s => s.location.pathname });
  const [state, setState] = useState<"checking" | "out" | "password" | "in">("checking");
  const [session, setSession] = useState<AdminSession | null>(null);
  const [error, setError] = useState("");
  const check = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) { setSession(null); setState("out"); return; }
    if (new URLSearchParams(window.location.search).get("setup") === "1") {
      setSession(null); setState("password"); return;
    }
    const role = await adminCall<AdminSession>("session");
    setSession(role); setState("in"); setError("");
  }, []);
  useEffect(() => {
    void check().catch(() => { setSession(null); setState("out"); setError("Não foi possível verificar o acesso."); });
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") { setSession(null); setState("out"); }
      if (event === "PASSWORD_RECOVERY") { setSession(null); setState("password"); }
    });
    return () => listener.subscription.unsubscribe();
  }, [check]);
  if (state === "checking") return <main className="min-h-screen bg-surface p-8" aria-busy="true">Verificando acesso…</main>;
  if (state === "password") return <AdminPasswordSetup onSuccess={check} />;
  if (state === "out" || !session) return <><AdminLogin onSuccess={check} />{error && <p role="alert" className="sr-only">{error}</p>}</>;
  const role = session.role;
  return <div className="min-h-screen bg-surface text-foreground">
    <header className="border-b border-emerald-950 bg-emerald-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6">
        <Link to="/admin" className="text-lg font-bold tracking-tight">VITALE <span className="text-emerald-300">ADMIN</span></Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden text-emerald-100 sm:inline">{session.email} · {role}</span>
          <button onClick={() => void supabase.auth.signOut()} className="rounded-lg border border-emerald-600 px-3 py-1.5 hover:bg-emerald-900">Sair</button>
        </div>
      </div>
    </header>
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[190px_minmax(0,1fr)] md:px-6">
      <nav aria-label="Navegação administrativa" className="flex gap-4 overflow-x-auto pb-2 md:block md:space-y-6">
        {NAV.map(group => {
          const links = group.links.filter(([, href]) => role !== "operation" || ["/admin", "/admin/bikes"].includes(href));
          if (!links.length) return null;
          return <div key={group.title} className="min-w-max">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{group.title}</p>
            <div className="flex gap-1 md:flex-col">{links.map(([label, href]) => <a key={href} href={href}
              aria-current={path === href ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${path === href ? "bg-emerald-100 text-emerald-950" : "hover:bg-white"}`}>{label}</a>)}</div>
          </div>;
        })}
      </nav>
      <main className="min-w-0">{children(role)}</main>
    </div>
  </div>;
}
