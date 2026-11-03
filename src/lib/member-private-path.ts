export function isMemberPrivatePath(path: string) {
  return ["/conta", "/newsletter/confirmar"].includes(path.replace(/\/+$/, ""));
}
