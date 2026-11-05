# Identidade exibida no cadastro — 05/11/2026

Classificação estrutural: autenticação e identidade. Relato de e-mail do responsável em cadastro de terceiro, sem origem completa da navegação. Captura não prova vazamento entre dispositivos nem explica qual sessão foi usada. Prioridade: diagnosticar sem modificar contas reais ou encerrar sessões de terceiros.

## Evidências e limites

O campo de conclusão lê somente session.user.email. Busca no código do produto não encontrou o e-mail relatado fixado no cadastro; os únicos literais desse endereço estão em testes de newsletter/editorial. A conta relatada existe em Auth apenas com identidade email, sem Google. Consulta limitada retornou somente presença, provedores e contagem de sessões, sem tokens, IPs, nomes ou IDs. Não diagnosticar o incidente como seleção Google sem comprovação. A rota /conta usa private,no-store e a sessão começa vazia, sendo carregada no cliente. Origem da captura (cadastro por senha, Google ou link encaminhado) foi perguntada ao responsável e permanece necessária para fechar a causa.

## Revisão prévia

| Perspectiva | Impacto, risco, dependência, recomendação |
|---|---|
| Produto | Cadastro deve representar a pessoa correta; oferecer troca local sem completar adesão indevida. Prosseguir com correção e investigação. |
| Arquitetura | Mesmo Supabase/broker; callback deve aceitar somente identidade Google validada no servidor; não confiar apenas em sessão email pré-existente. Preservar SSR e contrato do banco. |
| IA | N/A: sem IA na correção. |
| Segurança | Não apagar conta, revogar sessões globalmente nem editar e-mail para mascarar o sintoma. Logout somente local e limpeza de formulário; nenhuma mudança em RLS. Prosseguir condicionado a provas negativas. |
| UX | Identificar sessão no início do formulário e apresentar Usar outra conta junto dela; cadastro novo sem dados anteriores. Prosseguir. |
| CX | Usuário consegue corrigir conta escolhida sem suporte. Investigação remota depende do caminho realizado; não afirmar causa sem evidência. Prosseguir. |
| Growth | Preservar retorno/convite e um aceite; seleção Google explícita reduz ambiguidade entre contas do mesmo navegador. Prosseguir. |
| QA | Testar email existente no callback Google, troca local, campos vazios, ausência de adesão/OTP antes de aceite, Google novo/existente e retorno; pnpm validate. Prosseguir condicionado. |

Decisão: corrigir UX de troca e rejeitar sessão de senha no callback Google. Pedir seletor de conta ao provedor por prompt=select_account via extraParams suportado pelo SDK instalado, sem login_hint pessoal. Não tratar essa mitigação como prova da causa do relato. Não publicar sem autorização específica da correção. Rollback: reverter arquivos da correção, mantendo guard no banco, contas e sessões.

Branding paralelo: Search Console de wowbmo já confirmou propriedade de domínio Vitale e proprietário verificado. A conta não está automaticamente associada ao projeto OAuth criado em outra conta; qualquer novo IAM exige confirmação específica. Nenhuma nova propriedade/DNS foi criada.

## Resultado da investigação e validação da correção local

O responsável esclareceu: a pessoa clicou no botão da página e a tela já abriu assim. Esse esclarecimento não identifica uma sessão/token nem confirma se houve passagem pelo Google. Teste real de leitura, em janela Chrome privada recém-aberta: Home → Entrar → Criar conta gratuita abriu nome, e-mail, senha e celular vazios; nenhum e-mail do responsável. Janela de teste fechada e janela Search Console de wowbmo restaurada. Não reproduzida exposição genérica a visitantes novos; isso não encerra o relato no dispositivo remoto. A tentativa de inspeção HTTP sem navegador recebeu 403, sem conclusão a partir dela.

Implementado: sessão identificada no começo da conclusão de cadastro com Usar outra conta; sair somente local, limpar nome/e-mail/senha/celular/aceite/envios/prova Google de tela e voltar ao cadastro vazio. Nenhuma adesão/OTP acontece ao trocar. Callback Google agora exige getUser válido, mesmo ID da sessão e identidade Google real; sessão de senha não basta. Adaptador envia prompt=select_account pelo extraParams suportado no SDK, sem e-mail/login_hint fixo. O teste comprova o parâmetro no pedido ao broker; propagação real pelo provedor será conferida na publicação, sem presumir por teste simulado.

Validações aprovadas: lint dos três arquivos; smoke local direcionado e regressão da comunidade (todos os pedidos não locais bloqueados), incluindo senha/recovery/perfil/comentários/convites/newsletter/OTP/Google; casos negativos de callback com sessão email e troca local sem join/OTP; pnpm validate: typecheck, 66 testes e build. A primeira execução do novo teste encontrou botão colocado no ramo de validação em vez do formulário inicial; localização corrigida e ambas as execuções posteriores aprovadas. Evidências locais em artifacts/member-identity-selection/ (ignoradas no Git); prova do visitante real fora do Git em outputs/vitale-identity-selection-2026-11-05/fresh-visitor-public.png.

## Revisão posterior — mitigação local, não encerramento do incidente

| Perspectiva | Status | Evidência/limite |
|---|---|---|
| Produto | Pass | Troca de conta disponível junto da identidade antes de aderir; origem e convite preservados. |
| Arquitetura | Pass | Mesmo Auth/broker e SSR; callback valida identidade do servidor, sem banco/migration. |
| IA | N/A | Sem IA. |
| Segurança | Pass | Caso negativo email→Google rejeitado; logout local sem revogação de terceiros; nenhuma escrita em conta real. Diagnóstico remoto continua aberto, não certificado como resolvido. |
| UX | Pass | Prova mobile com sessão e botão visível; depois da troca todos os campos e aceite vazios. |
| CX | Pass | Rota de correção pelo próprio usuário e falha com recuperação; nenhum OTP real disparado. |
| Growth | Pass | Cadastro com um aceite e newsletter incluída preservados, retorno contextual intacto; solicita seleção Google. |
| PMO/QA | Pass | Lint, smoke local completo do escopo e pnpm validate aprovados; publicação requer aprovação, causa remota permanece investigável. |

Trade-off registrado: publicar a mitigação não prova nem corrige automaticamente uma possível sessão que já esteja no aparelho remoto. Não alterar permissões, senhas, perfis ou revogar outras sessões sem evidência e autorização. Custo externo desta correção: nenhum previsto, sem serviços pagos/mensagens/agente Lovable; publicação usa pipeline existente. Rollback por reversão dos três arquivos de produto, preservando dados, guard e credenciais.
