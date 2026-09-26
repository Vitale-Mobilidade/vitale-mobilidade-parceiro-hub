# Seleção de vídeo ao criar artigo — 26/09/2026

## Governança — revisão pré-implementação

**Classificação:** estrutural, pois a entrada alimenta a geração editorial por IA. O corte proposto altera somente o formulário privado `/admin/conteudos/novo`; o contrato `generate` existente já aceita YouTube ID, título e transcrição.

| Perspectiva | Impacto, risco e dependência | Recomendação |
| --- | --- | --- |
| Produto | Permitir escolher um dos vídeos existentes ou trazer outro URL do YouTube sem perder o vínculo com o artigo. Risco de duplicar vídeo; o ID canônico é a chave existente. | Prosseguir com duas origens explícitas. |
| CTO | Reutilizar parser de ID e `generate`; sem schema, novo endpoint, writer ou mudança em SSR público. | Prosseguir. |
| IA | Título e transcrição do operador continuam sendo a entrada da geração; a seleção não dispara IA. | Prosseguir, mantendo revisão editorial. |
| Segurança | O formulário continua sob `AdminShell` e papéis editoriais; validar URL antes de enviar e confiar na validação server-side já existente. Não buscar HTML de URLs arbitrárias. | Prosseguir. |
| UX/UI | Substituir `<select>` de 104 opções por busca por título/ID e lista navegável; exibir URL canônica selecionada com botão de cópia e fallback manual. | Prosseguir com estados vazios e foco por teclado. |
| CX/Operação | Vídeo fora da planilha precisa de título e transcrição; o `generate` já o importa para o Admin. Não editar a planilha de vídeos. | Prosseguir com rótulos claros. |
| Growth | A URL do YouTube é complementar ao artigo, sem alterar links afiliados ou SEO público. | Prosseguir. |
| PMO/QA | Testar filtragem sem acentos, URL válida/inválida, troca de origem e regressão do gate local. | Prosseguir localmente; publicação requer autorização própria. |

**Trade-off:** não se cria uma rotina de sincronização do YouTube nem se altera a planilha. Isso deixa o novo vídeo no acervo editorial do Admin, o que resolve a criação de artigo sem adicionar outra fonte de escrita à planilha. A biblioteca existente continua disponível.

**Decisão consolidada:** implementar busca local pelo título/ID, opção de URL manual do YouTube com título obrigatório, cartão do vídeo selecionado e URL copiável. Critérios: o fluxo antigo da biblioteca permanece; a URL manual válida pode alimentar `generate`; não há envio com URL inválida; nenhum vídeo é salvo antes de `Gerar artigo`; seleção e cópia são acessíveis. Fora de escopo: importação em massa e edição da aba Google Sheets. Rollback: reverter o componente e helper deste corte, sem migração ou dados a reverter.

## Governança — revisão pós-implementação

| Perspectiva | Status | Evidência ou limite |
| --- | --- | --- |
| Produto | Pass | Busca no acervo e URL de outro vídeo são alternativas explícitas; o artigo continua associado a um único vídeo principal. |
| CTO | Pass | Só o formulário e funções puras mudaram; `generate`, Edge Function, tabelas e rotas públicas não foram alterados. |
| IA | Pass | Nenhuma geração é disparada ao buscar, selecionar ou copiar; `generate` ainda recebe ID, título e transcrição após a confirmação do operador. |
| Segurança | Pass | URL passa pelo parser de domínio/ID existente; URL canônica é usada; vídeo já catalogado não pode ser reenviado pelo caminho manual com título diferente. |
| UX/UI | Pass | Resultados são botões nativos com indicação `aria-pressed`, busca por título/ID sem acentos, estado vazio, link legível e cópia com seleção manual de fallback. Inspeção autenticada visual permanece para o release. |
| CX/Operação | Pass | Novo vídeo só entra no acervo do Admin ao acionar `Gerar artigo`; a planilha continua intocada. Rascunhos de transcrição são preservados ao trocar de seleção durante a sessão. |
| Growth | Pass | URL pública, clique afiliado, SEO e páginas de artigo não mudaram. |
| PMO/QA | Pass | Teste novo: 4/4; `pnpm validate`: typecheck, 47/47 testes do gate e build aprovados; `git diff --check` limpo. |

**Estado:** implementado e validado localmente; não publicado. Risco residual: o Admin exige sessão real, então a inspeção visual e o smoke autenticado ficam para a prévia/release. A publicação no Lovable requer autorização explícita deste corte. Rollback de frontend: voltar à versão anterior do formulário; nenhum dado produtivo precisa ser revertido.
