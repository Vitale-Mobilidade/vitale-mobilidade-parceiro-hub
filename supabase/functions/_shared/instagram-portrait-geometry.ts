/** Keep every source pixel in the foreground; surrounding canvas only extends the scene softly. */
export function instagramWholePhoto(width: number, height: number) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1
  )
    throw Error("invalid_original_dimensions");
  const scale = Math.min(1080 / width, 1020 / height);
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  return {
    w,
    h,
    left: Math.floor((1080 - w) / 2),
    top: Math.round((1110 - h) * 0.43),
  };
}
