import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site/site-ui";
import { CONSENT_OPEN_EVENT } from "@/lib/consent";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/privacidade")({
  head: () =>
    pageHead({
      path: "/privacidade",
      title: "Cookies e privacidade | Vitale Mobilidade",
      description:
        "Saiba como a Vitale Mobilidade usa tecnologias de medição e publicidade e altere suas preferências.",
    }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="responsive-container max-w-3xl py-12 text-ink sm:py-16">
        <h1 className="text-3xl font-bold">Privacidade e uso de dados</h1>
        <p className="mt-5 leading-relaxed">
          Você pode usar o site, consultar o Radar, fazer o Quiz e abrir links
          de ofertas sem aceitar tecnologias opcionais. Guardamos sua escolha
          neste navegador até você alterá-la ou limpar os dados dele.
        </p>
        <div className="mt-8 space-y-6 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold">Conteúdo do canal no YouTube</h2>
            <p>
              A integração editorial Vitale YouTube Editorial é destinada ao
              responsável pelo nosso canal. Com sua autorização, acessamos os
              dados dos vídeos e suas legendas para preparar artigos baseados
              nas falas originais. As legendas automáticas podem conter erros.
            </p>
            <p className="mt-3">
              Guardamos a transcrição e a legenda de origem na área editorial
              privada. Enviamos a transcrição ao serviço de inteligência
              artificial do Lovable para produzir o artigo. O texto publicado
              fica disponível aos visitantes; as credenciais de acesso e os
              arquivos de origem permanecem restritos à operação editorial. Não
              usamos os dados recebidos do YouTube para publicidade ou venda de
              dados.
            </p>
            <p className="mt-3">
              A permissão exigida pelo YouTube para baixar legendas também
              permite editar e excluir conteúdo do canal. Nossa integração
              utiliza essa permissão apenas para consultar vídeos e baixar
              legendas. O responsável pode revogar o acesso em suas
              <a
                className="underline underline-offset-2"
                href="https://myaccount.google.com/connections"
                target="_blank"
                rel="noopener noreferrer"
              >
                {" "}
                conexões da Conta Google
              </a>
              . A revogação impede novas capturas; para solicitar a exclusão dos
              arquivos de origem armazenados, entre em contato com
              <a
                className="underline underline-offset-2"
                href="mailto:wowbmo@gmail.com"
              >
                {" "}
                wowbmo@gmail.com
              </a>
              .
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold">Necessários</h2>
            <p>
              Recursos essenciais para o funcionamento do site e para lembrar
              sua escolha de privacidade. Permanecem ativos.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold">Análise</h2>
            <p>
              O Google Analytics mede visitas, páginas e interações para
              entendermos o uso do site. Sem seu aceite, o armazenamento de
              análise permanece negado. As tags do Google ainda podem enviar
              sinais limitados sem cookies para medição agregada.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold">
              Publicidade e acompanhamento de visitantes
            </h2>
            <p>
              Google Ads e Meta Pixel apoiam campanhas e medição de conversões.
              Zoho SalesIQ acompanha visitantes para atendimento. Meta Pixel e
              SalesIQ só carregam após o aceite desta finalidade; o Google Ads
              respeita os sinais de consentimento e pode enviar sinais limitados
              sem cookies enquanto o armazenamento publicitário estiver negado.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold">Assistente Vitale</h2>
            <p>
              O assistente é carregado apenas quando você clica para abri-lo. As
              informações que você envia na conversa são usadas para responder à
              sua solicitação.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold">Mude sua escolha</h2>
            <p>
              Você pode aceitar, rejeitar ou escolher as finalidades
              separadamente e mudar de ideia a qualquer momento.
            </p>
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))
              }
              className="mt-3 min-h-11 rounded-lg bg-action px-5 py-2 font-semibold text-white hover:opacity-90"
            >
              Abrir preferências de privacidade
            </button>
          </section>
          <section>
            <h2 className="text-xl font-bold">Informações dos provedores</h2>
            <p>
              Os prazos de retenção e os controles adicionais dos dados tratados
              por cada provedor constam em suas políticas:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 underline underline-offset-2">
              <li>
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google
                </a>
              </li>
              <li>
                <a
                  href="https://www.facebook.com/privacy/policy/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Meta
                </a>
              </li>
              <li>
                <a
                  href="https://www.zoho.com/privacy.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Zoho
                </a>
              </li>
            </ul>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
