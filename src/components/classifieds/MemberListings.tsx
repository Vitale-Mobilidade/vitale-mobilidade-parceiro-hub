import { ListingBillingPanel } from "./ListingBillingPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ListingDashboard, type ListingAction } from "./ListingDashboard";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { useMemberSession } from "@/hooks/use-member-session";
import {
  classifiedsCall,
  removeMemberImage,
  signedMemberImages,
  uploadMemberImage,
} from "@/lib/bike-classifieds-api";
import {
  BATTERIES,
  CONDITIONS,
  LISTING_STATUSES,
  STATES,
  classifiedsAccountSchema,
  classifiedsError,
  listingInputSchema,
  listingDraftInputSchema,
  isEmptyBikeDraft,
  listingSchema,
  type BikeListing,
  type ClassifiedsAccount,
} from "@/lib/bike-classifieds";
import { ClassifiedCard } from "./BikeClassifiedsSection";
import { memberError } from "@/lib/member-community";
import { ListingPreview } from "./ListingPreview";
const field =
  "mt-2 block min-h-12 w-full rounded-xl border border-line bg-white px-3 py-3 text-ink disabled:bg-surface";
const button =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-action px-5 py-3 font-bold text-white disabled:opacity-50";
export function MemberListings() {
  const { session, loading } = useMemberSession();
  const userId = session?.user.id;
  const [account, setAccount] = useState<ClassifiedsAccount | null>(null);
  const [listings, setListings] = useState<BikeListing[]>([]);
  const [selected, setSelected] = useState<string>();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [editing, setEditing] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [editorBusy, setEditorBusy] = useState(false);
  async function load() {
    const a = classifiedsAccountSchema.parse(await classifiedsCall("account"));
    setAccount(a);
    if (a.canAdvertise && a.communityJoined) {
      const items = listingSchema.array().parse(await classifiedsCall("mine"));
      const signed = await signedMemberImages(
        items.flatMap((v) => v.images.map((i) => i.path)),
      );
      for (const l of items)
        for (const img of l.images) img.url = signed.get(img.path);
      setListings(items);
    } else setListings([]);
    setReady(true);
  }
  useEffect(() => {
    let active = true;
    setReady(false);
    setAccount(null);
    setListings([]);
    setSelected(undefined);
    setError("");
    if (!userId) return;
    void (async () => {
      const a = classifiedsAccountSchema.parse(
        await classifiedsCall("account"),
      );
      let items: BikeListing[] = [];
      if (a.canAdvertise && a.communityJoined) {
        items = listingSchema.array().parse(await classifiedsCall("mine"));
        const signed = await signedMemberImages(
          items.flatMap((v) => v.images.map((i) => i.path)),
        );
        for (const l of items)
          for (const img of l.images) img.url = signed.get(img.path);
      }
      if (active) {
        setAccount(a);
        setListings(items);
        setReady(true);
      }
    })().catch((e) => {
      if (active) {
        setError(classifiedsError(e) || memberError(e));
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [userId, retry]);
  async function create() {
    setBusy(true);
    setError("");
    try {
      const l =
        listings.find(isEmptyBikeDraft) ??
        listingSchema.parse(await classifiedsCall("create"));
      await load();
      setSelected(l.id);
    } catch (e) {
      setError(classifiedsError(e) || memberError(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <p role="status">Carregando sua conta…</p>;
  if (!session)
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-line bg-white p-7">
        <h1 className="text-3xl font-bold text-ink">Anuncie sua bike</h1>
        <p className="mt-4">
          Entre na sua conta para criar e acompanhar seus anúncios.
        </p>
        <a
          href="/conta?retorno=%2Fconta%2Fanuncios"
          className={`${button} mt-6`}
        >
          Entrar na minha conta
        </a>
        <a href="/venda-sua-bike" className="ml-5 underline">
          Ver bikes
        </a>
      </section>
    );
  if (!ready) return <p role="status">Carregando seus anúncios…</p>;
  if (!account)
    return (
      <div>
        <p role="alert">
          {error || "Não foi possível carregar seus anúncios."}
        </p>
        <button
          className={`${button} mt-4`}
          onClick={() => setRetry((n) => n + 1)}
        >
          Tentar novamente
        </button>
      </div>
    );
  if (!account.canAdvertise)
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-line bg-white p-7">
        <h1 className="text-3xl font-bold text-ink">Venda sua bike aqui</h1>
        <p className="mt-4">
          Estamos testando os anúncios com uma conta convidada. Sua conta ainda
          não tem acesso à criação.
        </p>
        <p className="mt-4">
          O valor é de R$150 por mês enquanto o anúncio estiver ativo. A
          abertura para outros anunciantes virá depois.
        </p>
        <a href="/venda-sua-bike" className={`${button} mt-6`}>
          Ver bikes disponíveis
        </a>
      </section>
    );
  if (!account.communityJoined)
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-line bg-white p-7">
        <h1 className="text-3xl font-bold">Complete seu cadastro</h1>
        <p className="mt-4">Complete seu perfil para começar o anúncio.</p>
        <a
          href="/conta?modo=perfil&retorno=%2Fconta%2Fanuncios"
          className={`${button} mt-6`}
        >
          Completar meu perfil
        </a>
      </section>
    );
  const listing = listings.find((l) => l.id === selected);
  const channel = account.sellerType === "channel";
  async function manage(
    action: ListingAction,
    item: BikeListing,
    edit = false,
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await classifiedsCall(action, { id: item.id });
      await load();
      if (edit) setSelected(item.id);
      setNotice(
        action === "archive"
          ? "Anúncio desativado. Se houver assinatura, o encerramento da renovação será solicitado. Você pode reativá-lo como rascunho."
          : action === "sold"
            ? "Bike marcada como vendida. Se houver assinatura, o encerramento da renovação será solicitado."
            : "Anúncio em rascunho. Revise antes de publicar novamente.",
      );
    } catch (e) {
      setError(classifiedsError(e) || memberError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <a
        href="/conta?modo=perfil"
        className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-action"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Meu perfil
      </a>
      {error && (
        <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-900">
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mb-5 rounded-xl bg-emerald-50 p-4 text-emerald-950"
        >
          {notice}
        </p>
      )}
      {listing ? (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-action">Meus anúncios</p>
              <h1 className="mt-2 text-3xl font-bold text-ink">
                {isEmptyBikeDraft(listing) ? "Criar anúncio" : listing.title}
              </h1>
            </div>
            <button
              disabled={editorBusy}
              className="min-h-11 font-semibold text-action underline disabled:opacity-50"
              onClick={() => {
                if (editing) setConfirmExit(true);
                else {
                  setSelected(undefined);
                  setNotice("");
                }
              }}
            >
              Voltar aos anúncios
            </button>
          </div>
          <ListingEditor
            key={listing.id}
            listing={listing}
            channel={channel}
            canPublish={account.canPublish}
            onChange={load}
            onEditing={setEditing}
            onBusy={setEditorBusy}
          />
        </>
      ) : (
        <ListingDashboard
          listings={listings}
          busy={busy}
          onCreate={() => void create()}
          onEdit={(item) => {
            if (item.status !== "draft") void manage("withdraw", item, true);
            else setSelected(item.id);
          }}
          onAction={manage}
        />
      )}
      <AlertDialog open={confirmExit} onOpenChange={setConfirmExit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Voltar sem salvar as alterações?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Os campos alterados desde o último salvamento serão descartados.
              As fotos enviadas e o rascunho já salvo continuam guardados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setSelected(undefined);
                setEditing(false);
                setNotice("");
              }}
            >
              Descartar alterações e voltar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ListingEditor({
  listing,
  canPublish,
  channel,
  onChange,
  onEditing,
  onBusy,
}: {
  listing: BikeListing;
  canPublish: boolean;
  channel: boolean;
  onChange: () => Promise<void>;
  onEditing: (value: boolean) => void;
  onBusy: (value: boolean) => void;
}) {
  const [form, setForm] = useState(() => ({
    ...listing,
    title: isEmptyBikeDraft(listing) ? "" : listing.title,
  }));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [billingLocked, setBillingLocked] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const [step, setStep] = useState<"photos" | "details" | "publish">("photos");
  const [consent, setConsent] = useState(false);
  const draft = listing.status === "draft";
  useEffect(() => {
    function warn(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change<K extends keyof BikeListing>(key: K, value: BikeListing[K]) {
    setForm((v) => ({ ...v, [key]: value }));
    setDirty(true);
    setMessage("");
  }
  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      await onChange();
      setMessage(success);
    } catch (e) {
      setError(classifiedsError(e) || memberError(e));
    } finally {
      setBusy(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    const data = listingDraftInputSchema.safeParse(form);
    if (!data.success) {
      setError(
        "Confira os campos preenchidos. Você pode deixar informações em branco para completar depois.",
      );
      return;
    }
    await run(async () => {
      const saved = listingSchema.parse(
        await classifiedsCall("save", { id: listing.id, ...data.data }),
      );
      setForm(saved);
      setDirty(false);
      return saved;
    }, "Rascunho salvo.");
  }
  async function files(selected: FileList | null) {
    if (!selected?.length) return;
    const files = Array.from(selected);
    if (files.length + listing.images.length > 5) {
      setError("Cada anúncio pode ter até cinco fotos.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      for (const file of files) await uploadMemberImage(file, listing.id);
      setMessage("Fotos adicionadas.");
    } catch (e) {
      setError(classifiedsError(e) || memberError(e));
    } finally {
      await onChange().catch(() => {});
      setBusy(false);
    }
  }
  useEffect(() => {
    if (listing.status !== form.status) {
      setForm(listing);
      setDirty(false);
    }
  }, [listing, form.status]);
  useEffect(() => {
    onEditing(dirty || busy);
    return () => onEditing(false);
  }, [dirty, busy, onEditing]);
  useEffect(() => {
    onBusy(busy);
    return () => onBusy(false);
  }, [busy, onBusy]);
  const locked = busy || !draft || billingLocked;
  const publishReady =
    listingInputSchema.safeParse(listing).success &&
    listing.images.some((i) => i.status === "ready") &&
    !listing.images.some((i) => i.status === "reserved");
  const input = (
    key: "title" | "brand" | "model" | "city" | "description" | "maintenance",
    label: string,
    max: number,
    min = 1,
  ) => (
    <label className="block font-semibold">
      {label}
      {key === "description" || key === "maintenance" ? (
        <textarea
          className={`${field} min-h-32`}
          value={form[key]}
          onChange={(e) => change(key, e.target.value)}
          maxLength={max}
          minLength={min}
          required={min > 0}
        />
      ) : (
        <input
          className={field}
          value={form[key]}
          onChange={(e) => change(key, e.target.value)}
          maxLength={max}
          minLength={min}
          required={min > 0}
        />
      )}
    </label>
  );
  return (
    <div
      className={
        preview
          ? ""
          : "grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
      }
    >
      <section className="min-w-0 rounded-2xl border border-line bg-white p-5 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-ink">
            {LISTING_STATUSES[listing.status]}
          </h2>
          <button
            type="button"
            className="min-h-11 font-semibold text-action underline"
            onClick={() => setPreview((v) => !v)}
          >
            {preview ? "Voltar à edição" : "Ver prévia"}
          </button>
        </div>
        {!preview && (
          <div
            role="tablist"
            aria-label="Etapas do anúncio"
            className="mb-6 grid grid-cols-3 gap-2"
          >
            {(
              [
                ["photos", "1. Fotos"],
                ["details", "2. Informações"],
                ["publish", "3. Publicar"],
              ] as const
            ).map(([key, label]) => (
              <button
                type="button"
                role="tab"
                key={key}
                id={`listing-tab-${key}`}
                aria-selected={step === key}
                tabIndex={step === key ? 0 : -1}
                onKeyDown={(event) => {
                  const keys = ["photos", "details", "publish"] as const;
                  const current = keys.indexOf(step);
                  const index =
                    event.key === "ArrowRight"
                      ? (current + 1) % 3
                      : event.key === "ArrowLeft"
                        ? (current + 2) % 3
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? 2
                            : -1;
                  if (index < 0) return;
                  event.preventDefault();
                  setStep(keys[index]);
                  event.currentTarget.parentElement
                    ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                    [index]?.focus();
                }}
                aria-controls={`listing-panel-${key}`}
                disabled={busy}
                onClick={() => setStep(key)}
                className={`min-h-12 rounded-xl px-2 py-3 text-sm font-semibold ${step === key ? "bg-ink text-white" : "bg-surface text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="mb-5 rounded-lg bg-red-50 p-4 text-red-900"
          >
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="mb-5 rounded-lg bg-emerald-50 p-4 text-emerald-950"
          >
            {message}
          </p>
        )}
        {billingLocked && draft && (
          <p className="mb-4 rounded-xl bg-surface p-4 text-sm">
            O anúncio está vinculado a uma solicitação de pagamento. Para
            alterar fotos ou informações, encerre a assinatura na etapa Publicar
            e aguarde a confirmação.
          </p>
        )}
        {busy && (
          <p role="status" className="mb-4">
            Salvando alteração…
          </p>
        )}
        {preview ? (
          <div className="space-y-8">
            <section aria-labelledby="preview-card-title">
              <h3 id="preview-card-title" className="mb-4 text-lg font-bold">
                Como aparece na vitrine
              </h3>
              <div className="max-w-sm">
                <ClassifiedCard
                  listing={{
                    ...listing,
                    ...form,
                    images: listing.images,
                    sellerType: channel ? "channel" : "individual",
                  }}
                  preview
                />
              </div>
            </section>
            <ListingPreview
              listing={{
                ...listing,
                ...form,
                images: listing.images,
                sellerType: channel ? "channel" : "individual",
              }}
              preview
            />
          </div>
        ) : (
          <>
            <section
              hidden={step !== "photos"}
              role="tabpanel"
              id="listing-panel-photos"
              aria-labelledby="listing-tab-photos"
              className="pb-3"
            >
              <h3 id="listing-photos" className="text-lg font-bold">
                1. Fotos da bike · {listing.images.length}/5
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Mostre a bike inteira, os dois lados, bateria e detalhes. A
                primeira foto será a capa. JPEG, PNG ou WebP, até 10 MB por
                foto.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {listing.images.map((image, index) => (
                  <div
                    key={image.id}
                    className="overflow-hidden rounded-xl border border-line"
                  >
                    {image.url && image.status === "ready" ? (
                      <img
                        src={image.url}
                        alt={`Sua bike, foto ${index + 1}`}
                        width={320}
                        height={240}
                        className="aspect-[4/3] w-full object-cover"
                      />
                    ) : (
                      <div className="grid aspect-[4/3] place-items-center bg-surface text-center text-sm">
                        Envio pendente
                      </div>
                    )}
                    <div className="p-3">
                      {index === 0 && image.status === "ready" ? (
                        <span className="block text-sm font-bold text-action">
                          Foto de capa
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={locked || image.status !== "ready"}
                          onClick={() =>
                            void run(
                              () =>
                                classifiedsCall("cover", {
                                  id: listing.id,
                                  assetId: image.id,
                                }),
                              "Capa atualizada.",
                            )
                          }
                          className="min-h-11 text-sm underline disabled:opacity-50"
                        >
                          Usar como capa
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() =>
                          void run(
                            () =>
                              removeMemberImage(
                                image.path,
                                image.id,
                                listing.id,
                              ),
                            "Foto removida.",
                          )
                        }
                        className="block min-h-11 text-sm text-red-800 underline disabled:opacity-50"
                      >
                        Remover foto {index + 1}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {draft && listing.images.length < 5 && (
                <label className="mt-5 inline-flex min-h-12 cursor-pointer items-center rounded-xl border border-action px-4 font-semibold text-action focus-within:ring-2 focus-within:ring-action">
                  <span className="flex items-center gap-2">
                    <ImagePlus className="h-5 w-5" aria-hidden="true" />
                    Adicionar fotos
                  </span>
                  <input
                    type="file"
                    aria-label="Adicionar fotos da bike"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={locked}
                    onChange={(e) => {
                      void files(e.currentTarget.files);
                      e.currentTarget.value = "";
                    }}
                    className="sr-only"
                  />
                </label>
              )}
              <button
                type="button"
                className={`${button} mt-6`}
                disabled={busy}
                onClick={() => setStep("details")}
              >
                Continuar para informações
              </button>
            </section>
            <form
              hidden={step !== "details"}
              role="tabpanel"
              id="listing-panel-details"
              aria-labelledby="listing-tab-details"
              noValidate
              onSubmit={save}
            >
              <fieldset
                disabled={locked}
                className="space-y-5 disabled:opacity-70"
              >
                <legend className="mb-5 text-lg font-bold">
                  2. Informações da bike
                </legend>
                {input("title", "Título do anúncio", 100, 6)}
                <div className="grid gap-5 sm:grid-cols-2">
                  {input("brand", "Marca", 60)}
                  {input("model", "Modelo", 80)}
                  <label className="block font-semibold">
                    Preço de venda (R$)
                    <input
                      type="number"
                      className={field}
                      min="1"
                      max="1000000"
                      step="0.01"
                      required
                      value={form.priceCents ? form.priceCents / 100 : ""}
                      onChange={(e) =>
                        change(
                          "priceCents",
                          Math.round(Number(e.target.value) * 100),
                        )
                      }
                    />
                  </label>
                  <label className="block font-semibold">
                    Quilometragem (km)
                    <input
                      type="number"
                      className={field}
                      min="0"
                      max="1000000"
                      step="1"
                      required
                      value={form.mileageKm ?? ""}
                      onChange={(e) =>
                        change(
                          "mileageKm",
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                  </label>
                  {input("city", "Cidade", 80, 2)}
                  <label className="block font-semibold">
                    Estado
                    <select
                      aria-label="Estado"
                      className={field}
                      required
                      value={form.state}
                      onChange={(e) => change("state", e.target.value)}
                    >
                      <option value="">Selecione</option>
                      {STATES.map((uf) => (
                        <option key={uf}>{uf}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block font-semibold">
                    Ano do modelo (opcional)
                    <input
                      type="number"
                      className={field}
                      min="1980"
                      max={new Date().getFullYear() + 1}
                      value={form.modelYear ?? ""}
                      onChange={(e) =>
                        change(
                          "modelYear",
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                  </label>
                  <label className="block font-semibold">
                    Conservação
                    <select
                      className={field}
                      value={form.condition}
                      onChange={(e) =>
                        change(
                          "condition",
                          e.target.value as BikeListing["condition"],
                        )
                      }
                    >
                      {Object.entries(CONDITIONS).map(([k, label]) => (
                        <option value={k} key={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block font-semibold">
                    Bateria
                    <select
                      className={field}
                      value={form.battery}
                      onChange={(e) =>
                        change(
                          "battery",
                          e.target.value as BikeListing["battery"],
                        )
                      }
                    >
                      {Object.entries(BATTERIES).map(([k, label]) => (
                        <option value={k} key={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block font-semibold">
                    Tem nota fiscal?
                    <select
                      className={field}
                      value={String(form.invoice)}
                      onChange={(e) =>
                        change("invoice", e.target.value === "true")
                      }
                    >
                      <option value="false">Não</option>
                      <option value="true">Sim</option>
                    </select>
                  </label>
                </div>
                {input("description", "Descrição da bike", 4000, 20)}
                {input(
                  "maintenance",
                  "Manutenção, acessórios e defeitos conhecidos (opcional)",
                  1000,
                  0,
                )}
                <p className="text-xs text-muted-foreground">
                  Inclua tempo de uso, autonomia atual e detalhes da bateria
                  quando souber. Use as fotos reais da sua bike. O WhatsApp de
                  contato será adicionado após sua autorização na publicação.
                </p>
                <button className={button} disabled={busy || !dirty}>
                  Salvar rascunho
                </button>
                <button
                  type="button"
                  className="ml-4 min-h-12 font-semibold text-action underline disabled:opacity-50"
                  disabled={busy || dirty}
                  onClick={() => setStep("publish")}
                >
                  Revisar publicação
                </button>
                {dirty && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Salve o rascunho para revisar a publicação.
                  </p>
                )}
              </fieldset>
            </form>
          </>
        )}
        <section
          hidden={step !== "publish" || preview}
          role="tabpanel"
          id="listing-panel-publish"
          aria-labelledby="listing-tab-publish"
          className="pt-2"
        >
          <h3 id="listing-publish" className="text-lg font-bold">
            3. Publicação
          </h3>
          {draft ? (
            <>
              <div className="mt-4 rounded-xl border border-line bg-surface p-4 text-sm">
                <p className="font-semibold text-ink">
                  Publicação: R$150 por mês enquanto o anúncio estiver ativo
                </p>
                {listing.feeStatus === "pilot_exempt" && (
                  <p className="mt-2 text-action">
                    Isenção aplicada à sua conta: R$0. Nenhuma cobrança será
                    feita nesta publicação.
                  </p>
                )}
              </div>
              {!publishReady && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Para publicar, complete título, marca/modelo, preço,
                  localização, quilometragem, descrição e ao menos uma foto.
                  Você pode salvar um rascunho incompleto.
                </p>
              )}
              {!canPublish && (
                <p className="mt-3 rounded-lg bg-amber-50 p-4 text-amber-950">
                  Para publicar,{" "}
                  <a
                    href="/conta?modo=perfil&retorno=%2Fconta%2Fanuncios"
                    className="font-bold underline"
                  >
                    valide seu e-mail e celular na Minha conta
                  </a>
                  . Você já pode preparar o rascunho.
                </p>
              )}
              <label className="mt-5 flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0"
                  disabled={busy}
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  Autorizo a divulgação do meu nome, foto de perfil e WhatsApp
                  verificado neste anúncio para receber contatos de compradores.
                  Confirmo que as informações e fotos são da bike que estou
                  anunciando.
                </span>
              </label>
              {listing.feeStatus === "pilot_exempt" && (
                <button
                  className={`${button} mt-5`}
                  disabled={
                    busy || dirty || !consent || !canPublish || !publishReady
                  }
                  onClick={() =>
                    void run(
                      () =>
                        classifiedsCall("publish", {
                          id: listing.id,
                          contactConsent: consent,
                        }),
                      "Anúncio publicado.",
                    )
                  }
                >
                  Publicar com isenção
                </button>
              )}
            </>
          ) : (
            <div className="mt-5 flex flex-wrap gap-4">
              {listing.status === "published" && (
                <>
                  <a href={`/venda-sua-bike/${listing.id}`} className={button}>
                    Ver anúncio no site
                  </a>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void run(
                        () => classifiedsCall("sold", { id: listing.id }),
                        "Bike marcada como vendida. Se houver assinatura, o encerramento da renovação será solicitado.",
                      )
                    }
                    className="min-h-12 rounded-xl border border-action px-5 font-bold text-action"
                  >
                    Marcar como vendida
                  </button>
                </>
              )}
              <button
                disabled={busy}
                onClick={() =>
                  void run(
                    () => classifiedsCall("withdraw", { id: listing.id }),
                    "Anúncio em rascunho. Você pode editar.",
                  )
                }
                className="min-h-12 font-semibold text-action underline"
              >
                {listing.status === "published"
                  ? "Retirar do ar para editar"
                  : "Voltar ao rascunho"}
              </button>
            </div>
          )}
          {draft && (
            <button
              disabled={busy || dirty}
              onClick={() =>
                void run(
                  () => classifiedsCall("archive", { id: listing.id }),
                  "Anúncio arquivado.",
                )
              }
              className="mt-5 block min-h-11 text-sm text-muted-foreground underline"
            >
              Desativar rascunho
            </button>
          )}
          {(draft || listing.feeStatus !== "pilot_exempt") && (
            <ListingBillingPanel
              listingId={listing.id}
              ready={draft && canPublish && publishReady}
              locked={busy || dirty}
              contactConsent={consent}
              onChange={onChange}
              onLockChange={setBillingLocked}
            />
          )}
        </section>
      </section>
      <aside
        className={`${preview ? "hidden" : "hidden xl:block"} min-w-0 rounded-2xl border border-line bg-white p-5 xl:sticky xl:top-28`}
        aria-labelledby="live-listing-preview"
      >
        <h2 id="live-listing-preview" className="text-lg font-bold text-ink">
          Prévia em tempo real
        </h2>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">
          Veja como sua bike aparece na vitrine.
        </p>
        <ClassifiedCard
          listing={{
            ...listing,
            ...form,
            images: listing.images,
            sellerType: channel ? "channel" : "individual",
          }}
          preview
        />
        <p className="mt-4 text-sm text-muted-foreground">
          O botão de contato abre o WhatsApp validado, com o título e o link da
          bike na mensagem.
        </p>
        <p className="mt-3 text-xs font-semibold text-action">
          {dirty ? "Alterações ainda não salvas" : "Dados e fotos salvos"}
        </p>
      </aside>
    </div>
  );
}
