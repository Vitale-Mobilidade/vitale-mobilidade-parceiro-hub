import { createClientOnlyFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { MEMBER_MEDIA_BUCKET } from "./bike-classifieds";
type ClassifiedsDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Functions"> & {
    Functions: Database["public"]["Functions"] & {
      member_classifieds: {
        Args: { p_action: string; p_payload: Json };
        Returns: Json;
      };
    };
  };
};
export const classifiedsCall = createClientOnlyFn(
  async (action: string, payload: Record<string, Json> = {}) => {
    const { data, error } = await (
      supabase as SupabaseClient<ClassifiedsDatabase>
    ).rpc("member_classifieds", { p_action: action, p_payload: payload });
    if (error) throw error;
    return data;
  },
);
export const signedMemberImages = createClientOnlyFn(
  async (paths: string[]) => {
    if (!paths.length) return new Map<string, string>();
    const { data, error } = await supabase.storage
      .from(MEMBER_MEDIA_BUCKET)
      .createSignedUrls(paths, 300);
    if (error) throw error;
    return new Map(
      (data ?? [])
        .filter((v) => v.signedUrl)
        .map((v) => [v.path!, v.signedUrl!] as [string, string]),
    );
  },
);
/** Decode then re-encode locally: bounded size, consistent format, no original EXIF. */
export async function prepareMemberImage(
  file: File,
  avatar = false,
): Promise<Blob> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 10 * 1024 * 1024 ||
    !file.size
  )
    throw new Error("image_invalid");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("image_invalid");
  });
  try {
    if (bitmap.width * bitmap.height > 60000000)
      throw new Error("image_invalid");
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    canvas.width = avatar ? 320 : Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = avatar
      ? 320
      : Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("image_invalid");
    if (avatar) {
      const side = Math.min(bitmap.width, bitmap.height);
      context.drawImage(
        bitmap,
        (bitmap.width - side) / 2,
        (bitmap.height - side) / 2,
        side,
        side,
        0,
        0,
        320,
        320,
      );
    } else context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (v) => (v ? resolve(v) : reject(new Error("image_invalid"))),
        "image/webp",
        0.82,
      ),
    );
    if (blob.type !== "image/webp" || blob.size > 2097152)
      throw new Error("image_too_large");
    return blob;
  } finally {
    bitmap.close();
  }
}
export async function uploadMemberImage(file: File, listingId?: string) {
  const blob = await prepareMemberImage(file, !listingId);
  const reservation = await classifiedsCall(
    listingId ? "reserve_image" : "reserve_avatar",
    listingId ? { id: listingId } : {},
  );
  if (
    !reservation ||
    typeof reservation !== "object" ||
    Array.isArray(reservation) ||
    typeof reservation.id !== "string" ||
    typeof reservation.path !== "string"
  )
    throw new Error("media_not_ready");
  try {
    const { error } = await supabase.storage
      .from(MEMBER_MEDIA_BUCKET)
      .upload(reservation.path, blob, {
        contentType: "image/webp",
        upsert: false,
        cacheControl: "300",
      });
    if (error) throw error;
    await classifiedsCall(listingId ? "finalize_image" : "finalize_avatar", {
      ...(listingId ? { id: listingId } : {}),
      assetId: reservation.id,
    });
  } catch (error) {
    // Keep the reservation visible if cleanup fails; never silently overfill a slot.
    const { error: cleanup } = await supabase.storage
      .from(MEMBER_MEDIA_BUCKET)
      .remove([reservation.path]);
    if (!cleanup)
      await classifiedsCall(listingId ? "remove_image" : "remove_avatar", {
        ...(listingId ? { id: listingId } : {}),
        assetId: reservation.id,
      }).catch(() => {});
    throw error;
  }
}
export async function removeMemberImage(
  path: string,
  assetId: string,
  listingId?: string,
) {
  const { error } = await supabase.storage
    .from(MEMBER_MEDIA_BUCKET)
    .remove([path]);
  if (error) throw error;
  await classifiedsCall(listingId ? "remove_image" : "remove_avatar", {
    ...(listingId ? { id: listingId } : {}),
    assetId,
  });
}
