import encode, { init } from "@jsquash/webp/encode";
import wasmUrl from "@jsquash/webp/codec/enc/webp_enc.wasm?url";
import simdWasmUrl from "@jsquash/webp/codec/enc/webp_enc_simd.wasm?url";

// Both WASM variants are bundled on our own origin, never fetched from a CDN.
const ready = init({
  locateFile: (path: string) => (path.includes("simd") ? simdWasmUrl : wasmUrl),
});
const scope = self as unknown as Worker;
scope.onmessage = async (
  event: MessageEvent<{
    width: number;
    height: number;
    pixels: ArrayBuffer;
    quality: number;
  }>,
) => {
  try {
    await ready;
    const { width, height, pixels, quality } = event.data;
    const bytes = await encode(
      new ImageData(new Uint8ClampedArray(pixels), width, height),
      { quality },
    );
    scope.postMessage({ bytes }, [bytes]);
  } catch {
    scope.postMessage({ error: true });
  }
};
