import type { ElementBin } from "../../../supabase/functions/_shared/heatmap-elements";
import { scrollMilestones } from "@/lib/heatmap-scroll";
export function ScrollHeatmapBands({
  bins,
  scale = 1,
}: {
  bins: ElementBin[];
  scale?: number;
}) {
  const inverse = 1 / Math.max(0.1, scale);
  return (
    <div
      aria-label="Faixas de alcance de scroll"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      {scrollMilestones(bins).map(({ depth, count, share }) => {
        const hue = share === null ? 210 : Math.round(120 * share);
        const color = share === null ? "#64748b" : `hsl(${hue},65%,35%)`;
        const fraction =
          share === null
            ? "sem base para percentual"
            : `${Math.round(share * 100)}% das entradas amostradas`;
        return (
          <div
            key={depth}
            data-scroll-depth={depth}
            style={{
              position: "absolute",
              top: `${depth - 25}%`,
              height: "25%",
              left: 0,
              right: 0,
              borderBottom: `3px solid ${color}`,
              background:
                share === null
                  ? "rgba(100,116,139,.035)"
                  : `hsla(${hue},75%,50%,.09)`,
            }}
          >
            <span
              style={{
                position: "absolute",
                right: 8,
                bottom: 5,
                maxWidth: "calc(100% - 16px)",
                padding: "7px 10px",
                borderRadius: 8,
                background: "rgba(255,255,255,.96)",
                border: `1px solid ${color}`,
                color: "#0f172a",
                fontSize: 13 * inverse,
                fontWeight: 700,
                boxShadow: "0 2px 8px #0002",
              }}
            >
              {depth}% da página · {count} entradas amostradas{" "}
              <span
                style={{
                  display: "block",
                  fontSize: 11 * inverse,
                  fontWeight: 400,
                }}
              >
                {fraction}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
