import { useCallback, useEffect, useState } from "react";
import { CommunityDirectory } from "@/components/admin/CommunityDirectory";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  ListingDashboard,
  type ListingAction,
} from "@/components/classifieds/ListingDashboard";
import { ListingEditor } from "@/components/classifieds/MemberListings";
import {
  adminClassifiedsCall,
  uploadChannelImage,
  removeChannelImage,
} from "@/lib/admin-classifieds-api";
import { CommunityMetrics } from "@/components/admin/CommunityMetrics";
import { listingSchema, type BikeListing } from "@/lib/bike-classifieds";
const button =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-action px-4 py-2 font-semibold text-white disabled:opacity-50";
function ChannelPublication({
  listing,
  ready,
  locked,
  submit,
}: {
  listing: BikeListing;
  ready: boolean;
  locked: boolean;
  submit: (phone: string) => Promise<void>;
}) {
  const [phone, setPhone] = useState(listing.channelWhatsapp ?? "");
  const [accepted, setAccepted] = useState(false);
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.length === 11 ? `55${digits}` : digits;
  const valid = /^55[1-9][0-9]9[0-9]{8}$/.test(normalized);
  return (
    <div className="mt-5 rounded-xl border border-line bg-surface p-5">
      <h4 className="text-xl font-bold">Publicar bike do canal</h4>
      <p className="mt-2 text-sm text-muted-foreground">
        O anúncio aparece como Vitale Mobilidade por 90 dias. Publicação
        institucional, sem cobrança nem cadastro na comunidade.
      </p>
      <label className="mt-5 block font-semibold" htmlFor="channel-whatsapp">
        WhatsApp da Vitale para este anúncio
      </label>
      <input
        id="channel-whatsapp"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        disabled={locked}
        placeholder="(11) 99999-9999"
        maxLength={20}
        aria-describedby="channel-contact-help"
        className="mt-2 min-h-12 w-full rounded-xl border border-line bg-white px-4"
      />
      <p
        id="channel-contact-help"
        className="mt-2 text-sm text-muted-foreground"
      >
        {phone.length}/20 caracteres. Informe 11 dígitos (DDD + celular), ou 13
        com o código 55. O botão do anúncio abre uma conversa neste WhatsApp,
        com o título e o link da bike.
      </p>
      {phone && !valid && (
        <p role="alert" className="mt-2 text-sm text-red-800">
          Confira o DDD e os nove dígitos do celular.
        </p>
      )}
      <label className="mt-5 flex gap-3 text-sm">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          disabled={locked}
          className="mt-1 h-5 w-5 shrink-0"
        />
        Confirmo as informações e fotos da bike do canal e autorizo divulgar
        este WhatsApp da Vitale para receber contatos.
      </label>
      {!ready && (
        <p className="mt-3 text-sm">
          Complete a ficha e adicione ao menos uma foto antes de publicar.
        </p>
      )}
      <button
        disabled={locked || !ready || !valid || !accepted}
        className={`${button} mt-5 w-full sm:ml-auto sm:flex sm:w-auto`}
        onClick={() => void submit(normalized)}
      >
        Publicar bike do canal
      </button>
    </div>
  );
}
function CommunityWorkspace() {
  const [workspace, setWorkspace] = useState("overview");
  const [metricsRefresh, setMetricsRefresh] = useState(0),
    [listings, setListings] = useState<BikeListing[]>([]),
    [selected, setSelected] = useState<string>(),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState(false),
    [error, setError] = useState("");
  const load = useCallback(async (refreshMetrics = true) => {
    const l = await adminClassifiedsCall("list");
    setListings(listingSchema.array().parse(l));
    if (refreshMetrics) setMetricsRefresh((n) => n + 1);
  }, []);
  useEffect(() => {
    let active = true;
    void load(false).catch(() => {
      if (active)
        setError("Não foi possível carregar o painel. Tente novamente.");
    });
    return () => {
      active = false;
    };
  }, [load]);
  async function create() {
    setBusy(true);
    setError("");
    try {
      const l = listingSchema.parse(await adminClassifiedsCall("create"));
      await load();
      setSelected(l.id);
    } catch {
      setError("Não foi possível criar a bike do canal. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  async function manage(action: ListingAction, l: BikeListing, edit = false) {
    setBusy(true);
    setError("");
    try {
      await adminClassifiedsCall(action, { id: l.id });
      await load();
      if (edit) setSelected(l.id);
    } catch {
      setError("Não foi possível atualizar o anúncio. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  const listing = listings.find((l) => l.id === selected);
  return (
    <div className="min-w-0 space-y-7 p-4 sm:p-7">
      <div>
        <p className="text-sm font-semibold text-action">
          Vitale Mobilidade · Admin
        </p>
        <h1 className="mt-2 text-3xl font-bold">Comunidade e anúncios</h1>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-900">
          {error}
          <button
            className="ml-3 underline"
            onClick={() => {
              setError("");
              void load().catch(() =>
                setError("Não foi possível carregar o painel."),
              );
            }}
          >
            Tentar novamente
          </button>
        </p>
      )}
      {listing ? (
        <>
          <button
            className="min-h-11 font-semibold text-action underline"
            disabled={busy}
            onClick={() => {
              if (
                !editing ||
                window.confirm(
                  "Voltar sem salvar os campos alterados? As fotos e o rascunho salvo serão preservados.",
                )
              ) {
                setSelected(undefined);
                setEditing(false);
              }
            }}
          >
            Voltar ao painel
          </button>
          <ListingEditor
            key={listing.id}
            listing={listing}
            channel
            canPublish
            onChange={load}
            onEditing={setEditing}
            onBusy={setBusy}
            actions={{
              call: adminClassifiedsCall,
              upload: uploadChannelImage,
              remove: removeChannelImage,
              publication: (state) => (
                <ChannelPublication
                  key={listing.id}
                  listing={listing}
                  {...state}
                />
              ),
            }}
          />
        </>
      ) : (
        <>
          <div
            role="group"
            aria-label="Áreas da comunidade"
            className="flex flex-wrap gap-2"
          >
            {[
              ["overview", "Visão geral"],
              ["directory", "Usuários e anúncios"],
              ["channel", "Bikes do canal"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={workspace === key}
                onClick={() => setWorkspace(key)}
                className={`min-h-11 rounded-xl px-4 py-2 font-semibold ${workspace === key ? "bg-ink text-white" : "border border-line bg-white text-action"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {workspace === "overview" && (
            <CommunityMetrics refreshKey={metricsRefresh} />
          )}
          {workspace === "directory" && <CommunityDirectory onChanged={load} />}
          <section
            hidden={workspace !== "channel"}
            className="border-t border-line pt-7"
          >
            <ListingDashboard
              channel
              listings={listings}
              busy={busy}
              onCreate={() => void create()}
              onEdit={(l) => {
                if (l.status !== "draft") void manage("withdraw", l, true);
                else setSelected(l.id);
              }}
              onAction={manage}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              Até 200 bikes do canal mais recentes. Publicação pelo Admin, sem
              perfil da comunidade.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
export default function AdminCommunity() {
  return (
    <AdminShell>
      {(role) =>
        role === "admin" ? (
          <CommunityWorkspace />
        ) : (
          <p role="alert" className="p-7">
            Esta área é exclusiva de administradores.
          </p>
        )
      }
    </AdminShell>
  );
}
