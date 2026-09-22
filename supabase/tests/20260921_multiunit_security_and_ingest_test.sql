-- RED specification: secure normalized site-lead ingestion and behavioral
-- multi-unit isolation. All fixtures use fixed, fictitious UUIDs.
BEGIN;

SELECT plan(87);

-- The durable inbox must not persist secrets or an undifferentiated request.
SELECT hasnt_column('public', 'site_lead_events', forbidden.column_name,
  format('site_lead_events does not store %s in clear text', forbidden.column_name))
FROM (VALUES
  ('payload'), ('raw_body'), ('bearer_token'), ('credential'), ('idempotency_key')
) AS forbidden(column_name);

-- The inbox is queryable without reopening an opaque payload.
SELECT has_column('public', 'site_lead_events', expected.column_name,
  format('site_lead_events has normalized %s', expected.column_name))
FROM (VALUES
  ('name'), ('phone'), ('email'), ('external_id'), ('source'), ('service'),
  ('campaign'), ('utm_source'), ('utm_medium'), ('utm_campaign'), ('utm_term'),
  ('utm_content'), ('message'), ('consent_granted'), ('consent_occurred_at'),
  ('consent_text'), ('occurred_at'), ('metadata')
) AS expected(column_name);

-- Equivalent lifecycle representations are accepted, but all three semantics
-- (state, expiry, revocation) must be represented.
SELECT ok(EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'site_lead_integrations'
    AND column_name IN ('status', 'is_active')
), 'integration has status/active state');
SELECT ok(EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'site_lead_integrations'
    AND column_name IN ('expires_at', 'valid_until', 'expiration_at')
), 'integration has expiration');
SELECT ok(EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'site_lead_integrations'
    AND column_name IN ('revoked_at', 'is_active')
), 'integration has revocation state');

-- Fixed users and tenant graph. Data setup is privileged; behavior below is not.
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-000000000001', 'owner@example.invalid'),
  ('00000000-0000-4000-8000-000000000002', 'member@example.invalid'),
  ('00000000-0000-4000-8000-000000000003', 'outsider@example.invalid'),
  ('00000000-0000-4000-8000-000000000004', 'unassigned@example.invalid');

INSERT INTO public.organizations (id, name, owner_user_id) VALUES
  ('10000000-0000-4000-8000-000000000001', 'Org One', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002', 'Org Two', '00000000-0000-4000-8000-000000000003');
INSERT INTO public.legal_entities (id, organization_id, legal_name, document) VALUES
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Entity One', 'DOC-ONE'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Entity Two', 'DOC-TWO');
INSERT INTO public.business_units (id, organization_id, legal_entity_id, name) VALUES
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'One A'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'One B'),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Two A');
INSERT INTO public.organization_members (id, organization_id, user_id, role) VALUES
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'proprietario'),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'comercial'),
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', 'proprietario');
INSERT INTO public.business_unit_members (id, organization_id, business_unit_id, user_id, role) VALUES
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'comercial');

INSERT INTO public.site_lead_integrations
  (id, organization_id, business_unit_id, name, credential_digest, is_active)
VALUES
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'One A active', extensions.digest('credential-one-a', 'sha256'), true),
  ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'One B active', extensions.digest('credential-one-b', 'sha256'), true),
  ('60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'Revoked', extensions.digest('credential-revoked', 'sha256'), false),
  ('60000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003', 'Two active', extensions.digest('credential-two', 'sha256'), true),
  -- Fixed HMAC-SHA-256 vector shared with site-lead-handler.test.ts.
  ('60000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Immutable spare', decode('8fd4d442c315549f4ffbae49eecc487abb1d1f5d0d6f5a459f1236b9cdc890ce', 'hex'), true),
  ('60000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Expiry probe', extensions.digest('credential-expiry', 'sha256'), true);

SELECT throws_ok(
  $$UPDATE public.site_lead_integrations SET business_unit_id = '30000000-0000-4000-8000-000000000002' WHERE id = '60000000-0000-4000-8000-000000000005'$$,
  NULL::char(5), NULL, 'integration business_unit_id is immutable');
UPDATE public.site_lead_integrations SET business_unit_id = '30000000-0000-4000-8000-000000000001'
WHERE id = '60000000-0000-4000-8000-000000000005';
SELECT throws_ok(
  $$UPDATE public.site_lead_integrations SET organization_id = '10000000-0000-4000-8000-000000000002', business_unit_id = '30000000-0000-4000-8000-000000000003' WHERE id = '60000000-0000-4000-8000-000000000005'$$,
  NULL::char(5), NULL, 'integration organization_id is immutable');
UPDATE public.site_lead_integrations
SET organization_id = '10000000-0000-4000-8000-000000000001', business_unit_id = '30000000-0000-4000-8000-000000000001'
WHERE id = '60000000-0000-4000-8000-000000000005';

-- The trusted entry point is callable only by service_role.
SELECT ok(NOT EXISTS (
  SELECT 1 FROM pg_proc p, LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
  WHERE p.oid = 'private.ingest_site_lead(bytea,bytea,jsonb)'::regprocedure
    AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
), 'PUBLIC has no EXECUTE on ingest_site_lead');
SELECT ok(NOT has_function_privilege('anon', 'private.ingest_site_lead(bytea,bytea,jsonb)', 'EXECUTE'),
  'anon has no EXECUTE on ingest_site_lead');
SELECT ok(NOT has_function_privilege('authenticated', 'private.ingest_site_lead(bytea,bytea,jsonb)', 'EXECUTE'),
  'authenticated has no EXECUTE on ingest_site_lead');
SELECT ok(has_function_privilege('service_role', 'private.ingest_site_lead(bytea,bytea,jsonb)', 'EXECUTE'),
  'service_role alone has EXECUTE on ingest_site_lead');

SELECT has_function('public', 'ingest_site_lead_from_edge', ARRAY['text', 'text', 'jsonb']::name[],
  'public edge adapter exists with the narrow digest contract');
SELECT function_returns('public', 'ingest_site_lead_from_edge', ARRAY['text', 'text', 'jsonb']::name[], 'jsonb',
  'public edge adapter returns jsonb');
SELECT ok(NOT (SELECT prosecdef FROM pg_proc WHERE oid = 'public.ingest_site_lead_from_edge(text,text,jsonb)'::regprocedure),
  'public edge adapter is SECURITY INVOKER');
SELECT ok(NOT EXISTS (
  SELECT 1 FROM pg_proc p, LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
  WHERE p.oid = 'public.ingest_site_lead_from_edge(text,text,jsonb)'::regprocedure
    AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
), 'PUBLIC has no EXECUTE on edge adapter');
SELECT ok(NOT has_function_privilege('anon', 'public.ingest_site_lead_from_edge(text,text,jsonb)', 'EXECUTE'),
  'anon has no EXECUTE on edge adapter');
SELECT ok(NOT has_function_privilege('authenticated', 'public.ingest_site_lead_from_edge(text,text,jsonb)', 'EXECUTE'),
  'authenticated has no EXECUTE on edge adapter');
SELECT ok(has_function_privilege('service_role', 'public.ingest_site_lead_from_edge(text,text,jsonb)', 'EXECUTE'),
  'service_role has EXECUTE on edge adapter');
SELECT throws_ok(
  $$SELECT public.ingest_site_lead_from_edge('not-a-sha256', repeat('0', 64), '{}'::jsonb)$$,
  '22023', 'invalid site lead digest', 'edge adapter rejects non-SHA-256 hex input');

SET LOCAL ROLE service_role;
SELECT lives_ok(
  $$SELECT public.ingest_site_lead_from_edge(
      '8fd4d442c315549f4ffbae49eecc487abb1d1f5d0d6f5a459f1236b9cdc890ce',
      'cd0798942695e831c4e22778548cb6f751ce66f0f3919d0f7a75d2e8c79f3cbd',
      '{"name":"Service Role","phone":"12345678"}'::jsonb
    )$$,
  'service_role can traverse the public adapter into private persistence');
RESET ROLE;

CREATE TEMP TABLE edge_ingest_results (label text PRIMARY KEY, result jsonb);
INSERT INTO edge_ingest_results VALUES ('created', public.ingest_site_lead_from_edge(
  '8fd4d442c315549f4ffbae49eecc487abb1d1f5d0d6f5a459f1236b9cdc890ce', encode(extensions.digest('edge-key', 'sha256'), 'hex'),
  '{"name":"Edge","phone":"12345678"}'::jsonb));
SELECT is((SELECT result->>'status' FROM edge_ingest_results WHERE label = 'created'), 'created',
  'edge adapter delegates a new event');
INSERT INTO edge_ingest_results VALUES ('duplicate', public.ingest_site_lead_from_edge(
  '8fd4d442c315549f4ffbae49eecc487abb1d1f5d0d6f5a459f1236b9cdc890ce', encode(extensions.digest('edge-key', 'sha256'), 'hex'),
  '{"name":"Edge","phone":"12345678"}'::jsonb));
SELECT is((SELECT result->>'status' FROM edge_ingest_results WHERE label = 'duplicate'), 'duplicate',
  'edge adapter preserves duplicate semantics');
INSERT INTO edge_ingest_results VALUES ('conflict', public.ingest_site_lead_from_edge(
  '8fd4d442c315549f4ffbae49eecc487abb1d1f5d0d6f5a459f1236b9cdc890ce', encode(extensions.digest('edge-key', 'sha256'), 'hex'),
  '{"name":"Changed","phone":"12345678"}'::jsonb));
SELECT is((SELECT result->>'status' FROM edge_ingest_results WHERE label = 'conflict'), 'conflict',
  'edge adapter preserves conflict semantics');
DELETE FROM public.site_lead_events
 WHERE integration_id = '60000000-0000-4000-8000-000000000005';

SELECT has_function('public', 'is_org_member', ARRAY['uuid']::name[],
  'is_org_member(uuid) helper exists');
SELECT has_function('public', 'has_bu_access', ARRAY['uuid']::name[],
  'has_bu_access(uuid) helper exists');

-- Created/duplicate/conflict semantics; tenant values come only from integration.
CREATE TEMP TABLE ingest_results (label text PRIMARY KEY, result jsonb);
INSERT INTO ingest_results VALUES ('created', private.ingest_site_lead(
  extensions.digest('credential-one-a', 'sha256'), extensions.digest('idempotency-one', 'sha256'),
  '{"name":"Ada","phone":"+550000000001","email":"ada@example.invalid","external_id":"ext-1","source":"site","service":"consulting","campaign":"spring","utm_source":"search","utm_medium":"cpc","utm_campaign":"spring","utm_term":"term","utm_content":"hero","message":"Hello","consent":{"granted":true,"occurred_at":"2026-09-21T10:00:00Z","text":"Accepted"},"occurred_at":"2026-09-21T10:01:00Z","metadata":{"page":"home"}}'::jsonb));
SELECT is((SELECT result->>'status' FROM ingest_results WHERE label = 'created'), 'created',
  'first request is created');
SELECT is((SELECT organization_id::text FROM public.site_lead_events WHERE integration_id = '60000000-0000-4000-8000-000000000001'),
  '10000000-0000-4000-8000-000000000001', 'ingest derives organization from integration');
SELECT is((SELECT business_unit_id::text FROM public.site_lead_events WHERE integration_id = '60000000-0000-4000-8000-000000000001'),
  '30000000-0000-4000-8000-000000000001', 'ingest derives business unit from integration');
SELECT ok((SELECT to_jsonb(e) @> '{"name":"Ada","phone":"+550000000001","consent_granted":true,"metadata":{"page":"home"}}'::jsonb
             FROM public.site_lead_events e WHERE integration_id = '60000000-0000-4000-8000-000000000001'),
  'ingest persists normalized lead and consent fields');
INSERT INTO ingest_results VALUES ('duplicate', private.ingest_site_lead(
  extensions.digest('credential-one-a', 'sha256'), extensions.digest('idempotency-one', 'sha256'),
  '{"name":"Ada","phone":"+550000000001","email":"ada@example.invalid","external_id":"ext-1","source":"site","service":"consulting","campaign":"spring","utm_source":"search","utm_medium":"cpc","utm_campaign":"spring","utm_term":"term","utm_content":"hero","message":"Hello","consent":{"granted":true,"occurred_at":"2026-09-21T10:00:00Z","text":"Accepted"},"occurred_at":"2026-09-21T10:01:00Z","metadata":{"page":"home"}}'::jsonb));
SELECT is((SELECT result->>'status' FROM ingest_results WHERE label = 'duplicate'), 'duplicate',
  'same key and body is duplicate');
SELECT is((SELECT result->>'event_id' FROM ingest_results WHERE label = 'duplicate'),
          (SELECT result->>'event_id' FROM ingest_results WHERE label = 'created'),
  'duplicate returns the original event');
SELECT is((SELECT count(*)::integer FROM public.site_lead_events WHERE integration_id = '60000000-0000-4000-8000-000000000001'), 1,
  'duplicate does not add an event');
INSERT INTO ingest_results VALUES ('conflict', private.ingest_site_lead(
  extensions.digest('credential-one-a', 'sha256'), extensions.digest('idempotency-one', 'sha256'), '{"name":"Different","phone":"12345678"}'::jsonb));
SELECT is((SELECT result->>'status' FROM ingest_results WHERE label = 'conflict'), 'conflict',
  'same key and different body conflicts');
SELECT is((SELECT count(*)::integer FROM public.site_lead_events WHERE integration_id = '60000000-0000-4000-8000-000000000001'), 1,
  'conflict does not add an event');

SELECT throws_ok($$SELECT private.ingest_site_lead(extensions.digest('credential-one-a','sha256'), extensions.digest('tenant-top','sha256'), '{"name":"X","organization_id":"10000000-0000-4000-8000-000000000002"}'::jsonb)$$,
  '22023', 'invalid site lead payload', 'top-level tenant identifiers are rejected');
SELECT throws_ok($$SELECT private.ingest_site_lead(extensions.digest('credential-one-a','sha256'), extensions.digest('tenant-meta','sha256'), '{"name":"X","metadata":{"business_unit_id":"30000000-0000-4000-8000-000000000003"}}'::jsonb)$$,
  '22023', 'invalid site lead payload', 'metadata tenant identifiers are rejected');
SELECT throws_ok($$SELECT private.ingest_site_lead(extensions.digest('credential-revoked','sha256'), extensions.digest('revoked','sha256'), '{"name":"X","phone":"123"}'::jsonb)$$,
  '28000', 'site lead integration is not authorized', 'revoked/inactive integration is rejected');

CREATE FUNCTION pg_temp.expired_integration_is_rejected() RETURNS boolean
LANGUAGE plpgsql AS $test$
DECLARE v_column text;
BEGIN
  SELECT column_name INTO v_column
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'site_lead_integrations'
    AND column_name IN ('expires_at', 'valid_until', 'expiration_at')
  ORDER BY CASE column_name WHEN 'expires_at' THEN 1 WHEN 'valid_until' THEN 2 ELSE 3 END
  LIMIT 1;
  IF v_column IS NULL THEN RETURN false; END IF;
  EXECUTE format('UPDATE public.site_lead_integrations SET %I = now() - interval ''1 minute'' WHERE id = $1', v_column)
    USING '60000000-0000-4000-8000-000000000006'::uuid;
  BEGIN
    PERFORM private.ingest_site_lead(extensions.digest('credential-expiry','sha256'), extensions.digest('expired','sha256'), '{"name":"X","phone":"123"}'::jsonb);
    RETURN false;
  EXCEPTION WHEN invalid_authorization_specification THEN
    RETURN true;
  END;
END
$test$;
SELECT ok(pg_temp.expired_integration_is_rejected(), 'expired integration is rejected');

-- Add two more tenant-routed events for behavioral RLS checks.
DO $setup_events$
BEGIN
  PERFORM private.ingest_site_lead(extensions.digest('credential-one-b','sha256'), extensions.digest('one-b','sha256'), '{"name":"Unit B","phone":"123"}'::jsonb);
  PERFORM private.ingest_site_lead(extensions.digest('credential-two','sha256'), extensions.digest('two-a','sha256'), '{"name":"Org Two","phone":"123"}'::jsonb);
END
$setup_events$;

-- Test as API roles (never as the table owner). Grants expose tables to RLS; they
-- do not grant row access by themselves.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_lead_events, public.site_lead_integrations TO authenticated;
GRANT SELECT ON public.site_lead_events TO anon;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
SELECT is((SELECT count(*)::integer FROM public.site_lead_events WHERE organization_id = '10000000-0000-4000-8000-000000000001'), 2,
  'organization owner sees events from all organization units');
SET LOCAL request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
SELECT is((SELECT count(*)::integer FROM public.site_lead_events WHERE organization_id = '10000000-0000-4000-8000-000000000001'), 1,
  'explicit unit member sees only that unit');
SET LOCAL request.jwt.claim.sub = '00000000-0000-4000-8000-000000000003';
SELECT is((SELECT count(*)::integer FROM public.site_lead_events WHERE organization_id = '10000000-0000-4000-8000-000000000001'), 0,
  'user from another organization sees no events from this organization');
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claim.sub = '';
SELECT is((SELECT count(*)::integer FROM public.site_lead_events), 0, 'anon sees zero site lead events');

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
SELECT throws_ok('INSERT INTO public.site_lead_integrations DEFAULT VALUES',
  '42501', NULL, 'authenticated cannot directly insert integrations');
SELECT throws_ok('INSERT INTO public.site_lead_events DEFAULT VALUES',
  '42501', NULL, 'authenticated cannot directly insert events');
UPDATE public.site_lead_integrations SET name = 'tampered' WHERE id = '60000000-0000-4000-8000-000000000001';
DELETE FROM public.site_lead_integrations WHERE id = '60000000-0000-4000-8000-000000000002';
UPDATE public.site_lead_events SET created_at = '2000-01-01' WHERE integration_id = '60000000-0000-4000-8000-000000000001';
DELETE FROM public.site_lead_events WHERE integration_id = '60000000-0000-4000-8000-000000000002';
RESET ROLE;
SELECT is((SELECT name FROM public.site_lead_integrations WHERE id = '60000000-0000-4000-8000-000000000001'), 'One A active',
  'authenticated cannot directly update integrations');
SELECT is((SELECT count(*)::integer FROM public.site_lead_integrations WHERE id = '60000000-0000-4000-8000-000000000002'), 1,
  'authenticated cannot directly delete integrations');
SELECT isnt((SELECT created_at::date FROM public.site_lead_events WHERE integration_id = '60000000-0000-4000-8000-000000000001'), '2000-01-01'::date,
  'authenticated cannot directly update events');
SELECT is((SELECT count(*)::integer FROM public.site_lead_events WHERE integration_id = '60000000-0000-4000-8000-000000000002'), 1,
  'authenticated cannot directly delete events');

-- Personal finance remains user-scoped, not business-unit scoped.
SELECT hasnt_column('public', personal.table_name, 'business_unit_id',
  format('%s remains personal (no business_unit_id)', personal.table_name))
FROM (VALUES ('financas_pessoais'), ('financas_pessoais_categorias'),
             ('credit_cards'), ('credit_card_purchases'), ('credit_card_installments'))
  AS personal(table_name);

-- Fundamental cross-tenant and completeness constraints are executable specs.
SELECT throws_ok($$INSERT INTO public.business_units (id, organization_id, legal_entity_id, name) VALUES ('30000000-0000-4000-8000-000000000099', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'Cross tenant')$$,
  '23503', NULL, 'business unit rejects legal entity from another organization');
SELECT throws_ok($$INSERT INTO public.business_unit_members (id, organization_id, business_unit_id, user_id, role) VALUES ('50000000-0000-4000-8000-000000000099', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000004', 'leitura')$$,
  '23503', NULL, 'unit membership requires organization membership');
SELECT throws_ok($$INSERT INTO public.bank_accounts (id, organization_id, legal_entity_id, bank_name) VALUES ('70000000-0000-4000-8000-000000000099', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'No Identifier Bank')$$,
  '23514', NULL, 'bank account requires account number or Pix key');

-- Supabase-compatible extension placement and defensive SQL contract.
SELECT has_function('extensions', 'digest', ARRAY['bytea', 'text']::name[],
  'pgcrypto digest is available from the Supabase extensions schema');
SELECT throws_ok($$SELECT private.ingest_site_lead(extensions.digest('credential-one-a','sha256'), extensions.digest('missing-contact','sha256'), '{"name":"No Contact"}'::jsonb)$$,
  '22023', 'invalid site lead payload', 'SQL ingest requires phone or email');
SELECT throws_ok($$SELECT private.ingest_site_lead(extensions.digest('credential-one-a','sha256'), extensions.digest('missing-name','sha256'), '{"phone":"123"}'::jsonb)$$,
  '22023', 'invalid site lead payload', 'SQL ingest requires name');
SELECT throws_ok($$SELECT private.ingest_site_lead(extensions.digest('credential-one-a','sha256'), extensions.digest('long-name','sha256'), jsonb_build_object('name', repeat('x', 121), 'phone', '123'))$$,
  '22023', 'invalid site lead payload', 'SQL ingest enforces text limits');
SELECT throws_ok($$SELECT private.ingest_site_lead(extensions.digest('credential-one-a','sha256'), extensions.digest('bad-consent','sha256'), '{"name":"X","phone":"123","consent":{}}'::jsonb)$$,
  '22023', 'invalid site lead payload', 'SQL ingest requires consent.granted when consent exists');
SELECT throws_ok($$SELECT private.ingest_site_lead(extensions.digest('credential-one-a','sha256'), extensions.digest('nested-metadata','sha256'), '{"name":"X","phone":"123","metadata":{"nested":{"a":1}}}'::jsonb)$$,
  '22023', 'invalid site lead payload', 'SQL ingest rejects nested metadata');

SELECT throws_ok($$DELETE FROM public.site_lead_integrations WHERE id = '60000000-0000-4000-8000-000000000001'$$,
  '23503', NULL, 'durable lead events prevent integration deletion');

INSERT INTO public.bank_accounts
  (id, organization_id, legal_entity_id, bank_name, pix_key)
VALUES
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', NULL, 'Finance@Example.Invalid');
SELECT throws_ok($$INSERT INTO public.bank_accounts
  (id, organization_id, legal_entity_id, bank_name, pix_key)
VALUES
  ('70000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', NULL, ' finance@example.invalid ')$$,
  '23505', NULL, 'normalized Pix key is unique per legal entity');

INSERT INTO public.bank_accounts
  (id, organization_id, legal_entity_id, bank_name, agency, account_number)
VALUES
  ('70000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', NULL, NULL, '000123');
SELECT throws_ok($$INSERT INTO public.bank_accounts
  (id, organization_id, legal_entity_id, bank_name, agency, account_number)
VALUES
  ('70000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', NULL, NULL, '000123')$$,
  '23505', NULL, 'normalized account identity remains unique with null bank and agency');

UPDATE public.bank_accounts
   SET updated_at = '2000-01-01 00:00:00+00', bank_name = 'Updated Bank'
 WHERE id = '70000000-0000-4000-8000-000000000001';
SELECT ok((SELECT updated_at > '2000-01-02 00:00:00+00'::timestamptz
             FROM public.bank_accounts
            WHERE id = '70000000-0000-4000-8000-000000000001'),
  'updated_at trigger replaces caller-supplied stale timestamp');

SELECT * FROM finish();
ROLLBACK;
