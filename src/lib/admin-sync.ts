import { supabase } from "@/integrations/supabase/client";
import { adminCall, adminStream, AdminApiError } from "./admin-api";
import type { VideoItem } from "./video-catalog";

export async function adminBikePanelCall<T extends { ok?: boolean; error?: string }>(action: string): Promise<T> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new AdminApiError("Sessão expirada. Entre novamente.", 401);
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bike-panel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${data.session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  const result = await response.json() as T;
  if (!response.ok || !result.ok) throw new AdminApiError(result.error ?? "Falha ao sincronizar bikes.", response.status);
  return result;
}
export type SyncCatalogResult = { videos: VideoItem[]; candidate: string | null; enabled: boolean };
export type AdminSyncResult = { bikes: string; videos: string; article: string; errors: string[] };

/** Every stage reports independently; a bike failure cannot silently prevent refreshing videos. */
export async function synchronizeAdmin(input: {
  bikes: () => Promise<unknown>;
  videos: () => Promise<SyncCatalogResult>;
  generate: (id: string) => Promise<unknown>;
  progress: (message: string) => void;
  catalog: (videos: VideoItem[]) => void;
}): Promise<AdminSyncResult> {
  const result: AdminSyncResult = { bikes: "Não atualizado", videos: "Não atualizado", article: "Sem vídeo novo para gerar", errors: [] };
  input.progress("Atualizando bikes…");
  try { await input.bikes(); result.bikes = "Atualizadas"; }
  catch (error) { result.errors.push(error instanceof Error ? error.message : "Falha nas bikes."); }
  input.progress("Atualizando vídeos…");
  try {
    const snapshot = await input.videos();
    input.catalog(snapshot.videos);
    result.videos = `${snapshot.videos.length} vídeos atualizados`;
    if (snapshot.candidate && snapshot.enabled) {
      if (result.errors.length) result.article = "Geração aguardando sincronização das bikes";
      else {
        input.progress("Criando artigo e capa do vídeo novo…");
        await input.generate(snapshot.candidate);
        result.article = "Artigo e capa preparados";
      }
    } else if (snapshot.candidate) result.article = "Geração automática desativada";
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : "Falha nos vídeos ou na geração.");
    result.article = "Não concluído; confira os registros no Admin";
  }
  return result;
}
export const syncAdmin = (progress: (message: string) => void, catalog: (videos: VideoItem[]) => void) => synchronizeAdmin({
  bikes: () => adminBikePanelCall("sync-now"),
  videos: () => adminCall<SyncCatalogResult>("sync-video-catalog"),
  generate: (youtubeId) => adminStream("generate-from-sheet", { youtubeId }, progress),
  progress, catalog,
});
