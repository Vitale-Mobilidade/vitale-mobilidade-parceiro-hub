import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site/site-ui";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/privacidade")({
  head: () =>
    pageHead({
      path: "/privacidade",
      title: "Cookies e privacidade | Vitale Mobilidade",
      description:
        "Saiba como a Vitale Mobilidade trata dados necessários às funções do site, ao atendimento e às solicitações de contato.",
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
          Você pode usar o site, consultar o Radar, fazer o Quiz e abrir links de ofertas sem um aviso de aceite de
          cookies. Não carregamos Google Analytics, Google Ads, Meta Pixel ou Zoho SalesIQ para rastrear sua navegação.
        </p>
        <div className="mt-8 space-y-6 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold">Conteúdo do canal no YouTube</h2>
            <p>
              A integração editorial Vitale YouTube Editorial é destinada ao responsável pelo nosso canal. Com sua
              autorização, acessamos os dados dos vídeos e suas legendas para preparar artigos baseados nas falas
              originais. As legendas automáticas podem conter erros.
            </p>
            <p className="mt-3">
              Guardamos a transcrição e a legenda de origem na área editorial privada. Enviamos a transcrição ao serviço
              de inteligência artificial do Lovable para produzir o artigo. O texto publicado fica disponível aos
              visitantes; as credenciais de acesso e os arquivos de origem permanecem restritos à operação editorial.
              Não usamos os dados recebidos do YouTube para publicidade ou venda de dados.
            </p>
            <p className="mt-3">
              A permissão exigida pelo YouTube para baixar legendas também permite editar e excluir conteúdo do canal.
              Nossa integração utiliza essa permissão apenas para consultar vídeos e baixar legendas. O responsável pode
              revogar o acesso em suas
              <a
                className="underline underline-offset-2"
                href="https://myaccount.google.com/connections"
                target="_blank"
                rel="noopener noreferrer"
              >
                {" "}
                conexões da Conta Google
              </a>
              . A revogação impede novas capturas; para solicitar a exclusão dos arquivos de origem armazenados, entre
              em contato com
              <a className="underline underline-offset-2" href="mailto:wowbmo@gmail.com">
                {" "}
                wowbmo@gmail.com
              </a>
              .
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold">Métricas agregadas do site</h2>
            <p>
              Podemos contar páginas visualizadas, aberturas de detalhes de bikes e cliques em ofertas para entender o
              que é útil no site. Essa medição não usa cookies, armazenamento no navegador ou identificadores de
              visitantes. Guardamos apenas totais por dia, página pública, bike e posição do botão. Não guardamos query
              string, endereço IP, user-agent ou referrer nessas métricas. Para proteção contra abuso, o endereço IP
              recebido pela infraestrutura é transformado imediatamente em uma chave não reversível, mantida em memória
              por até um minuto e nunca gravada nos totais. Os totais antigos são removidos na próxima gravação após 365
              dias. Registros técnicos da infraestrutura seguem as políticas dos provedores.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold">Funcionamento e solicitações</h2>
            <p>
              Usamos armazenamento necessário às funções que você utiliza, como sessão administrativa e continuidade do
              Quiz. Os dados enviados em formulários são tratados para atender à sua solicitação. Newsletter e pedidos
              de alerta mantêm seus consentimentos específicos.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold">Vídeos e links externos</h2>
            <p>
              Nos artigos, o player do YouTube é carregado quando você escolhe reproduzir o vídeo. Ao abrir uma oferta,
              você acessa diretamente o site do vendedor. Esses serviços têm suas próprias políticas de privacidade.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold">Assistente Vitale</h2>
            <p>
              O assistente é carregado apenas quando você clica para abri-lo. As informações que você envia na conversa
              são usadas para responder à sua solicitação.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
