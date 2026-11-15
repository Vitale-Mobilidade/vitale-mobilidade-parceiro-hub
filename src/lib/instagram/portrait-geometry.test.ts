import { describe, expect, it } from "vitest";
import { composeNativeInstagramCover } from "../../../supabase/functions/_shared/cover-renderer/index";
import { encode } from "../../../supabase/functions/_shared/cover-renderer/vendor/jpeg.js";
import { inspectJpeg } from "../../../supabase/functions/_shared/editorial-cover";

const photo = (width: number, height: number) => ({
  bytes: encode(new Uint8Array(width * height * 4).fill(255), width, height, 88),
  mime: "image/jpeg" as const,
});

describe("native Instagram photograph", () => {
  it.each([[192, 108], [100, 100], [400, 100]])("blocks %ix%i without verified crop evidence", async (width, height) => {
    await expect(composeNativeInstagramCover(photo(width, height), "Teste")).rejects.toThrow("instagram_framing_review_required");
  });
  it.each([[80, 100], [232, 288]])("accepts native or provider-rounded 4:5 %ix%i", async (width, height) => {
    const result = await composeNativeInstagramCover(photo(width, height), "Teste");
    expect(inspectJpeg(result.bytes)).toEqual({ width: 1080, height: 1350 });
  });
  it("rejects normalization beyond one percent", async () => {
    await expect(composeNativeInstagramCover(photo(82, 100), "Teste")).rejects.toThrow("instagram_framing_review_required");
  });
});
