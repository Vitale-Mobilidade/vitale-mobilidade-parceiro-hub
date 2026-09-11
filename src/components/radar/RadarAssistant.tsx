import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LucasSDRWidget } from "@/components/LucasSDR/LucasSDRWidget";
import { LucasSDRErrorBoundary } from "@/components/LucasSDR/LucasSDRErrorBoundary";
import { trackRadar } from "@/lib/radar-analytics";
import type { SDRContext } from "@/components/LucasSDR/types";

interface CatalogItem {
  id: string;
  name: string;
  currentPrice: number;
}

/**
 * Assistente Vitale — UMA instância por rota.
 * /escolherbike já monta a sua própria instância: aqui é excluída de propósito.
 */
export function RadarAssistant() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);

  const path = location.pathname;
  const excluded = path.startsWith("/escolherbike") || path.startsWith("/painel-bikes");
  const isDetail = /^\/acompanhamento\/[^/]+$/.test(path);
  const isRadar = path === "/acompanhamento";

  useEffect(() => {
    if (excluded) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("get_price_tracker_catalog");
      if (cancelled || !Array.isArray(data)) return;
      setCatalog(
        (data as unknown as CatalogItem[]).map((b) => ({
          id: b.id,
          name: b.name,
          currentPrice: Number(b.currentPrice),
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [excluded]);

  const currentBike = useMemo(() => {
    const id = (params as { bikeId?: string }).bikeId;
    if (!id) return null;
    return catalog.find((b) => b.id === id) ?? null;
  }, [catalog, params]);

  const ctx = useMemo<SDRContext>(
    () => ({
      leadId: null,
      answers: {
        assistant_scope: isDetail ? "radar_detail" : isRadar ? "radar" : "site",
        current_bike: currentBike ? { id: currentBike.id, name: currentBike.name, price: currentBike.currentPrice } : null,
        catalog: catalog.map((b) => ({ id: b.id, name: b.name, price: b.currentPrice })),
        invite: isDetail
          ? "Tire dúvidas sobre esta bike"
          : isRadar
            ? "Quer entender se este preço está bom?"
            : "Encontre a bike ideal para você",
      },
      origin: { route: path },
    }),
    [catalog, currentBike, isDetail, isRadar, path],
  );

  if (excluded) return null;

  return (
    <LucasSDRErrorBoundary>
      <LucasSDRWidget
        ctx={ctx}
        assistantName="Assistente Vitale"
        inviteTitle={isDetail ? "Dúvida nesta bike?" : isRadar ? "Este preço está bom?" : "Qual bike é a sua?"}
        inviteText={
          isDetail
            ? "Tire dúvidas sobre esta bike"
            : isRadar
              ? "Quer entender se este preço está bom?"
              : "Encontre a bike ideal para você"
        }

        onBuyLink={(bikeId) => {
          // Nunca aceitamos URL vinda da IA: resolvemos o id no catálogo público.
          const bike = catalog.find((b) => b.id === bikeId);
          if (!bike) {
            navigate("/acompanhamento");
            trackRadar("radar_assistant_navigation", { route: "/acompanhamento", reason: "unknown_bike" });
            return;
          }
          navigate(`/acompanhamento/${bike.id}`);
          trackRadar("radar_assistant_navigation", { route: "/acompanhamento/:bikeId", bike_id: bike.id });
        }}
        onEvent={(name) => {
          if (name === "sdr_opened") trackRadar("radar_assistant_navigation", { route: path, source: "assistant_open" });
        }}
      />
    </LucasSDRErrorBoundary>
  );
}
