/**
 * Histórico de atualizações do catálogo (painel /painel-bikes).
 *
 * Lista TODAS as tentativas de sincronização (automáticas e manuais, com
 * sucesso, sem mudanças, ignoradas ou com erro), com diff expansível por bike,
 * e unifica as mudanças de elegibilidade feitas no painel.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  CHANGE_TYPE_LABEL,
  eligibilityLabel,
  groupChangesByRun,
  ORIGIN_LABEL,
  relativeTime,
  RUN_STATUS_LABEL,
  type EligibilityAuditRow,
  type SyncChangeRow,
  type SyncRunRow,
} from "@/lib/painel-bikes";

const PAGE_SIZE = 20;

interface HistoryResponse {
  ok?: boolean;
  error?: string;
  page?: number;
  total?: number;
  runs?: SyncRunRow[];
  changes?: SyncChangeRow[];
  eligibilityAudit?: EligibilityAuditRow[];
}

interface Props {
  /** Chamada autenticada ao bike-panel (injetada pela página). */
  call: <T>(action: string, body?: Record<string, unknown>) => Promise<{ status: number; data: T }>;
  onUnauthorized: () => void;
  /** Muda quando uma nova sincronização termina, para recarregar o histórico. */
  refreshKey: number;
}

function fmtDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
}

function statusBadge(status: string) {
  if (status === "error") {
    return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{RUN_STATUS_LABEL.error}</Badge>;
  }
  if (status === "ok") {
    return <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />{RUN_STATUS_LABEL.ok}</Badge>;
  }
  if (status === "skipped") {
    return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{RUN_STATUS_LABEL.skipped}</Badge>;
  }
  return <Badge variant="secondary">{RUN_STATUS_LABEL[status] ?? status}</Badge>;
}

export default function SyncHistory({ call, onUnauthorized, refreshKey }: Props) {
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [origin, setOrigin] = useState("all");
  const [status, setStatus] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [res, setRes] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status: httpStatus, data } = await call<HistoryResponse>("get-history", {
        page,
        pageSize: PAGE_SIZE,
        origin,
        status,
      });
      if (httpStatus === 401) { onUnauthorized(); return; }
      if (!data?.ok) throw new Error(data?.error ?? "Falha ao carregar o histórico.");
      setRes(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar o histórico.");
    } finally {
      setLoading(false);
    }
  }, [call, onUnauthorized, page, origin, status]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const changesByRun = useMemo(() => groupChangesByRun(res?.changes ?? []), [res]);
  const runs = res?.runs ?? [];
  const total = res?.total ?? 0;
  const audit = res?.eligibilityAudit ?? [];
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Histórico de atualizações</h2>
          <p className="text-xs text-muted-foreground">
            Toda tentativa de sincronização fica registrada — automática ou manual, com ou sem mudanças.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={origin} onValueChange={(v) => { setPage(0); setOrigin(v); }}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              <SelectItem value="auto">Automáticas</SelectItem>
              <SelectItem value="manual">Manuais</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setPage(0); setStatus(v); }}>
            <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os resultados</SelectItem>
              <SelectItem value="changes">Só com mudanças</SelectItem>
              <SelectItem value="ok">Concluídas</SelectItem>
              <SelectItem value="error">Com erro</SelectItem>
              <SelectItem value="skipped">Ignoradas</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Recarregar
          </Button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-4 divide-y divide-border rounded-lg border border-border">
        {loading && runs.length === 0 && (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        {!loading && runs.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">Nenhuma execução registrada com esses filtros.</p>
        )}

        {runs.map((run) => {
          const runChanges = changesByRun.get(run.id) ?? [];
          const isOpen = expanded.has(run.id);
          return (
            <div key={run.id} className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggle(run.id)}
                  className="flex items-center gap-2 text-left text-sm font-medium text-foreground"
                  aria-expanded={isOpen}
                >
                  {runChanges.length > 0
                    ? (isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)
                    : <span className="inline-block h-4 w-4" />}
                  {fmtDateTime(run.started_at)}
                </button>
                {statusBadge(run.status)}
                <Badge variant="outline">{ORIGIN_LABEL[run.origin] ?? run.origin}</Badge>
                {run.changed_bikes > 0 && (
                  <Badge variant="secondary">
                    {run.changed_bikes} bike{run.changed_bikes > 1 ? "s" : ""} · {run.changed_fields} campo{run.changed_fields > 1 ? "s" : ""}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {relativeTime(run.started_at)}
                  {run.duration_ms != null && ` · ${(run.duration_ms / 1000).toFixed(1)}s`}
                  {run.recognized_count != null && ` · ${run.recognized_count} reconhecidas`}
                  {run.ignored_count ? ` · ${run.ignored_count} ignoradas` : ""}
                </span>
              </div>
              {run.error_message && (
                <p className="mt-2 text-xs text-destructive">{run.error_message}</p>
              )}
              {isOpen && runChanges.length > 0 && (
                <ul className="mt-3 space-y-2 border-l-2 border-border pl-4 text-sm">
                  {runChanges.map((c, i) => (
                    <li key={`${c.bike_id}-${c.field ?? "bike"}-${i}`} className="text-muted-foreground">
                      <span className="font-medium text-foreground">{c.bike_name ?? c.bike_id}</span>{" "}
                      <Badge variant="outline" className="align-middle text-[10px]">
                        {CHANGE_TYPE_LABEL[c.change_type] ?? c.change_type}
                      </Badge>{" "}
                      {c.field_label && (
                        <>
                          <span className="text-foreground">{c.field_label}:</span>{" "}
                          <span className="line-through">{c.old_value ?? "—"}</span>{" → "}
                          <span className="text-foreground">{c.new_value ?? "—"}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{total} execução(ões) registradas</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 0 || loading} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" disabled={page >= lastPage || loading} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </Button>
        </div>
      </div>

      {audit.length > 0 && (
        <div className="mt-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4" /> Mudanças de elegibilidade no painel
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {audit.map((a) => (
              <li key={a.id}>
                <span className="text-foreground">{a.bike_id}</span> — {eligibilityLabel(a.detail?.eligible)}{" "}
                <span className="text-xs">({fmtDateTime(a.created_at)} · {relativeTime(a.created_at)})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
