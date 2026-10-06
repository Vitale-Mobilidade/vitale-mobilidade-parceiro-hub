import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { syncAdmin, type AdminSyncResult } from "@/lib/admin-sync";

export function AdminSyncButton() {
  const client = useQueryClient();
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [result, setResult] = useState<AdminSyncResult | null>(null);
  async function synchronize() {
    if (running.current) return;
    running.current = true; setBusy(true); setResult(null);
    try {
      setResult(await syncAdmin(setStep, videos => client.setQueryData(["admin", "video-catalog"], videos)));
    } finally {
      // Refresh protected data, but preserve the freshly read, uncached sheet response.
      try { await client.invalidateQueries({ predicate: query => query.queryKey[0] === "admin" && query.queryKey[1] !== "video-catalog" }); }
      finally {
      window.dispatchEvent(new Event("vitale-admin-synced"));
      running.current = false; setBusy(false); setStep("");
      }
    }
  }
  return <div className="relative">
    <button type="button" onClick={() => void synchronize()} disabled={busy} aria-busy={busy}
      className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
      {busy ? "Sincronizando…" : "Sincronizar tudo"}
    </button>
    {(step || result) && <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-line bg-white p-4 text-sm text-foreground shadow-lg" role={result?.errors.length ? "alert" : "status"} aria-live="polite">
      {step && <p>{step}</p>}
      {result && <><p>Bikes: {result.bikes}</p><p className="mt-1">Vídeos: {result.videos}</p><p className="mt-1">{result.article}</p>
        {result.errors.map((error, i) => <p key={i} className="mt-2 text-red-800">{error}</p>)}
        <button type="button" onClick={() => setResult(null)} className="mt-3 font-semibold text-emerald-800 underline">Fechar</button></>}
    </div>}
  </div>;
}
