import { expect, it, vi } from "vitest";
import { jpegWidth, newsletterVideoImage } from "./newsletter-images.server";
function jpeg(width: number) {
  return new Uint8Array([
    255,
    216,
    255,
    192,
    0,
    17,
    8,
    2,
    208,
    width >> 8,
    width & 255,
    3,
    1,
    17,
    0,
    2,
    17,
    1,
    3,
    17,
    1,
  ]);
}
it("uses 1280px originals for email instead of catalog 320px thumbnails", async () => {
  expect(jpegWidth(jpeg(1280))).toBe(1280);
  const request = vi.fn(
    async () =>
      new Response(jpeg(1280), { headers: { "content-type": "image/jpeg" } }),
  );
  expect(
    await newsletterVideoImage("GBLPS1ShiYA", "small.jpg", request),
  ).toContain("maxresdefault.jpg");
});
it("rejects 120px placeholder even with HTTP200, then tries a real larger thumbnail", async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(jpeg(120), { headers: { "content-type": "image/jpeg" } }),
    )
    .mockResolvedValueOnce(
      new Response(jpeg(640), { headers: { "content-type": "image/jpeg" } }),
    );
  expect(
    await newsletterVideoImage("Wq5RjlPrZRI", "small.jpg", request),
  ).toContain("sddefault.jpg");
});
it("image provider failure never blocks delivery or permits arbitrary host probing", async () => {
  const request = vi.fn().mockRejectedValue(new Error("offline"));
  expect(
    await newsletterVideoImage("abcdefghijk", "original.jpg", request),
  ).toBe("original.jpg");
  request.mockClear();
  expect(
    await newsletterVideoImage(
      "https://private.invalid",
      "original.jpg",
      request,
    ),
  ).toBe("original.jpg");
  expect(request).not.toHaveBeenCalled();
});
