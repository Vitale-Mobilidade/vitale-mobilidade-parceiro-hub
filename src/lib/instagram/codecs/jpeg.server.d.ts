export function decode(
  bytes: Uint8Array,
  width: number,
  height: number,
): { width: number; height: number; format: number; buffer: Uint8Array };
export function encode(
  bytes: Uint8Array,
  width: number,
  height: number,
  quality: number,
): Uint8Array;
