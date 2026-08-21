import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ExternalLink, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { useBikeCatalog } from "@/hooks/useBikeCatalog";
import { STATIC_CATALOG } from "@/lib/bike-catalog";

const SHEET_PUBLIC_URL =
  "https://docs.google.com/spreadsheets/d/1gIzIM3YOsT3tXLkYGqJMsZ26oY_mOc10SLaT0hzKOkc/edit#gid=0";

function fmt(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

export default function PainelBikes() {
  const { catalog, origin, snapshotUpdatedAt, syncState, loading, refresh } = useBikeCatalog();

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

  const rows = useMemo(() => {
    return catalog.map((bike) => {
      const staticBike = STATIC_CATALOG.find((b) => b.id === bike.id)!;
      const fromSheet =
        origin === "sheet" &&
        (bike.internalPrice !== staticBike.internalPrice ||
          bike.linkVitale !== staticBike.linkVitale ||
          bike.autonomyKm !== staticBike.autonomyKm ||
          bike.capacity !== staticBike.capacity ||
          bike.fullDescription !== staticBike.fullDescription ||
          origin === "sheet");
      return { bike, fromSheet };
    });
  }, [catalog, origin]);

  return (
    <main className="min-h-screen bg-background px-4 py-10 md:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">
              Painel do catálogo de bikes
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Acompanhamento da sincronização horária com a planilha oficial.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => window.open(SHEET_PUBLIC_URL, "_blank", "noopener,noreferrer")}>
              <ExternalLink className="mr-2 h-4 w-4" /> Abrir planilha oficial
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
              {healthy ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : syncState?.status === "error" ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : (
                <Clock className="h-5 w-5 text-muted-foreground" />
              )}
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
            <p className="text-foreground">Última tentativa: <strong>{fmt(syncState?.last_attempt_at)}</strong></p>
            <p className="text-foreground">Última bem-sucedida: <strong>{fmt(syncState?.last_success_at)}</strong></p>
            <p className="text-foreground">Próxima execução: <strong>{fmt(syncState?.next_run_at)}</strong></p>
            <p className="text-foreground">Snapshot atualizado em: <strong>{fmt(snapshotUpdatedAt)}</strong></p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-2 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Linhas</p>
            <p className="text-foreground">Reconhecidas: <strong>{syncState?.recognized_count ?? 0}</strong></p>
            <p className="text-foreground">Ignoradas: <strong>{syncState?.ignored_count ?? 0}</strong></p>
            <p className="text-foreground">Bikes no quiz: <strong>{catalog.length}</strong></p>
          </div>
        </section>

        {pendencias.length > 0 && (
          <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-5">
            <h2 className="text-base font-semibold text-foreground">Pendências da planilha</h2>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {pendencias.map((p, i) => (
                <li key={`${p.line}-${i}`}>
                  Linha {p.line}: <strong>{p.name || "(sem nome)"}</strong> — {p.reason}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Bike</th>
                  <th className="p-3">Preço</th>
                  <th className="p-3">Autonomia</th>
                  <th className="p-3">Capacidade</th>
                  <th className="p-3">Link Vitale</th>
                  <th className="p-3">Atualizado em</th>
                  <th className="p-3">Correspondência</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ bike, fromSheet }) => (
                  <tr key={bike.id} className="border-b border-border/60 last:border-0">
                    <td className="p-3 font-medium text-foreground">{bike.name}</td>
                    <td className="p-3">{brl(bike.internalPrice)}</td>
                    <td className="p-3">Até {bike.autonomyKm} km</td>
                    <td className="p-3">{bike.capacity} {bike.capacity === 1 ? "pessoa" : "pessoas"}</td>
                    <td className="p-3">
                      <a className="text-primary underline" href={bike.linkVitale} target="_blank" rel="noopener noreferrer">
                        {bike.linkVitale.replace("https://", "")}
                      </a>
                    </td>
                    <td className="p-3 text-muted-foreground">{fromSheet ? fmt(snapshotUpdatedAt) : "—"}</td>
                    <td className="p-3">
                      <Badge variant={fromSheet ? "default" : "secondary"}>
                        {fromSheet ? "Planilha" : "Estático"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
