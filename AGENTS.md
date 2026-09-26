# Architecture rules

- Multiunidade: clients, deals, service_orders, transactions e checklist_items têm unit_id preenchido por trigger com profiles.active_unit_id; RLS filtra por public.current_unit_id() — isola unidades no banco sem exigir unit_id no frontend.
- Papéis por unidade (owner/manager/collaborator/viewer) ficam em unit_members; RLS usa current_unit_role() — Vendas/Entregáveis liberam collaborator, transactions não; DELETE só owner.
- Consultas do frontend em tabelas por unidade não filtram por user_id — o RLS delimita a unidade, e membros precisam ver os registros do dono.
- Convites: RPCs invite/accept/list/update/remove_unit_member; link /convite/:token válido 7 dias, entregue por copiar/mailto (sem domínio de e-mail próprio).
