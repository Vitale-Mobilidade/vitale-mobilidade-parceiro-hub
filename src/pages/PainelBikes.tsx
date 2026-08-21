import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RefreshCw, ExternalLink, CheckCircle2, AlertTriangle, Clock, Search } from "lucide-react";
import { useBikeCatalog } from "@/hooks/useBikeCatalog";
import type { CatalogRow } from "@/lib/bike-catalog";

const SHEET_PUBLIC_URL =
  "https://docs.google.com/spreadsheets/d/1gIzIM3YOsT3tXLkYGqJMsZ26oY_mOc10SLaT0hzKOkc/edit#gid=0";

const OPTIONAL_COLUMNS = [
  "ID", "Imagem", "Peso Suportado", "Usos", "Terrenos",
  "Pontos Fortes", "Diferencial", "Perfil Indicado", "Ativa",
];

type FilterKey = "todos" | "eligible" | "draft" | "inactive" | "static";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "todos", label: "Todas" },
  { key: "eligible", label: "Elegíveis" },
  { key: "draft", label: "Pendentes" },
  { key: "inactive", label: "Inativas" },
  { key: "static", label: "Só estáticas" },
];

const STATE_LABEL: Record<CatalogRow["state"], string> = {
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

export default function PainelBikes() {
  const { rows, origin, snapshotUpdatedAt, syncState, loading, refresh } = useBikeCatalog();
  const [filter, setFilter] = useState<FilterKey>("todos");
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.title = "Painel de sincronização do catálogo | Vitale Mobilidade";
    const robots = document.querySelector('meta[name="robots"]') ?? (() => {
      const m = document.createElement("meta");
      m.setAttribute("name", "robots");
      document.head.appendChild(m);
      return m;
    })();
    robots.setAttribute("content", "noindex, nofollow");
  }, []);

  const healthy = syncState?.status === "ok" && !syncState?.error_message;
  const pendencias = syncState?.ignored_rows ?? [];

  const counts = useMemo(() => ({
    eligible: rows.filter((r) => r.state === "eligible").length,
    draft: rows.filter((r) => r.state === "draft").length,
    inactive: rows.filter((r) => r.state === "inactive").length,
    static: rows.filter((r) => r.state === "static").length,
  }), [rows]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "todos" && r.state !== filter) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
    });
  }, [rows, filter, query]);

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
            <Button onClick={refresh} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar visualização
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
            <p>Última tentativa: <strong>{fmt(syncState?.last_attempt_at)}</strong></p>
            <p>Última bem-sucedida: <strong>{fmt(syncState?.last_success_at)}</strong></p>
            <p>Próxima execução: <strong>{fmt(syncState?.next_run_at)}</strong></p>
            <p>Snapshot atualizado em: <strong>{fmt(snapshotUpdatedAt)}</strong></p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-2 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Linhas</p>
            <p>Reconhecidas: <strong>{syncState?.recognized_count ?? 0}</strong></p>
            <p>Ignoradas: <strong>{syncState?.ignored_count ?? 0}</strong></p>
            <p>Elegíveis no quiz: <strong>{counts.eligible + counts.static}</strong></p>
            <p>Pendentes / inativas: <strong>{counts.draft} / {counts.inactive}</strong></p>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-muted/40 p-5 text-sm">
          <h2 className="font-semibold text-foreground">Como editar o catálogo</h2>
          <p className="mt-1 text-muted-foreground">
            Todas as edições são feitas <strong>na planilha oficial</strong> — este painel é somente leitura e
            atualiza sozinho a cada hora. Colunas sincronizadas hoje: Nome, Link Vitale, Preço R$, Autonomia,
            Capacidade e Descrição.
          </p>
          <p className="mt-2 text-muted-foreground">
            Para cadastrar uma <strong>bike nova</strong>, preencha também as colunas opcionais:{" "}
            {OPTIONAL_COLUMNS.join(", ")}. Enquanto faltar Imagem (URL https), Peso Suportado, Usos ou Terrenos,
            a bike aparece como <strong>Pendente</strong> e não entra no quiz.
          </p>
        </section>

        {pendencias.length > 0 && (
          <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-5">
            <h2 className="text-base font-semibold text-foreground">Linhas ignoradas na planilha</h2>
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
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Imagem</th>
                  <th className="p-3">Bike / ID</th>
                  <th className="p-3">Preço</th>
                  <th className="p-3">Autonomia</th>
                  <th className="p-3">Capacidade</th>
                  <th className="p-3">Link Vitale</th>
                  <th className="p-3">Atualizado em</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Campos faltantes</th>
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
                    </td>
                    <td className="p-3">{brl(r.price)}</td>
                    <td className="p-3">{r.autonomyKm ? `Até ${r.autonomyKm} km` : "—"}</td>
                    <td className="p-3">{r.capacity ? `${r.capacity} ${r.capacity === 1 ? "pessoa" : "pessoas"}` : "—"}</td>
                    <td className="p-3">
                      {r.linkVitale ? (
                        <a className="text-primary underline" href={r.linkVitale} target="_blank" rel="noopener noreferrer">
                          {r.linkVitale.replace("https://", "")}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">{r.fromSheet ? fmt(snapshotUpdatedAt) : "—"}</td>
                    <td className="p-3">
                      <Badge variant={r.state === "eligible" ? "default" : r.state === "draft" ? "destructive" : "secondary"}>
                        {STATE_LABEL[r.state]}
                      </Badge>
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
