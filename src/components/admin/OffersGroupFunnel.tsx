import type { AdminGrowth } from "@/lib/admin-api";

const sources = [
  { id: "google", label: "Google Ads" },
  { id: "meta", label: "Meta Ads" },
  { id: "unattributed", label: "Sem origem de campanha" },
] as const;

const wholeNumber = new Intl.NumberFormat("pt-BR");

export function OffersGroupFunnel({
  rows,
}: {
  rows: AdminGrowth["sitewide"]["offersGroupFunnel"];
}) {
  return (
    <section
      aria-labelledby="offers-group-funnel-title"
      className="rounded-xl border border-line bg-white p-3 shadow-sm sm:p-4"
    >
      <h2 id="offers-group-funnel-title" className="text-base font-bold">
        Funil do Grupo de Ofertas
      </h2>
      {!rows?.length ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {rows
            ? "Sem registros da landing no período."
            : "Medição da landing indisponível."}
        </p>
      ) : (
        <>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-muted-foreground">
                <tr>
                  <th scope="col" className="py-2 pr-3 text-left">
                    Origem
                  </th>
                  <th scope="col" className="px-2 py-2 text-right">
                    Visualizações da landing
                  </th>
                  <th scope="col" className="py-2 pl-2 text-right">
                    Cliques no botão
                  </th>
                </tr>
              </thead>
              <tbody>
                {sources.map(({ id, label }) => {
                  const row = rows.find(({ origin }) => origin === id);
                  return (
                    <tr
                      key={id}
                      className="border-b border-line last:border-b-0"
                    >
                      <th
                        scope="row"
                        className="py-2 pr-3 text-left font-medium"
                      >
                        {label}
                      </th>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {row ? wholeNumber.format(row.views) : "—"}
                      </td>
                      <td className="py-2 pl-2 text-right tabular-nums">
                        {row ? wholeNumber.format(row.clicks) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Eventos registrados desde a ativação da coleta. Uma pessoa pode
            gerar vários eventos. A entrada no WhatsApp é confirmada
            separadamente.
          </p>
        </>
      )}
    </section>
  );
}
