import type { TrafficHours } from "@/lib/admin-api";

const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const hours = Array.from({ length: 24 }, (_, hour) => hour);
const formatAverage = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

export function TrafficPeakMap({
  traffic,
  day,
}: {
  traffic: TrafficHours | null | undefined;
  day?: string;
}) {
  const cells = traffic?.heatmap ?? [];
  const byTime = new Map(
    cells.map((cell) => [cell.weekday * 24 + cell.hour, cell]),
  );
  const peak = Math.max(0, ...cells.map((cell) => cell.average));
  const visibleDays = day
    ? [(new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7]
    : weekdays.map((_, index) => index);

  return (
    <section
      aria-labelledby="traffic-peak-title"
      className="min-w-0 rounded-xl border border-line bg-white p-3 shadow-sm sm:p-4"
    >
      <h2 id="traffic-peak-title" className="text-base font-bold">
        Mapa de calor de acessos
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {day
          ? "Visualizações por hora do dia selecionado."
          : "Média de visualizações por dia da semana e hora no período selecionado."}{" "}
        Horas fechadas no fuso de São Paulo.
      </p>
      {cells.length > 0 ? (
        <>
          <div
            className="mt-4 overflow-x-auto rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
            tabIndex={0}
            role="region"
            aria-label="Horários de pico. Deslize para ver todas as horas."
          >
            <table className="w-full min-w-[54rem] border-separate border-spacing-0.5 text-center text-[11px] tabular-nums">
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 bg-white px-1.5">
                    Dia
                  </th>
                  {hours.map((hour) => (
                    <th scope="col" className="px-0.5 font-medium" key={hour}>
                      {hour}h
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleDays.map((index) => (
                  <tr key={index}>
                    <th
                      scope="row"
                      className="sticky left-0 bg-white px-1.5 text-left"
                    >
                      {weekdays[index]}
                    </th>
                    {hours.map((hour) => {
                      const cell = byTime.get((index + 1) * 24 + hour);
                      const value = cell
                        ? formatAverage.format(cell.average)
                        : "—";
                      const intensity =
                        cell && peak > 0 ? cell.average / peak : 0;
                      return (
                        <td
                          key={hour}
                          className="h-8 rounded-sm px-0.5 font-medium"
                          style={{
                            backgroundColor: cell
                              ? `color-mix(in srgb, #065f46 ${Math.round(intensity * 100)}%, #ecfdf5)`
                              : "#f1f5f9",
                            color: intensity > 0.55 ? "#ffffff" : "#0f172a",
                          }}
                          title={
                            cell
                              ? `${value} visualizações · ${cell.samples} ${cell.samples === 1 ? "ocorrência" : "ocorrências"}`
                              : "Sem cobertura"
                          }
                        >
                          {value}
                          <span className="sr-only">
                            {cell
                              ? ` visualizações em média, ${cell.samples} ocorrências`
                              : " Sem cobertura"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Tons mais escuros indicam maior volume. — indica ausência de
            cobertura.
          </p>
        </>
      ) : (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          {traffic
            ? "Ainda não há horas fechadas com dados neste período."
            : "Mapa de horários temporariamente indisponível."}
        </p>
      )}
      {traffic?.coverageSince && (
        <p className="mt-2 text-xs text-muted-foreground">
          Coleta por hora iniciada em{" "}
          {traffic.coverageSince.slice(0, 10).split("-").reverse().join("/")}.
        </p>
      )}
    </section>
  );
}
