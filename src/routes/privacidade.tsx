import { newsletterReferralsEnabled } from "@/lib/newsletter-referrals";
import { memberAccountsEnabled } from "@/lib/member-accounts-feature";
import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site/site-ui";
import { pageHead } from "@/lib/seo";
import { useEffect, useState } from "react";
import { googleAnalyticsDisabled, setGoogleAnalyticsDisabled } from "@/lib/gtm-script";

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
          cookies. Usamos Google Analytics para medir o uso das páginas, com cookies analíticos e sem publicidade ou
          remarketing. Não carregamos Google Ads, Meta Pixel ou Zoho SalesIQ para rastrear sua navegação.
        </p>
        <div className="mt-8 space-y-6 leading-relaxed">
          {newsletterReferralsEnabled && <section>
            <h2 className="text-xl font-bold">Convites para a comunidade</h2>
            <p>Cada membro pode compartilhar um convite pessoal. Contamos acessos agregados, que podem incluir mais de uma visita da mesma pessoa. Um novo membro só conta como indicação depois de criar sua conta e concluir a adesão à comunidade. O indicador acompanha totais e resultados por dia, sem nomes ou e-mails dos convidados.</p>
            <p className="mt-3">O código do convite é registrado no cadastro para atribuição. Adesões ainda não concluídas aparecem nos agregados por até 48 horas. Mantemos uma chave técnica privada para evitar contagem repetida; o login posterior não gera nova indicação. O controle de tentativas usa uma chave derivada do endereço de rede, sem expô-la nos totais.</p>
          </section>}
          {memberAccountsEnabled && <section>
            <h2 className="text-xl font-bold">Perfil e anúncios de bicicletas</h2>
            <p>Você pode adicionar uma foto ao seu perfil. O menu da conta mostra essa foto apenas na sua sessão. Ao publicar um anúncio, pedimos autorização específica para divulgar seu nome público, foto de perfil e WhatsApp validado para contato direto de compradores. O e-mail da conta não aparece no anúncio. As informações e até cinco fotos da bicicleta ficam públicas enquanto o anúncio estiver publicado e a identidade do anunciante continuar validada. Rascunhos, anúncios vendidos e anúncios retirados do ar não aparecem na vitrine.</p>
            <p className="mt-3">Guardamos as imagens no Storage do Supabase integrado à Vitale. As fotos são reduzidas e convertidas para WebP no navegador, sem os metadados originais. O bucket é privado; a exibição pública depende de um anúncio publicado. Links temporários usados na edição podem continuar acessíveis por até cinco minutos. Anúncios arquivados permanecem na sua área para consulta ou reedição. Para excluir a conta e os dados, utilize o contato indicado abaixo.</p>
          </section>}
          {memberAccountsEnabled && <section>
            <h2 className="text-xl font-bold">Conta de leitor e comentários</h2>
            <p>Usamos seu e-mail para autenticação e recuperação de acesso, com Supabase Auth no projeto da Vitale. A conta permite acesso imediato ao perfil e à newsletter. Para comentar, curtir ou anunciar, exigimos validação separada de e-mail e celular. Enviamos códigos de e-mail pelo Resend e de celular pelo WhatsApp, usando a conta Vitale no Hotpipe IA. Os códigos expiram em dez minutos, têm limite de tentativas e não podem ser reutilizados. A assinatura da newsletter não depende dessas validações. As mensagens de recuperação de senha são enviadas pelo Resend. A senha é tratada pelo serviço de autenticação e não fica disponível à equipe. A sessão fica no armazenamento necessário do navegador até você sair ou ela expirar. O nome público informado no envio e os comentários aprovados aparecem no site; o e-mail permanece privado. Alterar o nome do perfil vale para os próximos comentários. Comentários pendentes e rejeitados são acessíveis apenas ao autor e à moderação.</p>
            <p className="mt-3">A newsletter também pode ser assinada apenas com nome, e-mail e autorização, sem conta completa, validação de celular ou confirmação por e-mail. A adesão à comunidade inclui o recebimento da newsletter, informado no aceite do cadastro. Após criar sua conta, o primeiro acesso conclui perfil e assinatura em conjunto. Descadastros anteriores e posteriores são respeitados: criar a conta ou entrar novamente não desfaz um cancelamento da newsletter. Um cadastro antigo da newsletter só vira conta da comunidade por iniciativa da pessoa. Mantemos perfil e contribuições enquanto a conta estiver ativa ou até solicitação de exclusão. Você pode remover seus comentários pelo artigo; o texto é retirado e substituído por um registro de remoção. A moderação guarda um registro de ações para segurança. Para corrigir ou excluir seus dados ou pedir revisão de uma suspensão, escreva pelo e-mail cadastrado para <a href="mailto:wowbmo@gmail.com" className="underline">wowbmo@gmail.com</a>. O celular validado permanece privado e não é exibido em comentários ou convites. A autorização para receber um código de validação não autoriza marketing no WhatsApp. Guardamos o resultado das validações e, em cada canal, o último desafio com destino, hash do código, validade e contagem de tentativas; não guardamos o código em texto aberto. A equipe verifica a identidade antes de executar a solicitação.</p>
          </section>}

          <section>
            <h2 className="text-xl font-bold">Google Analytics</h2>
            <p>
              O Google Analytics é carregado pelo Google Tag Manager nas páginas públicas para medir visualizações,
              sessões e origens de acesso. Os cookies analíticos têm expiração configurada em até 90 dias, sem renovação
              automática. Não ativamos Google Signals, personalização de anúncios ou remarketing. Não enviamos nomes,
              e-mails, telefones ou respostas dos formulários por essa integração; removemos parâmetros arbitrários e
              fragmentos dos endereços medidos. Códigos técnicos de campanha podem ser usados para atribuição.
            </p>
            <p className="mt-3">
              Você pode desativar essas métricas neste navegador. A integração também respeita uma recusa analítica
              anterior válida e os sinais de privacidade do navegador. O Google processa dados técnicos das requisições
              conforme sua{" "}
              <a
                className="underline underline-offset-2"
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                política de privacidade
              </a>
              .
            </p>
            <GoogleAnalyticsPreference />
          </section>
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
            <h2 className="text-xl font-bold">Mapa agregado de interação</h2>
            <p>
              Quando ativado, o mapa usa uma amostra aleatória de 25% das entradas em páginas da Home, Radar e
              conteúdos. Contamos cliques em links e botões por identificadores técnicos, posição relativa dentro do
              elemento, largura da tela e alcance de rolagem, por dia, página, faixa de tela e versão do layout. Não
              gravamos sessões, movimentos do cursor, textos, conteúdo da página, valores de formulários, cookies ou
              identificadores de visitantes. Quiz, ferramentas interativas e áreas privadas ficam fora dessa coleta. Os
              totais são privados e removidos na próxima gravação após a janela de 90 dias. A proteção contra abuso e os
              limites da infraestrutura são os mesmos das métricas agregadas.
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

function GoogleAnalyticsPreference() {
  const [disabled, setDisabled] = useState<boolean | null>(null);
  useEffect(() => {
    setDisabled(googleAnalyticsDisabled());
  }, []);
  return (
    <div className="mt-3">
      <p>
        {disabled === null
          ? ""
          : disabled
            ? "Métricas do Google desativadas neste navegador."
            : "Métricas do Google ativadas neste navegador."}
      </p>
      <button
        type="button"
        disabled={disabled === null}
        className="mt-2 rounded-md border border-border px-3 py-2 underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
        onClick={() => setGoogleAnalyticsDisabled(!disabled)}
      >
        {disabled ? "Ativar métricas do Google" : "Desativar métricas do Google"}
      </button>
      <p className="mt-2 text-sm">
        Sinais de privacidade do navegador, como Do Not Track e Global Privacy Control, têm prioridade sobre essa
        preferência.
      </p>
    </div>
  );
}
