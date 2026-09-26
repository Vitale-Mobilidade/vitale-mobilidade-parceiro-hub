# Substituição do assistente público pelo widget HotPipe — 26/09/2026

## Escopo

O assistente público anterior (RadarAssistant no root e LucasSDRWidget no resultado do Quiz) foi substituído por um único launcher flutuante do widget HotPipe da conta Vitale, presente em todas as rotas públicas.

- Script do fornecedor: `https://smixxobbszyxqauysvor.supabase.co/functions/v1/web-widget?k=2badd062-4693-4490-a5c2-23aea788fee4` (carregado somente após clique no launcher, nunca no render inicial/SSR).
- Novo componente: `src/components/site/HotPipeWidget.tsx`.
- Removidas as montagens públicas de `RadarAssistant` em `src/routes/__root.tsx` e de `LucasSDRWidget` em `src/pages/EscolherBike.tsx`. Os módulos antigos permanecem no repositório, sem uso público.
- Não houve alteração em scoring do Quiz, captura de lead, compra, afiliados, CRM, banco ou funções Supabase.

## Comportamento no Quiz (/escolherbike)

- O launcher/widget NÃO aparece durante intro, lead, perguntas nem processing: o `HotPipeWidget` só é montado na fase `result` com recomendação disponível (o root exclui `/escolherbike`).
- Ao voltar a qualquer fase anterior, o componente é desmontado e seu efeito de limpeza fecha o widget (`window.hotpipeWidget.close()`) e sincroniza `lucas-chat-bus`, mesmo se o script já estiver carregado.
- Ao abrir no resultado, a pergunta é deixada como RASCUNHO (sem envio) no campo do widget, com os nomes reais da recomendação (duas bikes ou uma). Nenhum nome, telefone, leadId ou resposta do Quiz é repassado à HotPipe.

## Revisão de governança (oito perspectivas)

- **Produto:** um único ponto de contato de conversa; rascunho contextual no resultado do Quiz mantém a continuidade da jornada sem friccionar as fases anteriores.
- **CTO:** script externo carregado sob demanda (após clique), preservando SSR e o peso inicial das páginas; falha de carregamento gera erro recuperável com retry.
- **IA:** a HotPipe responde com a base dela; a Vitale não envia dados do Quiz nem afirma fatos — o rascunho apenas pergunta sobre as bikes recomendadas.
- **Segurança:** nenhum dado pessoal (nome, telefone, leadId, respostas) é enviado ao fornecedor; o script roda em origem de terceiro apenas após ação explícita do visitante.
- **UX:** launcher único, acessível (aria-label, foco visível, min-h-14), mobile-first; botão próprio do fornecedor (`.hp-btn`) é ocultado para não duplicar launchers.
- **CX:** erro de carga é comunicado em linguagem clara com ação de tentar novamente; o fechamento pelo botão do fornecedor (`.hp-close`) é sincronizado com o estado local.
- **Growth:** o rascunho com os nomes das bikes recomendadas reduz o esforço de pergunta no momento de maior intenção (resultado do Quiz).
- **PMO:** mudança limitada a três arquivos de código + este documento; sem migrations, sem deploy de funções, sem publicação automática.

## Risco residual

- O prefill do rascunho e a sincronização de fechamento dependem de seletores DOM do fornecedor (`.hp-form input`, `.hp-close`, `.hp-btn`), que NÃO são API documentada. Se a HotPipe alterar o markup, o rascunho pode não ser preenchido (degradação silenciosa: o widget abre vazio) ou o botão próprio pode reaparecer. Monitorar após publicação e ajustar os seletores se necessário.
- O popup de ofertas do Quiz usa `lucas-chat-bus` para não competir com o chat; a sincronização cobre abertura, fechamento pelo launcher e pelo `.hp-close` do fornecedor.

## Validação

- `pnpm validate` (typecheck, testes, build) executado no código resultante.
- Teste manual de rota comum, fases do Quiz e rascunho: sem envio de mensagem real e sem criação de lead de teste.
- Publicação do frontend: etapa separada, acionada pelo responsável após conferência do preview.
