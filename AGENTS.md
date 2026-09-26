# Architecture rules

- Multiunidade: clients, deals, service_orders, transactions e checklist_items têm unit_id preenchido por trigger com profiles.active_unit_id; RLS filtra por public.current_unit_id() — isola unidades no banco sem exigir unit_id no frontend.
- Acesso a unidades é pela posse da organização (organizations.owner_user_id) — membros/papéis ainda não existem.
