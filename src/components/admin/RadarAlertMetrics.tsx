import type { RadarAlertOverview } from "@/lib/price-alert-metrics";
export function RadarAlertMetrics({
  overview,
}: {
  overview: RadarAlertOverview;
}) {
  const { local, remote } = overview;
  const confirmedDeliveries = remote.available
    ? (remote.counts.receipt_delivered ?? 0) + (remote.counts.receipt_read ?? 0)
    : null;
  const cards: Array<[string, number | null, string]> = [
    ["Pessoas cadastradas", local?.people ?? null, "Cada pessoa conta uma vez"],
    [
      "Alertas criados",
      local?.totalAlerts ?? null,
      "Uma pessoa pode acompanhar várias bikes",
    ],
    [
      "Aguardando queda de preço",
      remote.available
        ? (remote.counts.active ?? 0) + (remote.counts.processing ?? 0)
        : null,
      "Alertas em acompanhamento",
    ],
    [
      "Avisos de preço enviados",
      remote.available ? (remote.counts.sent ?? 0) : null,
      confirmedDeliveries == null
        ? "Entrega não consultada"
        : `${confirmedDeliveries} com entrega confirmada`,
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
        {cards.map(([label, value, description]) => (
          <div
            key={label}
            className="rounded-xl border border-line bg-white p-4"
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value ?? "—"}</p>
            <p className="mt-2 text-xs text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Totais gerais. Os filtros abaixo alteram apenas a lista de cadastros.
      </p>
      {!remote.available && (
        <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm">
          Não foi possível consultar o envio no WhatsApp. Nenhum total remoto
          foi estimado.
        </p>
      )}
      {local && (
        <>
          <details className="rounded-xl border border-line bg-white p-4" open>
            <summary className="min-h-11 cursor-pointer font-semibold">
              Cadastros por dia · últimos 30 dias
            </summary>
            <p className="mt-1 text-xs text-muted-foreground">
              {local.recent7d} novos alertas nos últimos 7 dias · horário de São
              Paulo
            </p>
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
          <details className="rounded-xl border border-line bg-white p-4">
            <summary className="min-h-11 cursor-pointer text-sm font-semibold">
              Ver pendências de envio
            </summary>
            <div className="mt-2 space-y-2 text-sm text-muted-foreground">
              <p>
                Cadastro no acompanhamento: {local.export.pending} aguardando
                sincronização e {local.export.failed} com falha de
                sincronização.
              </p>
              <p>
                WhatsApp: {remote.available ? (remote.counts.failed ?? 0) : "—"}{" "}
                com falha e{" "}
                {remote.available ? (remote.counts.uncertain ?? 0) : "—"} sem
                confirmação de envio.
              </p>
              <p>
                Envios sem confirmação precisam de conferência antes de tentar
                novamente, para evitar mensagens duplicadas.
              </p>
              <p>
                E-mails: {local.email.accepted ?? 0} aceitos,{" "}
                {local.email.delivered ?? 0} entregues,{" "}
                {local.email.uncertain ?? 0} sem confirmação de envio e{" "}
                {(local.email.failed ?? 0) +
                  (local.email.bounced ?? 0) +
                  (local.email.complained ?? 0)}{" "}
                com falha ou bloqueio.
              </p>
              <p>
                Cada cadastro pode gerar confirmação e aviso de preço. As falhas
                de sincronização são tentativas de integração, não pessoas.
              </p>
            </div>
          </details>
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
