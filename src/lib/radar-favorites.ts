import { z } from "zod";

export const favoriteBikeIdSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9_-]{0,63}$/);
export const radarFavoritesSchema = z.array(favoriteBikeIdSchema);
const intentSchema = z.object({
  bikeId: favoriteBikeIdSchema,
  expiresAt: z.number(),
});
const INTENT_KEY = "vitale-radar-favorite-intent";
const INTENT_TTL = 15 * 60 * 1000;

/** This is a short-lived explicit click, never an instruction taken from a URL. */
export function rememberFavoriteIntent(
  storage: Storage,
  bikeId: string,
  now = Date.now(),
) {
  try {
    storage.setItem(
      INTENT_KEY,
      JSON.stringify({
        bikeId: favoriteBikeIdSchema.parse(bikeId),
        expiresAt: now + INTENT_TTL,
      }),
    );
  } catch {
    /* Login remains available when storage is blocked. */
  }
}
export function readFavoriteIntent(
  storage: Storage,
  now = Date.now(),
): string | null {
  try {
    const value = storage.getItem(INTENT_KEY);
    const intent = intentSchema.safeParse(JSON.parse(value ?? "null"));
    return intent.success &&
      intent.data.expiresAt > now &&
      intent.data.expiresAt <= now + INTENT_TTL
      ? intent.data.bikeId
      : null;
  } catch {
    return null;
  }
}

export function clearFavoriteIntent(storage: Storage) {
  try {
    storage.removeItem(INTENT_KEY);
  } catch {
    /* Blocked storage. */
  }
}
