import { useQuery } from "@tanstack/react-query";
import { adminCall } from "@/lib/admin-api";
import type { WosiCampaignReport } from "../../../supabase/functions/_shared/wosi-campaign";

export function WosiCampaignResults({ data }: { data: WosiCampaignReport }) {
  return (
    <>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          ["Cliques no banner", data.clicks],
          ["Páginas gerais", data.surfaces.site],
          ["Artigos", data.surfaces.article],
        ].map(([label, count]) => (
          <div
            key={label}
            className="rounded-xl border border-line bg-surface p-4"
          >
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-3xl font-bold">
              {Number(count).toLocaleString("pt-BR")}
            </dd>
          </div>
        ))}
      </dl>
      {data.days.length > 0 ? (
        <div className="mt-4 max-h-72 overflow-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Cliques diários na campanha Wosi
            </caption>
            <thead>
              <tr>
                <th scope="col" className="p-2">
                  Data
                </th>
                <th scope="col" className="p-2 text-right">
                  Cliques
                </th>
              </tr>
            </thead>
            <tbody>
              {data.days.map((day) => (
                <tr key={day.date} className="border-t border-line">
                  <td className="p-2">
                    {day.date.split("-").reverse().join("/")}
                  </td>
                  <td className="p-2 text-right">
                    {day.clicks.toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Nenhum clique registrado neste período.
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Contagem de cliques, não de pessoas únicas ou vendas. A medição começa
        após a ativação e não recupera cliques anteriores. Datas no horário de
        São Paulo.
      </p>
    </>
  );
}
export function WosiCampaignSummary({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  const query = useQuery({
    queryKey: ["admin", "wosi-campaign", startDate, endDate],
    queryFn: () =>
      adminCall<WosiCampaignReport>("wosi-campaign", { startDate, endDate }),
  });
  return (
    <section
      aria-labelledby="wosi-campaign-heading"
      className="rounded-2xl border border-line bg-card p-5 sm:p-6"
    >
      <h2 id="wosi-campaign-heading" className="text-2xl font-bold">
        Wosi · Seguro para bike elétrica
      </h2>
      {query.isPending && (
        <p role="status" className="mt-4">
          Carregando cliques…
        </p>
      )}
      {query.isError && (
        <div role="alert" className="mt-4">
          <p>Medição da Wosi indisponível.</p>
          <button
            type="button"
            className="min-h-11 font-semibold text-action underline"
            onClick={() => void query.refetch()}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {query.isSuccess && <WosiCampaignResults data={query.data} />}
    </section>
  );
}
