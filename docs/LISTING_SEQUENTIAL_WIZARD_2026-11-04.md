# Anúncio sequencial: fotos → informações → publicação

Mudança estrutural na jornada da integração existente, autorizada pelo responsável em 04/11. Sem schema, secrets, cobrança real ou mudança na abertura pública. Diagnóstico somente leitura: conta e Asaas aptos, quatro fotos persistidas, ficha com título provisório Minha bike e descrição abaixo de20 caracteres. O problema é avanço sem validação e mensagem genérica de bloqueio, não indisponibilidade do provedor.

## Revisão prévia

| Perspectiva | Impacto, risco e recomendação |
|---|---|
| Produto | Converter com três etapas claras, salvar e avançar numa ação, permitir salvar parcial. Prosseguir sem eliminar revisão/aceite antes do pagamento. |
| Arquitetura | Uma rotina de persistência validada, navegação sequencial e foco após render; contratos existentes. Prosseguir sem writer novo. |
| Segurança | Manter ownership, validações servidor, prova dos contatos e pagamento autoritativo; não criar cobrança ao avançar. Prosseguir. |
| UX/UI | Separar botões com espaço; avanço à direita, foco/início da próxima etapa, erro específico. Prosseguir com teclado/mobile. |
| CX | Distinguir ficha incompleta de integração indisponível; preservar os dados e fotos reais e o título próprio. Prosseguir. |
| Growth | Reduzir abandono sem pular informações/consentimentos; CTA Seguir para pagamento de R$150. Prosseguir preservando newsletter e menus ocultos. |
| IA | N/A: título derivado deterministicamente de marca/modelo quando ausente, sem geração de fatos/descritivo. |
| QA | Testar salto de etapa, persistência/erro, ordem e foco, layout, título automático/customizado e checkout só após aceite. Prosseguir condicionado a smoke e validate. |

Decisão: fotos já são persistidas no upload; continuar avança após confirmar foto pronta. Informações usam salvar e continuar, com validação completa antes de etapa3. Título ausente/provisório usa marca/modelo; descrição continua do usuário, com mínimo explícito. Salvar rascunho parcial permanece ação secundária. Não preencher nem publicar a bike do responsável como teste. Rollback: reverter frontend/helpers; nenhum estado financeiro ou schema a restaurar.

## Revisão posterior

| Perspectiva | Estado e evidência |
|---|---|
| Produto | Pass: ordem1→2→3, uma ação salva/avança, rascunho parcial separado, pagamento após revisão/aceites. |
| Arquitetura | Pass: mesma RPC save; próximo passo só após sucesso; revisão com cobrança pendente não regrava ficha congelada. Sem schema/writer novo. |
| Segurança | Pass: gates atuais preservados; nenhum pagamento/publish disparado ao avançar, nenhum secret no cliente, testes de billing mantidos. |
| UX/UI | Pass local: botões separados/alinhados e avanço à direita; foco/início de painel, respeito a movimento reduzido, erro por campo, mobile sem overflow. |
| CX | Pass: título provisório resolvido pela marca/modelo e descrição não inventada; erro de salvamento mantém campos/etapa; carregamento não se apresenta como indisponibilidade. |
| Growth | Pass: CTA exato Seguir para pagamento de R$150, sem atalhos para pular ficha; navegação pública/SSR/newsletter preservados. |
| IA | N/A: sem modelo ou geração; somente concatenação determinística de dados inseridos pelo vendedor. |
| QA | Pass local:29 testes unitários/de integração, Playwright com passo bloqueado, salvar parcial, erro de descrição, falha de save, foco, posições, foto/prévia, checkout/aceite e republicação. Lint, diff check e pnpm validate (66 contratos, types, SSR/client). |

Evidências visuais locais (dados sintéticos) em outputs/vitale-sequential-wizard-2026-11-04. Nenhum rascunho/foto real alterado nem pagamento concluído. O diagnóstico ao vivo confirmou Asaas e identidade aptos; esta correção não depende de nova chave/configuração do provedor. Gate do pagamento continua exigindo ficha completa salva e aceites.

Rollback: revert dos componentes/helper/testes; sem migração ou alteração de dados/financeiro. Publicação frontend deste escopo já solicitada pelo responsável, sem custo de geração Lovable. Deploy e conferência no domínio próprio são a etapa operacional restante; não confundir build com release.
