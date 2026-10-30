import { NewsletterEngagementPeople } from "./NewsletterEngagementPeople";
import { useQuery } from "@tanstack/react-query";
import { NEWSLETTER_REPORT_INTERVAL_MS } from "@/lib/newsletter-report-policy";
import {
  newsletterCall,
  type NewsletterCampaignStats,
} from "@/lib/newsletter-api";
export function NewsletterCampaignResults({
  id,
  delivered,
  failed,
  reportsVersion,
}: {
  id: string;
  delivered: number;
  failed: number;
  reportsVersion: string;
}) {
  const query = useQuery({
    queryKey: ["admin", "newsletter", "campaign-reports", reportsVersion],
    queryFn: () =>
      newsletterCall<Record<string, NewsletterCampaignStats>>(
        "campaign_reports",
      ),
    staleTime: NEWSLETTER_REPORT_INTERVAL_MS,
    gcTime: NEWSLETTER_REPORT_INTERVAL_MS,
    refetchInterval: NEWSLETTER_REPORT_INTERVAL_MS,
    retry: false,
  });
  const stats = query.data?.[id];
  return (
    <div className="my-3">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Enviados", stats?.available ? stats.sent : null],
          ["Entregues", stats?.available ? stats.delivered : delivered],
          ["Abertos", stats?.available ? stats.opened : null],
          ["Com clique", stats?.available ? stats.clicked : null],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-emerald-50 p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-xl font-bold">
              {value ?? (query.isPending ? "…" : "—")}
            </dd>
          </div>
        ))}
      </dl>
      {query.isPending && (
        <p role="status" className="mt-2 text-xs">
          Consultando resultados no Resend…
        </p>
      )}
      {(query.isError || (query.isSuccess && !stats?.available)) && (
        <p role="status" className="mt-2 text-xs">
          Resultados do Resend indisponíveis agora; entregas locais preservadas.{" "}
          <button className="underline" onClick={() => void query.refetch()}>
            Tentar novamente
          </button>
        </p>
      )}
      {stats?.available && (
        <p className="mt-2 text-xs text-muted-foreground">
          Abertos e com clique: e-mails com pelo menos um evento registrado. Os
          resultados são consultados a cada 6 horas. Atualização do provedor
          pode levar até 15 minutos.
          {stats.openTracking !== true &&
            " Rastreamento de abertura desativado ou não confirmado."}
          {stats.clickTracking !== true &&
            " Rastreamento de clique desativado ou não confirmado."}{" "}
          Proteções de privacidade e robôs podem influenciar essas métricas.
          Envios anteriores à ativação não ganham rastreamento retroativo.
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        {failed} falhas registradas
        {stats?.updatedAt
          ? ` · Consultado em ${new Date(stats.updatedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}`
          : ""}
      </p>
      <NewsletterEngagementPeople campaign={id} />
    </div>
  );
}
