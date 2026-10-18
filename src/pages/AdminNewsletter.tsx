import { NewsletterPreviewPanel } from "@/components/admin/NewsletterPreviewPanel";
import { NewsletterCampaignResults } from "@/components/admin/NewsletterCampaignResults";
import type { NewsletterDraft } from "@/lib/newsletter-drafts";
import { NewsletterDraftEditor } from "@/components/admin/NewsletterDraftEditor";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  newsletterCall,
  type NewsletterAdminState,
  type NewsletterPeople,
  type NewsletterMetrics,
  type NewsletterPreview,
} from "@/lib/newsletter-api";
const field = "mt-1 w-full rounded-lg border border-line bg-white p-3";
const button =
  "rounded-lg border border-line px-4 py-2 font-medium disabled:opacity-50";
const statuses: Record<string, string> = {
  syncing: "Preparando destinatários",
  creating: "Criando edição",
  ready: "Pronta para enviar",
  submitting: "Enviando ao Resend",
  submitted: "Aceita pelo Resend",
  sent: "Enviada · processamento concluído",
  uncertain: "Resultado incerto · conferir",
  failed: "Falhou",
  paused: "Pausada · conferir",
  skipped: "Sem novidades ou destinatários",
};
function NewsletterOperation() {
  const qc = useQueryClient();
  const [editionPreview, setEditionPreview] =
    useState<NewsletterPreview | null>(null);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const drafts = useQuery({
    queryKey: ["admin", "newsletter", "drafts"],
    queryFn: () => newsletterCall<{ drafts: NewsletterDraft[] }>("draft_list"),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  async function viewEdition(
    action: "campaign_preview" | "edition_preview",
    id: string,
  ) {
    setBusy(true);
    setError("");
    try {
      setEditionPreview(
        await newsletterCall<NewsletterPreview>(action, { id }),
      );
      requestAnimationFrame(() =>
        document
          .getElementById("newsletter-edition-preview")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível abrir a edição.",
      );
    } finally {
      setBusy(false);
    }
  }
  const [from, setFrom] = useState<string | null>(null),
    [reply, setReply] = useState<string | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<{ html: string; text: string } | null>(
    null,
  );
  const query = useQuery({
    queryKey: ["admin", "newsletter", "operation"],
    queryFn: () => newsletterCall<NewsletterAdminState>(),
    staleTime: 15_000,
    refetchInterval: (q) => (q.state.data?.settings.enabled ? 30_000 : false),
  });
  const [selection, setSelection] = useState({
    filter: "all",
    campaign: null as string | null,
    page: 0,
    label: "Todos os cadastrados",
  });
  const people = useQuery({
    queryKey: ["admin", "newsletter", "people", selection],
    queryFn: () =>
      newsletterCall<NewsletterPeople>("people", {
        filter: selection.filter,
        campaign: selection.campaign,
        page: selection.page,
      }),
    staleTime: 15_000,
  });
  function showPeople(
    filter: string,
    label: string,
    campaign: string | null = null,
  ) {
    setSelection({ filter, label, campaign, page: 0 });
    const panel = document.getElementById("newsletter-people")?.parentElement;
    if (panel instanceof HTMLDetailsElement) panel.open = true;
    document
      .getElementById("newsletter-people")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const personStatus: Record<string, string> = {
    eligible: "Elegível",
    legacy: "Aguarda novo aceite",
    suppressed: "Descadastrado",
    delivered: "Entrega confirmada",
    failed: "Falha / reclamação",
    unknown: "Sem confirmação individual",
  };
  const metrics = useQuery({
    queryKey: ["admin", "newsletter", "metrics"],
    queryFn: () => newsletterCall<NewsletterMetrics>("metrics"),
    staleTime: 60_000,
  });
  const data = query.data;
  async function action(name: string, payload: Record<string, unknown> = {}) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await newsletterCall<{ html?: string; text?: string }>(
        name,
        payload,
      );
      if (name === "preview" && result.html && result.text) {
        setPreview({ html: result.html, text: result.text });
        await qc.invalidateQueries({
          queryKey: ["admin", "newsletter", "drafts"],
        });
      } else {
        await qc.invalidateQueries({
          queryKey: ["admin", "newsletter", "operation"],
        });
        setNotice(
          name === "enable"
            ? "Automação ativada para segunda, quarta e sexta às 6h30. Nenhum lote antecipado."
            : name === "pause"
              ? "Automação pausada. Campanhas já aceitas pelo Resend podem continuar em entrega."
              : "Configuração atualizada.",
        );
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível completar a operação.",
      );
    } finally {
      setBusy(false);
    }
  }
  function download(kind: "html" | "text") {
    if (!preview) return;
    const url = URL.createObjectURL(
      new Blob([preview[kind]], {
        type:
          kind === "html"
            ? "text/html;charset=utf-8"
            : "text/plain;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `vitale-newsletter.${kind === "html" ? "html" : "txt"}`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Newsletter</h1>
        <p className="mt-2 text-muted-foreground">
          Artigos, Radar, bike em destaque e vídeos recentes. Segunda, quarta e
          sexta, às 6h30 de São Paulo.
        </p>
      </div>
      {query.isPending && <p role="status">Carregando a newsletter…</p>}
      {query.isError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <p>{query.error.message}</p>
          <button
            className={button + " mt-3"}
            onClick={() => {
              void query.refetch();
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Todos os cadastrados", data.audience.total, "all"],
              ["Inscritos ativos", data.audience.eligible, "eligible"],
              ["Descadastrados", data.audience.suppressed, "suppressed"],
            ].map(([label, count, filter]) => (
              <button
                type="button"
                className="rounded-xl border bg-white p-4 text-left focus-visible:outline focus-visible:outline-2"
                key={label}
                onClick={() => showPeople(String(filter), String(label))}
              >
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold">{count}</p>
                <span className="text-xs underline">Ver pessoas</span>
              </button>
            ))}
          </div>
          <section
            className="rounded-xl border bg-white p-5"
            aria-label="Novas inscrições por dia"
          >
            <h2 className="font-bold">Novas inscrições · últimos 30 dias</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastros por dia, no horário de São Paulo. Inclui quem se
              descadastrou depois.
            </p>
            {metrics.isPending && <p role="status">Carregando evolução…</p>}
            {metrics.isError && (
              <p role="alert">
                Não foi possível carregar a evolução.{" "}
                <button
                  className="underline"
                  onClick={() => void metrics.refetch()}
                >
                  Tentar novamente
                </button>
              </p>
            )}
            {metrics.data && (
              <>
                <p className="my-3">
                  <strong>
                    {metrics.data.days.reduce((sum, d) => sum + d.count, 0)}
                  </strong>{" "}
                  cadastros no período ·{" "}
                  <strong>{metrics.data.days.at(-1)?.count ?? 0}</strong> hoje ·{" "}
                  <strong>{metrics.data.radarPeople}</strong> pessoas com
                  alertas ativos no Radar
                </p>
                <div className="relative">
                  <p
                    className="mb-2 min-h-5 text-sm font-medium"
                    role="status"
                    aria-live="polite"
                  >
                    {activeDay
                      ? `${activeDay.split("-").reverse().join("/")}: ${metrics.data.days.find((d) => d.day === activeDay)?.count ?? 0} cadastros`
                      : "Passe o mouse, toque ou use o teclado para ver cada dia."}
                  </p>
                  <div
                    className="flex h-36 items-end gap-1"
                    aria-label="Gráfico de inscrições diárias"
                  >
                    {metrics.data.days.map((d) => (
                      <button
                        key={d.day}
                        type="button"
                        aria-label={`${d.day.split("-").reverse().join("/")}: ${d.count} cadastros`}
                        onMouseEnter={() => setActiveDay(d.day)}
                        onFocus={() => setActiveDay(d.day)}
                        onClick={() => setActiveDay(d.day)}
                        className="group relative flex h-full min-w-0 flex-1 items-end rounded-t focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-800"
                        title={`${d.day.split("-").reverse().join("/")}: ${d.count} cadastros`}
                      >
                        <span
                          className="w-full rounded-t bg-emerald-700 group-hover:bg-emerald-900"
                          style={{
                            height: `${(d.count / Math.max(1, ...metrics.data.days.map((v) => v.count))) * 100}%`,
                          }}
                        />
                        <span
                          className="absolute bottom-full left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-emerald-950 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                          aria-hidden="true"
                        >
                          {d.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-2 flex justify-between text-xs">
                  <span>
                    {metrics.data.days[0]?.day.split("-").reverse().join("/")}
                  </span>
                  <span>Hoje</span>
                </p>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm underline">
                    Ver valores por dia
                  </summary>
                  <div className="max-h-48 overflow-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr>
                          <th>Dia</th>
                          <th>Cadastros</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...metrics.data.days].reverse().map((d) => (
                          <tr key={d.day}>
                            <td>{d.day.split("-").reverse().join("/")}</td>
                            <td>{d.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            )}
          </section>
          <details
            className="rounded-xl border bg-white p-5"
            open={!!selection.campaign}
          >
            <summary className="cursor-pointer font-bold">
              Cadastros e destinatários
            </summary>
            <section
              id="newsletter-people"
              className="rounded-xl border bg-white p-5"
              aria-label="Pessoas da newsletter"
            >
              <h2 className="font-bold">{selection.label}</h2>
              {selection.campaign && (
                <p className="mt-2 text-sm">
                  Eventos antigos podem ter apenas contagem agregada. Sem
                  confirmação individual não significa que a pessoa não recebeu.
                </p>
              )}
              <button
                className={button + " mt-3"}
                onClick={() => showPeople("all", "Todos os cadastrados")}
              >
                Ver todos os cadastros
              </button>
              {people.isPending && <p role="status">Carregando pessoas…</p>}
              {people.isError && (
                <div role="alert">
                  <p>{people.error.message}</p>
                  <button
                    className={button}
                    onClick={() => {
                      void people.refetch();
                    }}
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
              {people.data && (
                <>
                  <p className="my-3" role="status">
                    {people.data.total} pessoas neste filtro
                  </p>
                  {!people.data.rows.length ? (
                    <p>Nenhuma pessoa neste filtro.</p>
                  ) : (
                    <ul className="divide-y">
                      {people.data.rows.map((person) => (
                        <li key={person.id} className="py-3 break-words">
                          <p className="font-medium">{person.person_name}</p>
                          <p>{person.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Cadastro:{" "}
                            {new Date(person.created_at).toLocaleString(
                              "pt-BR",
                              {
                                timeZone: "America/Sao_Paulo",
                                dateStyle: "short",
                                timeStyle: "short",
                              },
                            )}{" "}
                            · {personStatus[person.subscription_status]}
                          </p>
                          {person.delivery_status && (
                            <p className="text-sm">
                              {personStatus[person.delivery_status]}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      className={button}
                      disabled={!selection.page}
                      onClick={() =>
                        setSelection((v) => ({ ...v, page: v.page - 1 }))
                      }
                    >
                      Anterior
                    </button>
                    <span>Página {selection.page + 1}</span>
                    <button
                      className={button}
                      disabled={(selection.page + 1) * 25 >= people.data.total}
                      onClick={() =>
                        setSelection((v) => ({ ...v, page: v.page + 1 }))
                      }
                    >
                      Próxima
                    </button>
                  </div>
                </>
              )}
            </section>
          </details>
          <section
            className="rounded-xl border bg-white p-5"
            aria-label="Próximas edições preparadas"
          >
            <h2 className="font-bold">Próximas edições</h2>
            {drafts.isPending && <p role="status">Carregando edições…</p>}
            {drafts.isError && (
              <p role="alert">
                Não foi possível carregar as edições.{" "}
                <button
                  className="underline"
                  onClick={() => void drafts.refetch()}
                >
                  Tentar novamente
                </button>
              </p>
            )}
            {drafts.data && (
              <>
                {!drafts.data.drafts.some(
                  (d) =>
                    d.edition_day &&
                    d.edition_day >= today &&
                    !data.campaigns.some(
                      (c) => c.edition_day === d.edition_day,
                    ),
                ) && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Nenhuma próxima edição preparada ainda. Ela aparecerá aqui
                    assim que o conteúdo for criado.
                  </p>
                )}
                {drafts.data.drafts
                  .filter(
                    (d) =>
                      d.edition_day &&
                      d.edition_day >= today &&
                      !data.campaigns.some(
                        (c) => c.edition_day === d.edition_day,
                      ),
                  )
                  .sort((a, b) => a.edition_day!.localeCompare(b.edition_day!))
                  .map((d) => (
                    <div key={d.id} className="mt-3 border-t pt-3">
                      <p className="font-medium">{d.content.subject}</p>
                      <p className="text-sm">
                        Envio previsto:{" "}
                        {d.edition_day!.split("-").reverse().join("/")} às 06h30
                        · São Paulo
                      </p>
                      <button
                        className={button + " mt-2"}
                        disabled={busy}
                        onClick={() =>
                          void viewEdition("edition_preview", d.id)
                        }
                      >
                        Visualizar conteúdo e HTML
                      </button>
                    </div>
                  ))}
              </>
            )}
            <details className="mt-3">
              <summary className="cursor-pointer text-sm underline">
                Ajustar textos de próximas edições
              </summary>
              <div className="mt-3">
                <NewsletterDraftEditor
                  lockedDays={data.campaigns.map((c) => c.edition_day)}
                />
              </div>
            </details>
          </section>
          {editionPreview && (
            <NewsletterPreviewPanel
              key={editionPreview.html}
              preview={editionPreview}
              onClose={() => setEditionPreview(null)}
            />
          )}
          <details className="rounded-xl border bg-white p-5">
            <summary className="cursor-pointer font-bold">
              Configurações e preparação de edições
            </summary>

            <div className="rounded-xl border bg-white p-5">
              <h2 className="font-bold">Entrega pelo Resend</h2>
              <p className="mt-2">
                {data.settings.enabled
                  ? "Automação ativa"
                  : "Automação pausada"}{" "}
                ·{" "}
                {data.configured
                  ? "Conexão disponível no servidor"
                  : "Conexão do servidor pendente"}{" "}
                ·{" "}
                {data.webhookConfigured
                  ? "Webhook configurado"
                  : "Webhook pendente"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Broadcasts no plano gratuito: até mil contatos na conta e envios
                ilimitados. Segmentação por interesse declarado; quem não
                escolheu recebe a edição geral. Nenhum contato do Quiz é
                incluído automaticamente.
              </p>
              {data.settings.last_error && (
                <p role="alert" className="mt-3 text-sm text-red-800">
                  A operação precisa de conferência: {data.settings.last_error}.
                  Nenhuma campanha incerta será reenviada automaticamente.
                </p>
              )}
            </div>
            <div className="rounded-xl border bg-white p-5">
              <h2 className="font-bold">Remetente e respostas</h2>
              <label className="mt-4 block">
                E-mail de envio no domínio verificado
                <input
                  type="email"
                  className={field}
                  disabled={data.settings.enabled}
                  value={from ?? data.settings.from_email}
                  placeholder="newsletter@news.hotpipe.com.br"
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label className="mt-4 block">
                Receber respostas em
                <input
                  type="email"
                  className={field}
                  disabled={data.settings.enabled}
                  value={reply ?? data.settings.reply_to}
                  onChange={(e) => setReply(e.target.value)}
                />
              </label>
              <button
                className={button + " mt-4"}
                disabled={busy || data.settings.enabled}
                onClick={() => {
                  void action("configure", {
                    from_email: from ?? data.settings.from_email,
                    reply_to: reply ?? data.settings.reply_to,
                  });
                }}
              >
                Salvar configuração
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                className={button}
                disabled={busy || data.settings.enabled || !data.configured}
                onClick={() => {
                  void action("prepare");
                }}
              >
                Verificar domínio e preparar segmentos
              </button>
              <button
                className={button}
                disabled={busy}
                onClick={() => {
                  void action("preview");
                }}
              >
                Gerar prévia com conteúdo publicado
              </button>
              {data.settings.enabled ? (
                <button
                  className={button}
                  disabled={busy}
                  onClick={() => {
                    void action("pause");
                  }}
                >
                  Pausar automação
                </button>
              ) : (
                <button
                  className={button + " bg-emerald-800 text-white"}
                  disabled={
                    busy ||
                    !data.configured ||
                    !data.webhookConfigured ||
                    !data.settings.segments.general
                  }
                  onClick={() => {
                    void action("enable");
                  }}
                >
                  Ativar envios automáticos
                </button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              O nome é personalizado pelo Resend. Edições sem novidades são
              puladas. A ativação inclui somente inscrições com autorização de
              contato; a primeira entrega ocorre na próxima janela da agenda. As
              respostas chegam ao e-mail acima.
            </p>
          </details>
          <div className="rounded-xl border bg-white p-5">
            <h2 className="font-bold">Histórico de edições enviadas</h2>
            {!data.campaigns.length ? (
              <p className="mt-3 text-muted-foreground">
                Nenhuma edição preparada ainda.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {data.campaigns.map((c) => (
                  <li key={c.id} className="border-t pt-3">
                    <h3 className="font-semibold">
                      {c.subject ?? "Edição da newsletter"}
                    </h3>
                    <p className="font-medium">
                      {c.edition_day.split("-").reverse().join("/")} ·{" "}
                      {c.segment === "general"
                        ? "Geral"
                        : c.segment === "radar"
                          ? "Radar"
                          : "Conteúdo"}
                    </p>
                    <p className="text-sm">
                      {statuses[c.status] ?? "Aguardando conferência"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.recipients} destinatários · {c.delivered} entregas
                      confirmadas · {c.failed} falhas
                    </p>
                    <NewsletterCampaignResults
                      id={c.id}
                      delivered={c.delivered}
                      failed={c.failed}
                    />
                    <button
                      className={button + " mt-2"}
                      disabled={busy}
                      onClick={() => void viewEdition("campaign_preview", c.id)}
                    >
                      Visualizar edição enviada
                    </button>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[
                        ["recipients", "Destinatários"],
                        ["delivered", "Entregues"],
                        ["failed", "Falhas"],
                        ["unknown", "Sem confirmação"],
                      ].map(([filter, label]) => (
                        <button
                          key={filter}
                          className={button}
                          onClick={() =>
                            showPeople(
                              filter,
                              `${label} · ${c.edition_day} · ${c.segment}`,
                              c.id,
                            )
                          }
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Aceita significa que o Resend recebeu a campanha. Processamento
              concluído não garante chegada à caixa de entrada de todos os
              destinatários.
            </p>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {preview && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Prévia do e-mail</h2>
          <p className="text-sm">
            Os campos de nome e descadastro serão substituídos pelo Resend na
            entrega.
          </p>
          <iframe
            title="Prévia da newsletter Vitale"
            sandbox=""
            srcDoc={preview.html}
            className="h-[680px] w-full rounded-xl border bg-white"
          />
          <div className="flex gap-3">
            <button className={button} onClick={() => download("html")}>
              Exportar HTML
            </button>
            <button className={button} onClick={() => download("text")}>
              Exportar texto
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
export default function AdminNewsletter() {
  return (
    <AdminShell>
      {(role) =>
        role === "admin" ? (
          <NewsletterOperation />
        ) : (
          <p>A newsletter está disponível para administradores.</p>
        )
      }
    </AdminShell>
  );
}
