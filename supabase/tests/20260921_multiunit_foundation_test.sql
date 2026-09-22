-- RED specification for the additive multi-unit foundation and durable site
-- lead ingestion. The production migration intentionally does not exist yet.

BEGIN;

SELECT plan(30);

-- Canonical multi-unit foundation tables.
SELECT has_table('public', 'organizations', 'organizations exists');
SELECT has_table('public', 'legal_entities', 'legal_entities exists');
SELECT has_table('public', 'business_units', 'business_units exists');
SELECT has_table('public', 'organization_members', 'organization_members exists');
SELECT has_table('public', 'business_unit_members', 'business_unit_members exists');
SELECT has_table('public', 'bank_accounts', 'bank_accounts exists');
SELECT has_table('public', 'bank_account_business_units', 'bank_account_business_units exists');
SELECT has_table('public', 'proposal_sequences', 'proposal_sequences exists');
SELECT has_table('public', 'goals', 'goals exists');
SELECT has_table('public', 'platform_admins', 'platform_admins exists');
SELECT has_table('public', 'platform_access_grants', 'platform_access_grants exists');

-- Durable integration configuration and idempotent event persistence for the
-- site-lead webhook. Tenant routing comes from site_lead_integrations, never
-- from a tenant identifier supplied in the public payload.
SELECT has_table('public', 'site_lead_integrations', 'site_lead_integrations exists');
SELECT has_table('public', 'site_lead_events', 'site_lead_events exists');

SELECT enum_has_labels(
  'public',
  'app_role',
  ARRAY['proprietario', 'administrador', 'comercial', 'operacao', 'financeiro', 'leitura'],
  'app_role has the canonical organization roles in order'
);

SELECT enum_has_labels(
  'public',
  'platform_role',
  ARRAY['plataforma_admin', 'plataforma_suporte', 'plataforma_auditoria'],
  'platform_role has the canonical platform roles in order'
);

-- Every new tenant, authorization, and webhook-persistence table starts with
-- RLS enabled. Policies and behavioral isolation belong to later tests.
SELECT ok(
  COALESCE((
    SELECT c.relrowsecurity
      FROM pg_catalog.pg_class AS c
      JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = expected.table_name
       AND c.relkind IN ('r', 'p')
  ), false),
  format('RLS is enabled on public.%I', expected.table_name)
)
FROM (VALUES
  ('organizations'),
  ('legal_entities'),
  ('business_units'),
  ('organization_members'),
  ('business_unit_members'),
  ('bank_accounts'),
  ('bank_account_business_units'),
  ('proposal_sequences'),
  ('goals'),
  ('platform_admins'),
  ('platform_access_grants'),
  ('site_lead_integrations'),
  ('site_lead_events')
) AS expected(table_name);

-- Trusted ingestion boundary: the caller supplies only credential/key digests
-- and the normalized allowlisted payload. Organization, unit and integration
-- are derived inside the function; the client cannot choose tenant identifiers.
SELECT has_function(
  'private',
  'ingest_site_lead',
  ARRAY['bytea', 'bytea', 'jsonb']::name[],
  'private.ingest_site_lead(bytea, bytea, jsonb) exists'
);

SELECT function_returns(
  'private',
  'ingest_site_lead',
  ARRAY['bytea', 'bytea', 'jsonb']::name[],
  'jsonb',
  'private.ingest_site_lead(bytea, bytea, jsonb) returns jsonb'
);

SELECT * FROM finish();
ROLLBACK;
