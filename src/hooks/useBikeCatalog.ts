import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildCatalogRows,
  mergeCatalog,
  type CatalogRow,
  type CatalogSnapshot,
} from "@/lib/bike-catalog";
import { BIKES } from "@/data/bikes";
import type { Bike } from "@/data/bikes";

export type CatalogOrigin = "static" | "sheet";

interface CatalogState {
  catalog: Bike[];
  rows: CatalogRow[];
  origin: CatalogOrigin;
  snapshotUpdatedAt: string | null;
  loading: boolean;
}

const STATIC_CATALOG = [...BIKES].sort((a, b) => a.internalPrice - b.internalPrice);

/**
 * Catálogo do quiz:
 * - Fonte principal: RPC `get_quiz_catalog` (somente elegíveis, com imagem
 *   persistida via proxy e perfil IA quando ready).
 * - Fallback: snapshot público `bike_catalog_snapshot` (merge com overrides).
 * - Último recurso: catálogo estático embutido.
 */
export function useBikeCatalog(): CatalogState {
  const [state, setState] = useState<CatalogState>({
    catalog: STATIC_CATALOG,
    rows: buildCatalogRows(STATIC_CATALOG, []),
    origin: "static",
    snapshotUpdatedAt: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rpcRes, snapRes] = await Promise.all([
          supabase.rpc("get_quiz_catalog"),
          supabase.from("bike_catalog_snapshot").select("data, updated_at").eq("id", "current").maybeSingle(),
        ]);
        if (cancelled) return;

        const rpcBikes = Array.isArray(rpcRes.data) ? (rpcRes.data as unknown[]) : [];
        const snapshot = (snapRes.data?.data ?? null) as CatalogSnapshot | null;
        const rowsSource = Array.isArray(snapshot?.bikes) ? snapshot.bikes : [];

        if (!rpcRes.error && rpcBikes.length > 0) {
          const rpcIds = new Set(rpcBikes.map((b) => (b as { id?: string }).id));
          const merged = mergeCatalog(STATIC_CATALOG, rpcBikes).filter((b) => rpcIds.has(b.id));
          setState({
            catalog: merged,
            rows: buildCatalogRows(STATIC_CATALOG, rowsSource),
            origin: "sheet",
            snapshotUpdatedAt: snapRes.data?.updated_at ?? null,
            loading: false,
          });
          return;
        }

        if (rowsSource.length > 0) {
          setState({
            catalog: mergeCatalog(STATIC_CATALOG, rowsSource),
            rows: buildCatalogRows(STATIC_CATALOG, rowsSource),
            origin: "sheet",
            snapshotUpdatedAt: snapRes.data?.updated_at ?? null,
            loading: false,
          });
          return;
        }
      } catch {
        // Fallback estático silencioso — o quiz nunca quebra.
      }
      if (!cancelled) setState((s) => ({ ...s, loading: false }));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
