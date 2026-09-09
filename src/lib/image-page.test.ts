import { describe, expect, it } from "vitest";
import {
  extractPageImage,
  looksLikePageUrl,
} from "../../supabase/functions/_shared/image-page";

describe("imagem a partir da página do produto", () => {
  it("prioriza og:image e decodifica entidades", () => {
    const html = `
      <meta property="twitter:image" content="https://http2.mlstatic.com/twitter.jpg">
      <meta property="og:image" content="https://http2.mlstatic.com/foto.jpg?a=1&amp;b=2">
    `;
    expect(extractPageImage(html)).toBe("https://http2.mlstatic.com/foto.jpg?a=1&b=2");
  });

  it("cai para twitter:image e depois para JSON-LD", () => {
    const twitter = `<meta name="twitter:image" content="https://http2.mlstatic.com/tw.jpg">`;
    expect(extractPageImage(twitter)).toBe("https://http2.mlstatic.com/tw.jpg");

    const jsonLd = `<script type="application/ld+json">
      {"@type":"Product","image":["https://http2.mlstatic.com/ld.jpg"]}
    </script>`;
    expect(extractPageImage(jsonLd)).toBe("https://http2.mlstatic.com/ld.jpg");
  });

  it("rejeita origens hostis e protocolos inseguros", () => {
    expect(extractPageImage(`<meta property="og:image" content="http://cdn.exemplo.com/a.jpg">`)).toBeNull();
    expect(extractPageImage(`<meta property="og:image" content="https://localhost/a.jpg">`)).toBeNull();
    expect(extractPageImage(`<meta property="og:image" content="https://127.0.0.1/a.jpg">`)).toBeNull();
    expect(extractPageImage(`<meta property="og:image" content="javascript:alert(1)">`)).toBeNull();
    expect(extractPageImage("")).toBeNull();
    expect(extractPageImage("<html><body>sem imagem</body></html>")).toBeNull();
  });

  it("identifica links de página (sem extensão de imagem)", () => {
    expect(looksLikePageUrl("https://meli.la/2gjJctS")).toBe(true);
    expect(looksLikePageUrl("https://http2.mlstatic.com/foto.jpg")).toBe(false);
    expect(looksLikePageUrl("https://http2.mlstatic.com/foto.webp?v=2")).toBe(false);
    expect(looksLikePageUrl("")).toBe(false);
  });
});
