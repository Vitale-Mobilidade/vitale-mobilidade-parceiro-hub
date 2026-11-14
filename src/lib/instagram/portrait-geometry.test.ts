import { describe, expect, it } from "vitest";
import { instagramWholePhoto } from "../../../supabase/functions/_shared/instagram-portrait-geometry";
describe("uncropped Instagram photograph", () => {
  it.each([
    [1920, 1080],
    [1080, 1920],
    [1000, 1000],
    [4, 1],
  ])("fits %ix%i without removing edges", (width, height) => {
    const frame = instagramWholePhoto(width, height);
    expect(frame.left).toBeGreaterThanOrEqual(0);
    expect(frame.top).toBeGreaterThan(0);
    expect(frame.left + frame.w).toBeLessThanOrEqual(1080);
    expect(frame.top + frame.h).toBeLessThan(1350);
    expect(Math.abs(frame.h - (frame.w * height) / width)).toBeLessThan(2);
  });
});
