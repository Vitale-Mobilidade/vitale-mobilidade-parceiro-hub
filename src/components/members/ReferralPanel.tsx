import { useEffect, useState } from "react";
import { getMemberReferrals } from "@/lib/member-community-api";
import {
  referralDashboardSchema,
  referralLink,
  referralWhatsAppLink,
  type ReferralDashboard,
} from "@/lib/newsletter-referrals";
import { memberError } from "@/lib/member-community";

export function ReferralPanel() {
  const [data, setData] = useState<ReferralDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void getMemberReferrals()
      .then((result) => {
        const parsed = referralDashboardSchema.parse(result);
        if (active) setData(parsed);
      })
      .catch((e) => {
        if (active) setError(memberError(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);
  async function copy() {
    if (!data?.enabled) return;
    setMessage("");
    try {
      await navigator.clipboard.writeText(referralLink(data.code));
      setMessage("Link copiado. Agora é só compartilhar.");
    } catch {
      setMessage(
        "Não foi possível copiar automaticamente. Selecione e copie o link abaixo.",
      );
    }
  }
  return (
    <section
      className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-8"
      aria-labelledby="referral-title"
      data-heatmap-private
    >
      <h2 id="referral-title" className="text-2xl font-bold text-ink">
        Convide para a comunidade
      </h2>
      <p className="mt-3 text-muted-foreground">
        Compartilhe seu convite. Cada novo membro que confirma o e-mail e entra
        na comunidade conta como uma indicação sua.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-red-800">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className="mt-4">
          Carregando suas indicações…
        </p>
      ) : data?.enabled ? (
        <>
          <label htmlFor="referral-link" className="mt-5 block font-semibold">
            Seu link pessoal
          </label>
          <input
            id="referral-link"
            className="mt-2 w-full rounded-lg border border-line bg-surface p-3 text-sm"
            readOnly
            value={referralLink(data.code)}
            onFocus={(e) => e.target.select()}
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={copy}
              className="min-h-11 rounded-lg bg-ink px-4 py-3 font-bold text-white"
            >
              Copiar convite
            </button>
            <a
              href={referralWhatsAppLink(data.code)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 py-3 font-semibold"
            >
              Compartilhar no WhatsApp
            </a>
          </div>
          {message && (
            <p role="status" className="mt-3 text-sm">
              {message}
            </p>
          )}
          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["Acessos ao link", data.visits],
              ["Cadastros a confirmar", data.pending],
              ["Novos membros indicados", data.confirmed],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl bg-surface p-4">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="mt-2 text-3xl font-bold text-ink">
                  {Number(value).toLocaleString("pt-BR")}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-muted-foreground">
            Acessos podem incluir mais de uma visita da mesma pessoa. Quem já
            participa da comunidade, repetições e autoindicações identificadas
            não contam. Cadastros ainda não confirmados aparecem por até 48
            horas.
          </p>
          <h3 className="mt-6 font-bold">Confirmações nos últimos 30 dias</h3>
          {data.history.length ? (
            <ul className="mt-3 space-y-2">
              {data.history.map((row) => (
                <li
                  key={row.day}
                  className="flex justify-between gap-4 border-b border-line pb-2"
                >
                  <time dateTime={row.day}>
                    {row.day.split("-").reverse().join("/")}
                  </time>
                  <span>
                    {row.confirmed.toLocaleString("pt-BR")}{" "}
                    {row.confirmed === 1 ? "indicação" : "indicações"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Seus primeiros membros indicados aparecerão aqui.
            </p>
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            Você acompanha os resultados sem acesso aos nomes ou e-mails dos
            convidados. Compartilhar abre uma mensagem para você enviar; a
            Vitale não envia convites em seu nome.
          </p>
        </>
      ) : (
        !error && (
          <p className="mt-4">
            O programa de indicações ainda não está disponível.
          </p>
        )
      )}
      <button
        type="button"
        disabled={loading}
        onClick={() => setRetry((n) => n + 1)}
        className="mt-5 min-h-11 text-sm underline disabled:opacity-40"
      >
        Atualizar indicações
      </button>
    </section>
  );
}
