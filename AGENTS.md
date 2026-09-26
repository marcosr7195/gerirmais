# Architecture rules

- Multiunidade: clients, deals, service_orders, transactions e checklist_items têm unit_id preenchido por trigger com profiles.active_unit_id; RLS filtra por public.current_unit_id() — isola unidades no banco sem exigir unit_id no frontend.
- Papéis por unidade (owner/manager/collaborator/viewer) ficam em unit_members; RLS usa current_unit_role() — Vendas/Entregáveis liberam collaborator, transactions não; DELETE só owner.
- Consultas do frontend em tabelas por unidade não filtram por user_id — o RLS delimita a unidade, e membros precisam ver os registros do dono.
- Convites: RPCs invite/accept/list/update/remove_unit_member; link /convite/:token válido 7 dias, entregue por copiar/mailto (sem domínio de e-mail próprio).
- Emails de autenticação compartilham o layout Gerir+ em pt-BR via branded-email.tsx — mantém os seis fluxos visuais consistentes.
- Convites são aceitos automaticamente pelo e-mail no login (accept_my_pending_invite), sem depender do localStorage. Quem se cadastra por convite (invited_signup) não ganha negócio padrão nem teste grátis. Motivo: a confirmação do e-mail costuma acontecer em outro navegador.
- O plano pertence ao proprietário: usePlan lê current_unit_plan(), que traz o plano do dono da unidade ativa. create_my_business aplica o limite de negócios (starter 1, pro 2, scale 5; durante o teste, 1) e só inicia os 14 dias grátis se trial_used = false. Motivo: membros não herdam plano.
- Campos de assinatura só mudam por service_role ou por RPC que ative app.allow_sub_change dentro da transação.
