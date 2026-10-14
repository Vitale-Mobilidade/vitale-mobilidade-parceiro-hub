import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  validOffersGroupUrl,
  type OffersGroupSettings,
} from "@/lib/offers-group";

// New migration contract; intentionally isolated until generated database types are refreshed.
const settingsDb = supabase as unknown as SupabaseClient;
function SettingsForm() {
  const client = useQueryClient();
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["admin", "offers-group"],
    queryFn: async () => {
      const { data, error } = await settingsDb
        .from("offers_group_settings")
        .select("url, revision")
        .eq("id", true)
        .single();
      if (error || !validOffersGroupUrl(data?.url))
        throw new Error(
          "Não foi possível carregar o convite. Tente recarregar.",
        );
      return data as OffersGroupSettings;
    },
  });
  const value = draft ?? query.data?.url ?? "";
  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!query.data || !validOffersGroupUrl(value.trim())) {
      setError("Informe um convite válido de https://chat.whatsapp.com/.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await settingsDb.rpc("update_offers_group_url", {
        p_url: value.trim(),
        p_revision: query.data.revision,
      });
      if (error) throw new Error(error.message);
      if (!validOffersGroupUrl(data?.url))
        throw new Error(
          "Resposta inválida ao salvar. Recarregue para conferir.",
        );
      client.setQueryData(["admin", "offers-group"], data);
      setDraft(null);
      setMessage(
        "Convite salvo. A página /grupodeofertas já usa este destino.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="max-w-3xl rounded-2xl border border-line bg-white p-5 shadow-sm">
      <h1 className="text-2xl font-bold">Grupo de ofertas</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Altere o destino de{" "}
        <a
          className="underline"
          href="/grupodeofertas"
          target="_blank"
          rel="noopener noreferrer"
        >
          vitalemobilidade.com/grupodeofertas
        </a>
        . Os botões do site acompanham este convite.
      </p>
      {query.isPending && (
        <p role="status" className="mt-4">
          Carregando convite…
        </p>
      )}
      {query.isError && (
        <p role="alert" className="mt-4">
          Não foi possível carregar o convite.
        </p>
      )}
      <form onSubmit={save} className="mt-5 space-y-4">
        <label
          htmlFor="offers-group-url"
          className="block text-sm font-semibold"
        >
          Convite do WhatsApp
        </label>
        <input
          id="offers-group-url"
          type="url"
          required
          disabled={busy || !query.data || query.isError}
          value={value}
          onChange={(e) => {
            setDraft(e.target.value);
            setMessage("");
          }}
          aria-describedby="offers-group-help"
          className="w-full rounded-lg border border-line px-3 py-2.5"
        />
        <p id="offers-group-help" className="text-sm text-muted-foreground">
          Cole o link de convite de chat.whatsapp.com. Não aceita encurtadores
          ou outros domínios.
        </p>
        {query.data && (
          <p className="break-all text-sm">
            Destino salvo:{" "}
            <a
              className="underline"
              href={query.data.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {query.data.url}
            </a>
          </p>
        )}
        {error && (
          <p role="alert" className="text-red-800">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-emerald-800">
            {message}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            disabled={
              busy ||
              !query.data ||
              query.isError ||
              !validOffersGroupUrl(value.trim()) ||
              value.trim() === query.data.url
            }
            className="rounded-lg bg-emerald-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Salvando…" : "Salvar convite"}
          </button>
          <button
            type="button"
            disabled={busy || query.isFetching}
            onClick={() => {
              setDraft(null);
              setError("");
              setMessage("");
              void query.refetch();
            }}
            className="rounded-lg border border-line px-4 py-2.5"
          >
            Recarregar
          </button>
        </div>
      </form>
    </section>
  );
}
export default function AdminOffersGroup() {
  return (
    <AdminShell>
      {(role) =>
        role === "admin" ? (
          <SettingsForm />
        ) : (
          <p role="alert">
            Somente administradores podem gerenciar o grupo de ofertas.
          </p>
        )
      }
    </AdminShell>
  );
}
