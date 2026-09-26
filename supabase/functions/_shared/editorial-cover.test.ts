import { describe, expect, it } from "vitest";
import {
  articleReferencesCover, coverObjectPath, coverPublicUrl, decodeBase64Jpeg, inspectJpeg,
  isAllowedCoverThumbnail, isEditorialCoverUrl,
} from "./editorial-cover";

const A = "0123abcd-0000-4000-8000-00000000abcd";
const F = "fedcba98-1111-4222-8333-444455556666";
const jpeg = (w: number, h: number) => new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
  0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0xff, 0xd9,
]);

describe("capas editoriais com IA", () => {
  it("aceita apenas miniaturas oficiais do vídeo cadastrado", () => {
    const id = "KSp39qV5XOk";
    for (const v of ["maxresdefault", "sddefault", "hqdefault", "mqdefault"]) {
      expect(isAllowedCoverThumbnail(`https://i.ytimg.com/vi/${id}/${v}.jpg`, id)).toBe(true);
    }
    expect(isAllowedCoverThumbnail("https://i.ytimg.com/vi/OTHERVIDEO1/maxresdefault.jpg", id)).toBe(false);
    expect(isAllowedCoverThumbnail(`https://i.ytimg.com/vi/${id}/hq720.jpg`, id)).toBe(false);
    expect(isAllowedCoverThumbnail(`https://evil.com/vi/${id}/maxresdefault.jpg`, id)).toBe(false);
    expect(isAllowedCoverThumbnail(`http://i.ytimg.com/vi/${id}/maxresdefault.jpg`, id)).toBe(false);
    expect(isAllowedCoverThumbnail(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg?x=1`, id)).toBe(false);
  });

  it("valida JPEG estruturalmente e lê dimensões", () => {
    expect(inspectJpeg(jpeg(1280, 720))).toEqual({ width: 1280, height: 720 });
    expect(inspectJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
    expect(inspectJpeg(jpeg(1280, 720).slice(0, -2))).toBeNull();
  });

  it("decodifica base64 respeitando o limite", () => {
    const b64 = btoa(String.fromCharCode(...jpeg(1280, 720)));
    expect(decodeBase64Jpeg(`data:image/jpeg;base64,${b64}`, 1000)?.length).toBe(29);
    expect(decodeBase64Jpeg(b64, 10)).toBeNull();
    expect(decodeBase64Jpeg("não é base64", 1000)).toBeNull();
  });

  it("URL canônica aponta para bike-image e só casa com o arquivo exato", () => {
    const url = coverPublicUrl("https://x.supabase.co/", A, F);
    expect(url).toBe(`https://x.supabase.co/functions/v1/bike-image?type=editorial-cover&id=${A}&file=${F}`);
    expect(coverObjectPath(A, F)).toBe(`${A}/${F}.jpg`);
    expect(articleReferencesCover(url, "https://x.supabase.co", A, F)).toBe(true);
    expect(articleReferencesCover(url, "https://x.supabase.co", A, A)).toBe(false);
    expect(articleReferencesCover(`${url}&x=1`, "https://x.supabase.co", A, F)).toBe(false);
    expect(articleReferencesCover("https://i.ytimg.com/vi/a/maxresdefault.jpg", "https://x.supabase.co", A, F)).toBe(false);
    expect(isEditorialCoverUrl(url)).toBe(true);
    expect(isEditorialCoverUrl("https://i.ytimg.com/vi/KSp39qV5XOk/maxresdefault.jpg")).toBe(false);
    expect(() => coverObjectPath("../x", F)).toThrow();
    expect(() => coverPublicUrl("https://x", A.toUpperCase(), F)).toThrow();
  });
});
