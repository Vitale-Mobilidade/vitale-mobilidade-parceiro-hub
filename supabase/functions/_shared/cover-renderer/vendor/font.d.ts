export class Font {
  constructor(size: number, bytes: Uint8Array);
  free(): void;
  has(char: string): boolean;
  metrics(char: string, size: number): { advance_width: number };
}
export class Layout {
  constructor();
  reset(options: Record<string, unknown>): void;
  append(font: Font, text: string, options: Record<string, unknown>): void;
  rasterize(
    r: number,
    g: number,
    b: number,
  ): { width: number; height: number; buffer: Uint8Array };
  free(): void;
}
