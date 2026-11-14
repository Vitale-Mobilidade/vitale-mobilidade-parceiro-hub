import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminCall } from "@/lib/admin-api";
import {
  growthRange,
  saoPauloDay,
} from "../../../supabase/functions/_shared/growth-range";
import {
  OFFERS_CAMPAIGN,
  type OffersOrigin,
} from "../../../supabase/functions/_shared/site-analytics";

export const Route = createFileRoute("/admin/campanhas")({
  head: () => ({
    meta: [
      { title: "Campanhas · Admin Vitale" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CampaignsRoute,
});

type CampaignRow = {
  campaign: string;
  origin: OffersOrigin;
  event_name: "offers_landing_view" | "offers_cta_click" | "offers_offer_click";
  surface: "" | "hero" | "grid";
  bike_id: string;
  count: number;
};
type Report = { observedDays: number; rows: CampaignRow[] };
const sources = [
  { id: "google", label: "Google Ads" },
  { id: "meta", label: "Meta Ads" },
  { id: "unattributed", label: "Sem origem identificada" },
] as const;
const numbers = new Intl.NumberFormat("pt-BR");
const percent = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
});
const input =
  "block w-full rounded-md border border-line bg-white px-3 py-2 text-sm";

function CampaignsRoute() {
  return (
    <AdminShell>
      {(role) =>
        role === "admin" ? (
          <Campaigns />
        ) : (
          <p role="alert">Acesso restrito a administradores.</p>
        )
      }
    </AdminShell>
  );
}

function Campaigns() {
  const [range, setRange] = useState(() => growthRange({ rangeDays: 30 }));
  const [campaign, setCampaign] = useState("");
  const [origin, setOrigin] = useState("");
  const [error, setError] = useState("");
  const { startDate, endDate } = range;
  const report = useQuery({
    queryKey: ["admin", "offers-campaigns", startDate, endDate],
    queryFn: () =>
      adminCall<Report>("offers-campaigns", { startDate, endDate }),
  });
  const filtered = (report.data?.rows ?? []).filter(
    (row) =>
      (!campaign || row.campaign === campaign) &&
      (!origin || row.origin === origin),
  );
  const total = (
    rows: CampaignRow[],
    event: CampaignRow["event_name"],
    surface?: CampaignRow["surface"],
  ) =>
    rows
      .filter(
        (row) =>
          row.event_name === event && (!surface || row.surface === surface),
      )
      .reduce((sum, row) => sum + row.count, 0);
  const modelCounts = new Map<string, { hero: number; grid: number }>();
  for (const row of filtered) {
    if (row.event_name !== "offers_offer_click" || !row.surface) continue;
    const counts = modelCounts.get(row.bike_id) ?? { hero: 0, grid: 0 };
    counts[row.surface] += row.count;
    modelCounts.set(row.bike_id, counts);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    try {
      setRange(
        growthRange({
          startDate: values.get("start"),
          endDate: values.get("end"),
        }),
      );
      setError("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Período inválido.");
    }
  }
  return (
    <section className="space-y-5 text-ink">
      <div>
        <h1 className="text-2xl font-bold">Campanhas</h1>
        <p className="text-sm">Grupo de ofertas · datas de São Paulo</p>
      </div>
      <form
        onSubmit={submit}
        className="grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-2 xl:grid-cols-5"
      >
        <label>
          Início{" "}
          <input
            required
            type="date"
            name="start"
            max={saoPauloDay()}
            defaultValue={startDate}
            className={input}
          />
        </label>
        <label>
          Fim{" "}
          <input
            required
            type="date"
            name="end"
            max={saoPauloDay()}
            defaultValue={endDate}
            className={input}
          />
        </label>
        <label>
          Campanha
          <select
            className={input}
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
          >
            <option value="">Todas</option>
            <option value={OFFERS_CAMPAIGN}>Grupo de ofertas</option>
            <option value="unattributed">Sem campanha</option>
          </select>
        </label>
        <label>
          Origem
          <select
            className={input}
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          >
            <option value="">Todas</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.label}
              </option>
            ))}
          </select>
        </label>
        <button className="self-end rounded-md bg-ink px-4 py-2 text-white">
          Aplicar datas
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {report.isPending ? (
        <p role="status">Carregando campanhas…</p>
      ) : report.isError ? (
        <p role="alert">
          Medição indisponível.{" "}
          <button onClick={() => void report.refetch()} className="underline">
            Tentar novamente
          </button>
        </p>
      ) : report.data.observedDays === 0 ? (
        <p>Sem coleta registrada no período.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white p-4">
          <table className="w-full text-left text-sm">
            <caption className="pb-3 text-left">
              Totais agregados · {report.data.observedDays} dia(s) com registros
            </caption>
            <thead>
              <tr>
                {[
                  "Origem",
                  "Visitas",
                  "Convite",
                  "Ofertas no destaque",
                  "Ofertas na grade",
                  "Cliques no convite / visitas",
                ].map((label) => (
                  <th scope="col" key={label} className="p-2">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sources
                .filter(
                  ({ id }) =>
                    (!origin || origin === id) &&
                    (!campaign ||
                      (campaign === "unattributed") ===
                        (id === "unattributed")),
                )
                .map((source) => {
                  const rows = filtered.filter(
                    (row) => row.origin === source.id,
                  );
                  const views = total(rows, "offers_landing_view");
                  const cta = total(rows, "offers_cta_click");
                  return (
                    <tr key={source.id} className="border-t border-line">
                      <th scope="row" className="p-2">
                        {source.label}
                      </th>
                      {[
                        views,
                        cta,
                        total(rows, "offers_offer_click", "hero"),
                        total(rows, "offers_offer_click", "grid"),
                      ].map((count, index) => (
                        <td key={index} className="p-2 tabular-nums">
                          {views > 0 || count > 0 ? numbers.format(count) : "—"}
                        </td>
                      ))}
                      <td className="p-2">
                        {views > 0 ? percent.format(cta / views) : "—"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          <p className="mt-3 text-sm">
            — indica ausência de registros ou falta de base para calcular a
            taxa.
          </p>
        </div>
      )}
      {!!modelCounts.size && (
        <div className="overflow-x-auto rounded-xl border border-line bg-white p-4">
          <table className="w-full text-left text-sm">
            <caption className="pb-3 text-left font-bold">
              Cliques de oferta por modelo
            </caption>
            <thead>
              <tr>
                <th scope="col">Modelo</th>
                <th scope="col">Destaque</th>
                <th scope="col">Grade</th>
              </tr>
            </thead>
            <tbody>
              {[...modelCounts]
                .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
                .map(([id, counts]) => (
                  <tr key={id}>
                    <th scope="row" className="py-2 font-medium">
                      {id.replaceAll("_", " ")}
                    </th>
                    <td>{numbers.format(counts.hero)}</td>
                    <td>{numbers.format(counts.grid)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-sm">
        Entradas confirmadas no WhatsApp: sem fonte conectada.
      </p>
    </section>
  );
}
