import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { validOffersGroupUrl } from "@/lib/offers-group";
import {
  offersGroupAdminCall,
  type OffersGroup,
  type OffersGroupAction,
} from "@/lib/offers-group-admin";
const KEY = ["admin", "offers-group-catalog"];
const BUTTON =
  "rounded-lg border border-line px-4 py-2.5 text-sm font-semibold disabled:opacity-50";
function SettingsForm() {
  const client = useQueryClient();
  const [editing, setEditing] = useState<
    (Partial<OffersGroup> & { revision: number }) | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: KEY,
    queryFn: () => offersGroupAdminCall({ p_action: "get" }),
  });
  const unavailable = busy || !query.data || query.isError || query.isFetching;
  async function mutate(action: OffersGroupAction) {
    if (unavailable || !query.data) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await offersGroupAdminCall({
        ...action,
        p_revision: action.p_revision ?? query.data.revision,
      });
      client.setQueryData(KEY, data);
      setEditing(null);
      setMessage(
        action.p_action === "activate"
          ? "Redirecionamento atualizado para o grupo selecionado."
          : "Grupo salvo.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  function save(event: FormEvent) {
    event.preventDefault();
    if (!editing?.name?.trim() || !validOffersGroupUrl(editing.url?.trim())) {
      setError("Informe o nome e um convite válido de chat.whatsapp.com.");
      return;
    }
    void mutate({
      p_action: "save",
      p_revision: editing.revision,
      p_group_id: editing.id,
      p_name: editing.name.trim(),
      p_url: editing.url.trim(),
    });
  }
  return (
    <section className="max-w-3xl rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Grupos de ofertas</h1>
        <button
          className={BUTTON}
          disabled={unavailable || !!editing}
          onClick={() => {
            setEditing({ name: "", url: "", revision: query.data!.revision });
            setError("");
            setMessage("");
          }}
        >
          Adicionar grupo
        </button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Selecione qual grupo recebe quem acessa{" "}
        <a
          className="underline"
          href="/grupodeofertas"
          target="_blank"
          rel="noopener noreferrer"
        >
          vitalemobilidade.com/grupodeofertas
        </a>
        . Os botões do site acompanham essa seleção.
      </p>
      {query.isPending && (
        <p role="status" className="mt-4">
          Carregando grupos…
        </p>
      )}
      {query.isError && (
        <p role="alert" className="mt-4">
          Não foi possível carregar os grupos. Recarregue para tentar novamente.
        </p>
      )}
      {query.data && (
        <ul className="mt-5 space-y-3" aria-label="Grupos cadastrados">
          {query.data.groups.map((group) => {
            const active = group.id === query.data.activeGroupId;
            return (
              <li
                key={group.id}
                className={`rounded-xl border p-4 ${active ? "border-emerald-500 bg-emerald-50" : "border-line"}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{group.name}</h2>
                  {active && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
                      Ativo no redirecionamento
                    </span>
                  )}
                </div>
                <a
                  className="mt-2 block break-all text-sm underline"
                  href={group.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {group.url}
                </a>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className={BUTTON}
                    disabled={unavailable || !!editing || active}
                    onClick={() =>
                      void mutate({
                        p_action: "activate",
                        p_group_id: group.id,
                      })
                    }
                    aria-label={`Usar ${group.name} no redirecionamento`}
                  >
                    {active ? "Grupo selecionado" : "Usar no redirecionamento"}
                  </button>
                  <button
                    className={BUTTON}
                    disabled={unavailable || !!editing}
                    onClick={() => {
                      setEditing({ ...group, revision: query.data!.revision });
                      setError("");
                      setMessage("");
                    }}
                    aria-label={`Editar ${group.name}`}
                  >
                    Editar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {editing && (
        <form
          onSubmit={save}
          className="mt-5 space-y-3 rounded-xl border border-line p-4"
        >
          <h2 className="font-semibold">
            {editing.id ? "Editar grupo" : "Adicionar grupo"}
          </h2>
          <label
            htmlFor="offers-group-name"
            className="block text-sm font-semibold"
          >
            Nome do grupo
          </label>
          <input
            id="offers-group-name"
            autoFocus
            required
            maxLength={80}
            disabled={unavailable}
            value={editing.name ?? ""}
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            className="w-full rounded-lg border border-line px-3 py-2.5"
          />
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
            disabled={unavailable}
            value={editing.url ?? ""}
            onChange={(e) => setEditing({ ...editing, url: e.target.value })}
            aria-describedby="offers-group-help"
            className="w-full rounded-lg border border-line px-3 py-2.5"
          />
          <p id="offers-group-help" className="text-sm text-muted-foreground">
            Cole o convite de https://chat.whatsapp.com/.{" "}
            {editing.id === query.data?.activeGroupId
              ? "Este grupo está ativo: salvar altera o destino do redirecionamento."
              : "Salvar este grupo mantém o redirecionamento atual."}
          </p>
          <div className="flex gap-3">
            <button
              className={BUTTON + " bg-emerald-700 text-white"}
              disabled={
                unavailable ||
                !editing.name?.trim() ||
                !validOffersGroupUrl(editing.url?.trim())
              }
            >
              {busy ? "Salvando…" : "Salvar grupo"}
            </button>
            <button
              type="button"
              className={BUTTON}
              disabled={busy}
              onClick={() => setEditing(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-4 text-red-800">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-4 text-emerald-800">
          {message}
        </p>
      )}
      <button
        className={BUTTON + " mt-4"}
        disabled={busy || query.isFetching}
        onClick={() => {
          setEditing(null);
          setError("");
          setMessage("");
          void query.refetch();
        }}
      >
        Recarregar grupos
      </button>
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
            Somente administradores podem gerenciar os grupos de ofertas.
          </p>
        )
      }
    </AdminShell>
  );
}
