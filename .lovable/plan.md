# Convidado entra direto no negócio que o convidou

## O que acontece hoje
- Aceitar o convite já marca o cadastro como concluído e leva o usuário ao negócio certo.
- O problema: o convite só é lembrado pelo navegador onde o link foi aberto. Se a pessoa confirma o e-mail no celular, em outro navegador ou numa aba nova, esse registro se perde. Ela chega ao sistema sem convite e cai em "Configure seu negócio".

## O que muda
1. **O sistema passa a reconhecer o convite pelo e-mail**: ao entrar, se existir um convite válido para o e-mail da pessoa, o sistema aceita esse convite antes de mostrar "Configure seu negócio". O navegador deixa de ser necessário para isso.
2. **Tela de boas-vindas**: depois de aceitar, aparece a mensagem "Você entrou na equipe de [Negócio] como [Papel]", e a pessoa vai direto para a área liberada para ela: Vendas no caso do colaborador, Dashboard no caso do gerente.
3. **Mais de um convite pendente**: aceitamos o mais recente. Os outros continuam valendo pelo link.
4. **Convite expirado**: aparece "Seu convite expirou, peça um novo ao responsável", junto com a opção de criar o próprio negócio.
5. O link `/convite/...` continua funcionando como hoje.

## Detalhes técnicos
- Nova função RPC `accept_my_pending_invite()` (SECURITY DEFINER, `search_path` fixo, uso só por usuários autenticados). Ela busca em `unit_members` o convite com `lower(email)` igual ao e-mail do usuário, `accepted_at IS NULL` e `expires_at > now()`, e usa a mesma lógica de `accept_unit_invite`. Retorna `{accepted, unit_name, role}` ou `{expired:true}`.
- `AppRoutes` em App.tsx: antes de mostrar Onboarding a quem ainda não concluiu o cadastro, chama a RPC uma única vez. Com `accepted`, roda `refreshProfile()` e mostra um aviso. Com `expired`, o Onboarding exibe um alerta.
- Regra registrada em AGENTS.md.
