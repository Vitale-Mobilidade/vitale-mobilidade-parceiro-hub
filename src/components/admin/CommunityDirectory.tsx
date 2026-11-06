import { useEffect, useRef, useState, type FormEvent } from "react";
import { adminClassifiedsCall } from "@/lib/admin-classifieds-api";
import {
  adminMemberDetailSchema,
  adminMembersResultSchema,
  adminListingsResultSchema,
  type AdminMemberDetail,
  type AdminMember,
  type AdminListing,
} from "@/lib/admin-classifieds";
import { LISTING_STATUSES } from "@/lib/bike-classifieds";
import { formatBRL } from "@/lib/price-tracker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
const button =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-action px-4 py-2 font-semibold text-white disabled:opacity-50";
const secondary =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-line px-4 py-2 font-semibold text-action disabled:opacity-50";
const field =
  "mt-2 min-h-12 w-full rounded-xl border border-line bg-white px-3 py-2";
const date = (v: string | null | undefined) =>
  v
    ? new Date(v).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
    : "Ainda não iniciado";
function ListingInfo({
  listing: l,
  onMember,
}: {
  listing: AdminListing;
  onMember: (id: string) => void;
}) {
  const cover = l.images.find((a) => a.status === "ready");
  return (
    <article className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface sm:w-36">
          {cover?.url ? (
            <img
              src={cover.url}
              alt={l.title}
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-sm text-muted-foreground">
              Sem foto de capa
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="break-words text-lg font-bold">{l.title}</h3>
            <span className="rounded-full bg-surface px-3 py-1 text-sm">
              {LISTING_STATUSES[l.status]}
            </span>
          </div>
          <p className="mt-1 font-bold text-action">
            {formatBRL(l.priceCents / 100)}
          </p>
          <p className="mt-1 text-sm">
            {[l.brand, l.model, l.city, l.state].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-2 text-sm">
            {l.sellerType === "channel" ? (
              "Vitale Mobilidade · bike do canal"
            ) : l.owner ? (
              <button
                className="min-h-11 text-action underline"
                onClick={() => onMember(l.owner!.id)}
              >
                Ver usuário: {l.owner.name}
              </button>
            ) : (
              "Usuário indisponível"
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            Criado em {date(l.createdAt)} ·{" "}
            {l.feeStatus === "courtesy"
              ? "Cortesia"
              : l.sellerType === "channel"
                ? "Institucional"
                : l.entitled
                  ? "Período pago"
                  : "Sem período vigente"}
            {l.displayExpiresAt
              ? ` · Exibição até ${date(l.displayExpiresAt)}`
              : ""}
          </p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-surface p-3 text-sm">
        {[
          ["Exibições", l.metrics?.impressions ?? 0],
          ["Visitas", l.metrics?.visits ?? 0],
          ["WhatsApp", l.metrics?.whatsappClicks ?? 0],
        ].map(([label, n]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className="mt-1 text-xl font-bold">{n}</dd>
          </div>
        ))}
      </dl>
      <details className="mt-3">
        <summary className="min-h-11 cursor-pointer py-3 font-semibold text-action">
          Informações do anúncio
        </summary>
        <p className="whitespace-pre-wrap break-words text-sm">
          {l.description || "Descrição ainda não preenchida."}
        </p>
        {l.maintenance && (
          <p className="mt-3 whitespace-pre-wrap break-words text-sm">
            Manutenção e observações: {l.maintenance}
          </p>
        )}
        <p className="mt-3 text-sm">
          Quilometragem: {l.mileageKm ?? "Não informada"} km · Ano:{" "}
          {l.modelYear ?? "Não informado"}
        </p>
        <p className="mt-2 break-all text-xs text-muted-foreground">
          ID: {l.id}
        </p>
      </details>
      {l.status === "published" && l.entitled && (
        <a
          href={`/venda-sua-bike/${l.id}`}
          target="_blank"
          rel="noreferrer"
          className={`${secondary} mt-3`}
        >
          Ver anúncio no site
        </a>
      )}
    </article>
  );
}
function MemberInfo({ member: m }: { member: AdminMember }) {
  return (
    <div className="rounded-xl bg-surface p-4">
      <h3 className="text-xl font-bold">{m.name}</h3>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold">E-mail</dt>
          <dd className="break-all">{m.email || "Não informado"}</dd>
          <dd>{m.emailVerified ? "Validado" : "Validação pendente"}</dd>
        </div>
        <div>
          <dt className="font-semibold">Telefone</dt>
          <dd>{m.phone || "Não informado"}</dd>
          <dd>
            {m.phoneVerified ? "WhatsApp validado" : "Validação pendente"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Cadastro</dt>
          <dd>
            {date(m.joinedAt)} ·{" "}
            {m.suspended ? "Conta suspensa" : "Conta ativa"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Anúncios</dt>
          <dd>
            {m.listings} criados · {m.activeListings} ativos ·{" "}
            {m.availableCourtesies} cortesias disponíveis
          </dd>
        </div>
      </dl>
    </div>
  );
}
export function CommunityDirectory({
  onChanged,
}: {
  onChanged: () => Promise<void>;
}) {
  const [tab, setTab] = useState("members"),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [offset, setOffset] = useState(0),
    [status, setStatus] = useState("all"),
    [retry, setRetry] = useState(0),
    [orderBy, setOrderBy] = useState<"name" | "listings" | "createdAt">(
      "createdAt",
    ),
    [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [results, setResults] = useState<{
      total: number;
      items: AdminMember[] | AdminListing[];
    } | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [detail, setDetail] = useState<AdminMemberDetail | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const [quantity, setQuantity] = useState(1),
    [reason, setReason] = useState(""),
    [confirm, setConfirm] = useState<"grant" | string | null>(null),
    [revokeReason, setRevokeReason] = useState("");
  const [removeOpen, setRemoveOpen] = useState(false),
    [confirmationEmail, setConfirmationEmail] = useState("");
  const requestId = useRef<string | null>(null),
    detailSequence = useRef(0);
  const memberFocus = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (detail?.member.id) {
      memberFocus.current?.focus({ preventScroll: true });
      memberFocus.current?.scrollIntoView({ block: "start" });
    }
  }, [detail?.member.id]);
  useEffect(() => {
    let current = true;
    setResults(null);
    setLoading(true);
    setError("");
    void adminClassifiedsCall(tab, {
      query: search,
      offset,
      ...(tab === "listings" ? { status } : { orderBy, direction }),
    })
      .then((v) => {
        if (current)
          setResults(
            tab === "members"
              ? adminMembersResultSchema.parse(v)
              : adminListingsResultSchema.parse(v),
          );
      })
      .catch(() => {
        if (current)
          setError("Não foi possível buscar os registros. Tente novamente.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [tab, search, offset, status, retry, orderBy, direction]);
  async function openMember(id: string) {
    const sequence = ++detailSequence.current;
    setSelected(id);
    setDetail(null);
    setError("");
    setNotice("");
    setReason("");
    setQuantity(1);
    requestId.current = null;
    try {
      const d = adminMemberDetailSchema.parse(
        await adminClassifiedsCall("member", { id }),
      );
      if (sequence === detailSequence.current) setDetail(d);
    } catch {
      if (sequence === detailSequence.current)
        setError("Não foi possível abrir o usuário. Tente novamente.");
    }
  }
  function back() {
    detailSequence.current++;
    setSelected(null);
    setDetail(null);
    setError("");
    setNotice("");
  }
  function find(e: FormEvent) {
    e.preventDefault();
    back();
    setSearch(query.trim());
    setOffset(0);
    setRetry((n) => n + 1);
  }
  async function apply() {
    if (!detail || !confirm) return;
    setBusy(true);
    setError("");
    try {
      const granting = confirm === "grant";
      if (granting && !requestId.current)
        requestId.current = crypto.randomUUID();
      const value = await adminClassifiedsCall(
        granting ? "grant" : "revoke",
        granting
          ? {
              userId: detail.member.id,
              requestId: requestId.current,
              quantity,
              reason: reason.trim(),
            }
          : {
              userId: detail.member.id,
              courtesyId: confirm,
              reason: revokeReason.trim(),
            },
      );
      setDetail(adminMemberDetailSchema.parse(value));
      setNotice(
        granting
          ? `${quantity} cortesia(s) liberada(s). O usuário já pode publicar sem pagamento.`
          : "Cortesia revogada. O histórico foi preservado.",
      );
      setConfirm(null);
      setReason("");
      setRevokeReason("");
      requestId.current = null;
      setRetry((n) => n + 1);
      await onChanged().catch(() => {});
    } catch (e) {
      setError(
        e instanceof Error && e.message === "courtesy_limit"
          ? "Este usuário atingiu o limite de 50 cortesias vigentes."
          : "Não foi possível concluir a operação. Você pode tentar novamente sem duplicar a liberação.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function removeMember() {
    if (
      !detail ||
      confirmationEmail.trim().toLowerCase() !==
        detail.member.email?.toLowerCase()
    )
      return;
    setBusy(true);
    setError("");
    try {
      await adminClassifiedsCall("remove_member", {
        userId: detail.member.id,
        email: confirmationEmail.trim(),
        confirmed: true,
      });
      setRemoveOpen(false);
      setConfirmationEmail("");
      back();
      setNotice(
        "Usuário removido. Acesso encerrado e anúncios retirados; registros financeiros preservados.",
      );
      setRetry((n) => n + 1);
      await onChanged().catch(() => {});
    } catch (e) {
      setError(
        e instanceof Error && e.message === "protected_account"
          ? "Contas da equipe editorial não podem ser removidas por esta área."
          : e instanceof Error && e.message === "payment_pending"
            ? "Há um pagamento em andamento. Aguarde a conclusão ou o vencimento antes de remover a conta."
            : e instanceof Error && e.message === "email_mismatch"
              ? "O e-mail não corresponde ao cadastro. Confira antes de remover."
              : "A remoção não foi concluída. A conta pode estar suspensa; tente novamente para concluir com segurança.",
      );
    } finally {
      setBusy(false);
    }
  }
  function sort(key: "name" | "listings" | "createdAt") {
    setDirection(
      orderBy === key
        ? direction === "asc"
          ? "desc"
          : "asc"
        : key === "name"
          ? "asc"
          : "desc",
    );
    setOrderBy(key);
    setOffset(0);
    back();
  }
  return (
    <section
      aria-labelledby="community-directory-title"
      className="space-y-5 border-t border-line pt-7"
      data-heatmap-private
    >
      <div>
        <h2 id="community-directory-title" className="text-2xl font-bold">
          Usuários e anúncios
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Encontre uma pessoa, acompanhe seus anúncios e gerencie cortesias para
          parceiros.
        </p>
      </div>
      <Tabs
        value={tab}
        onValueChange={(v) => {
          back();
          setTab(v);
          setOffset(0);
        }}
      >
        <TabsList className="h-auto gap-2">
          <TabsTrigger value="members" className="min-h-11 px-4">
            Usuários
          </TabsTrigger>
          <TabsTrigger value="listings" className="min-h-11 px-4">
            Todos os anúncios
          </TabsTrigger>
        </TabsList>
        <form
          onSubmit={find}
          className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-4"
        >
          <label
            className="min-w-0 flex-1 text-sm font-semibold"
            htmlFor="community-search"
          >
            {tab === "members"
              ? "Buscar por nome, e-mail ou telefone"
              : "Buscar por bike, nome, e-mail ou telefone"}
            <input
              id="community-search"
              type="search"
              autoComplete="off"
              value={query}
              maxLength={120}
              onChange={(e) => setQuery(e.target.value)}
              className={field}
              placeholder="Nome, e-mail ou telefone"
            />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              {query.length}/120 caracteres
            </span>
          </label>
          {tab === "listings" && (
            <label className="text-sm font-semibold">
              Status
              <select
                aria-label="Status dos anúncios"
                className={field}
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setOffset(0);
                  back();
                }}
              >
                {[["all", "Todos"], ...Object.entries(LISTING_STATUSES)].map(
                  ([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </label>
          )}
          <button className={`${button} mb-5`} disabled={loading || busy}>
            Buscar
          </button>
          {search && (
            <button
              type="button"
              className={`${secondary} mb-5`}
              onClick={() => {
                setQuery("");
                setSearch("");
                setOffset(0);
                back();
              }}
            >
              Limpar busca
            </button>
          )}
        </form>
        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl bg-red-50 p-4 text-red-900"
          >
            {error}
            <button
              className="ml-3 min-h-11 underline"
              disabled={busy}
              onClick={() =>
                selected ? void openMember(selected) : setRetry((n) => n + 1)
              }
            >
              Tentar novamente
            </button>
          </div>
        )}
        {notice && (
          <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-4">
            {notice}
          </p>
        )}
        {selected ? (
          <div className="mt-5 space-y-5">
            <button className={secondary} disabled={busy} onClick={back}>
              ← Voltar à listagem
            </button>
            {!detail ? (
              <p role="status">Carregando usuário…</p>
            ) : (
              <>
                <div
                  ref={memberFocus}
                  tabIndex={-1}
                  className="scroll-mt-28 outline-none"
                >
                  <MemberInfo member={detail.member} />
                  <button
                    className="mt-4 min-h-11 text-sm font-semibold text-red-800 underline"
                    disabled={busy || !detail.member.email}
                    onClick={() => {
                      setConfirmationEmail("");
                      setRemoveOpen(true);
                    }}
                  >
                    Remover usuário
                  </button>
                  {detail.member.removalPending && (
                    <p className="mt-2 text-sm text-red-800">
                      Remoção pendente. A conta está suspensa; use “Remover
                      usuário” para concluir.
                    </p>
                  )}
                </div>
                <section className="rounded-2xl border border-line bg-white p-5">
                  <h3 className="text-xl font-bold">Liberar anúncios grátis</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Cada cortesia permite uma bike ativa por 90 dias corridos a
                    partir da primeira publicação. O usuário pode pausar ou
                    trocar a bike no mesmo período. A validação de e-mail e
                    WhatsApp continua obrigatória. Não gera cobrança nem
                    faturamento.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setConfirm("grant");
                    }}
                    className="mt-5 space-y-4"
                  >
                    <label className="block text-sm font-semibold">
                      Quantidade de cortesias
                      <select
                        aria-label="Quantidade de cortesias"
                        className={`${field} max-w-32`}
                        value={quantity}
                        disabled={busy}
                        onChange={(e) => {
                          setQuantity(Number(e.target.value));
                          requestId.current = null;
                        }}
                      >
                        {Array.from({ length: 10 }, (_, i) => (
                          <option key={i + 1}>{i + 1}</option>
                        ))}
                      </select>
                    </label>
                    <label
                      className="block text-sm font-semibold"
                      htmlFor="courtesy-reason"
                    >
                      Motivo da liberação
                      <textarea
                        id="courtesy-reason"
                        value={reason}
                        minLength={5}
                        maxLength={300}
                        required
                        disabled={busy}
                        aria-describedby="courtesy-reason-count"
                        onChange={(e) => {
                          setReason(e.target.value);
                          requestId.current = null;
                        }}
                        className={field}
                        placeholder="Ex.: parceria com a loja"
                      />
                      <span
                        id="courtesy-reason-count"
                        className="mt-1 block text-xs font-normal text-muted-foreground"
                      >
                        {reason.trim().length}/300 caracteres · mínimo de 5
                      </span>
                    </label>
                    <button
                      className={button}
                      disabled={
                        busy ||
                        detail.member.suspended ||
                        reason.trim().length < 5
                      }
                    >
                      Revisar liberação
                    </button>
                    {detail.member.suspended && (
                      <p className="text-sm">
                        A conta está suspensa; não é possível conceder
                        cortesias.
                      </p>
                    )}
                  </form>
                </section>
                <section className="rounded-2xl border border-line bg-white p-5">
                  <h3 className="text-xl font-bold">Histórico de cortesias</h3>
                  {detail.courtesies.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Nenhuma cortesia concedida.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-4">
                      {detail.courtesies.map((c) => (
                        <li
                          key={c.id}
                          className="rounded-xl border border-line p-4"
                        >
                          <p className="font-semibold">
                            {c.revokedAt
                              ? "Revogada"
                              : c.expiresAt &&
                                  Date.parse(c.expiresAt) <= Date.now()
                                ? "Expirada"
                                : c.startedAt
                                  ? "Em uso"
                                  : "Disponível"}{" "}
                            · {c.reason}
                          </p>
                          <p className="mt-2 break-words text-sm">
                            Liberada em {date(c.grantedAt)} por{" "}
                            {c.grantedBy ?? "Admin"}
                          </p>
                          <p className="mt-1 text-sm">
                            {c.expiresAt
                              ? `Exibição até ${date(c.expiresAt)}`
                              : "90 dias a partir da primeira publicação"}
                          </p>
                          {c.listingId && (
                            <p className="mt-1 text-sm">
                              Bike:{" "}
                              {detail.listings.find((l) => l.id === c.listingId)
                                ?.title ?? "Anúncio indisponível"}
                            </p>
                          )}
                          {c.revokeReason && (
                            <p className="mt-2 text-sm">
                              Motivo da revogação: {c.revokeReason}
                            </p>
                          )}
                          {!c.revokedAt &&
                            (!c.expiresAt ||
                              Date.parse(c.expiresAt) > Date.now()) && (
                              <button
                                className={`${secondary} mt-3`}
                                disabled={busy}
                                onClick={() => {
                                  setRevokeReason("");
                                  setConfirm(c.id);
                                }}
                              >
                                Revogar cortesia
                              </button>
                            )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <section className="space-y-4">
                  <h3 className="text-xl font-bold">
                    Anúncios deste usuário ({detail.listings.length})
                  </h3>
                  {detail.listings.map((l) => (
                    <ListingInfo
                      key={l.id}
                      listing={l}
                      onMember={(id) => void openMember(id)}
                    />
                  ))}
                  {!detail.listings.length && (
                    <p className="rounded-xl bg-white p-5 text-sm">
                      Este usuário ainda não criou anúncios.
                    </p>
                  )}
                </section>
              </>
            )}
          </div>
        ) : (
          <>
            {loading && (
              <p role="status" className="mt-5">
                Buscando registros…
              </p>
            )}
            {results && (
              <p role="status" className="mt-5 text-sm text-muted-foreground">
                {results.total}{" "}
                {tab === "members" ? "usuário(s)" : "anúncio(s)"} encontrado(s)
              </p>
            )}
            <TabsContent value="members">
              <div
                className="max-w-full overflow-x-auto rounded-2xl border border-line bg-white"
                role="region"
                tabIndex={0}
                aria-label="Tabela de usuários"
              >
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">
                    Usuários da comunidade. Ordene por nome, anúncios ou data de
                    criação.
                  </caption>
                  <thead>
                    <tr>
                      {[
                        ["name", "Nome"],
                        [null, "Contato"],
                        ["listings", "Anúncios"],
                        ["createdAt", "Data de criação"],
                        [null, "Ações"],
                      ].map(([key, label]) => (
                        <th
                          key={label}
                          scope="col"
                          className={`whitespace-nowrap border-b border-line px-4 py-3 ${key === "name" ? "sticky left-0 z-10 bg-white" : ""}`}
                          aria-sort={
                            key
                              ? orderBy === key
                                ? direction === "asc"
                                  ? "ascending"
                                  : "descending"
                                : "none"
                              : undefined
                          }
                        >
                          {key ? (
                            <button
                              className="min-h-11 font-semibold text-action underline"
                              disabled={busy}
                              onClick={() =>
                                sort(key as "name" | "listings" | "createdAt")
                              }
                              aria-label={`Ordenar por ${label?.toLowerCase()}`}
                            >
                              {label}{" "}
                              {orderBy === key
                                ? direction === "asc"
                                  ? "↑"
                                  : "↓"
                                : "↕"}
                            </button>
                          ) : (
                            label
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(tab === "members"
                      ? (results?.items as AdminMember[])
                      : []
                    )?.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b border-line last:border-0"
                      >
                        <th
                          scope="row"
                          className="sticky left-0 z-10 min-w-32 bg-white px-4 py-3 font-semibold"
                        >
                          {m.name}
                          {m.suspended && (
                            <span className="mt-1 block text-xs text-red-800">
                              {m.removalPending
                                ? "Remoção pendente"
                                : "Suspenso"}
                            </span>
                          )}
                        </th>
                        <td className="max-w-64 px-4 py-3">
                          <span className="block break-all">
                            {m.email || "E-mail não informado"}
                          </span>
                          <span className="mt-1 block whitespace-nowrap">
                            {m.phone || "Telefone não informado"}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {m.phoneVerified
                              ? "WhatsApp validado"
                              : "Validação pendente"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <strong>{m.listings}</strong>
                          <span className="mt-1 block whitespace-nowrap text-xs text-muted-foreground">
                            {m.activeListings} ativos
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {date(m.joinedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            className={`${secondary} whitespace-nowrap`}
                            onClick={() => void openMember(m.id)}
                            aria-label={`Ver usuário ${m.name}`}
                          >
                            Ver usuário
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            <TabsContent value="listings">
              <div className="space-y-4">
                {(tab === "listings"
                  ? (results?.items as AdminListing[])
                  : []
                )?.map((l) => (
                  <ListingInfo
                    key={l.id}
                    listing={l}
                    onMember={(id) => void openMember(id)}
                  />
                ))}
              </div>
            </TabsContent>
            {!loading && results?.total === 0 && (
              <p className="mt-5 rounded-xl bg-white p-5">
                Nenhum registro encontrado. Ajuste sua busca.
              </p>
            )}
            {results && results.total > 20 && (
              <nav
                aria-label="Paginação da comunidade"
                className="mt-5 flex items-center justify-between gap-3"
              >
                <button
                  disabled={loading || offset === 0}
                  className={secondary}
                  onClick={() => setOffset((n) => Math.max(0, n - 20))}
                >
                  Anterior
                </button>
                <span className="text-sm">
                  {offset + 1}–{Math.min(offset + 20, results.total)} de{" "}
                  {results.total}
                </span>
                <button
                  disabled={loading || offset + 20 >= results.total}
                  className={secondary}
                  onClick={() => setOffset((n) => n + 20)}
                >
                  Próxima
                </button>
              </nav>
            )}
          </>
        )}
      </Tabs>
      <Dialog
        open={removeOpen}
        onOpenChange={(v) => {
          if (!busy) setRemoveOpen(v);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover usuário</DialogTitle>
            <DialogDescription>
              Remover o acesso de {detail?.member.name}, anonimizar o perfil e
              retirar seus anúncios e fotos. Esta ação não pode ser desfeita.
              Compras e histórico financeiro serão preservados. A newsletter
              independente não será alterada.
            </DialogDescription>
          </DialogHeader>
          <label className="block text-sm font-semibold">
            Digite o e-mail para confirmar:{" "}
            <span className="break-all">{detail?.member.email}</span>
            <input
              autoComplete="off"
              type="email"
              maxLength={254}
              value={confirmationEmail}
              onChange={(e) => setConfirmationEmail(e.target.value)}
              disabled={busy}
              className={field}
              aria-label="E-mail para confirmar remoção"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-800">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <button
              className={secondary}
              disabled={busy}
              onClick={() => setRemoveOpen(false)}
            >
              Cancelar
            </button>
            <button
              className={`${button} bg-red-800`}
              disabled={
                busy ||
                !detail?.member.email ||
                confirmationEmail.trim().toLowerCase() !==
                  detail.member.email.toLowerCase()
              }
              onClick={() => void removeMember()}
            >
              {busy ? "Removendo…" : "Remover definitivamente"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={confirm !== null}
        onOpenChange={(v) => {
          if (!v && !busy) setConfirm(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm === "grant"
                ? "Confirmar cortesia para parceiro"
                : "Revogar cortesia"}
            </DialogTitle>
            <DialogDescription>
              {confirm === "grant"
                ? `${quantity} cortesia(s) para ${detail?.member.name} (${detail?.member.email}). Cada unidade libera uma bike ativa por 90 dias a partir da primeira publicação, sem pagamento.`
                : "O benefício será encerrado e o anúncio coberto por ele sairá do ar. Pagamentos e outros benefícios permanecem preservados."}
            </DialogDescription>
          </DialogHeader>
          {confirm === "grant" ? (
            <p className="whitespace-pre-wrap break-words text-sm">
              Motivo: {reason}
            </p>
          ) : (
            <label className="block text-sm font-semibold">
              Motivo da revogação
              <textarea
                aria-label="Motivo da revogação"
                minLength={5}
                maxLength={300}
                value={revokeReason}
                disabled={busy}
                onChange={(e) => setRevokeReason(e.target.value)}
                className={field}
              />
              <span className="mt-1 block text-xs font-normal">
                {revokeReason.trim().length}/300 caracteres · mínimo de 5
              </span>
            </label>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <button
              className={secondary}
              disabled={busy}
              onClick={() => setConfirm(null)}
            >
              Voltar
            </button>
            <button
              className={button}
              disabled={
                busy || (confirm !== "grant" && revokeReason.trim().length < 5)
              }
              onClick={() => void apply()}
            >
              {busy
                ? "Salvando…"
                : confirm === "grant"
                  ? "Liberar cortesias"
                  : "Confirmar revogação"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
