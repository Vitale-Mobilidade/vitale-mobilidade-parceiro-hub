import { WosiCampaignSummary } from "@/components/admin/WosiCampaignSummary";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { LinksCampaignSummary } from "@/components/admin/LinksCampaignSummary";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  growthRange,
  saoPauloDay,
} from "../../../supabase/functions/_shared/growth-range";

export const Route = createFileRoute("/admin/campanhas")({
  head: () => ({
    meta: [
      { title: "Campanhas Vitale" },
      {
        name: "description",
        content:
          "Resultados das campanhas Vitale: cliques no banner Wosi e jornadas anônimas do Instagram.",
      },
      { property: "og:title", content: "Campanhas Vitale" },
      {
        property: "og:description",
        content:
          "Jornadas anônimas, oito destinos e ações observadas da bio ao site Vitale.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CampaignsRoute,
});
function CampaignsRoute() {
  return (
    <AdminShell>
      {(role) =>
        role === "admin" ? (
          <Campaigns />
        ) : (
          <p role="alert">Acesso restrito a administradores.</p>
        )
      }
    </AdminShell>
  );
}
function Campaigns() {
  const [range, setRange] = useState(() => growthRange({ rangeDays: 30 }));
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    try {
      setRange(
        growthRange({
          startDate: values.get("start"),
          endDate: values.get("end"),
        }),
      );
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Período inválido.");
    }
  }
  return (
    <section className="space-y-6 text-ink">
      <header>
        <p className="text-sm font-bold text-action">CAMPANHAS VITALE</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Resultados das campanhas
        </h1>
        <p className="mt-2 text-muted-foreground">
          Acompanhe os cliques da Wosi e as jornadas anônimas do link da bio.
        </p>
      </header>
      <form
        onSubmit={submit}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-card p-4"
      >
        <label className="flex-1 text-sm">
          Início
          <input
            required
            type="date"
            name="start"
            max={saoPauloDay()}
            defaultValue={range.startDate}
            className="mt-1 block min-h-11 w-full rounded-md border border-line px-3"
          />
        </label>
        <label className="flex-1 text-sm">
          Fim
          <input
            required
            type="date"
            name="end"
            max={saoPauloDay()}
            defaultValue={range.endDate}
            className="mt-1 block min-h-11 w-full rounded-md border border-line px-3"
          />
        </label>
        <Button
          size="lg"
          className="min-h-11 rounded-md bg-ink px-5 font-semibold text-background hover:bg-ink"
        >
          Aplicar período
        </Button>
      </form>
      {error && <p role="alert">{error}</p>}
      <WosiCampaignSummary
        key={`wosi:${range.startDate}:${range.endDate}`}
        startDate={range.startDate}
        endDate={range.endDate}
      />
      <section aria-labelledby="instagram-campaign-heading">
        <h2 id="instagram-campaign-heading" className="mb-4 text-2xl font-bold">
          Instagram · Link da bio
        </h2>
        <LinksCampaignSummary
          key={`${range.startDate}:${range.endDate}`}
          startDate={range.startDate}
          endDate={range.endDate}
        />
      </section>
    </section>
  );
}
