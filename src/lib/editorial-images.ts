import manifest from "./editorial-images-manifest.json";

/** Exact immutable-source lookup. A new image falls back to its original until variants are generated. */
export function editorialImageProps(url: string, sizes: string) {
  const image = (
    manifest as Record<string, { key: string; width: number; height: number }>
  )[url];
  if (!image) return { src: url, sizes };
  return {
    src: `/editorial/${image.key}-768.webp`,
    srcSet: [480, 768, 1280]
      .filter(
        (width, index, widths) =>
          index === 0 ||
          Math.min(width, image.width) !==
            Math.min(widths[index - 1], image.width),
      )
      .map(
        (width) =>
          `/editorial/${image.key}-${width}.webp ${Math.min(width, image.width)}w`,
      )
      .join(", "),
    sizes,
  };
}
