import { useState } from "react";
import {
  Bike,
  Search,
  Plus,
  Pencil,
  PauseCircle,
  CheckCircle2,
  RotateCcw,
  Image,
} from "lucide-react";
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
import {
  isEmptyBikeDraft,
  LISTING_STATUSES,
  type BikeListing,
} from "@/lib/bike-classifieds";
import { formatBRL } from "@/lib/price-tracker";
export type ListingAction = "archive" | "sold" | "withdraw";
export function ListingDashboard({
  listings,
  channel,
  busy,
  onCreate,
  onEdit,
  onAction,
}: {
  listings: BikeListing[];
  channel: boolean;
  busy: boolean;
  onCreate: () => void;
  onEdit: (listing: BikeListing) => void;
  onAction: (action: ListingAction, listing: BikeListing) => Promise<void>;
}) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [disabling, setDisabling] = useState<BikeListing | null>(null);
  const meaningful = listings.filter(
    (l) => !isEmptyBikeDraft({ ...l, status: "draft" }),
  );
  const tabs = [
    { key: "all", label: "Em gestão" },
    { key: "published", label: "Ativos" },
    { key: "draft", label: "Rascunhos" },
    { key: "sold", label: "Vendidas" },
    { key: "archived", label: "Desativados" },
  ];
  const matches = (l: BikeListing, value: string) =>
    value === "all" ? l.status !== "archived" : l.status === value;
  const visible = meaningful.filter(
    (l) =>
      matches(l, filter) &&
      `${l.title} ${l.brand} ${l.model}`
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR")),
  );
  const actionClass =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-50";
  return (
    <section aria-labelledby="listing-dashboard-title">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-semibold text-action">
            {channel
              ? "Vitale Mobilidade · gestão do canal"
              : "Área do anunciante"}
          </p>
          <h1
            id="listing-dashboard-title"
            className="mt-2 text-3xl font-bold tracking-tight text-ink"
          >
            {channel ? "Bikes do canal" : "Meus anúncios"}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Acompanhe suas bikes, edite os anúncios e mantenha a disponibilidade
            atualizada.
          </p>
        </div>
        <button
          onClick={onCreate}
          disabled={busy}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-action px-5 py-3 font-bold text-white disabled:opacity-50"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          {channel ? "Nova bike do canal" : "Criar anúncio"}
        </button>
      </div>
      {!channel && (
        <p className="mt-6 rounded-xl bg-white p-4 text-sm text-muted-foreground">
          R$150 por anúncio. Nesta etapa, sua conta convidada tem isenção;
          nenhuma cobrança será feita.
        </p>
      )}
      <div className="mt-8 rounded-2xl border border-line bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div
            className="flex max-w-full flex-wrap gap-2"
            role="group"
            aria-label="Filtrar anúncios por status"
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                aria-pressed={filter === tab.key}
                className={`min-h-11 rounded-xl px-3 py-2 text-sm font-semibold ${filter === tab.key ? "bg-ink text-white" : "bg-surface text-ink"}`}
              >
                {tab.label}{" "}
                <span className="ml-1 opacity-75">
                  {meaningful.filter((l) => matches(l, tab.key)).length}
                </span>
              </button>
            ))}
          </div>
          <label className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-line px-3 sm:w-72">
            <Search
              className="h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="sr-only">Pesquisar suas bikes</span>
            <input
              className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por bike, marca ou modelo"
              type="search"
            />
          </label>
        </div>
      </div>
      {visible.length ? (
        <ul className="mt-5 space-y-4">
          {visible.map((listing) => {
            const photo = listing.images.find(
              (i) => i.status === "ready" && i.url,
            );
            return (
              <li
                key={listing.id}
                className="rounded-2xl border border-line bg-white p-4 sm:p-5"
              >
                <article className="flex min-w-0 flex-col gap-5 sm:flex-row">
                  <div className="flex aspect-[4/3] w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface sm:aspect-square sm:w-36">
                    {photo ? (
                      <img
                        src={photo.url}
                        alt={listing.title}
                        width={200}
                        height={200}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Image
                        className="h-10 w-10 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h2 className="break-words text-xl font-bold text-ink">
                        {listing.title || "Anúncio sem título"}
                      </h2>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${listing.status === "published" ? "bg-emerald-50 text-emerald-900" : "bg-surface text-muted-foreground"}`}
                      >
                        {LISTING_STATUSES[listing.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-xl font-bold text-action">
                      {listing.priceCents
                        ? formatBRL(listing.priceCents / 100)
                        : "Preço a informar"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[
                        listing.brand,
                        listing.model,
                        listing.city &&
                          `${listing.city}${listing.state ? `, ${listing.state}` : ""}`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Complete a ficha da bike"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Atualizado em{" "}
                      {new Date(listing.updatedAt).toLocaleDateString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                      })}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(listing.status === "draft" ||
                        listing.status === "published") && (
                        <button
                          className={actionClass}
                          disabled={busy}
                          onClick={() => onEdit(listing)}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          {listing.status === "published"
                            ? "Pausar e editar"
                            : "Editar anúncio"}
                        </button>
                      )}
                      {listing.status === "published" && (
                        <>
                          <a
                            href={`/venda-sua-bike/${listing.id}`}
                            className={actionClass}
                          >
                            Ver anúncio
                          </a>
                          <button
                            className={actionClass}
                            disabled={busy}
                            onClick={() => void onAction("sold", listing)}
                          >
                            <CheckCircle2
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                            Marcar como vendida
                          </button>
                        </>
                      )}
                      {listing.status === "archived" ||
                      listing.status === "sold" ? (
                        <button
                          className={actionClass}
                          disabled={busy}
                          onClick={() => void onAction("withdraw", listing)}
                        >
                          <RotateCcw className="h-4 w-4" aria-hidden="true" />
                          Reativar como rascunho
                        </button>
                      ) : null}
                      {listing.status !== "archived" && (
                        <button
                          className={actionClass}
                          disabled={busy}
                          onClick={() => setDisabling(listing)}
                        >
                          <PauseCircle className="h-4 w-4" aria-hidden="true" />
                          Desativar
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-line bg-white px-6 py-14 text-center">
          <Bike className="mx-auto h-12 w-12 text-action" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-bold text-ink">
            {meaningful.length
              ? "Nenhuma bike neste filtro"
              : channel
                ? "Vamos preparar a primeira bike do canal?"
                : "Seu próximo anúncio começa aqui"}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {meaningful.length
              ? "Experimente outro status ou ajuste sua busca."
              : "Comece pelas fotos, preencha a ficha e confira a prévia. O anúncio só vai ao ar quando você escolher publicar."}
          </p>
        </div>
      )}
      <AlertDialog
        open={Boolean(disabling)}
        onOpenChange={(open) => {
          if (!open) setDisabling(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar este anúncio?</AlertDialogTitle>
            <AlertDialogDescription>
              “{disabling?.title}” sairá da vitrine e deixará de receber novos
              contatos pelo site. As fotos e os dados serão mantidos. Você pode
              reativá-lo depois como rascunho.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter anúncio</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (disabling) void onAction("archive", disabling);
              }}
            >
              Desativar anúncio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
