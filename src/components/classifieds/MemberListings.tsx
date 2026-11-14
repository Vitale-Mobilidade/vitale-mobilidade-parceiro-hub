import { classifiedsFeeLabel } from "@/lib/classifieds-price";
import { FieldCounter } from "./FieldCounter";
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
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
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
  MEMBER_IMAGE_MAX_MB,
  STATES,
  DEFAULT_LISTING_MESSAGE,
  listingWhatsAppMessage,
  classifiedsAccountSchema,
  classifiedsError,
  listingInputSchema,
  listingWithTitle,
  missingListingFields,
  LISTING_FIELD_LABELS,
  listingDraftInputSchema,
  isEmptyBikeDraft,
  listingSchema,
  type BikeListing,
  type ClassifiedsAccount,
} from "@/lib/bike-classifieds";
import { ClassifiedCard } from "./BikeClassifiedsSection";
import { memberPhone } from "@/lib/member-identity";
import { memberError } from "@/lib/member-community";
import { ListingPreview } from "./ListingPreview";
const field =
  "mt-2 block min-h-12 w-full rounded-xl border border-line bg-white px-3 py-3 text-ink disabled:bg-surface";
const button =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-action px-5 py-3 font-bold text-white disabled:opacity-50";
export function MemberListings({ startNew = false }: { startNew?: boolean }) {
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
      if (startNew)
        window.history.replaceState(
          window.history.state,
          "",
          "/conta/anuncios",
        );
    } catch (e) {
      setError(classifiedsError(e) || memberError(e));
    } finally {
      setBusy(false);
    }
  }
  const startedNew = useRef(false);
  useEffect(() => {
    if (
      startNew &&
      ready &&
      account?.canAdvertise &&
      account.communityJoined &&
      !startedNew.current
    ) {
      startedNew.current = true;
      void create();
    }
  });
  if (loading) return <p role="status">Carregando sua conta…</p>;
  if (!session)
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-line bg-white p-7">
        <h1 className="text-3xl font-bold text-ink">Anuncie sua bike</h1>
        <p className="mt-4">
          Entre na sua conta para criar e acompanhar seus anúncios.
        </p>
        <a
          href={
            startNew
              ? "/conta?retorno=%2Fconta%2Fanuncios%3Fnovo%3D1"
              : "/conta?retorno=%2Fconta%2Fanuncios"
          }
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
          Não foi possível liberar a criação de anúncios nesta conta. Confira
          seu perfil ou tente novamente em alguns instantes.
        </p>
        <p className="mt-4">
          O valor é de {classifiedsFeeLabel()} por 90 dias de exibição, em
          pagamento único. A publicação exige e-mail e WhatsApp validados.
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
  const channel = listing?.sellerType === "channel";
  async function manage(
    action: ListingAction,
    item: BikeListing,
    edit = false,
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await classifiedsCall(action === "reactivate" ? "withdraw" : action, {
        id: item.id,
      });
      if (action === "reactivate") {
        if (
          ["paid", "courtesy"].includes(item.feeStatus) &&
          item.contactConfirmed
        )
          await classifiedsCall("publish", {
            id: item.id,
            contactConsent: true,
          });
        else setSelected(item.id);
      }
      await load();
      if (edit) setSelected(item.id);
      setNotice(
        action === "archive"
          ? "Anúncio desativado. Você pode reativá-lo durante o período de exibição, mantendo o vencimento original."
          : action === "reactivate"
            ? ["paid", "courtesy"].includes(item.feeStatus) &&
              item.contactConfirmed
              ? "Anúncio reativado. Seu período pago e a data final foram mantidos."
              : "Anúncio em rascunho. Confira o contato e seu período pago antes de publicar."
            : action === "sold"
              ? "Bike marcada como vendida e retirada da vitrine."
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
            verifiedPhone={account.verifiedPhone ?? undefined}
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
          onCreate={() => {
            window.location.href = "/anuncie-sua-bike";
          }}
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

export function ListingEditor({
  listing,
  canPublish,
  channel,
  onChange,
  onEditing,
  onBusy,
  actions,
  verifiedPhone,
}: {
  listing: BikeListing;
  verifiedPhone?: string;
  canPublish: boolean;
  channel: boolean;
  onChange: () => Promise<void>;
  onEditing: (value: boolean) => void;
  onBusy: (value: boolean) => void;
  actions?: {
    call: typeof classifiedsCall;
    upload: (file: File, id: string) => Promise<unknown>;
    remove: typeof removeMemberImage;
    publication: (state: {
      ready: boolean;
      locked: boolean;
      submit: (phone: string) => Promise<void>;
    }) => ReactNode;
  };
}) {
  const call = actions?.call ?? classifiedsCall;
  const upload = actions?.upload ?? uploadMemberImage;
  const remove = actions?.remove ?? removeMemberImage;
  const [form, setForm] = useState(() => ({
    ...listing,
    title: listing.title === "Minha bike" ? "" : listing.title,
  }));
  const [contactPhone, setContactPhone] = useState(verifiedPhone ?? "");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [billingLocked, setBillingLocked] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const [photoProgress, setPhotoProgress] = useState<string>();
  const [step, setStep] = useState<"photos" | "details" | "publish">("photos");
  const [consent, setConsent] = useState(false);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  const photosReady =
    listing.images.some((i) => i.status === "ready") &&
    !listing.images.some((i) => i.status === "reserved");
  const [lastStep, setLastStep] = useState(
    photosReady
      ? listingInputSchema.safeParse(listing).success &&
        (channel || listing.contactConfirmed)
        ? 2
        : 1
      : 0,
  );
  const steps = ["photos", "details", "publish"] as const;
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
    setInvalidFields((old) => old.filter((field) => field !== key));
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
  function showStep(next: typeof step) {
    setStep(next);
    requestAnimationFrame(() => {
      const panel = editorRef.current?.querySelector<HTMLElement>(
        `#listing-panel-${next}`,
      );
      panel?.focus({ preventScroll: true });
      panel?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    });
  }
  async function persist(complete: boolean): Promise<boolean> {
    const candidate = listingWithTitle(form);
    const missing = complete ? missingListingFields(candidate) : [];
    if (complete && (!photosReady || missing.length)) {
      setInvalidFields(missing);
      setError(
        !photosReady
          ? "Adicione ao menos uma foto para continuar."
          : `Para continuar, complete: ${missing.map((key) => LISTING_FIELD_LABELS[key] ?? key).join("; ")}.`,
      );
      requestAnimationFrame(() => {
        const target =
          editorRef.current?.querySelector<HTMLElement>(
            `#listing-field-${missing[0]}`,
          ) ??
          editorRef.current?.querySelector<HTMLElement>("[data-wizard-error]");
        target?.focus();
      });
      return false;
    }
    if (
      complete &&
      !channel &&
      (!canPublish ||
        !verifiedPhone ||
        memberPhone(contactPhone)?.replace("+", "") !== verifiedPhone)
    ) {
      setError(
        "Para continuar, confirme um WhatsApp validado. Altere e valide o número no seu perfil se necessário.",
      );
      return false;
    }
    const data = listingDraftInputSchema.safeParse(candidate);
    if (!data.success) {
      setError(
        "Confira os campos preenchidos. Você pode salvar informações incompletas como rascunho.",
      );
      return false;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const saved = listingSchema.parse(
        await call("save", {
          id: listing.id,
          ...data.data,
          ...(!channel && complete
            ? {
                confirmContact: true,
                contactPhone: memberPhone(contactPhone)?.replace("+", "") ?? "",
              }
            : {}),
        }),
      );
      setForm(saved);
      setDirty(false);
      setInvalidFields([]);
      await onChange();
      setMessage("Rascunho salvo.");
      return true;
    } catch (e) {
      setError(classifiedsError(e) || memberError(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function navigate(next: typeof step) {
    if (busy) return;
    const current = steps.indexOf(step),
      target = steps.indexOf(next);
    if (billingLocked || !draft) {
      if (target <= lastStep) showStep(next);
      return;
    }
    if (target <= current) {
      showStep(next);
      return;
    }
    if (step === "photos" && next === "details") {
      if (!photosReady) {
        setError("Adicione ao menos uma foto para continuar.");
        return;
      }
      if (dirty && !(await persist(false))) return;
      setLastStep((value) => Math.max(value, 1));
      showStep("details");
      return;
    }
    if (step === "details" && next === "publish") {
      if (!(await persist(true))) return;
      setLastStep(2);
      showStep("publish");
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    await navigate("publish");
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
      for (const [index, file] of files.entries()) {
        setPhotoProgress(
          `Preparando e enviando foto ${index + 1} de ${files.length}…`,
        );
        await upload(file, listing.id);
      }
      setMessage("Fotos adicionadas.");
    } catch (e) {
      setError(classifiedsError(e) || memberError(e));
    } finally {
      await onChange().catch(() => {});
      setPhotoProgress(undefined);
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
          id={`listing-field-${key}`}
          aria-label={label}
          aria-describedby={`listing-field-${key}-limits`}
          aria-invalid={invalidFields.includes(key)}
          className={`${field} min-h-32 ${invalidFields.includes(key) ? "border-red-600" : ""}`}
          value={form[key]}
          onChange={(e) => change(key, e.target.value)}
          maxLength={max}
          minLength={min}
          required={min > 0}
        />
      ) : (
        <input
          id={`listing-field-${key}`}
          aria-label={label}
          aria-describedby={`listing-field-${key}-limits`}
          aria-invalid={invalidFields.includes(key)}
          className={`${field} ${invalidFields.includes(key) ? "border-red-600" : ""}`}
          value={form[key]}
          onChange={(e) => change(key, e.target.value)}
          maxLength={max}
          minLength={min}
          required={min > 0}
        />
      )}
      <FieldCounter
        id={`listing-field-${key}-limits`}
        value={form[key]}
        min={key === "title" ? 6 : min}
        max={max}
        optional={min === 0}
      />
    </label>
  );
  return (
    <div
      ref={editorRef}
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
                  if (index > lastStep || Math.abs(index - current) > 1) return;
                  void navigate(keys[index]);
                }}
                aria-controls={`listing-panel-${key}`}
                disabled={
                  busy ||
                  steps.indexOf(key) > lastStep ||
                  Math.abs(steps.indexOf(key) - steps.indexOf(step)) > 1
                }
                onClick={() => void navigate(key)}
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
            tabIndex={-1}
            data-wizard-error
            className="mb-5 rounded-lg bg-red-50 p-4 text-red-900"
          >
            {error}
          </p>
        )}
        {message &&
          !(
            listing.status === "published" && message === "Rascunho salvo."
          ) && (
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
            alterar fotos ou informações, cancele o pagamento pendente na etapa
            Publicar e aguarde a confirmação.
          </p>
        )}
        {busy && (
          <p role="status" className="mb-4">
            {photoProgress ?? "Salvando alteração…"}
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
                    ...listingWithTitle(form),
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
                ...listingWithTitle(form),
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
              tabIndex={-1}
              className="scroll-mt-28 pb-3 outline-none"
            >
              <h3 id="listing-photos" className="text-lg font-bold">
                1. Fotos da bike · {listing.images.length}/5
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Envie de 1 a 5 fotos. Mostre a bike inteira, os dois lados,
                bateria e detalhes. A primeira foto será a capa. JPEG, PNG ou
                WebP, até {MEMBER_IMAGE_MAX_MB} MB por foto. Nós otimizamos as
                imagens automaticamente para o site.
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
                                call("cover", {
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
                      <div
                        className="mt-2 flex flex-wrap gap-2"
                        role="group"
                        aria-label={`Ordem da foto ${index + 1}`}
                      >
                        {[-1, 1].map((direction) => (
                          <button
                            type="button"
                            key={direction}
                            disabled={
                              locked ||
                              index + direction < 0 ||
                              index + direction >= listing.images.length ||
                              listing.images.some((i) => i.status !== "ready")
                            }
                            className="min-h-11 rounded-lg border border-line px-3 text-sm disabled:opacity-40"
                            aria-label={`Mover foto ${index + 1} para ${direction < 0 ? "antes" : "depois"}`}
                            onClick={() => {
                              const ids = listing.images.map((i) => i.id);
                              const target = index + direction;
                              [ids[index], ids[target]] = [
                                ids[target],
                                ids[index],
                              ];
                              void run(
                                () =>
                                  call("reorder", {
                                    id: listing.id,
                                    imageIds: ids,
                                  }),
                                "Ordem das fotos atualizada. A primeira é a capa.",
                              );
                            }}
                          >
                            {direction < 0 ? "← Antes" : "Depois →"}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() =>
                          void run(
                            () => remove(image.path, image.id, listing.id),
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
              <div
                className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center"
                data-testid="photo-step-actions"
              >
                {draft && listing.images.length < 5 && (
                  <label className="inline-flex min-h-12 cursor-pointer items-center rounded-xl border border-action px-4 font-semibold text-action focus-within:ring-2 focus-within:ring-action">
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
                  className={`${button} w-full sm:ml-auto sm:w-auto`}
                  disabled={busy || !photosReady}
                  onClick={() => void navigate("details")}
                >
                  Continuar para informações
                </button>
              </div>
            </section>
            <form
              hidden={step !== "details"}
              role="tabpanel"
              id="listing-panel-details"
              aria-labelledby="listing-tab-details"
              tabIndex={-1}
              className="scroll-mt-28 outline-none"
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
                {input("title", "Título do anúncio", 100, 0)}
                <p className="text-sm text-muted-foreground">
                  Se deixar o título em branco, usamos a marca e o modelo da
                  bike.
                </p>
                <div className="grid gap-5 sm:grid-cols-2">
                  {input("brand", "Marca", 60)}
                  {input("model", "Modelo", 80)}
                  <label className="block font-semibold">
                    Preço de venda (R$)
                    <input
                      id="listing-field-priceCents"
                      aria-label="Preço de venda (R$)"
                      aria-describedby="listing-field-priceCents-limits"
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
                    <span
                      id="listing-field-priceCents-limits"
                      className="mt-2 block text-xs font-normal text-muted-foreground"
                    >
                      Mínimo R$1 · máximo R$1.000.000
                    </span>
                  </label>
                  <label className="block font-semibold">
                    Quilometragem (km)
                    <input
                      id="listing-field-mileageKm"
                      aria-label="Quilometragem (km)"
                      aria-describedby="listing-field-mileageKm-limits"
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
                    <span
                      id="listing-field-mileageKm-limits"
                      className="mt-2 block text-xs font-normal text-muted-foreground"
                    >
                      De 0 a 1.000.000 km
                    </span>
                  </label>
                  {input("city", "Cidade", 80, 2)}
                  <label className="block font-semibold">
                    Estado
                    <select
                      aria-label="Estado"
                      className={field}
                      required
                      id="listing-field-state"
                      aria-invalid={invalidFields.includes("state")}
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
                      id="listing-field-modelYear"
                      aria-label="Ano do modelo (opcional)"
                      aria-describedby="listing-field-modelYear-limits"
                      aria-invalid={invalidFields.includes("modelYear")}
                      value={form.modelYear ?? ""}
                      onChange={(e) =>
                        change(
                          "modelYear",
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                    <span
                      id="listing-field-modelYear-limits"
                      className="mt-2 block text-xs font-normal text-muted-foreground"
                    >
                      De 1980 a {new Date().getFullYear() + 1}
                    </span>
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
                <p className="text-sm text-muted-foreground">
                  Conte como está a bike, seu tempo de uso e os detalhes que o
                  comprador precisa saber.
                </p>
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
                <section
                  aria-labelledby="listing-contact-title"
                  className="rounded-2xl border border-line bg-surface p-5"
                >
                  <h4
                    id="listing-contact-title"
                    className="text-lg font-bold text-ink"
                  >
                    Como os compradores vão falar com você
                  </h4>
                  {!channel && (
                    <>
                      <label className="mt-4 block font-semibold">
                        WhatsApp que receberá os contatos
                        <input
                          type="tel"
                          className={field}
                          value={contactPhone}
                          onChange={(e) =>
                            setContactPhone(e.target.value.replace(/\D/g, ""))
                          }
                          aria-label="WhatsApp que receberá os contatos"
                          aria-describedby="listing-phone-limits"
                          maxLength={13}
                        />
                      </label>
                      <FieldCounter
                        id="listing-phone-limits"
                        value={contactPhone}
                        min={11}
                        max={13}
                      />
                      <p className="mt-2 text-sm text-muted-foreground">
                        O botão do anúncio abrirá uma conversa diretamente neste
                        WhatsApp. Ele precisa estar validado no seu perfil.
                      </p>
                      <a
                        href="/conta?modo=perfil&retorno=%2Fconta%2Fanuncios"
                        className="inline-flex min-h-11 items-center font-semibold text-action underline"
                      >
                        Alterar ou validar meu WhatsApp
                      </a>
                    </>
                  )}
                  <label className="mt-3 block font-semibold">
                    Mensagem que gostaria de receber
                    <textarea
                      aria-label="Mensagem que gostaria de receber"
                      aria-describedby="listing-message-limits"
                      className={`${field} min-h-28`}
                      maxLength={600}
                      value={form.whatsappMessage || DEFAULT_LISTING_MESSAGE}
                      onChange={(e) =>
                        change("whatsappMessage", e.target.value)
                      }
                    />
                  </label>
                  <FieldCounter
                    id="listing-message-limits"
                    value={form.whatsappMessage || DEFAULT_LISTING_MESSAGE}
                    max={600}
                    min={0}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Use {"{bike}"} para o nome da bicicleta, que aparece em
                    negrito no WhatsApp, e {"{link}"} para o endereço do
                    anúncio. Se não os incluir, adicionaremos os dois ao final.
                  </p>
                  <p
                    className="mt-3 whitespace-pre-wrap break-words text-sm"
                    aria-label="Prévia da mensagem de contato"
                  >
                    {listingWhatsAppMessage({ ...form, id: listing.id })
                      .split(/(\*[^*]+\*)/)
                      .map((part, i) =>
                        part.startsWith("*") ? (
                          <strong key={i}>{part.slice(1, -1)}</strong>
                        ) : (
                          part
                        ),
                      )}
                  </p>
                </section>
                <div
                  className="flex flex-col gap-3 sm:flex-row sm:items-center"
                  data-testid="details-step-actions"
                >
                  <button
                    type="button"
                    className="min-h-12 px-3 font-semibold text-action underline"
                    disabled={busy}
                    onClick={() => void navigate("photos")}
                  >
                    Voltar às fotos
                  </button>
                  <button
                    type="button"
                    className="min-h-12 rounded-xl border border-action px-4 font-semibold text-action disabled:opacity-50"
                    disabled={busy || !dirty}
                    onClick={() => void persist(false)}
                  >
                    Salvar rascunho
                  </button>
                  <button
                    type="submit"
                    className={`${button} w-full sm:ml-auto sm:w-auto`}
                    disabled={busy}
                  >
                    {busy ? "Salvando…" : "Salvar e continuar"}
                  </button>
                </div>
              </fieldset>
            </form>
          </>
        )}
        <section
          hidden={step !== "publish" || preview}
          role="tabpanel"
          id="listing-panel-publish"
          aria-labelledby="listing-tab-publish"
          tabIndex={-1}
          className="scroll-mt-28 pt-2 outline-none"
        >
          <h3 id="listing-publish" className="text-lg font-bold">
            3. Publicação
          </h3>
          <button
            type="button"
            className="mb-4 min-h-11 font-semibold text-action underline"
            disabled={busy}
            onClick={() => void navigate("details")}
          >
            Voltar às informações
          </button>
          {draft ? (
            <>
              <div className="mt-4 rounded-xl border border-line bg-surface p-4 text-sm">
                <p className="font-semibold text-ink">
                  {actions
                    ? "Bike do canal · publicação institucional por 90 dias"
                    : listing.feeStatus === "courtesy"
                      ? "Cortesia · publicação por 90 dias"
                      : `Publicação por 90 dias · pagamento único de ${classifiedsFeeLabel()}`}
                </p>
              </div>
              {!publishReady && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Falta completar:{" "}
                  {missingListingFields(listing)
                    .map((key) => LISTING_FIELD_LABELS[key] ?? key)
                    .join("; ")}
                  {!photosReady ? "; ao menos uma foto" : ""}.
                  <button
                    type="button"
                    onClick={() => showStep("details")}
                    className="ml-2 font-semibold text-action underline"
                  >
                    Completar informações
                  </button>
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
                        () => call("sold", { id: listing.id }),
                        "Bike marcada como vendida e retirada da vitrine.",
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
                    () => call("withdraw", { id: listing.id }),
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
                  () => call("archive", { id: listing.id }),
                  "Anúncio arquivado.",
                )
              }
              className="mt-5 block min-h-11 text-sm text-muted-foreground underline"
            >
              Desativar rascunho
            </button>
          )}
          {actions
            ? draft &&
              actions.publication({
                ready: canPublish && publishReady,
                locked: busy || dirty,
                submit: (phone) =>
                  run(
                    () =>
                      call("publish", {
                        id: listing.id,
                        whatsapp: phone,
                        contactConsent: true,
                      }),
                    "Bike do canal publicada.",
                  ),
              })
            : (draft || listing.feeStatus !== "pilot_exempt") && (
                <ListingBillingPanel
                  courtesy={listing.feeStatus === "courtesy"}
                  courtesyExpiresAt={listing.displayExpiresAt}
                  published={listing.status === "published"}
                  listingId={listing.id}
                  active={step === "publish" && !preview}
                  reason={
                    !canPublish
                      ? "Confirme seu e-mail e WhatsApp no perfil para anunciar."
                      : !publishReady
                        ? `Complete: ${missingListingFields(listing)
                            .map((key) => LISTING_FIELD_LABELS[key] ?? key)
                            .join(
                              "; ",
                            )}${!photosReady ? "; ao menos uma foto" : ""}.`
                        : dirty
                          ? "Salve as alterações do rascunho antes de continuar."
                          : ""
                  }
                  ready={draft && canPublish && publishReady}
                  locked={busy || dirty}
                  contactConsent={consent}
                  onConsentChange={setConsent}
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
            ...listingWithTitle(form),
            images: listing.images,
            sellerType: channel ? "channel" : "individual",
          }}
          preview
        />
        <p className="mt-4 text-sm text-muted-foreground">
          O botão de contato abre o{" "}
          {actions ? "WhatsApp da Vitale informado" : "WhatsApp validado"}, com
          o título e o link da bike na mensagem.
        </p>
        <p className="mt-3 text-xs font-semibold text-action">
          {dirty ? "Alterações ainda não salvas" : "Dados e fotos salvos"}
        </p>
      </aside>
    </div>
  );
}
