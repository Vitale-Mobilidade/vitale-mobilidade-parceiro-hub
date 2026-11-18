import type { RadarAlertOverview } from "@/lib/price-alert-metrics";
export function RadarAlertMetrics({
  overview,
}: {
  overview: RadarAlertOverview;
}) {
  const { local } = overview;
  const reconciliation = overview.reconciliation;
  const cards: Array<[string, number | null, string]> = [
    [
      "Aguardando preço",
      reconciliation?.waiting ?? null,
      "Alertas em acompanhamento",
    ],
    [
      "Aviso entregue",
      reconciliation?.delivered ?? null,
      "Entrega confirmada no WhatsApp",
    ],
    [
      "Entrega em andamento",
      reconciliation?.inDelivery ?? null,
      "Envio iniciado; entrega ainda não confirmada",
    ],
    [
      "Com pendências",
      reconciliation?.needsAttention ?? null,
      "Cadastros ou envios que precisam de revisão",
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
      <div>
        <h2 className="text-lg font-bold">
          {local?.totalAlerts ?? "—"} alertas cadastrados
        </h2>
        <p className="text-sm text-muted-foreground">
          De {local?.people ?? "—"} pessoas. Uma pessoa pode cadastrar alertas
          para várias bikes.
        </p>
        <p className="mt-3 text-sm font-semibold">
          Situação dos avisos de preço por WhatsApp
        </p>
      </div>
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
      {reconciliation ? (
        <div className="space-y-1 text-sm">
          {reconciliation.closed > 0 && (
            <p>
              Encerrados ou sem autorização de contato: {reconciliation.closed}
            </p>
          )}
          <p aria-label="Conferência do total de alertas">
            {reconciliation.waiting} aguardando preço +{" "}
            {reconciliation.delivered} entregues + {reconciliation.inDelivery}{" "}
            em andamento + {reconciliation.needsAttention} com pendências
            {reconciliation.closed > 0 &&
              ` + ${reconciliation.closed} encerrados`}{" "}
            = <strong>{reconciliation.total} alertas</strong>
          </p>
        </div>
      ) : (
        <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm">
          Não foi possível conferir a situação de todos os alertas. Atualize
          para consultar novamente. Nenhum total de situação foi estimado.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Totais gerais. Cada alerta entra em uma única situação. Os filtros
        abaixo alteram apenas a lista de cadastros.
      </p>
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
              {reconciliation && (
                <>
                  <p className="font-semibold text-foreground">
                    {reconciliation.needsAttention} alertas com pendências:
                  </p>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>
                      {reconciliation.issues.notTracking} cadastros ainda sem
                      acompanhamento confirmado.
                    </li>
                    <li>
                      {reconciliation.issues.unconfirmed} envios que precisam de
                      conferência para saber se a mensagem saiu.
                    </li>
                    <li>
                      {reconciliation.issues.sendFailed} avisos com falha no
                      envio.
                    </li>
                    <li>
                      {reconciliation.issues.deliveryFailed} avisos enviados que
                      não chegaram ao destinatário.
                    </li>
                  </ul>
                  <p>
                    Mensagens sem confirmação precisam de conferência antes de
                    tentar novamente, para evitar duplicação.
                  </p>
                </>
              )}
              <p>
                Sincronização: {local.export.pending} tentativas pendentes e{" "}
                {local.export.failed} com falha. São eventos de integração e não
                entram na soma dos alertas.
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
