import {
  MEMBER_IMAGE_MAX_BYTES,
  MEMBER_IMAGE_OUTPUT_MAX_BYTES,
} from "./bike-classifieds";

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
};
async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      /* Some mobile decoders work through Image instead. */
    }
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("image_invalid"));
      image.src = url;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => {
        image.src = "";
        URL.revokeObjectURL(url);
      },
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("image_invalid");
  }
}
function nativeWebp(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 20000);
    try {
      canvas.toBlob(
        (blob) => {
          clearTimeout(timer);
          resolve(blob);
        },
        "image/webp",
        quality,
      );
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}
function workerWebp(
  worker: Worker,
  data: ImageData,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("image_processing_failed")),
      60000,
    );
    worker.onmessage = (event: MessageEvent<{ bytes?: ArrayBuffer }>) => {
      clearTimeout(timer);
      if (!event.data.bytes) reject(new Error("image_processing_failed"));
      else resolve(new Blob([event.data.bytes], { type: "image/webp" }));
    };
    worker.onerror = () => {
      clearTimeout(timer);
      reject(new Error("image_processing_failed"));
    };
    worker.postMessage(
      {
        width: data.width,
        height: data.height,
        pixels: data.data.buffer,
        quality: quality * 100,
      },
      [data.data.buffer],
    );
  });
}
async function validWebp(blob: Blob): Promise<boolean> {
  const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  return (
    blob.type === "image/webp" &&
    blob.size > 12 &&
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  );
}
/** Originals stay local. Persist only bounded, recoded WebP without original EXIF. */
export async function prepareMemberImage(
  file: File,
  avatar = false,
): Promise<Blob> {
  if (file.size > MEMBER_IMAGE_MAX_BYTES)
    throw new Error("image_input_too_large");
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    !file.size
  )
    throw new Error("image_invalid");
  const decoded = await decodeImage(file);
  const canvas = document.createElement("canvas");
  let worker: Worker | undefined;
  let useNative = true;
  try {
    if (
      !decoded.width ||
      !decoded.height ||
      decoded.width * decoded.height > 60000000
    )
      throw new Error("image_invalid");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("image_processing_failed");
    for (const [edge, quality] of [
      [1600, 0.82],
      [1600, 0.65],
      [1280, 0.72],
      [1024, 0.7],
    ]) {
      const scale = Math.min(1, edge / Math.max(decoded.width, decoded.height));
      canvas.width = avatar
        ? 320
        : Math.max(1, Math.round(decoded.width * scale));
      canvas.height = avatar
        ? 320
        : Math.max(1, Math.round(decoded.height * scale));
      if (avatar) {
        const side = Math.min(decoded.width, decoded.height);
        context.drawImage(
          decoded.source,
          (decoded.width - side) / 2,
          (decoded.height - side) / 2,
          side,
          side,
          0,
          0,
          320,
          320,
        );
      } else
        context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
      let blob = useNative ? await nativeWebp(canvas, quality) : null;
      if (!blob || !(await validWebp(blob))) {
        useNative = false;
        worker ??= new Worker(
          new URL("./member-image-worker.ts", import.meta.url),
          { type: "module" },
        );
        blob = await workerWebp(
          worker,
          context.getImageData(0, 0, canvas.width, canvas.height),
          quality,
        );
      }
      if (!(await validWebp(blob))) throw new Error("image_processing_failed");
      if (blob.size <= MEMBER_IMAGE_OUTPUT_MAX_BYTES) return blob;
    }
    throw new Error("image_processing_failed");
  } catch (error) {
    if (error instanceof Error && error.message === "image_invalid")
      throw error;
    throw new Error("image_processing_failed");
  } finally {
    worker?.terminate();
    canvas.width = canvas.height = 0;
    decoded.close();
  }
}
