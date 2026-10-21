import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminCall } from "@/lib/admin-api";
import {
  heatmapPath,
  type HeatmapScreen,
} from "../../../supabase/functions/_shared/heatmap";
import { type ElementBin } from "../../../supabase/functions/_shared/heatmap-elements";
import { targetIndex } from "@/lib/heatmap-targets";
type Report = {
  bins: ElementBin[];
  viewport: number;
  viewports: number[];
  layout: string;
};
type Spot = {
  target: string;
  key: string;
  left: number;
  top: number;
  count: number;
  label: string;
};
export function ElementHeatmap() {
  const [draft, setDraft] = useState("/");
  const [path, setPath] = useState("/");
  const [screen, setScreen] = useState<HeatmapScreen>("mobile");
  const [days, setDays] = useState(30);
  const [viewport, setViewport] = useState(0);
  const [invalid, setInvalid] = useState(false);
  const [height, setHeight] = useState(1000);
  const [availableWidth, setAvailableWidth] = useState(900);
  const [zoom, setZoom] = useState(1);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [missing, setMissing] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const report = useQuery({
    queryKey: ["admin", "heatmap-elements", path, screen, days, viewport],
    queryFn: () =>
      adminCall<Report>("heatmap-elements", { path, screen, days, viewport }),
    retry: false,
  });
  const width =
    report.data?.viewport ??
    (screen === "mobile" ? 390 : screen === "tablet" ? 820 : 1440);
  const bins = useMemo(() => report.data?.bins ?? [], [report.data]);
  const measure = useCallback(() => {
    const doc = frame.current?.contentDocument;
    if (!doc || !doc.body) return;
    const index = targetIndex(doc);
    let absent = 0;
    const next: Spot[] = [];
    for (const b of bins.filter((b) => b.kind === "click")) {
      const element = index.get(b.target);
      const rect = element?.getBoundingClientRect();
      if (!element || !rect || rect.width <= 0 || rect.height <= 0) {
        absent += Number(b.count);
        continue;
      }
      next.push({
        target: b.target,
        key: `${b.target}:${b.x}:${b.y}`,
        left: rect.left + ((b.x + 0.5) / 100) * rect.width,
        top:
          rect.top +
          (doc.defaultView?.scrollY ?? 0) +
          ((b.y + 0.5) / 100) * rect.height,
        count: Number(b.count),
        label:
          (
            element.textContent ??
            element.getAttribute("aria-label") ??
            b.target
          )
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 100) || b.target,
      });
    }
    const docHeight = Math.max(
      doc.documentElement.scrollHeight,
      doc.body.scrollHeight,
    );
    setHeight(Math.min(60000, Math.max(1000, docHeight)));
    setSpots(next);
    setMissing(absent);
  }, [bins]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setAvailableWidth(element.clientWidth),
    );
    observer.observe(element);
    setAvailableWidth(element.clientWidth);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    measure();
    const doc = frame.current?.contentDocument;
    if (!doc?.body) return;
    const observer = new ResizeObserver(measure);
    observer.observe(doc.body);
    const images = Array.from(doc.images);
    images.forEach((image) => image.addEventListener("load", measure));
    return () => {
      observer.disconnect();
      images.forEach((image) => image.removeEventListener("load", measure));
    };
  }, [measure, loaded, width, path]);
  useEffect(() => {
    setHeight(1000);
    setLoaded(false);
    setSpots([]);
    setMissing(0);
  }, [path, width]);
  const scale = Math.min(1, availableWidth / width) * zoom;
  const views = bins
    .filter((b) => b.kind === "view")
    .reduce((n, b) => n + Number(b.count), 0);
  const clicks = bins
    .filter((b) => b.kind === "click")
    .reduce((n, b) => n + Number(b.count), 0);
  const ranking = Array.from(new Set(spots.map((s) => s.target)))
    .map((target) => ({
      target,
      label: spots.find((s) => s.target === target)!.label,
      count: spots
        .filter((s) => s.target === target)
        .reduce((n, s) => n + s.count, 0),
    }))
    .sort((a, b) => b.count - a.count);
  return (
    <section className="mx-auto my-8 max-w-7xl rounded-2xl border bg-white p-5 text-slate-900">
      <h2 className="text-2xl font-bold">Mapa de calor sobre a página</h2>
      <p className="mt-2 text-sm">
        Veja a página com os cliques sobre links e botões. A posição é relativa
        ao elemento clicado, na largura de tela registrada. Amostra de 25%; sem
        gravação de sessões.
      </p>
      <form
        className="my-4 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const next = heatmapPath(draft);
          setInvalid(!next);
          if (next) {
            setPath(next);
            setViewport(0);
          }
        }}
      >
        <label>
          Página
          <input
            className="block rounded border p-2"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </label>
        <label>
          Tela
          <select
            className="block rounded border p-2"
            value={screen}
            onChange={(e) => {
              setScreen(e.target.value as HeatmapScreen);
              setViewport(0);
            }}
          >
            <option value="mobile">Celular</option>
            <option value="tablet">Tablet</option>
            <option value="desktop">Desktop</option>
          </select>
        </label>
        <label>
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
        <label>
          Largura registrada
          <select
            className="block rounded border p-2"
            value={viewport}
            onChange={(e) => setViewport(Number(e.target.value))}
          >
            <option value={0}>Mais frequente</option>
            {report.data?.viewports.map((w) => (
              <option value={w} key={w}>
                {w} px
              </option>
            ))}
          </select>
        </label>
        <button
          className="rounded bg-emerald-800 px-4 py-2 text-white"
          type="submit"
        >
          Consultar página
        </button>
      </form>
      {invalid && (
        <p role="alert">
          Use uma página pública da Home, Radar ou conteúdos, sem parâmetros.
        </p>
      )}
      {report.isPending ? (
        <p role="status">Carregando contagens…</p>
      ) : report.isError ? (
        <p role="alert">{report.error.message}</p>
      ) : (
        <p className="font-semibold">
          {views} entradas amostradas · {clicks} cliques em elementos · largura{" "}
          {width} px
        </p>
      )}
      {!bins.length && (
        <p className="my-3 rounded bg-amber-50 p-3 text-sm">
          A página aparece abaixo mesmo sem cliques. A coleta por elemento
          começa após a ativação da versão nova; os dados da grade anterior não
          têm essa precisão.
        </p>
      )}
      <div className="my-3 flex flex-wrap items-center gap-4 text-sm">
        <label>
          Zoom{" "}
          <select
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="rounded border p-1"
          >
            <option value={0.75}>75%</option>
            <option value={1}>Ajustar à largura</option>
            <option value={1.5}>150%</option>
          </select>
        </label>
        <span>
          🔴 Mais cliques = marcação maior. Passe sobre uma marcação para ver o
          elemento e a contagem.
        </span>
      </div>
      <p className="mb-3 text-xs text-slate-600">
        Referência: página atual, sem interação. Não é reprodução da sessão nem
        captura histórica. Se a página mudou, posições podem variar; elementos
        ausentes não recebem marcações.
      </p>
      <div
        ref={host}
        className="max-h-[760px] overflow-auto rounded-xl border bg-slate-100"
      >
        <div
          style={{
            width: Math.max(1, width * scale),
            margin: "0 auto",
            height: height * scale,
            position: "relative",
          }}
        >
          <div
            style={{
              width,
              height,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              position: "absolute",
            }}
          >
            <iframe
              ref={frame}
              key={`${path}:${width}`}
              title={`Prévia visual de ${path} em ${width} pixels`}
              src={path}
              sandbox="allow-same-origin"
              referrerPolicy="no-referrer"
              scrolling="no"
              tabIndex={-1}
              onLoad={() => {
                setLoaded(true);
                measure();
              }}
              style={{
                width,
                height,
                border: 0,
                pointerEvents: "none",
                display: "block",
              }}
            />
            <div
              style={{ position: "absolute", inset: 0 }}
              aria-label="Marcações de cliques"
            >
              {spots.map((s) => (
                <span
                  key={s.key}
                  title={`${s.label}: ${s.count} cliques`}
                  style={{
                    position: "absolute",
                    left: s.left,
                    top: s.top,
                    width: Math.min(70, 18 + Math.sqrt(s.count) * 8),
                    height: Math.min(70, 18 + Math.sqrt(s.count) * 8),
                    transform: "translate(-50%,-50%)",
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle,rgba(220,38,38,.9),rgba(245,158,11,.65) 45%,rgba(250,204,21,0) 75%)",
                    boxShadow: "0 0 8px rgba(239,68,68,.25)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      {missing > 0 && (
        <p role="status" className="mt-3 rounded bg-amber-50 p-3">
          {missing} cliques não posicionados: o elemento está ausente ou oculto
          na referência atual. Eles não foram movidos para outro botão.
        </p>
      )}
      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <section>
          <h3 className="font-bold">Elementos clicados na referência atual</h3>
          {ranking.length ? (
            <ol className="mt-2 space-y-2">
              {ranking.map((r) => (
                <li className="flex justify-between gap-3" key={r.target}>
                  <span>{r.label}</span>
                  <strong>{r.count}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm">Nenhum clique posicionado neste filtro.</p>
          )}
        </section>
        <section>
          <h3 className="font-bold">Alcance de leitura</h3>
          <table className="mt-2 w-full text-left text-sm">
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
        </section>
      </div>
    </section>
  );
}
