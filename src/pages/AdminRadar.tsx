import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminRadarAlerts } from "@/lib/admin-radar-api";
import type { AdminRadarAlert, RadarAlertFilter } from "@/lib/admin-radar";

const input = "rounded-lg border border-line bg-white px-3 py-2 text-sm";
const button =
  "min-h-11 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold hover:bg-emerald-50 disabled:opacity-50";
const money = (value: number | null) =>
  value == null
    ? "Indisponível"
    : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Não registrada";

export function RadarAlertRow({ alert }: { alert: AdminRadarAlert }) {
  const [expanded, setExpanded] = useState(false);
  const phone = /^\+\d{8,15}$/.test(alert.phone) ? alert.phone : null;
  const email =
    alert.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alert.email)
      ? alert.email
      : null;
  const targetReached =
    alert.condition === "target" &&
    alert.targetPrice != null &&
    alert.currentPrice != null &&
    alert.currentPrice <= alert.targetPrice;
  return (
    <article className="rounded-xl border border-line bg-white p-3 sm:p-4">
      <div className="grid grid-cols-2 items-start gap-3 xl:grid-cols-[1.5fr_1fr_0.8fr_0.8fr]">
        <div className="col-span-2 min-w-0 sm:col-span-1">
          <h2>
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={`radar-alert-${alert.id}`}
              className="min-h-11 text-left text-sm font-bold text-emerald-900 underline decoration-emerald-300 underline-offset-4"
              onClick={() => setExpanded(!expanded)}
            >
              {alert.personName || "Nome não informado"}{" "}
              <span className="font-normal">{expanded ? "▴" : "▾"}</span>
            </button>
          </h2>
          <div className="space-y-1 text-sm">
            {phone && alert.consent ? (
              <a
                href={`https://wa.me/${phone.slice(1)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block min-h-8 w-fit text-emerald-800 underline"
                aria-label={`Abrir WhatsApp de ${alert.personName}`}
              >
                WhatsApp: {alert.phone}
              </a>
            ) : (
              <p className="break-all">
                WhatsApp: {alert.phone || "Não informado"}
              </p>
            )}
            {email && alert.consent ? (
              <a
                href={`mailto:${encodeURIComponent(email)}`}
                className="block min-h-8 w-fit break-all text-emerald-800 underline"
                aria-label={`Enviar e-mail para ${alert.personName}`}
              >
                {alert.email}
              </a>
            ) : (
              <p className="break-all text-muted-foreground">
                E-mail: {alert.email || "Não informado"}
              </p>
            )}
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xs text-muted-foreground">Bike acompanhada</p>
          {/^[a-z0-9_]{1,64}$/.test(alert.bikeId) ? (
            <Link
              to="/radar/$bikeId"
              params={{ bikeId: alert.bikeId }}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block min-h-8 text-sm font-semibold text-emerald-800 underline"
            >
              {alert.bikeName}
            </Link>
          ) : (
            <p className="mt-1 text-sm font-semibold">{alert.bikeName}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {alert.status === "active"
              ? "Alerta ativo"
              : `Status: ${alert.status}`}
            {!alert.consent && " · Sem autorização de contato"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Preço atual</p>
          <p className="mt-1 text-base font-bold">
            {money(alert.currentPrice)}
          </p>
          {alert.currentPrice == null && (
            <p className="mt-1 text-xs text-muted-foreground">
              Sem oferta vigente válida.
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Preço desejado</p>
          <p className="mt-1 text-base font-bold">
            {alert.condition === "any_drop"
              ? "Qualquer queda"
              : alert.condition === "target"
                ? money(alert.targetPrice)
                : "Condição não reconhecida"}
          </p>
          {targetReached && (
            <p className="mt-1 text-xs font-semibold text-emerald-800">
              Preço desejado atingido
            </p>
          )}
          {alert.condition === "target" &&
            alert.currentPrice != null &&
            alert.targetPrice != null &&
            !targetReached && (
              <p className="mt-1 text-xs text-muted-foreground">
                Falta cair {money(alert.currentPrice - alert.targetPrice)}
              </p>
            )}
        </div>
      </div>
      {expanded && (
        <div
          id={`radar-alert-${alert.id}`}
          className="mt-3 border-t border-line pt-3"
        >
          <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Preço no cadastro</dt>
              <dd className="mt-1 font-semibold">
                {money(alert.referencePrice)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Oferta verificada em</dt>
              <dd className="mt-1">{date(alert.priceVerifiedAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cadastrado em</dt>
              <dd className="mt-1">{date(alert.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Atualizado em</dt>
              <dd className="mt-1">{date(alert.updatedAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Autorização de contato</dt>
              <dd className="mt-1">
                {alert.consent ? "Autorizada" : "Não autorizada"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                Entrega habilitada no cadastro
              </dt>
              <dd className="mt-1">{alert.deliveryEnabled ? "Sim" : "Não"}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Cadastro e preço atingido não confirmam envio de mensagem. Esta tela
            não dispara alertas nem altera o cadastro.
          </p>
        </div>
      )}
    </article>
  );
}

export function RadarAlertsPanel() {
  const [filter, setFilter] = useState<RadarAlertFilter>({
    page: 1,
    scope: "active",
    search: "",
  });
  const [search, setSearch] = useState("");
  const alerts = useQuery({
    queryKey: ["admin", "radar-alerts", filter],
    queryFn: () => getAdminRadarAlerts(filter),
    staleTime: 30_000,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const data = alerts.data;
  function submit(event: FormEvent) {
    event.preventDefault();
    setFilter({ ...filter, page: 1, search: search.trim() });
  }
  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pessoas e alertas do Radar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Contatos, bikes acompanhadas e preços. Uma pessoa pode ter alertas
            para várias bikes.
          </p>
        </div>
        <button
          type="button"
          className={button}
          onClick={() => void alerts.refetch()}
          disabled={alerts.isFetching}
        >
          Atualizar
        </button>
      </div>
      <form onSubmit={submit} className="mb-4 flex flex-wrap items-end gap-2">
        <label className="min-w-48 flex-1 text-sm">
          Buscar pessoa, contato ou bike
          <input
            type="search"
            autoComplete="off"
            maxLength={100}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${input} mt-1 w-full`}
            placeholder="Nome, WhatsApp, e-mail ou bike"
          />
        </label>
        <label className="text-sm">
          Mostrar
          <select
            className={`${input} mt-1 block`}
            value={filter.scope}
            onChange={(e) =>
              setFilter({
                ...filter,
                scope: e.target.value as RadarAlertFilter["scope"],
                page: 1,
              })
            }
          >
            <option value="active">Ativos com consentimento</option>
            <option value="all">Todos os cadastros</option>
          </select>
        </label>
        <button className={button}>Buscar</button>
        {filter.search && (
          <button
            type="button"
            className={button}
            onClick={() => {
              setSearch("");
              setFilter({ ...filter, search: "", page: 1 });
            }}
          >
            Limpar busca
          </button>
        )}
      </form>
      {alerts.isError && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {alerts.error instanceof Error
            ? alerts.error.message
            : "Não foi possível carregar os alertas."}{" "}
          <button
            type="button"
            className="min-h-11 font-semibold underline"
            onClick={() => void alerts.refetch()}
          >
            Tentar novamente
          </button>
        </p>
      )}
      {alerts.isPending && (
        <p role="status" aria-busy="true">
          Carregando pessoas e preços…
        </p>
      )}
      {data && (
        <>
          <div
            className="mb-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"
            aria-live="polite"
          >
            <p>
              {data.totalAlerts} alerta(s)
              {filter.search && ` para “${filter.search}”`} ·{" "}
              {filter.scope === "active"
                ? "ativos com consentimento"
                : "todos os cadastros"}{" "}
              · Página {data.page}
            </p>
            <p>Consultado em {date(data.updatedAt)} · São Paulo</p>
          </div>
          <div className="space-y-2" aria-busy={alerts.isFetching}>
            {data.items.map((alert) => (
              <RadarAlertRow key={alert.id} alert={alert} />
            ))}
          </div>
          {!data.items.length && (
            <p
              role="status"
              className="rounded-xl border border-line bg-white p-4 text-sm"
            >
              {data.totalAlerts > 0
                ? "Não há mais alertas nesta página. Volte à página anterior."
                : filter.search
                  ? "Nenhum alerta corresponde à busca."
                  : "Nenhum alerta neste filtro."}
            </p>
          )}
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              className={button}
              disabled={filter.page <= 1 || alerts.isFetching}
              onClick={() => setFilter({ ...filter, page: filter.page - 1 })}
            >
              Anterior
            </button>
            <span className="text-sm">
              Página {data.page} de{" "}
              {Math.max(1, Math.ceil(data.totalAlerts / data.pageSize))}
            </span>
            <button
              type="button"
              className={button}
              disabled={
                filter.page * data.pageSize >= data.totalAlerts ||
                alerts.isFetching
              }
              onClick={() => setFilter({ ...filter, page: filter.page + 1 })}
            >
              Próxima
            </button>
          </div>
        </>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        O preço atual vem da oferta vigente; o preço no cadastro é histórico.
        Clique no nome da pessoa para ver datas e informações do alerta. Links
        de contato abrem seu aplicativo, sem envio automático.
      </p>
    </>
  );
}
export default function AdminRadar() {
  return (
    <AdminShell>
      {(role) =>
        role === "admin" ? (
          <RadarAlertsPanel />
        ) : (
          <p role="alert">
            Somente administradores podem consultar pessoas e contatos do Radar.
          </p>
        )
      }
    </AdminShell>
  );
}
