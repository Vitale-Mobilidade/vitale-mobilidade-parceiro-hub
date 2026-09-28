/** Optional for older callers; [] explicitly opts out of automatic bike detection. */
export function parseCreationBikeIds(input: unknown, known: Set<string>): string[] | undefined {
  if (input === undefined) return undefined;
  if (!Array.isArray(input) || input.length > 7 || input.some((id) => typeof id !== "string" || !known.has(id))) {
    throw new Error("Escolha até 7 bikes válidas do catálogo.");
  }
  return [...new Set(input)] as string[];
}
