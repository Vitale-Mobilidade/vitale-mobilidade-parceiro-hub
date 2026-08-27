import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  LogOut,
  Loader2,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Lock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  buildCatalogRows,
  STATIC_CATALOG,
  type CatalogSnapshot,
  type SyncState,
} from "@/lib/bike-catalog";
import SyncHistory from "@/components/painel/SyncHistory";
import {
  buildPanelRows,
  clearPanelSession,
  DEFAULT_SORT,
  nextSort,
  readPanelSession,
  relativeTime,
  sortPanelRows,
  storePanelSession,
  type AssetRow,
  type OverrideRow,
  type PanelRow,
  type PanelStorages,
  type ProfileRow,
  type SortKey,
  type SortState,
} from "@/lib/painel-bikes";


const SHEET_PUBLIC_URL =
  "https://docs.google.com/spreadsheets/d/1gIzIM3YOsT3tXLkYGqJMsZ26oY_mOc10SLaT0hzKOkc/edit#gid=0";

const PANEL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bike-panel`;

const storages: PanelStorages = { session: sessionStorage, persistent: localStorage };

interface PanelData {
  snapshot: { id: string; data: CatalogSnapshot; updated_at: string } | null;
  syncState: SyncState | null;
  overrides: OverrideRow[];
  assets: AssetRow[];
  profiles: ProfileRow[];
}

async function panelCall<T = Record<string, unknown>>(
  action: string,
  body: Record<string, unknown> = {},
  token?: string,
): Promise<{ status: number; data: T & { ok?: boolean; error?: string } }> {
  const res = await fetch(PANEL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, ...body }),
  });
  let data: T & { ok?: boolean; error?: string };
  try {
    data = await res.json();
  } catch {
    data = {} as T & { ok?: boolean; error?: string };
  }
  return { status: res.status, data };
}

type FilterKey = "todos" | "eligible" | "draft" | "inactive" | "static" | "not_eligible";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "todos", label: "Todas" },
  { key: "eligible", label: "Elegíveis" },
  { key: "not_eligible", label: "Não elegíveis" },
  { key: "draft", label: "Pendentes" },
  { key: "inactive", label: "Inativas" },
  { key: "static", label: "Só estáticas" },
];

const STATE_LABEL: Record<PanelRow["state"], string> = {
  eligible: "Elegível",
  draft: "Pendente",
  inactive: "Inativa",
  static: "Estática (sem linha)",
};

function fmt(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const brl = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const IMAGE_STATUS_LABEL: Record<string, string> = {
  pending: "imagem pendente",
  downloading: "baixando imagem",
  ready: "imagem persistida",
  error: "erro na imagem",
};

const PROFILE_STATUS_LABEL: Record<string, string> = {
  pending: "perfil IA pendente",
  processing: "gerando perfil IA",
  ready: "perfil IA pronto",
  error: "erro no perfil IA",
  review: "perfil IA em revisão",
};

// ---------------- Tela de login ----------------

function LoginScreen({ onLoggedIn }: { onLoggedIn: (token: string, expiresAt: string, remember: boolean) => void }) {
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !password) return;
    setLoading(true);
    setError(null);
    try {
      const { status, data } = await panelCall("login", { password, remember });
      if (data.ok && typeof data.token === "string" && typeof data.expiresAt === "string") {
        storePanelSession(storages, data.token, data.expiresAt, remember);
        onLoggedIn(data.token, data.expiresAt, remember);
        return;
      }
      // Erros 503 (não configurado) e 429 (rate limit) são seguros de exibir;
      // credencial errada recebe sempre mensagem genérica.
      if (status === 503 || status === 429) {
        setError(data.error ?? "Não foi possível entrar.");
      } else {
        setError("Senha incorreta. Tente novamente.");
      }
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
      setPassword("");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-5 rounded-xl border border-border bg-card p-8 shadow-sm"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Painel do catálogo</h1>
          <p className="text-sm text-muted-foreground">Acesso restrito — Vitale Mobilidade</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="painel-senha" className="text-sm font-medium text-foreground">
            Senha
          </label>
          <Input
            id="painel-senha"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="painel-lembrar"
            checked={remember}
            onCheckedChange={(v) => setRemember(v === true)}
            disabled={loading}
          />
          <label htmlFor="painel-lembrar" className="text-sm text-muted-foreground">
            Lembrar de mim (30 dias)
          </label>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading || !password}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Entrar
        </Button>
      </form>
    </main>
  );
}

// ---------------- Cabeçalho ordenável ----------------

function SortableTh({
  label,
  sortKey,
  sort,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sort.key === sortKey;
  return (
    <th
      className={`p-3 ${className}`}
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground"
      >
        {label}
        {active ? (
          sort.dir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
        )}
      </button>
    </th>
  );
}

// ---------------- Página ----------------

export default function PainelBikes() {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [data, setData] = useState<PanelData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("todos");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);

  useEffect(() => {
    document.title = "Painel do catálogo de bikes | Vitale Mobilidade";
    const robots = document.querySelector('meta[name="robots"]') ?? (() => {
      const m = document.createElement("meta");
      m.setAttribute("name", "robots");
      document.head.appendChild(m);
      return m;
    })();
    robots.setAttribute("content", "noindex, nofollow");
  }, []);

  const logout = useCallback(async (tok?: string | null) => {
    if (tok) {
      try { await panelCall("logout", {}, tok); } catch { /* sessão local é limpa mesmo assim */ }
    }
    clearPanelSession(storages);
    setToken(null);
    setData(null);
  }, []);

  const loadData = useCallback(async (tok: string) => {
    setLoadingData(true);
    try {
      const { status, data: res } = await panelCall<PanelData>("get-data", {}, tok);
      if (status === 401) {
        await logout(tok);
        return;
      }
      if (res.ok) {
        setData({
          snapshot: res.snapshot ?? null,
          syncState: res.syncState ?? null,
          overrides: res.overrides ?? [],
          assets: res.assets ?? [],
          profiles: res.profiles ?? [],
        });
      } else {
        toast({ title: "Falha ao carregar o painel", description: res.error ?? "Tente novamente.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Falha de conexão", description: "Não foi possível carregar os dados.", variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  }, [logout, toast]);

  // Valida sessão armazenada ao abrir a página.
  useEffect(() => {
    (async () => {
      const stored = readPanelSession(storages);
      if (!stored) { setChecking(false); return; }
      try {
        const { data: res } = await panelCall("validate", {}, stored.token);
        if (res.ok) {
          setToken(stored.token);
          await loadData(stored.token);
        } else {
          clearPanelSession(storages);
        }
      } catch {
        // Falha de rede: mantém a sessão local para tentar de novo depois.
      } finally {
        setChecking(false);
      }
    })();
  }, [loadData]);

  const handleSyncNow = async () => {
    if (!token || syncing) return; // bloqueia duplo clique
    setSyncing(true);
    try {
      const { status, data: res } = await panelCall("sync-now", {}, token);
      if (status === 401) { await logout(token); return; }
      if (res.ok) {
        const changed = res.snapshotWritten ? "catálogo atualizado" : "sem mudanças";
        toast({
          title: "Sincronização concluída",
          description: `${res.recognized ?? 0} reconhecidas, ${res.ignored ?? 0} ignoradas — ${changed}.`,
        });
      } else {
        toast({
          title: "Sincronização não concluída",
          description: res.error ?? "Tente novamente em instantes.",
          variant: "destructive",
        });
      }
      await loadData(token);
    } catch {
      toast({ title: "Falha de conexão", description: "Não foi possível sincronizar.", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleEligibility = async (row: PanelRow, value: string) => {
    if (!token || savingId) return;
    const eligible = value === "elegivel";
    const previous = data;
    setSavingId(row.id);
    // Atualização otimista.
    setData((d) => d && {
      ...d,
      overrides: [
        ...d.overrides.filter((o) => o.bike_id !== row.id),
        { bike_id: row.id, eligible },
      ],
    });
    try {
      const { status, data: res } = await panelCall("set-eligibility", { bikeId: row.id, eligible }, token);
      if (status === 401) { await logout(token); return; }
      if (!res.ok) throw new Error(res.error);
      toast({
        title: eligible ? "Bike marcada como elegível" : "Bike marcada como não elegível",
        description: row.name,
      });
    } catch {
      setData(previous); // rollback
      toast({
        title: "Não foi possível salvar",
        description: "A elegibilidade anterior foi restaurada. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const rows = useMemo<PanelRow[]>(() => {
    const snapshot = data?.snapshot?.data ?? null;
    const bikes = Array.isArray(snapshot?.bikes) ? snapshot.bikes : [];
    const base = buildCatalogRows(STATIC_CATALOG, bikes);
    return buildPanelRows(base, data?.overrides ?? [], data?.snapshot?.updated_at ?? null, data?.assets ?? [], data?.profiles ?? []);
  }, [data]);

  const syncState = data?.syncState ?? null;
  const origin: "sheet" | "static" = (data?.snapshot?.data?.bikes?.length ?? 0) > 0 ? "sheet" : "static";
  const healthy = syncState?.status === "ok" && !syncState?.error_message;
  const pendencias = syncState?.ignored_rows ?? [];

  // Alerta se a execução automática passou mais de 10 min do horário previsto.
  const scheduleLate = useMemo(() => {
    const t = syncState?.next_run_at ? new Date(syncState.next_run_at).getTime() : NaN;
    if (Number.isNaN(t)) return false;
    return Date.now() - t > 10 * 60 * 1000;
  }, [syncState?.next_run_at]);


  const counts = useMemo(() => ({
    eligible: rows.filter((r) => r.eligible).length,
    notEligible: rows.filter((r) => !r.eligible).length,
    draft: rows.filter((r) => r.state === "draft").length,
    inactive: rows.filter((r) => r.state === "inactive").length,
    static: rows.filter((r) => r.state === "static").length,
  }), [rows]);

  // Filtro + busca ANTES da ordenação.
  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (filter === "eligible" && !r.eligible) return false;
      if (filter === "not_eligible" && r.eligible) return false;
      if ((filter === "draft" || filter === "inactive" || filter === "static") && r.state !== filter) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
    });
    return sortPanelRows(filtered, sort);
  }, [rows, filter, query, sort]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!token) {
    return <LoginScreen onLoggedIn={(tok) => { setToken(tok); void loadData(tok); }} />;
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 md:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">Painel do catálogo de bikes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Acompanhamento da sincronização horária com a planilha oficial.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => window.open(SHEET_PUBLIC_URL, "_blank", "noopener,noreferrer")}>
              <ExternalLink className="mr-2 h-4 w-4" /> Abrir planilha
            </Button>
            <Button variant="outline" onClick={() => void loadData(token)} disabled={loadingData || syncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loadingData ? "animate-spin" : ""}`} /> Atualizar visualização
            </Button>
            <Button onClick={() => void handleSyncNow()} disabled={syncing || loadingData}>
              {syncing
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <RefreshCw className="mr-2 h-4 w-4" />}
              {syncing ? "Sincronizando…" : "Sincronizar agora"}
            </Button>
            <Button variant="ghost" onClick={() => void logout(token)}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
            <div className="mt-2 flex items-center gap-2">
              {healthy ? <CheckCircle2 className="h-5 w-5 text-primary" />
                : syncState?.status === "error" ? <AlertTriangle className="h-5 w-5 text-destructive" />
                : <Clock className="h-5 w-5 text-muted-foreground" />}
              <span className="text-lg font-semibold text-foreground">
                {healthy ? "Saudável" : syncState?.status === "error" ? "Erro" : "Aguardando 1ª sincronização"}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Origem dos dados: {origin === "sheet" ? "último snapshot válido da planilha" : "catálogo estático (fallback)"}
            </p>
            {syncState?.error_message && (
              <p className="mt-2 text-xs text-destructive">{syncState.error_message}</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-2 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Execuções</p>
            <p className="text-xs text-muted-foreground">
              Agenda fixa: toda hora no minuto :07 (horário de Brasília). Sincronizar agora não adia a automática.
            </p>
            <p>Última tentativa: <strong>{fmt(syncState?.last_attempt_at)}</strong></p>
            <p>
              Última bem-sucedida: <strong>{fmt(syncState?.last_success_at)}</strong>{" "}
              <span className="text-xs text-muted-foreground">({relativeTime(syncState?.last_success_at)})</span>
            </p>
            <p>Próxima execução: <strong>{fmt(syncState?.next_run_at)}</strong></p>
            <p>Snapshot atualizado em: <strong>{fmt(data?.snapshot?.updated_at)}</strong></p>
            {scheduleLate && (
              <p className="flex items-center gap-2 text-xs text-destructive">
                <AlertTriangle className="h-4 w-4" />
                A execução automática está atrasada mais de 10 minutos — use “Sincronizar agora”.
              </p>
            )}
          </div>


          <div className="rounded-xl border border-border bg-card p-5 space-y-2 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Linhas</p>
            <p>Reconhecidas: <strong>{syncState?.recognized_count ?? 0}</strong></p>
            <p>Ignoradas: <strong>{syncState?.ignored_count ?? 0}</strong></p>
            <p>Elegíveis / não elegíveis: <strong>{counts.eligible} / {counts.notEligible}</strong></p>
            <p>Pendentes / inativas: <strong>{counts.draft} / {counts.inactive}</strong></p>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-muted/40 p-5 text-sm">
          <h2 className="font-semibold text-foreground">Como editar o catálogo</h2>
          <p className="mt-1 text-muted-foreground">
            Todas as edições de conteúdo são feitas <strong>na planilha oficial</strong> — o painel sincroniza
            a cada hora (ou sob demanda em “Sincronizar agora”). Colunas obrigatórias já existentes: Nome,
            Link Vitale, Preço R$, Autonomia, Capacidade e Descrição.
          </p>
          <p className="mt-2 text-muted-foreground">
            Colunas opcionais: <strong>ID</strong> e <strong>Imagem da Bike</strong> (URL https pública — copiada
            permanentemente para o nosso armazenamento). O perfil técnico de recomendação é gerado
            automaticamente por IA quando uma bike nova entra ou quando a Descrição muda — nenhum campo de
            perfil precisa ser preenchido manualmente. A elegibilidade final de cada bike é definida aqui no
            painel, na coluna <strong>Estado</strong>.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Persistência de imagens e geração de perfis por IA estão em implantação gradual; os status
            aparecem abaixo do nome de cada bike quando disponíveis.
          </p>
        </section>

        {pendencias.length > 0 && (
          <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-5">
            <h2 className="text-base font-semibold text-foreground">
              {syncState?.status === "error"
                ? "Linhas com problema na planilha — sincronização bloqueada"
                : "Linhas ignoradas na planilha"}
            </h2>
            {syncState?.status === "error" && (
              <p className="mt-1 text-sm text-muted-foreground">
                Nada foi substituído: o quiz continua usando o último catálogo válido. Corrija as
                linhas abaixo na planilha e a próxima execução automática publica o catálogo.
              </p>
            )}
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {pendencias.map((p, i) => (
                <li key={`${p.line}-${i}`}>
                  Linha {p.line}: <strong>{p.name || "(sem nome)"}</strong> — {p.reason}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={filter === f.key ? "default" : "outline"}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome ou ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Imagem</th>
                  <SortableTh label="Bike / ID" sortKey="name" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} />
                  <SortableTh label="Preço" sortKey="price" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} />
                  <SortableTh label="Autonomia" sortKey="autonomyKm" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} />
                  <SortableTh label="Capacidade" sortKey="capacity" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} />
                  <SortableTh label="Link Vitale" sortKey="linkVitale" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} />
                  <SortableTh label="Atualizado em" sortKey="updatedAt" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} />
                  <SortableTh label="Estado" sortKey="state" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} />
                  <SortableTh label="Campos faltantes" sortKey="missingFields" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} />
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0 align-top">
                    <td className="p-3">
                      {r.image ? (
                        <img
                          src={r.image}
                          alt={`Foto da bike elétrica ${r.name}`}
                          loading="lazy"
                          className="h-12 w-16 rounded object-cover"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">sem imagem</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-foreground">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.id}{r.isNew ? " · nova" : ""}</div>
                      {(r.imageStatus || r.profileStatus) && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {r.imageStatus && (
                            <span className={`text-[11px] ${r.imageStatus === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                              {IMAGE_STATUS_LABEL[r.imageStatus] ?? r.imageStatus}
                              {r.imageNeedsReview ? " (revisão)" : ""}
                            </span>
                          )}
                          {r.profileStatus && (
                            <span className={`text-[11px] ${r.profileStatus === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                              · {PROFILE_STATUS_LABEL[r.profileStatus] ?? r.profileStatus}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3">{brl(r.price)}</td>
                    <td className="p-3">{r.autonomyKm ? `Até ${r.autonomyKm} km` : "—"}</td>
                    <td className="p-3">{r.capacity ? `${r.capacity} ${r.capacity === 1 ? "pessoa" : "pessoas"}` : "—"}</td>
                    <td className="p-3">
                      {r.linkVitale ? (
                        <a
                          className="break-all text-primary underline"
                          href={r.linkVitale}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {r.linkVitale}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">{r.fromSheet ? fmt(r.updatedAt) : "—"}</td>
                    <td className="p-3">
                      <div className="w-40">
                        <Select
                          value={r.eligible ? "elegivel" : "nao_elegivel"}
                          onValueChange={(v) => void handleEligibility(r, v)}
                          disabled={savingId === r.id || r.state === "inactive"}
                        >
                          <SelectTrigger className="h-8 text-xs" aria-label={`Elegibilidade de ${r.name}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="elegivel">Elegível</SelectItem>
                            <SelectItem value="nao_elegivel">Não elegível</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="mt-1">
                          <Badge variant={r.state === "eligible" ? "default" : r.state === "draft" ? "destructive" : "secondary"}>
                            {STATE_LABEL[r.state]}
                          </Badge>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {r.missingFields.length > 0 ? r.missingFields.join(", ") : "—"}
                    </td>
                  </tr>
                ))}
                {visibleRows.length === 0 && (
                  <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Nenhuma bike encontrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
