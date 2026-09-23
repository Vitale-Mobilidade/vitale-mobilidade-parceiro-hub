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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
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
      <h1 className="mt-2 text-3xl font-bold text-foreground">Admin</h1>
      <p className="mt-2 text-sm text-muted-foreground">Acesso individual da equipe editorial e operacional.</p>
      <label className="mt-6 block text-sm font-medium" htmlFor="admin-email">E-mail</label>
      <input id="admin-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)}
        className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5" />
      <label className="mt-4 block text-sm font-medium" htmlFor="admin-password">Senha</label>
      <input id="admin-password" type="password" autoComplete="current-password" required value={password}
        onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5" />
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <button disabled={busy} className="mt-6 w-full rounded-lg bg-primary px-4 py-3 font-semibold text-white disabled:opacity-60">
        {busy ? "Entrando…" : "Entrar"}
      </button>
    </form>
  </main>;
}

export function AdminShell({ children }: Props) {
  const path = useRouterState({ select: s => s.location.pathname });
  const [state, setState] = useState<"checking" | "out" | "in">("checking");
  const [session, setSession] = useState<AdminSession | null>(null);
  const [error, setError] = useState("");
  const check = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) { setSession(null); setState("out"); return; }
    const role = await adminCall<AdminSession>("session");
    setSession(role); setState("in"); setError("");
  }, []);
  useEffect(() => {
    void check().catch(() => { setSession(null); setState("out"); setError("Não foi possível verificar o acesso."); });
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") { setSession(null); setState("out"); }
    });
    return () => listener.subscription.unsubscribe();
  }, [check]);
  if (state === "checking") return <main className="min-h-screen bg-surface p-8" aria-busy="true">Verificando acesso…</main>;
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
