# Corrigir convite de gerente: e-mail que não chega e pedido de "cadastrar negócio"

## O que os registros mostram
- O domínio de e-mail está verificado e funcionando (últimos envios com sucesso às 19:16 e 19:51).
- O convidado **eu@marcosroberto.me** já tinha uma conta criada às 13:49 (antes do convite), que nunca foi confirmada. Quando ele "cadastra de novo", o sistema não cria outra conta e **não envia e-mail nenhum** (nenhum envio registrado depois das 19:51). Por isso nada chega.
- Essa conta antiga também ganhou um negócio próprio padrão, por isso o login pede para configurar negócio em vez de entrar na equipe.
- O convite de **suporte@marcosroberto.me** (19:23) continua pendente mesmo com a conta confirmada: o aceite automático só roda para quem ainda não tem negócio, então quem já tem conta nunca entra na equipe.
- O convite hoje só gera link; não existe envio automático por e-mail.

## O que será feito
1. **Cadastro de e-mail já existente**: se a pessoa tentar se cadastrar com e-mail que já tem conta não confirmada, o app reenvia o e-mail de confirmação automaticamente e mostra a tela "Verifique seu email". Se a conta já está confirmada, avisa "Você já tem conta — entre" e abre o login.
2. **Aceite do convite em todo login**: ao entrar, se houver convite válido para o e-mail, a pessoa é colocada na equipe e o negócio convidado vira o ativo — mesmo que ela já tenha conta ou negócio próprio (o negócio dela continua disponível no seletor).
3. **Não pedir cadastro de negócio a quem entrou por convite**: se a pessoa já pertence a alguma equipe, vai direto para ela.
4. **Convite enviado por e-mail automaticamente**: ao criar o convite, o Gerir+ envia um e-mail com a identidade visual (nome do negócio, papel e botão "Aceitar convite"). O botão de copiar link continua como alternativa, e haverá "Reenviar convite".
5. **Corrigir os casos atuais**: reenviar a confirmação para eu@marcosroberto.me e aplicar os convites pendentes nas próximas entradas.
6. **Testar** o fluxo completo com um e-mail novo e com um e-mail já existente, conferindo nos registros que os envios saíram.

## Pendente de você
- Quantos negócios cada plano permite? (Sugestão atual: Starter 1, Pro 2, Scale 5.)

## Detalhes técnicos
- Auth.tsx: `signUp` com e-mail existente retorna `user.identities = []`; nesse caso chamar `auth.resend({type:'signup'})` e, se erro indicar confirmado, alternar para login.
- AuthContext: chamar `accept_my_pending_invite()` em todo `SIGNED_IN`/carga de sessão, não só quando sem unidade; RPC passa a aceitar mesmo com unidade ativa e trocar `active_unit_id` para a unidade do convite.
- Onboarding só quando `list_my_units()` estiver vazio.
- Envio de convite: `scaffold_transactional_email_templates` + template `team-invite` + Edge Function `send-team-invite` (valida JWT e papel owner/manager, chama `sendTemplateEmail`), acionada após `invite_unit_member` em TeamSettings.tsx; deploy das funções.
