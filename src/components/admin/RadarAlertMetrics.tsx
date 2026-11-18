import type { RadarAlertOverview } from "@/lib/price-alert-metrics";
export function RadarAlertMetrics({
  overview,
}: {
  overview: RadarAlertOverview;
}) {
  const { local, remote } = overview;
  const cards: Array<[string, number | null]> = [
    ["Cadastros de alerta", local?.totalAlerts ?? null],
    ["Pessoas únicas", local?.people ?? null],
    ["Cadastros ativos no site", local?.activeRegistrations ?? null],
    ["Cadastros nos últimos 7 dias", local?.recent7d ?? null],
    [
      "Aguardando preço na Hotpipe",
      remote.available
        ? (remote.counts.active ?? 0) + (remote.counts.processing ?? 0)
        : null,
    ],
    [
      "Avisos aceitos pelo WhatsApp",
      remote.available ? (remote.counts.sent ?? 0) : null,
    ],
    [
      "Avisos entregues ou lidos",
      remote.available
        ? (remote.counts.receipt_delivered ?? 0) +
          (remote.counts.receipt_read ?? 0)
        : null,
    ],
    [
      "Envios com resultado incerto",
      remote.available ? (remote.counts.uncertain ?? 0) : null,
    ],
  ];
  const maximum = Math.max(
    1,
    ...(local?.daily.map((d) => d.registrations) ?? []),
  );
  return (
    <section
      aria-label="Indicadores globais dos alertas"
      className="mb-6 space-y-4"
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-line bg-white p-4"
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value ?? "—"}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Indicadores globais, independentes da busca. Cadastros ativos no site
        não confirmam acompanhamento ou envio. Os estados do WhatsApp
        representam o pedido atual de cada cadastro; recibos vêm da Hotpipe.
      </p>
      {!remote.available && (
        <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm">
          Não foi possível consultar o envio no WhatsApp. Nenhum total remoto
          foi estimado.
        </p>
      )}
      {local && (
        <>
          {(local.export.failed > 0 ||
            local.export.pending > 0 ||
            (remote.counts.failed ?? 0) > 0) && (
            <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm">
              Integração: {local.export.failed} evento(s) com falha;{" "}
              {local.export.pending} pendente(s). Hotpipe:{" "}
              {remote.available ? (remote.counts.failed ?? 0) : "—"} pedido(s)
              com falha. Resultados incertos precisam de conciliação antes de
              reenvio.
            </p>
          )}
          <details className="rounded-xl border border-line bg-white p-4" open>
            <summary className="min-h-11 cursor-pointer font-semibold">
              Cadastros por dia · últimos 30 dias de São Paulo
            </summary>
            <div aria-hidden="true" className="mt-4 flex h-32 items-end gap-1">
              {local.daily.map((d) => (
                <div
                  key={d.day}
                  title={`${d.day}: ${d.registrations}`}
                  className="min-w-0 flex-1 rounded-t bg-emerald-700"
                  style={{
                    height: `${(d.registrations / maximum) * 100}%`,
                    minHeight: d.registrations ? 3 : 0,
                  }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{local.daily[0]?.day}</span>
              <span>{local.daily.at(-1)?.day}</span>
            </div>
            <details className="mt-3">
              <summary className="min-h-11 cursor-pointer text-sm underline">
                Ver números por dia
              </summary>
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Cadastros diários no fuso America/Sao_Paulo
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Dia</th>
                    <th scope="col">Cadastros</th>
                  </tr>
                </thead>
                <tbody>
                  {local.daily.map((d) => (
                    <tr key={d.day}>
                      <th scope="row" className="font-normal">
                        {d.day}
                      </th>
                      <td>{d.registrations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </details>
          <p className="text-xs text-muted-foreground">
            E-mails: {local.email.accepted ?? 0} aceito(s),{" "}
            {local.email.delivered ?? 0} entregue(s),{" "}
            {local.email.uncertain ?? 0} incerto(s),{" "}
            {(local.email.failed ?? 0) +
              (local.email.bounced ?? 0) +
              (local.email.complained ?? 0)}{" "}
            com falha ou supressão. Cada cadastro pode gerar confirmação e aviso
            de preço.
          </p>
        </>
      )}
      {!local && (
        <p role="status" className="text-sm">
          Indicadores de cadastro indisponíveis. A lista abaixo permanece
          disponível.
        </p>
      )}
    </section>
  );
}
