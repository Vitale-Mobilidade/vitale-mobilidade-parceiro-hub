import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Instagram,
  MousePointer2,
  Route,
  CheckCircle2,
  Youtube,
  Bike,
  MessageCircle,
  Radar,
  Mail,
  Headphones,
} from "lucide-react";
import {
  BIO_CHOICES,
  type JourneyReport,
  type JourneyStep,
} from "../../../supabase/functions/_shared/links-journey";
const numbers = new Intl.NumberFormat("pt-BR");
const pct = (n: number, d: number) =>
  d > 0
    ? new Intl.NumberFormat("pt-BR", {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(n / d)
    : "—";
const stageLabel: Record<string, string> = {
  landing: "Entrou em /links",
  page_view: "Abriu página",
  quiz_started: "Iniciou o Quiz",
  quiz_completed: "Viu o resultado do Quiz",
  newsletter_subscribed: "Cadastro da newsletter aceito",
  offer_click: "Clicou em uma oferta",
};
function stepLabel(step: JourneyStep) {
  return step.stage === "button_click"
    ? `Escolheu ${BIO_CHOICES.find((c) => c.id === step.choice)?.label ?? "um botão"}`
    : (stageLabel[step.stage] ?? step.stage);
}
const icons = {
  youtube_video: Youtube,
  quiz: Bike,
  whatsapp: MessageCircle,
  radar: Radar,
  newsletter: Mail,
  youtube_channel: Youtube,
  instagram: Instagram,
  spotify: Headphones,
};
export function LinksInstagramFunnel({
  data,
  views,
  offset,
  onPage,
}: {
  data?: JourneyReport;
  views?: number;
  offset: number;
  onPage: (offset: number) => void;
}) {
  const covered = Boolean(data?.coverageSince);
  const stages = [
    {
      label: "Entraram na bio",
      value: data?.sessions,
      description: "Sessões de navegação",
      icon: Instagram,
    },
    {
      label: "Escolheram um botão",
      value: data?.clicked,
      description: "Pelo menos um clique",
      icon: MousePointer2,
    },
    {
      label: "Continuaram no site",
      value: data?.continued,
      description: "Abriram uma página após clicar",
      icon: Route,
    },
    {
      label: "Concluíram uma ação",
      value: data?.converted,
      description: "Quiz, newsletter ou oferta",
      icon: CheckCircle2,
    },
  ];
  return (
    <div className="space-y-6">
      <section className="grid gap-4 rounded-2xl bg-ink p-6 text-background sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-mint">
            <Instagram size={18} aria-hidden="true" />
            Instagram · link da bio
          </div>
          <h2 className="mt-3 text-2xl font-bold">
            Uma entrada. Vários caminhos.
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-background/75">
            Veja quais escolhas levam ao Quiz, ao Radar e à newsletter. As
            saídas para outros aplicativos ficam identificadas.
          </p>
        </div>
        <dl>
          <dt className="text-sm text-background/75">Visualizações de /links</dt>
          <dd className="mt-1 text-4xl font-bold tabular-nums">
            {views === undefined ? "—" : numbers.format(views)}
          </dd>
          <dd className="mt-1 text-sm text-background/75">
            Inclui acessos anteriores e repetidos
          </dd>
        </dl>
      </section>
      <section
        aria-labelledby="bio-funnel-title"
        className="rounded-2xl border border-line bg-card p-5 sm:p-6"
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 id="bio-funnel-title" className="text-xl font-bold">
            O funil da bio
          </h2>
          <span className="rounded-full bg-surface px-3 py-1 text-sm text-action">
            Jornadas anônimas
          </span>
        </div>
        <ol className="grid gap-3 lg:grid-cols-4">
          {stages.map((s, i) => (
            <li
              key={s.label}
              className="relative rounded-xl border border-line bg-surface p-4"
            >
              <s.icon size={21} aria-hidden="true" className="text-action" />
              <h3 className="mt-3 text-sm font-semibold">{s.label}</h3>
              <p className="mt-2 text-3xl font-bold tabular-nums">
                {covered ? numbers.format(s.value ?? 0) : "—"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {i === 0
                  ? s.description
                  : `${pct(s.value ?? 0, data?.sessions ?? 0)} das entradas`}
              </p>
              {i < 3 && (
                <ArrowRight
                  aria-hidden="true"
                  size={16}
                  className="absolute -right-2 top-1/2 z-10 hidden text-action lg:block"
                />
              )}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-muted-foreground">
          Acompanha sessões iniciadas no período selecionado, uma vez por etapa
          e na ordem dos eventos. Sessões não representam pessoas únicas.
        </p>
        {!covered && (
          <p
            role="status"
            className="mt-4 rounded-lg border border-line bg-surface p-4 text-sm"
          >
            A medição detalhada ainda não tem jornadas neste período. Os acessos
            antigos não permitem reconstruir cliques.
          </p>
        )}
        {data && !data.collectionEnabled && (
          <p className="mt-3 text-sm font-semibold text-action">
            Coleta de jornadas desativada. Ativação pendente.
          </p>
        )}
      </section>
      <section
        className="rounded-2xl border border-line bg-card p-5 sm:p-6"
        aria-labelledby="bio-choices-title"
      >
        <h2 id="bio-choices-title" className="text-xl font-bold">
          Em qual botão clicaram?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Uma sessão pode escolher mais de um botão. Os percentuais não precisam
          somar 100%.
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="text-muted-foreground">
                <th className="pb-3 font-medium">Destino</th>
                <th className="pb-3 font-medium">Sessões</th>
                <th className="pb-3 font-medium">Cliques</th>
                <th className="pb-3 font-medium">Das entradas</th>
                <th className="pb-3 font-medium">Depois no site</th>
                <th className="pb-3 font-medium">Ação após o clique</th>
              </tr>
            </thead>
            <tbody>
              {BIO_CHOICES.map((choice) => {
                const row = data?.choices.find((r) => r.choice === choice.id);
                const Icon = icons[choice.id];
                return (
                  <tr key={choice.id} className="border-t border-line">
                    <th scope="row" className="py-4 pr-4 font-semibold">
                      <span className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-action">
                          <Icon size={18} aria-hidden="true" />
                        </span>
                        <span>
                          {choice.label}
                          <small className="mt-1 block text-xs font-normal text-muted-foreground">
                            {choice.external
                              ? "Saída para outro aplicativo"
                              : "Continuação no site"}
                          </small>
                        </span>
                      </span>
                    </th>
                    <td className="pr-4 tabular-nums">
                      {covered ? numbers.format(row?.sessions ?? 0) : "—"}
                    </td>
                    <td className="pr-4 tabular-nums">
                      {covered ? numbers.format(row?.clicks ?? 0) : "—"}
                    </td>
                    <td className="pr-4 tabular-nums">
                      {covered
                        ? pct(row?.sessions ?? 0, data?.sessions ?? 0)
                        : "—"}
                    </td>
                    <td className="pr-4 tabular-nums">
                      {covered ? numbers.format(row?.continued ?? 0) : "—"}
                    </td>
                    <td className="tabular-nums">
                      {covered ? numbers.format(row?.converted ?? 0) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Ações observadas"
      >
        {[
          ["quiz_started", "Quiz iniciado"],
          ["quiz_completed", "Resultado do Quiz"],
          ["newsletter_subscribed", "Cadastro da newsletter"],
          ["offer_click", "Clique em oferta"],
        ].map(([stage, label]) => (
          <dl
            key={stage}
            className="rounded-xl border border-line bg-card p-5"
          >
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-2 text-2xl font-bold tabular-nums">
              {covered
                ? numbers.format(
                    data?.conversions.find((c) => c.stage === stage)
                      ?.sessions ?? 0,
                  )
                : "—"}
            </dd>
            <dd className="mt-1 text-sm text-muted-foreground">
              Sessões após uma escolha na bio
            </dd>
          </dl>
        ))}
      </section>
      <section
        className="rounded-2xl border border-line bg-card p-5 sm:p-6"
        aria-labelledby="bio-paths-title"
      >
        <h2 id="bio-paths-title" className="text-xl font-bold">
          O que aconteceu depois?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Abra uma sessão para ver a sequência. Sem nomes, contatos ou respostas
          do Quiz.
        </p>
        <div className="mt-4 divide-y divide-line">
          {data?.journeys.map((journey, i) => (
            <details key={journey.session} className="group py-4">
              <summary className="cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-action">
                <span className="font-semibold">
                  Sessão {numbers.format(offset + i + 1)}
                </span>
                <span className="ml-3 text-sm text-muted-foreground">
                  {new Date(journey.startedAt).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    dateStyle: "short",
                    timeStyle: "short",
                  })}{" "}
                  · {journey.steps.length} ações
                </span>
              </summary>
              <ol className="mt-4 ml-2 space-y-3 border-l-2 border-line pl-5">
                {journey.steps.map((step) => (
                  <li key={step.sequence}>
                    <p className="text-sm font-semibold">{stepLabel(step)}</p>
                    {step.stage !== "landing" && (
                      <p className="mt-1 break-all text-sm text-muted-foreground">
                        {step.path}
                        {step.bikeId
                          ? ` · ${step.bikeId.replaceAll("_", " ")}`
                          : ""}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </div>
        {!data?.journeys.length && (
          <p className="mt-5 text-sm text-muted-foreground">
            As próximas jornadas aparecerão aqui quando a coleta estiver ativa.
          </p>
        )}
        {covered && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <Button variant="ghost"
              type="button"
              disabled={offset === 0}
              onClick={() => onPage(Math.max(0, offset - 20))}
              className="min-h-11 rounded-md border border-line px-4 text-sm font-semibold disabled:opacity-40"
            >
              Anteriores
            </Button>
            <span className="text-sm text-muted-foreground">
              {offset + 1}–{Math.min(offset + 20, data?.sessions ?? 0)} de{" "}
              {numbers.format(data?.sessions ?? 0)}
            </span>
            <Button variant="ghost"
              type="button"
              disabled={offset >= 10000 || offset + 20 >= (data?.sessions ?? 0)}
              onClick={() => onPage(offset + 20)}
              className="min-h-11 rounded-md border border-line px-4 text-sm font-semibold disabled:opacity-40"
            >
              Próximas
            </Button>
          </div>
        )}
      </section>
      <p className="text-sm leading-relaxed text-muted-foreground">
        WhatsApp, YouTube, Instagram e Spotify: medimos o clique de saída, sem
        presumir entrada no grupo, visualização ou novo seguidor. Clique em
        oferta não comprova compra. Origem Instagram corresponde ao canal
        definido para o link da bio. Dados detalhados disponíveis por até 30
        dias, fora de Growth.
      </p>
    </div>
  );
}
