import { describe, expect, it } from "vitest";
import {
  readFavoriteIntent,
  clearFavoriteIntent,
  rememberFavoriteIntent,
  radarFavoritesSchema,
} from "./radar-favorites";
function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => values.set(k, v),
    removeItem: (k: string) => values.delete(k),
    clear: () => values.clear(),
    key: () => null,
    get length() {
      return values.size;
    },
  } satisfies Storage;
}
describe("favorite login intent", () => {
  it("keeps an explicit click until completion and expires after 15 minutes", () => {
    const s = storage();
    rememberFavoriteIntent(s, "v9_max", 1000);
    expect(readFavoriteIntent(s, 2000)).toBe("v9_max");
    // Reading must survive a remount while the server write is still pending.
    expect(readFavoriteIntent(s, 2001)).toBe("v9_max");
    clearFavoriteIntent(s);
    expect(readFavoriteIntent(s, 2002)).toBeNull();
    rememberFavoriteIntent(s, "v9_max", 1000);
    expect(readFavoriteIntent(s, 901000)).toBeNull();
  });
  it("ignores malformed, invalid and future-dated intents and blocked storage", () => {
    const s = storage();
    for (const value of [
      "bad json",
      JSON.stringify({ bikeId: "https://evil.invalid", expiresAt: 2000 }),
      JSON.stringify({ bikeId: "v9_max", expiresAt: 9999999 }),
    ]) {
      s.setItem("vitale-radar-favorite-intent", value);
      expect(readFavoriteIntent(s, 1000)).toBeNull();
    }
    const blocked = {
      ...s,
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() => rememberFavoriteIntent(blocked, "v9_max")).not.toThrow();
    expect(readFavoriteIntent(blocked)).toBeNull();
  });
  it("validates the private response without accepting user or contact fields", () => {
    expect(radarFavoritesSchema.parse(["v9_max", "v8_pro"])).toEqual([
      "v9_max",
      "v8_pro",
    ]);
    expect(
      radarFavoritesSchema.safeParse([{ bike_id: "v9_max", user_id: "other" }])
        .success,
    ).toBe(false);
  });
});
