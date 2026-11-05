import { useState } from "react";
import { Share2, Copy, MessageCircle } from "lucide-react";
export function ListingShare({
  id,
  title,
  coverId,
}: {
  id: string;
  title: string;
  coverId?: string;
}) {
  const [status, setStatus] = useState("");
  const url = `https://vitalemobilidade.com/venda-sua-bike/${id}${coverId ? `?foto=${encodeURIComponent(coverId)}` : ""}`;
  const text = `Veja a bike *${title.replace(/[*_~`]/g, "")}* na Vitale Mobilidade: ${url}`;
  const style =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-semibold text-action";
  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error("clipboard_unavailable");
      await navigator.clipboard.writeText(url);
      setStatus("Link copiado.");
    } catch {
      setStatus(
        "Não foi possível copiar automaticamente. Copie o link abaixo.",
      );
    }
  }
  return (
    <div className="mt-4" aria-label="Compartilhar anúncio">
      <div className="flex flex-wrap gap-2">
        <button
          className={style}
          onClick={() => {
            if (navigator.share)
              void navigator
                .share({
                  title,
                  text: `Veja a bike ${title} na Vitale Mobilidade`,
                  url,
                })
                .catch(() => {});
            else void copy();
          }}
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Compartilhar
        </button>
        <a
          className={style}
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          WhatsApp
        </a>
        <button className={style} onClick={() => void copy()}>
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copiar link
        </button>
      </div>
      {status && (
        <p role="status" className="mt-2 text-sm text-action">
          {status}
        </p>
      )}
      {status.startsWith("Não") && (
        <input
          aria-label="Link do anúncio para copiar"
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          className="mt-2 w-full rounded border border-line p-2 text-sm"
        />
      )}
    </div>
  );
}
