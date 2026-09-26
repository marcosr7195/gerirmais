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

## Ter o próprio negócio depois (sem novo cadastro)
- A mesma conta pode participar de vários negócios. Não é preciso sair da equipe nem criar outra conta.
- Um **seletor de negócio** fica no topo do menu lateral, com a lista "Meus negócios" e "Equipes que participo". Ao trocar, a tela mostra os dados do negócio escolhido. Os dados de um negócio nunca aparecem em outro.
- A opção **"Criar meu negócio"** abre o formulário de configuração (nome, tipo de serviço, CNPJ/CPF). A pessoa vira proprietária desse novo negócio, com acesso total, e continua na equipe onde já estava.

## Regras de assinatura
- **O plano pertence ao proprietário.** Membros da equipe usam o plano do dono daquele negócio e nunca herdam esse plano para os próprios negócios.
- **Quem entra por convite** não recebe teste grátis no cadastro. Enquanto for apenas membro, não paga nada.
- **Primeiro negócio próprio**: quem ainda não é proprietário de nenhum negócio ganha 14 dias grátis ao criar o primeiro. Depois disso, precisa assinar como proprietário, pela página Planos e pela Kiwify.
- **Teste acabou sem assinatura**: o negócio próprio fica bloqueado para alterações até a assinatura. A participação em outras equipes continua normal.
- **Limite de negócios por plano**: cada proprietário pode ter um número máximo de negócios, conforme o plano. Ao chegar no limite, "Criar meu negócio" mostra a opção de fazer upgrade.
  - Starter: 1 negócio | Pro: 2 negócios | Scale: 5 negócios. Esses números são sugestões e precisam da sua confirmação.

## Detalhes técnicos
- Nova função RPC `accept_my_pending_invite()` (SECURITY DEFINER, `search_path` fixo, uso só por usuários autenticados). Ela busca em `unit_members` o convite com `lower(email)` igual ao e-mail do usuário, `accepted_at IS NULL` e `expires_at > now()`, e usa a mesma lógica de `accept_unit_invite`. Retorna `{accepted, unit_name, role}` ou `{expired:true}`.
- `AppRoutes` em App.tsx: antes de mostrar Onboarding a quem ainda não concluiu o cadastro, chama a RPC uma única vez. Com `accepted`, roda `refreshProfile()` e mostra um aviso. Com `expired`, o Onboarding exibe um alerta.
- Hoje o cadastro cria automaticamente um negócio padrão para todo usuário novo. Para quem entra por convite, esse negócio não é criado e o plano fica `pendente`, sem teste grátis.
- RPC `list_my_units()`: seletor que troca `profiles.active_unit_id`, validado por `validate_active_unit`.
- RPC `create_my_business(name, service_type, document)`: confere o limite do plano, cria organization, unit e fiscal_entity e define o novo negócio como ativo. Na primeira vez como proprietário, começa o teste de 14 dias.
- Verificações de plano (`usePlan`/FeatureGate) passam a usar o plano do dono da unidade ativa.
- Regras registradas em AGENTS.md e na memória do projeto.
