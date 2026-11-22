import { useQuery } from "@tanstack/react-query";
import { adminCall } from "@/lib/admin-api";

export type LinksCampaignReport = {
  startDate: string;
  endDate: string;
  views: number;
  days: Array<{ date: string; views: number }>;
};

export function LinksCampaignSummary({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  const report = useQuery({
    queryKey: ["admin", "links-campaign", startDate, endDate],
    queryFn: () =>
      adminCall<LinksCampaignReport>("links-campaign", { startDate, endDate }),
  });
  return (
    <section
      aria-labelledby="links-campaign-heading"
      className="rounded-xl border border-line bg-white p-5"
    >
      <h2 id="links-campaign-heading" className="text-xl font-bold">
        Link da bio · /links
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Mesmo período selecionado acima. Estes acessos ficam fora de Growth.
      </p>
      {report.isPending ? (
        <p role="status" className="mt-4">
          Carregando acessos…
        </p>
      ) : report.isError ? (
        <p role="alert" className="mt-4">
          Medição indisponível.{" "}
          <button
            type="button"
            onClick={() => void report.refetch()}
            className="underline"
          >
            Tentar novamente
          </button>
        </p>
      ) : (
        <dl className="mt-4">
          <dt className="text-sm">Acessos à página</dt>
          <dd className="mt-1 text-3xl font-bold tabular-nums">
            {new Intl.NumberFormat("pt-BR").format(report.data.views)}
          </dd>
          <dd className="mt-2 text-sm text-muted-foreground">
            {report.data.days.length
              ? "Visualizações da página, incluindo visitas repetidas."
              : "Nenhum acesso registrado neste período."}
          </dd>
        </dl>
      )}
    </section>
  );
}
