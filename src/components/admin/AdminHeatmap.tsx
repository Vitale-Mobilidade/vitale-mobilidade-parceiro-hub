import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminCall } from "@/lib/admin-api";
import {
  HEATMAP_LAYOUT,
  heatmapPath,
  type HeatmapBin,
  type HeatmapScreen,
} from "../../../supabase/functions/_shared/heatmap";

const names = {
  other: "Outros cliques",
  radar: "Radar",
  quiz: "Quiz",
  content: "Conteúdos",
  tools: "Ferramentas",
  offer: "Oferta",
};
export function AdminHeatmap() {
  const [draft, setDraft] = useState("/");
  const [path, setPath] = useState("/");
  const [screen, setScreen] = useState<HeatmapScreen>("mobile");
  const [days, setDays] = useState(30);
  const [invalid, setInvalid] = useState(false);
  const result = useQuery({
    queryKey: ["admin", "heatmap", path, screen, days],
    queryFn: () =>
      adminCall<{ bins: HeatmapBin[]; layout: string; sample: number }>(
        "heatmap",
        { path, screen, days },
      ),
    retry: false,
  });
  const bins = result.data?.bins ?? [];
  const views = bins
    .filter((b) => b.kind === "view")
    .reduce((n, b) => n + Number(b.count), 0);
  const cells = Array.from({ length: 240 }, (_, i) =>
    bins
      .filter(
        (b) =>
          b.kind === "click" && b.x === i % 12 && b.y === Math.floor(i / 12),
      )
      .reduce((n, b) => n + Number(b.count), 0),
  );
  const max = Math.max(1, ...cells);
  return (
    <section className="mx-auto my-8 max-w-7xl rounded-2xl border bg-white p-5 text-slate-900">
      <h2 className="text-xl font-bold">Mapa de calor</h2>
      <p className="mt-2 text-sm">
        Mapa esquemático da largura e altura do documento, sem captura de tela.
        Amostra de 25% por entrada; sem pessoas únicas ou jornadas individuais.
        Versão {HEATMAP_LAYOUT}.
      </p>
      <form
        className="my-4 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const next = heatmapPath(draft);
          setInvalid(!next);
          if (next) setPath(next);
        }}
      >
        <label className="text-sm">
          Página pública
          <input
            className="block rounded border p-2"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="/radar"
          />
        </label>
        <label className="text-sm">
          Tela
          <select
            className="block rounded border p-2"
            value={screen}
            onChange={(e) => setScreen(e.target.value as HeatmapScreen)}
          >
            <option value="mobile">Celular</option>
            <option value="tablet">Tablet</option>
            <option value="desktop">Desktop</option>
          </select>
        </label>
        <label className="text-sm">
          Período
          <select
            className="block rounded border p-2"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {[7, 30, 90].map((n) => (
              <option key={n} value={n}>
                {n} dias
              </option>
            ))}
          </select>
        </label>
        <button
          className="rounded bg-emerald-800 px-4 py-2 text-white"
          type="submit"
        >
          Consultar
        </button>
      </form>
      {invalid && (
        <p role="alert">
          Use /, /radar, /radar/modelo ou uma página de /conteudos, sem
          parâmetros.
        </p>
      )}
      <p className="text-sm">
        Página consultada: {path}. Não extrapolamos a amostra para o tráfego
        total. Cores indicam contagens relativas dentro deste filtro.
      </p>
      {result.isPending ? (
        <p role="status">Carregando mapa…</p>
      ) : result.isError ? (
        <p role="alert">{result.error.message}</p>
      ) : !bins.length ? (
        <p className="py-5">
          Sem cobertura neste filtro. A coleta pode estar desligada ou ainda não
          ter recebido amostras.
        </p>
      ) : (
        <>
          <p className="my-3 font-semibold">
            {views} entradas amostradas · {cells.reduce((a, b) => a + b, 0)}{" "}
            cliques
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-bold">Distribuição dos cliques</h3>
              <div
                aria-hidden="true"
                className="mt-2 grid max-w-sm grid-cols-12 gap-px border bg-slate-200"
              >
                {cells.map((count, i) => (
                  <div
                    key={i}
                    title={`${count} cliques`}
                    style={{
                      aspectRatio: "1.5",
                      background: count
                        ? `rgba(185,28,28,${0.15 + (0.85 * count) / max})`
                        : "#f8fafc",
                    }}
                  />
                ))}
              </div>
              <p className="text-xs">
                Topo da grade = início da página; base = final. Não corresponde
                à posição exata de um botão. Mudanças de altura e conteúdo podem
                deslocar células.
              </p>
            </div>
            <div>
              <h3 className="font-bold">Alcance de rolagem</h3>
              <table className="my-2 w-full text-left text-sm">
                <caption className="sr-only">
                  Entradas amostradas que visualizaram cada profundidade
                </caption>
                <thead>
                  <tr>
                    <th>Profundidade vista</th>
                    <th>Entradas</th>
                  </tr>
                </thead>
                <tbody>
                  {[25, 50, 75, 100].map((y) => (
                    <tr key={y}>
                      <td>{y}%</td>
                      <td>
                        {bins
                          .filter((b) => b.kind === "scroll" && b.y === y)
                          .reduce((n, b) => n + Number(b.count), 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3 className="font-bold">Categorias de cliques</h3>
              <ul>
                {Object.entries(names).map(([action, name]) => (
                  <li key={action}>
                    {name}:{" "}
                    {bins
                      .filter((b) => b.kind === "click" && b.action === action)
                      .reduce((n, b) => n + Number(b.count), 0)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <details className="mt-4">
            <summary>Contagens por célula em tabela</summary>
            <table className="w-full text-left text-sm">
              <caption>
                Colunas da esquerda para a direita; faixas do topo para o final
              </caption>
              <thead>
                <tr>
                  <th>Coluna</th>
                  <th>Faixa vertical</th>
                  <th>Cliques</th>
                </tr>
              </thead>
              <tbody>
                {cells.map((count, i) =>
                  count > 0 ? (
                    <tr key={i}>
                      <td>{(i % 12) + 1}/12</td>
                      <td>{Math.floor(i / 12) + 1}/20</td>
                      <td>{count}</td>
                    </tr>
                  ) : null,
                )}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}
