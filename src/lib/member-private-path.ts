export function isMemberPrivatePath(path: string) {
  const normalized = path.replace(/\/+$/, "");
  return (
    normalized === "/conta" ||
    normalized.startsWith("/conta/") ||
    normalized === "/newsletter/confirmar"
  );
}
