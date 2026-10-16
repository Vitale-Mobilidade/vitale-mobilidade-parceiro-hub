import { previewTheme } from "@/lib/newsletter-theme";
import { useState } from "react";
import type { NewsletterPreview } from "@/lib/newsletter-api";
export function NewsletterPreviewPanel({
  preview,
  onClose,
}: {
  preview: NewsletterPreview;
  onClose: () => void;
}) {
  const [dark, setDark] = useState(false),
    [mobile, setMobile] = useState(false);
  return (
    <section
      id="newsletter-edition-preview"
      className="rounded-xl border bg-white p-5 space-y-3"
      aria-label="Visualização da edição"
    >
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="font-bold">
          {preview.subject ?? "Visualizar newsletter"}
        </h2>
        <button className="underline" onClick={onClose}>
          Fechar visualização
        </button>
      </div>
      <p className="text-sm text-muted-foreground">
        {preview.source === "provider"
          ? "HTML original salvo no Resend · somente leitura."
          : preview.source === "snapshot"
            ? "Prévia reconstituída do conteúdo salvo. O HTML original do provedor não está disponível nesta consulta."
            : "Prévia do conteúdo preparado · nenhum envio será realizado."}
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          className="rounded border px-3 py-2"
          aria-pressed={mobile}
          onClick={() => setMobile(!mobile)}
        >
          {mobile ? "Celular" : "Desktop"}
        </button>
        <button
          className="rounded border px-3 py-2"
          aria-pressed={dark}
          onClick={() => setDark(!dark)}
        >
          {dark ? "Tema escuro" : "Tema claro"}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        A simulação aplica os estilos de tema disponíveis neste HTML. Gmail,
        Apple Mail e Outlook podem tratar as cores de outra forma; esta prévia
        não substitui um teste no aplicativo.
      </p>
      <div
        className="overflow-auto rounded border p-2"
        style={{ background: dark ? "#101814" : "#f1f4ef" }}
      >
        <iframe
          title="HTML da newsletter"
          sandbox=""
          srcDoc={previewTheme(preview.html, dark)}
          className="mx-auto h-[680px] max-w-full border-0"
          style={{
            width: mobile ? 390 : "100%",
            colorScheme: dark ? "dark" : "light",
          }}
        />
      </div>
    </section>
  );
}
