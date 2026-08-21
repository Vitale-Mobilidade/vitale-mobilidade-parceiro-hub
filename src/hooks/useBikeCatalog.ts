import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Bike } from "@/data/bikes";
import {
  mergeCatalog,
  STATIC_CATALOG,
  type CatalogSnapshot,
  type SyncState,
} from "@/lib/bike-catalog";

export interface BikeCatalogState {
  catalog: Bike[];
  /** "sheet" quando veio do snapshot da planilha; "static" no fallback. */
  origin: "sheet" | "static";
  snapshotUpdatedAt: string | null;
  syncState: SyncState | null;
  loading: boolean;
  refresh: () => void;
}

export function useBikeCatalog(): BikeCatalogState {
  const [catalog, setCatalog] = useState<Bike[]>(STATIC_CATALOG);
  const [origin, setOrigin] = useState<"sheet" | "static">("static");
  const [snapshotUpdatedAt, setSnapshotUpdatedAt] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const [snapRes, stateRes] = await Promise.all([
          supabase.from("bike_catalog_snapshot").select("data, updated_at").eq("id", "current").maybeSingle(),
          supabase.from("bike_catalog_sync_state").select("*").eq("id", "current").maybeSingle(),
        ]);
        if (cancelled) return;

        const snapshot = (snapRes.data?.data ?? null) as CatalogSnapshot | null;
        const bikes = snapshot?.bikes;
        if (Array.isArray(bikes) && bikes.length > 0) {
          setCatalog(mergeCatalog(STATIC_CATALOG, bikes));
          setOrigin("sheet");
          setSnapshotUpdatedAt(snapRes.data?.updated_at ?? null);
        } else {
          setCatalog(STATIC_CATALOG);
          setOrigin("static");
          setSnapshotUpdatedAt(null);
        }

        if (stateRes.data) setSyncState(stateRes.data as unknown as SyncState);
      } catch (e) {
        if (!cancelled) {
          console.warn("[bike-catalog] fallback para catálogo estático", e);
          setCatalog(STATIC_CATALOG);
          setOrigin("static");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [nonce]);

  return { catalog, origin, snapshotUpdatedAt, syncState, loading, refresh };
}
