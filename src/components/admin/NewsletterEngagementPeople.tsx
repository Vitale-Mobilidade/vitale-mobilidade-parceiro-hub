import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  newsletterCall,
  type NewsletterEngagement,
} from "@/lib/newsletter-api";

export function NewsletterEngagementPeople({ campaign }: { campaign: string }) {
  const [event, setEvent] = useState<"opened" | "clicked" | null>(null);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const cursor = cursors.at(-1);
  const query = useQuery({
    queryKey: ["admin", "newsletter", "engagement", campaign, event, cursor],
    queryFn: () =>
      newsletterCall<NewsletterEngagement>("campaign_engagement", {
        campaign,
        event,
        ...(cursor ? { cursor } : {}),
      }),
    enabled: event !== null,
    staleTime: 60_000,
    retry: false,
  });
  function select(value: "opened" | "clicked") {
    setEvent(value);
    setCursors([undefined]);
  }
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-10 rounded-lg border px-3 py-2"
          aria-pressed={event === "opened"}
          onClick={() => select("opened")}
        >
          Quem abriu
        </button>
        <button
          type="button"
          className="min-h-10 rounded-lg border px-3 py-2"
          aria-pressed={event === "clicked"}
          onClick={() => select("clicked")}
        >
          Quem clicou
        </button>
      </div>
      {event && (
        <section
          aria-label={
            event === "opened"
              ? "Pessoas que abriram esta campanha"
              : "Pessoas que clicaram nesta campanha"
          }
          className="mt-3 rounded-lg border p-3"
        >
          <h4 className="font-semibold">
            {event === "opened" ? "Quem abriu" : "Quem clicou"}
          </h4>
          <p className="text-xs text-muted-foreground">
            Eventos registrados pelo Resend. Envios anteriores à ativação não
            ganham rastreamento retroativo. Proteções de privacidade e robôs
            podem gerar eventos; ausência de registro não prova que a pessoa não
            leu.
          </p>
          {query.isPending && (
            <p role="status">Consultando pessoas no Resend…</p>
          )}
          {query.isError && (
            <div role="alert">
              <p>{query.error.message}</p>
              <button
                type="button"
                className="underline"
                onClick={() => void query.refetch()}
              >
                Tentar novamente
              </button>
            </div>
          )}
          {query.data && (
            <>
              {!query.data.rows.length ? (
                <p>Nenhum evento registrado para este filtro.</p>
              ) : (
                <ul className="divide-y">
                  {query.data.rows.map((person) => (
                    <li key={person.id} className="py-3 break-words">
                      <p className="font-medium">
                        {person.person_name || "Nome não disponível"}
                      </p>
                      <p>{person.email}</p>
                      <p className="text-sm">
                        {person.count}{" "}
                        {event === "opened"
                          ? "abertura(s) registrada(s)"
                          : "clique(s) registrado(s)"}
                      </p>
                      {!!person.links.length && (
                        <ul>
                          {person.links.map((link) => (
                            <li key={link.url}>
                              <a
                                className="text-sm underline"
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {link.url}
                              </a>{" "}
                              · {link.clicks} clique(s)
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-3 items-center">
                <button
                  type="button"
                  disabled={cursors.length === 1}
                  onClick={() => setCursors((v) => v.slice(0, -1))}
                >
                  Anterior
                </button>
                <span>Página {cursors.length}</span>
                <button
                  type="button"
                  disabled={!query.data.hasMore || !query.data.nextCursor}
                  onClick={() =>
                    setCursors((v) => [...v, query.data!.nextCursor!])
                  }
                >
                  Próxima
                </button>
                <button
                  type="button"
                  className="underline"
                  onClick={() => void query.refetch()}
                >
                  Atualizar eventos
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
