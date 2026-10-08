/** SSR: destinos externos abrem em outra aba; navegação interna permanece local. */
export function externalLinkProps(href?: string) {
  if (!href) return {};
  try {
    const url = new URL(href, "https://vitalemobilidade.com");
    if (["http:", "https:"].includes(url.protocol) && !["vitalemobilidade.com", "www.vitalemobilidade.com"].includes(url.hostname)) {
      return { target: "_blank", rel: "noopener noreferrer" } as const;
    }
  } catch { /* URL inválida não ganha comportamento externo. */ }
  return {};
}
