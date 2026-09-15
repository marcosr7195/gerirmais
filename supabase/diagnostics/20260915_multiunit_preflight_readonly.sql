-- Gerir+ — diagnóstico multiunidade somente leitura
-- Data: 2026-09-15
-- Objetivo: comparar o schema remoto com as migrations locais antes de qualquer DDL/DML.
-- Segurança: retorna apenas metadados e contagens agregadas; não retorna dados de clientes.

begin transaction read only;
set local statement_timeout = '60s';

-- 1. Migrations aplicadas
select
  version,
  name
from supabase_migrations.schema_migrations
order by version;

-- 2. Tabelas e RLS no schema public
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
order by c.relname;

-- 3. Colunas estruturais e nulabilidade
select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

-- 4. Chaves primárias, estrangeiras e únicas
select
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_schema as foreign_table_schema,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on kcu.constraint_schema = tc.constraint_schema
 and kcu.constraint_name = tc.constraint_name
left join information_schema.constraint_column_usage ccu
  on ccu.constraint_schema = tc.constraint_schema
 and ccu.constraint_name = tc.constraint_name
where tc.table_schema = 'public'
  and tc.constraint_type in ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE')
order by tc.table_name, tc.constraint_type, tc.constraint_name, kcu.ordinal_position;

-- 5. Índices
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_catalog.pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- 6. Policies efetivas de public e storage
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_catalog.pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

-- 7. Funções públicas: metadados de segurança sem expor dados de aplicação
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_arguments,
  p.prosecdef as security_definer,
  p.provolatile as volatility,
  p.proleakproof as leakproof,
  pg_catalog.pg_get_userbyid(p.proowner) as owner
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname, identity_arguments;

-- 8. Triggers ativos e suas funções
select
  event_object_schema,
  event_object_table,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
from information_schema.triggers
where event_object_schema in ('public', 'auth')
order by event_object_schema, event_object_table, trigger_name, event_manipulation;

-- 9. Buckets: somente configuração, sem objetos
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
order by id;

-- 10. Contagens agregadas por tabela conhecida
select 'profiles' as table_name, count(*)::bigint as row_count from public.profiles
union all select 'clients', count(*)::bigint from public.clients
union all select 'deals', count(*)::bigint from public.deals
union all select 'deal_items', count(*)::bigint from public.deal_items
union all select 'service_orders', count(*)::bigint from public.service_orders
union all select 'checklist_items', count(*)::bigint from public.checklist_items
union all select 'transactions', count(*)::bigint from public.transactions
union all select 'categories', count(*)::bigint from public.categories
union all select 'proposals', count(*)::bigint from public.proposals
union all select 'client_interactions', count(*)::bigint from public.client_interactions
union all select 'vitrine_items', count(*)::bigint from public.vitrine_items
union all select 'financas_pessoais', count(*)::bigint from public.financas_pessoais
union all select 'financas_pessoais_categorias', count(*)::bigint from public.financas_pessoais_categorias
union all select 'credit_cards', count(*)::bigint from public.credit_cards
union all select 'credit_card_purchases', count(*)::bigint from public.credit_card_purchases
union all select 'credit_card_installments', count(*)::bigint from public.credit_card_installments
order by table_name;

-- 11. Nulos e usuários órfãos: somente totais
select 'profiles' as table_name,
       count(*) filter (where user_id is null)::bigint as null_user_id,
       count(*) filter (where user_id is not null and not exists (select 1 from auth.users u where u.id = profiles.user_id))::bigint as orphan_user_id
from public.profiles
union all
select 'clients',
       count(*) filter (where user_id is null)::bigint,
       count(*) filter (where user_id is not null and not exists (select 1 from auth.users u where u.id = clients.user_id))::bigint
from public.clients
union all
select 'deals',
       count(*) filter (where user_id is null)::bigint,
       count(*) filter (where user_id is not null and not exists (select 1 from auth.users u where u.id = deals.user_id))::bigint
from public.deals
union all
select 'deal_items',
       count(*) filter (where user_id is null)::bigint,
       count(*) filter (where user_id is not null and not exists (select 1 from auth.users u where u.id = deal_items.user_id))::bigint
from public.deal_items
union all
select 'service_orders',
       count(*) filter (where user_id is null)::bigint,
       count(*) filter (where user_id is not null and not exists (select 1 from auth.users u where u.id = service_orders.user_id))::bigint
from public.service_orders
union all
select 'checklist_items',
       count(*) filter (where user_id is null)::bigint,
       count(*) filter (where user_id is not null and not exists (select 1 from auth.users u where u.id = checklist_items.user_id))::bigint
from public.checklist_items
union all
select 'transactions',
       count(*) filter (where user_id is null)::bigint,
       count(*) filter (where user_id is not null and not exists (select 1 from auth.users u where u.id = transactions.user_id))::bigint
from public.transactions
union all
select 'categories',
       count(*) filter (where user_id is null)::bigint,
       count(*) filter (where user_id is not null and not exists (select 1 from auth.users u where u.id = categories.user_id))::bigint
from public.categories
union all
select 'proposals',
       count(*) filter (where user_id is null)::bigint,
       count(*) filter (where user_id is not null and not exists (select 1 from auth.users u where u.id = proposals.user_id))::bigint
from public.proposals
union all
select 'client_interactions',
       count(*) filter (where user_id is null)::bigint,
       count(*) filter (where user_id is not null and not exists (select 1 from auth.users u where u.id = client_interactions.user_id))::bigint
from public.client_interactions
union all
select 'vitrine_items',
       count(*) filter (where user_id is null)::bigint,
       count(*) filter (where user_id is not null and not exists (select 1 from auth.users u where u.id = vitrine_items.user_id))::bigint
from public.vitrine_items
order by table_name;

-- 12. Divergências de tenant entre pais e filhos: somente contagens
select 'deals.client_id -> clients.id' as relationship,
       count(*)::bigint as mismatched_user_id
from public.deals child
join public.clients parent on parent.id = child.client_id
where child.user_id is distinct from parent.user_id
union all
select 'deal_items.deal_id -> deals.id', count(*)::bigint
from public.deal_items child
join public.deals parent on parent.id = child.deal_id
where child.user_id is distinct from parent.user_id
union all
select 'service_orders.deal_id -> deals.id', count(*)::bigint
from public.service_orders child
join public.deals parent on parent.id = child.deal_id
where child.user_id is distinct from parent.user_id
union all
select 'service_orders.client_id -> clients.id', count(*)::bigint
from public.service_orders child
join public.clients parent on parent.id = child.client_id
where child.user_id is distinct from parent.user_id
union all
select 'checklist_items.service_order_id -> service_orders.id', count(*)::bigint
from public.checklist_items child
join public.service_orders parent on parent.id = child.service_order_id
where child.user_id is distinct from parent.user_id
union all
select 'transactions.service_order_id -> service_orders.id', count(*)::bigint
from public.transactions child
join public.service_orders parent on parent.id = child.service_order_id
where child.user_id is distinct from parent.user_id
union all
select 'proposals.deal_id -> deals.id', count(*)::bigint
from public.proposals child
join public.deals parent on parent.id = child.deal_id
where child.user_id is distinct from parent.user_id
union all
select 'proposals.client_id -> clients.id', count(*)::bigint
from public.proposals child
join public.clients parent on parent.id = child.client_id
where child.user_id is distinct from parent.user_id
union all
select 'client_interactions.client_id -> clients.id', count(*)::bigint
from public.client_interactions child
join public.clients parent on parent.id = child.client_id
where child.user_id is distinct from parent.user_id
union all
select 'credit_card_purchases.card_id -> credit_cards.id', count(*)::bigint
from public.credit_card_purchases child
join public.credit_cards parent on parent.id = child.card_id
where child.user_id is distinct from parent.user_id
union all
select 'credit_card_installments.purchase_id -> credit_card_purchases.id', count(*)::bigint
from public.credit_card_installments child
join public.credit_card_purchases parent on parent.id = child.purchase_id
where child.user_id is distinct from parent.user_id
union all
select 'credit_card_installments.card_id -> credit_cards.id', count(*)::bigint
from public.credit_card_installments child
join public.credit_cards parent on parent.id = child.card_id
where child.user_id is distinct from parent.user_id
order by relationship;

-- 13. Distribuição por proprietário sem revelar UUIDs individuais
select
  source,
  count(*)::bigint as owner_count,
  min(record_count)::bigint as min_records_per_owner,
  max(record_count)::bigint as max_records_per_owner,
  round(avg(record_count), 2) as avg_records_per_owner
from (
  select 'clients' as source, user_id, count(*)::bigint as record_count from public.clients group by user_id
  union all select 'deals', user_id, count(*)::bigint from public.deals group by user_id
  union all select 'service_orders', user_id, count(*)::bigint from public.service_orders group by user_id
  union all select 'transactions', user_id, count(*)::bigint from public.transactions group by user_id
  union all select 'proposals', user_id, count(*)::bigint from public.proposals group by user_id
  union all select 'vitrine_items', user_id, count(*)::bigint from public.vitrine_items group by user_id
) grouped
where user_id is not null
group by source
order by source;

commit;
