import { supabase } from "@/integrations/supabase/client";
import { prepareMemberImage } from "./bike-classifieds-api";
export async function adminClassifiedsCall(
  action: string,
  payload: Record<string, unknown> = {},
) {
  const { data } = await supabase.auth.getSession();
  if (!data.session)
    throw new Error("Sessão expirada. Entre no Admin novamente.");
  const response = await fetch("/api/admin/classifieds", {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      action === "metrics"
        ? { action, ...payload }
        : Object.keys(payload).length
          ? { action, payload }
          : { action },
    ),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      response.status === 401 || response.status === 403
        ? "Acesso restrito ao Admin."
        : result.error || "classifieds_unavailable",
    );
  return result;
}
export async function uploadChannelImage(file: File, listingId: string) {
  const blob = await prepareMemberImage(file);
  const asset = await adminClassifiedsCall("reserve_image", { id: listingId });
  const { error } = await supabase.storage
    .from("member-media")
    .uploadToSignedUrl(asset.path, asset.token, blob, {
      contentType: "image/webp",
    });
  if (error)
    throw new Error(
      "Não foi possível enviar a foto. Remova a reserva e tente novamente.",
    );
  await adminClassifiedsCall("finalize_image", {
    id: listingId,
    assetId: asset.id,
  });
}
export async function removeChannelImage(
  _path: string,
  assetId: string,
  listingId?: string,
) {
  await adminClassifiedsCall("remove_image", { id: listingId, assetId });
}
