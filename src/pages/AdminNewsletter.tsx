import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  newsletterCall,
  type NewsletterAdminState,
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
  sent: "Processamento concluído",
  uncertain: "Resultado incerto · conferir",
  failed: "Falhou",
  paused: "Pausada · conferir",
  skipped: "Sem novidades ou destinatários",
};
function NewsletterOperation() {
  const qc = useQueryClient();
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
      if (name === "preview" && result.html && result.text)
        setPreview({ html: result.html, text: result.text });
      else {
        await qc.invalidateQueries({
          queryKey: ["admin", "newsletter", "operation"],
        });
        setNotice(
          name === "enable"
            ? "Automação ativada para segunda e quinta às 10h. Nenhum lote antecipado."
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
      <div className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-semibold">Redator da newsletter</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Cada edição recebe uma abertura curta e editorial, sem curiosidade, três leituras (incluindo Do acervo), resumos com tópicos e imagens dos
          artigos, bike e vídeos. O redator usa artigos e transcrições do canal,
          consulta o acervo ainda não enviado e passa por uma revisão factual
          automática antes do envio. As pautas exploram bikes diferentes; a bike
          em destaque não repete as quedas do Radar.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Gerar prévia usa IA: uma chamada para redação e outra para revisão. Se
          houver rejeição editorial, o agente faz no máximo uma autocorreção;
          até quatro chamadas e dois minutos no total. Os envios da mesma edição
          reutilizam o texto preparado. Links levam UTMs por edição, seção e
          segmento. No GA4, filtre origem vitale_newsletter e mídia email; o
          Quiz também preserva essa atribuição.
        </p>
      </div>
      <div>
        <h1 className="text-2xl font-bold">Newsletter</h1>
        <p className="mt-2 text-muted-foreground">
          Artigos, Radar, bike em destaque e vídeos recentes. Segunda e quinta,
          às 10h de São Paulo.
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
              ["Inscritos elegíveis", data.audience.eligible],
              ["Aguardam novo aceite", data.audience.legacy],
              ["Descadastrados", data.audience.suppressed],
            ].map(([label, count]) => (
              <div className="rounded-xl border bg-white p-4" key={label}>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold">{count}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border bg-white p-5">
            <h2 className="font-bold">Entrega pelo Resend</h2>
            <p className="mt-2">
              {data.settings.enabled ? "Automação ativa" : "Automação pausada"}{" "}
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
              ilimitados. Segmentação por interesse declarado; quem não escolheu
              recebe a edição geral. Nenhum contato do Quiz é incluído
              automaticamente.
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
          <div className="rounded-xl border bg-white p-5">
            <h2 className="font-bold">Últimas edições</h2>
            {!data.campaigns.length ? (
              <p className="mt-3 text-muted-foreground">
                Nenhuma edição preparada ainda.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {data.campaigns.map((c) => (
                  <li key={c.id} className="border-t pt-3">
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
                    {c.resend_id && (
                      <a
                        className="text-sm underline"
                        href="https://resend.com/broadcasts"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Conferir entrega no Resend
                      </a>
                    )}
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
