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
import {
  memberMetricsSchema,
  type MemberMetrics,
} from "@/lib/admin-classifieds";
import { listingSchema, type BikeListing } from "@/lib/bike-classifieds";
import { formatBRL } from "@/lib/price-tracker";
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
  const [days, setDays] = useState(30),
    [metrics, setMetrics] = useState<MemberMetrics | null>(null),
    [listings, setListings] = useState<BikeListing[]>([]),
    [selected, setSelected] = useState<string>(),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState(false),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    const [m, l] = await Promise.all([
      adminClassifiedsCall("metrics", { days }),
      adminClassifiedsCall("list"),
    ]);
    setMetrics(memberMetricsSchema.parse(m));
    setListings(listingSchema.array().parse(l));
  }, [days]);
  useEffect(() => {
    let active = true;
    void load().catch(() => {
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
  const max = Math.max(1, ...(metrics?.daily.map((d) => d.grossCents) ?? []));
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
          <div hidden={workspace !== "overview"} className="space-y-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-3 text-sm font-semibold">
                Período
                <select
                  aria-label="Período do painel"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="min-h-11 rounded-xl border border-line bg-white px-3"
                >
                  {[7, 30, 90].map((d) => (
                    <option key={d} value={d}>
                      Últimos {d} dias
                    </option>
                  ))}
                </select>
              </label>
              <button
                className={button}
                disabled={busy}
                onClick={() =>
                  void load().catch(() =>
                    setError("Não foi possível atualizar o painel."),
                  )
                }
              >
                Atualizar painel
              </button>
            </div>
            {!metrics ? (
              <p role="status">Carregando acompanhamento…</p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    [
                      "Perfis cadastrados",
                      metrics.members.toLocaleString("pt-BR"),
                      "Total de membros da comunidade",
                    ],
                    [
                      "Anúncios criados",
                      metrics.listings.toLocaleString("pt-BR"),
                      `${metrics.channelListings} do canal · inclui rascunhos e desativados`,
                    ],
                    [
                      "Anúncios ativos",
                      metrics.activeListings.toLocaleString("pt-BR"),
                      "Disponíveis na vitrine agora",
                    ],
                    [
                      "Faturamento confirmado",
                      formatBRL(metrics.grossCents / 100),
                      `Bruto nos últimos ${days} dias`,
                    ],
                  ].map(([label, value, note]) => (
                    <section
                      key={label}
                      className="min-w-0 rounded-2xl border border-line bg-white p-5"
                    >
                      <h2 className="text-sm font-semibold text-muted-foreground">
                        {label}
                      </h2>
                      <p className="mt-2 break-words text-3xl font-bold text-ink">
                        {value}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {note}
                      </p>
                    </section>
                  ))}
                </div>
                <section className="rounded-2xl border border-line bg-white p-5">
                  <h2 className="text-xl font-bold">Faturamento por dia</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Primeira confirmação de cada compra, no horário de São
                    Paulo. Não inclui pagamentos pendentes nem bikes do canal.
                    Valores brutos, antes de taxas e estornos.
                  </p>
                  <div
                    role="img"
                    aria-label={`Faturamento bruto confirmado por dia nos últimos ${days} dias: ${formatBRL(metrics.grossCents / 100)}`}
                    className="mt-5 flex h-28 items-end gap-1 border-b border-line"
                  >
                    {[...metrics.daily].reverse().map((d) => (
                      <div
                        key={d.day}
                        title={`${d.day}: ${formatBRL(d.grossCents / 100)}`}
                        style={{
                          height: `${Math.max(2, (d.grossCents / max) * 100)}%`,
                        }}
                        className={`min-w-0 flex-1 rounded-t ${d.grossCents ? "bg-action" : "bg-surface"}`}
                      />
                    ))}
                  </div>
                  <p className="mt-4 text-sm">
                    Pagamentos com estorno ou contestação registrados:{" "}
                    <strong>{metrics.reversedPayments}</strong>. Este
                    acompanhamento não representa o saldo líquido do Asaas.
                  </p>
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <caption className="sr-only">
                        Cadastro, anúncios e pagamentos por dia
                      </caption>
                      <thead>
                        <tr>
                          {[
                            "Dia",
                            "Novos perfis",
                            "Anúncios criados",
                            "Pagamentos confirmados",
                            "Faturamento bruto",
                          ].map((h) => (
                            <th
                              key={h}
                              className="whitespace-nowrap border-b border-line px-3 py-3"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.daily.map((d) => (
                          <tr key={d.day}>
                            <td className="whitespace-nowrap px-3 py-3">
                              {d.day.split("-").reverse().join("/")}
                            </td>
                            <td className="px-3 py-3">{d.members}</td>
                            <td className="px-3 py-3">{d.listings}</td>
                            <td className="px-3 py-3">{d.payments}</td>
                            <td className="whitespace-nowrap px-3 py-3 font-semibold">
                              {formatBRL(d.grossCents / 100)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Newsletter sem perfil não entra no total de membros. Cada
                    compra é contada uma vez, mesmo com múltiplos eventos de
                    confirmação.
                  </p>
                </section>
              </>
            )}
          </div>
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
