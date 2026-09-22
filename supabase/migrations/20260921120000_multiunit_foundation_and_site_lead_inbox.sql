-- Additive multi-unit foundation and durable, tenant-safe site lead inbox.
-- This migration intentionally does not backfill data or alter legacy tables.

CREATE TYPE public.app_role AS ENUM (
  'proprietario',
  'administrador',
  'comercial',
  'operacao',
  'financeiro',
  'leitura'
);

CREATE TYPE public.platform_role AS ENUM (
  'plataforma_admin',
  'plataforma_suporte',
  'plataforma_auditoria'
);

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (btrim(name) <> ''),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id),
  plano text,
  status_assinatura text,
  data_inicio timestamptz,
  data_vencimento timestamptz,
  origem text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_subscription_period_check
    CHECK (data_vencimento IS NULL OR data_inicio IS NULL OR data_vencimento >= data_inicio)
);

CREATE INDEX organizations_owner_user_id_idx
  ON public.organizations (owner_user_id);

CREATE TABLE public.legal_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  legal_name text,
  trade_name text,
  document text,
  fiscal_type text,
  cnaes text[],
  municipal_registration text,
  state_registration text,
  address jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(address) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT legal_entities_id_organization_key UNIQUE (id, organization_id),
  CONSTRAINT legal_entities_organization_document_key UNIQUE (organization_id, document)
);

CREATE INDEX legal_entities_organization_id_idx
  ON public.legal_entities (organization_id);

CREATE TABLE public.business_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  legal_entity_id uuid,
  name text NOT NULL CHECK (btrim(name) <> ''),
  slug text,
  slogan text,
  logo_url text,
  whatsapp text,
  commercial_email text,
  instagram text,
  website text,
  address jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(address) = 'object'),
  is_default boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_units_id_organization_key UNIQUE (id, organization_id),
  CONSTRAINT business_units_organization_name_key UNIQUE (organization_id, name),
  CONSTRAINT business_units_legal_entity_same_organization_fk
    FOREIGN KEY (legal_entity_id, organization_id)
    REFERENCES public.legal_entities (id, organization_id)
);

CREATE INDEX business_units_organization_id_idx
  ON public.business_units (organization_id);
CREATE INDEX business_units_legal_entity_id_idx
  ON public.business_units (legal_entity_id);
CREATE UNIQUE INDEX business_units_one_default_per_organization_idx
  ON public.business_units (organization_id)
  WHERE is_default;
CREATE UNIQUE INDEX business_units_slug_ci_key
  ON public.business_units (lower(slug))
  WHERE slug IS NOT NULL;

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_members_organization_user_key UNIQUE (organization_id, user_id)
);

CREATE INDEX organization_members_user_id_idx
  ON public.organization_members (user_id);

CREATE TABLE public.business_unit_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  business_unit_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_unit_members_business_unit_user_key UNIQUE (business_unit_id, user_id),
  CONSTRAINT business_unit_members_unit_same_organization_fk
    FOREIGN KEY (business_unit_id, organization_id)
    REFERENCES public.business_units (id, organization_id) ON DELETE CASCADE,
  CONSTRAINT business_unit_members_requires_organization_membership_fk
    FOREIGN KEY (organization_id, user_id)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE CASCADE
);

CREATE INDEX business_unit_members_user_id_idx
  ON public.business_unit_members (user_id);
CREATE INDEX business_unit_members_organization_id_idx
  ON public.business_unit_members (organization_id);

CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  legal_entity_id uuid NOT NULL,
  bank_name text,
  agency text,
  account_number text,
  account_type text,
  pix_key text,
  account_holder text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bank_accounts_id_organization_key UNIQUE (id, organization_id),
  CONSTRAINT bank_accounts_legal_entity_same_organization_fk
    FOREIGN KEY (legal_entity_id, organization_id)
    REFERENCES public.legal_entities (id, organization_id) ON DELETE CASCADE,
  CONSTRAINT bank_accounts_identifier_required_check
    CHECK (NULLIF(btrim(account_number), '') IS NOT NULL OR NULLIF(btrim(pix_key), '') IS NOT NULL)
);

CREATE INDEX bank_accounts_legal_entity_id_idx
  ON public.bank_accounts (legal_entity_id);
CREATE INDEX bank_accounts_organization_id_idx
  ON public.bank_accounts (organization_id);
CREATE UNIQUE INDEX bank_accounts_pix_key_normalized_key
  ON public.bank_accounts (legal_entity_id, lower(btrim(pix_key)))
  WHERE NULLIF(btrim(pix_key), '') IS NOT NULL;
CREATE UNIQUE INDEX bank_accounts_number_normalized_key
  ON public.bank_accounts (
    legal_entity_id, lower(COALESCE(btrim(bank_name), '')),
    lower(COALESCE(btrim(agency), '')), lower(btrim(account_number))
  )
  WHERE NULLIF(btrim(account_number), '') IS NOT NULL;

CREATE TABLE public.bank_account_business_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  bank_account_id uuid NOT NULL,
  business_unit_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bank_account_business_units_pair_key UNIQUE (bank_account_id, business_unit_id),
  CONSTRAINT bank_account_business_units_account_same_organization_fk
    FOREIGN KEY (bank_account_id, organization_id)
    REFERENCES public.bank_accounts (id, organization_id) ON DELETE CASCADE,
  CONSTRAINT bank_account_business_units_unit_same_organization_fk
    FOREIGN KEY (business_unit_id, organization_id)
    REFERENCES public.business_units (id, organization_id) ON DELETE CASCADE
);

CREATE INDEX bank_account_business_units_business_unit_id_idx
  ON public.bank_account_business_units (business_unit_id);
CREATE INDEX bank_account_business_units_organization_id_idx
  ON public.bank_account_business_units (organization_id);

CREATE TABLE public.proposal_sequences (
  business_unit_id uuid PRIMARY KEY REFERENCES public.business_units(id) ON DELETE CASCADE,
  prefix text,
  last_number integer NOT NULL DEFAULT 0 CHECK (last_number >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id uuid NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  indicator text NOT NULL CHECK (btrim(indicator) <> ''),
  period_start date NOT NULL,
  period_end date NOT NULL,
  target_value numeric NOT NULL,
  created_by_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT goals_valid_period_check CHECK (period_end >= period_start),
  CONSTRAINT goals_scope_key
    UNIQUE (business_unit_id, indicator, period_start, period_end)
);

CREATE INDEX goals_unit_period_idx
  ON public.goals (business_unit_id, period_start);

CREATE TABLE public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.platform_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_admins_user_role_key UNIQUE (user_id, role)
);

CREATE TABLE public.platform_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  granted_to_user_id uuid NOT NULL REFERENCES auth.users(id),
  granted_by_user_id uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL CHECK (btrim(reason) <> ''),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_access_grants_valid_period_check CHECK (expires_at > created_at),
  CONSTRAINT platform_access_grants_valid_revocation_check
    CHECK (revoked_at IS NULL OR (revoked_at >= created_at AND revoked_at <= expires_at))
);

CREATE INDEX platform_access_grants_organization_id_idx
  ON public.platform_access_grants (organization_id);
CREATE INDEX platform_access_grants_granted_to_user_id_idx
  ON public.platform_access_grants (granted_to_user_id);

CREATE TABLE public.site_lead_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  business_unit_id uuid NOT NULL,
  name text NOT NULL CHECK (btrim(name) <> ''),
  credential_digest bytea NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_lead_integrations_id_tenant_key
    UNIQUE (id, organization_id, business_unit_id),
  CONSTRAINT site_lead_integrations_credential_digest_key UNIQUE (credential_digest),
  CONSTRAINT site_lead_integrations_credential_digest_length_check
    CHECK (octet_length(credential_digest) = 32),
  CONSTRAINT site_lead_integrations_unit_same_organization_fk
    FOREIGN KEY (business_unit_id, organization_id)
    REFERENCES public.business_units (id, organization_id) ON DELETE CASCADE
);

CREATE INDEX site_lead_integrations_tenant_idx
  ON public.site_lead_integrations (organization_id, business_unit_id);

CREATE TABLE public.site_lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  business_unit_id uuid NOT NULL,
  idempotency_key_digest bytea NOT NULL,
  request_digest bytea NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  external_id text,
  source text,
  service text,
  campaign text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  message text,
  consent_granted boolean,
  consent_occurred_at timestamptz,
  consent_text text,
  occurred_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_lead_events_integration_idempotency_key
    UNIQUE (integration_id, idempotency_key_digest),
  CONSTRAINT site_lead_events_idempotency_digest_length_check
    CHECK (octet_length(idempotency_key_digest) = 32),
  CONSTRAINT site_lead_events_request_digest_length_check
    CHECK (octet_length(request_digest) = 32),
  CONSTRAINT site_lead_events_contact_check
    CHECK (phone IS NOT NULL OR email IS NOT NULL),
  CONSTRAINT site_lead_events_field_limits_check CHECK (
    length(btrim(name)) BETWEEN 1 AND 120
    AND (phone IS NULL OR length(phone) BETWEEN 3 AND 32)
    AND (email IS NULL OR length(email) BETWEEN 3 AND 254)
    AND (external_id IS NULL OR length(external_id) BETWEEN 1 AND 128)
    AND (source IS NULL OR length(source) BETWEEN 1 AND 64)
    AND (service IS NULL OR length(service) BETWEEN 1 AND 120)
    AND (campaign IS NULL OR length(campaign) BETWEEN 1 AND 120)
    AND (utm_source IS NULL OR length(utm_source) BETWEEN 1 AND 120)
    AND (utm_medium IS NULL OR length(utm_medium) BETWEEN 1 AND 120)
    AND (utm_campaign IS NULL OR length(utm_campaign) BETWEEN 1 AND 120)
    AND (utm_term IS NULL OR length(utm_term) BETWEEN 1 AND 120)
    AND (utm_content IS NULL OR length(utm_content) BETWEEN 1 AND 120)
    AND (message IS NULL OR length(message) BETWEEN 1 AND 2000)
    AND (consent_text IS NULL OR length(consent_text) BETWEEN 1 AND 500)
  ),
  CONSTRAINT site_lead_events_integration_tenant_fk
    FOREIGN KEY (integration_id, organization_id, business_unit_id)
    REFERENCES public.site_lead_integrations (id, organization_id, business_unit_id)
);

CREATE INDEX site_lead_events_tenant_created_at_idx
  ON public.site_lead_events (organization_id, business_unit_id, created_at);

-- Keep mutable records' audit timestamps trustworthy using the existing helper.
CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER legal_entities_updated_at BEFORE UPDATE ON public.legal_entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER business_units_updated_at BEFORE UPDATE ON public.business_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER proposal_sequences_updated_at BEFORE UPDATE ON public.proposal_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER goals_updated_at BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER site_lead_integrations_updated_at BEFORE UPDATE ON public.site_lead_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS is deny-by-default except for the narrowly scoped event read policy below.
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_unit_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_account_business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_lead_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_lead_events ENABLE ROW LEVEL SECURITY;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE FUNCTION private.prevent_site_lead_integration_tenant_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp
AS $function$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.business_unit_id IS DISTINCT FROM OLD.business_unit_id THEN
    RAISE EXCEPTION 'site lead integration tenant is immutable'
      USING ERRCODE = '23000';
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER site_lead_integrations_tenant_immutable
  BEFORE UPDATE OF organization_id, business_unit_id
  ON public.site_lead_integrations
  FOR EACH ROW
  EXECUTE FUNCTION private.prevent_site_lead_integration_tenant_change();

REVOKE ALL ON FUNCTION private.prevent_site_lead_integration_tenant_change() FROM PUBLIC;

CREATE FUNCTION public.is_org_member(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
  SELECT auth.uid() IS NOT NULL
     AND (
       EXISTS (
         SELECT 1
           FROM public.organizations AS organization
          WHERE organization.id = p_organization_id
            AND organization.owner_user_id = auth.uid()
       )
       OR EXISTS (
         SELECT 1
           FROM public.organization_members AS membership
          WHERE membership.organization_id = p_organization_id
            AND membership.user_id = auth.uid()
       )
     )
$function$;

CREATE FUNCTION public.has_bu_access(p_business_unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (
       SELECT 1
         FROM public.business_units AS unit
        WHERE unit.id = p_business_unit_id
          AND (
            EXISTS (
              SELECT 1
                FROM public.organizations AS organization
               WHERE organization.id = unit.organization_id
                 AND organization.owner_user_id = auth.uid()
            )
            OR EXISTS (
              SELECT 1
                FROM public.organization_members AS membership
               WHERE membership.organization_id = unit.organization_id
                 AND membership.user_id = auth.uid()
                 AND membership.role IN (
                   'proprietario'::public.app_role,
                   'administrador'::public.app_role
                 )
            )
            OR EXISTS (
              SELECT 1
                FROM public.business_unit_members AS membership
               WHERE membership.business_unit_id = unit.id
                 AND membership.user_id = auth.uid()
            )
          )
     )
$function$;

REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.has_bu_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_bu_access(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_bu_access(uuid) TO authenticated;

CREATE POLICY site_lead_events_select_by_business_unit
  ON public.site_lead_events
  FOR SELECT
  TO authenticated
  USING (public.has_bu_access(business_unit_id));

REVOKE ALL ON public.site_lead_integrations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.site_lead_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.site_lead_events TO authenticated;

CREATE FUNCTION private.ingest_site_lead(
  p_credential_digest bytea,
  p_idempotency_key_digest bytea,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
DECLARE
  v_integration public.site_lead_integrations%ROWTYPE;
  v_request_digest bytea;
  v_event_id uuid;
  v_existing_request_digest bytea;
  v_invalid boolean;
  v_consent_granted boolean;
  v_consent_occurred_at timestamptz;
  v_occurred_at timestamptz;
  v_metadata jsonb := '{}'::jsonb;
  v_allowed_keys constant text[] := ARRAY[
    'name', 'phone', 'email', 'external_id', 'source', 'service', 'campaign',
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'message', 'consent', 'occurred_at', 'metadata'
  ];
  v_text_keys constant text[] := ARRAY[
    'name', 'phone', 'email', 'external_id', 'source', 'service', 'campaign',
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'message'
  ];
  v_tenant_keys constant text[] := ARRAY[
    'organization_id', 'organizationid', 'org_id', 'tenant_id',
    'business_unit_id', 'businessunitid', 'unit_id', 'integration_id', 'user_id'
  ];
BEGIN
  IF p_credential_digest IS NULL OR octet_length(p_credential_digest) <> 32
     OR p_idempotency_key_digest IS NULL OR octet_length(p_idempotency_key_digest) <> 32
     OR p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'invalid site lead request' USING ERRCODE = '22023';
  END IF;

  -- Validate the complete normalized contract without including values in errors.
  SELECT EXISTS (
    SELECT 1
      FROM jsonb_each(p_payload) AS supplied(key, value)
     WHERE lower(supplied.key) = ANY (v_tenant_keys)
        OR NOT (supplied.key = ANY (v_allowed_keys))
        OR (supplied.key = ANY (v_text_keys)
            AND jsonb_typeof(supplied.value) <> 'string')
        OR (supplied.key = 'occurred_at'
            AND jsonb_typeof(supplied.value) <> 'string')
        OR (supplied.key = 'consent'
            AND jsonb_typeof(supplied.value) <> 'object')
        OR (supplied.key = 'metadata'
            AND jsonb_typeof(supplied.value) <> 'object')
  ) INTO v_invalid;

  IF v_invalid THEN
    RAISE EXCEPTION 'invalid site lead payload' USING ERRCODE = '22023';
  END IF;

  IF NOT (p_payload ? 'name')
     OR jsonb_typeof(p_payload -> 'name') <> 'string'
     OR length(btrim(p_payload ->> 'name')) NOT BETWEEN 1 AND 120
     OR (NOT (p_payload ? 'phone') AND NOT (p_payload ? 'email'))
     OR (p_payload ? 'phone' AND length(p_payload ->> 'phone') NOT BETWEEN 3 AND 32)
     OR (p_payload ? 'email' AND (
       length(p_payload ->> 'email') > 254
       OR (p_payload ->> 'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     ))
     OR (p_payload ? 'external_id' AND length(btrim(p_payload ->> 'external_id')) NOT BETWEEN 1 AND 128)
     OR (p_payload ? 'source' AND length(btrim(p_payload ->> 'source')) NOT BETWEEN 1 AND 64)
     OR (p_payload ? 'service' AND length(btrim(p_payload ->> 'service')) NOT BETWEEN 1 AND 120)
     OR (p_payload ? 'campaign' AND length(btrim(p_payload ->> 'campaign')) NOT BETWEEN 1 AND 120)
     OR (p_payload ? 'utm_source' AND length(btrim(p_payload ->> 'utm_source')) NOT BETWEEN 1 AND 120)
     OR (p_payload ? 'utm_medium' AND length(btrim(p_payload ->> 'utm_medium')) NOT BETWEEN 1 AND 120)
     OR (p_payload ? 'utm_campaign' AND length(btrim(p_payload ->> 'utm_campaign')) NOT BETWEEN 1 AND 120)
     OR (p_payload ? 'utm_term' AND length(btrim(p_payload ->> 'utm_term')) NOT BETWEEN 1 AND 120)
     OR (p_payload ? 'utm_content' AND length(btrim(p_payload ->> 'utm_content')) NOT BETWEEN 1 AND 120)
     OR (p_payload ? 'message' AND length(btrim(p_payload ->> 'message')) NOT BETWEEN 1 AND 2000)
     OR (p_payload ? 'occurred_at' AND (p_payload ->> 'occurred_at')
       !~ '^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$') THEN
    RAISE EXCEPTION 'invalid site lead payload' USING ERRCODE = '22023';
  END IF;

  IF p_payload ? 'consent' THEN
    IF NOT (p_payload -> 'consent' ? 'granted')
       OR jsonb_typeof(p_payload #> '{consent,granted}') <> 'boolean' THEN
      RAISE EXCEPTION 'invalid site lead payload' USING ERRCODE = '22023';
    END IF;
    SELECT EXISTS (
      SELECT 1
        FROM jsonb_each(p_payload -> 'consent') AS consent_field(key, value)
       WHERE consent_field.key NOT IN ('granted', 'occurred_at', 'text')
          OR (consent_field.key = 'granted'
              AND jsonb_typeof(consent_field.value) <> 'boolean')
          OR (consent_field.key IN ('occurred_at', 'text')
              AND jsonb_typeof(consent_field.value) <> 'string')
    ) INTO v_invalid;
    IF v_invalid THEN
      RAISE EXCEPTION 'invalid site lead payload' USING ERRCODE = '22023';
    END IF;
    IF (p_payload #>> '{consent,text}') IS NOT NULL
       AND length(btrim(p_payload #>> '{consent,text}')) NOT BETWEEN 1 AND 500
       OR (p_payload #>> '{consent,occurred_at}') IS NOT NULL
       AND (p_payload #>> '{consent,occurred_at}') !~ '^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$' THEN
      RAISE EXCEPTION 'invalid site lead payload' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_payload ? 'metadata' THEN
    SELECT count(*) > 20 OR octet_length(convert_to((p_payload -> 'metadata')::text, 'UTF8')) > 4096
      INTO v_invalid
      FROM jsonb_each(p_payload -> 'metadata');
    IF v_invalid THEN
      RAISE EXCEPTION 'invalid site lead payload' USING ERRCODE = '22023';
    END IF;
    SELECT EXISTS (
      SELECT 1
        FROM jsonb_each(p_payload -> 'metadata') AS metadata_field(key, value)
       WHERE lower(metadata_field.key) = ANY (v_tenant_keys)
          OR length(metadata_field.key) NOT BETWEEN 1 AND 64
          OR jsonb_typeof(metadata_field.value) NOT IN ('string', 'number', 'boolean', 'null')
          OR (jsonb_typeof(metadata_field.value) = 'string'
              AND length(metadata_field.value #>> '{}') > 500)
    ) INTO v_invalid;
    IF v_invalid THEN
      RAISE EXCEPTION 'invalid site lead payload' USING ERRCODE = '22023';
    END IF;
    v_metadata := p_payload -> 'metadata';
  END IF;

  BEGIN
    v_consent_granted := (p_payload #>> '{consent,granted}')::boolean;
    v_consent_occurred_at := (p_payload #>> '{consent,occurred_at}')::timestamptz;
    v_occurred_at := (p_payload ->> 'occurred_at')::timestamptz;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'invalid site lead payload' USING ERRCODE = '22023';
  END;

  SELECT integration.*
    INTO v_integration
    FROM public.site_lead_integrations AS integration
   WHERE integration.credential_digest = p_credential_digest
     AND integration.is_active
     AND integration.revoked_at IS NULL
     AND (integration.expires_at IS NULL OR integration.expires_at > now())
   FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'site lead integration is not authorized' USING ERRCODE = '28000';
  END IF;

  -- jsonb text has deterministic key ordering, so this digests the validated,
  -- normalized document rather than an opaque raw request body.
  v_request_digest := extensions.digest(convert_to(p_payload::text, 'UTF8'), 'sha256');

  INSERT INTO public.site_lead_events (
    integration_id, organization_id, business_unit_id,
    idempotency_key_digest, request_digest,
    name, phone, email, external_id, source, service, campaign,
    utm_source, utm_medium, utm_campaign, utm_term, utm_content, message,
    consent_granted, consent_occurred_at, consent_text, occurred_at, metadata
  ) VALUES (
    v_integration.id, v_integration.organization_id, v_integration.business_unit_id,
    p_idempotency_key_digest, v_request_digest,
    p_payload ->> 'name', p_payload ->> 'phone', p_payload ->> 'email',
    p_payload ->> 'external_id', p_payload ->> 'source', p_payload ->> 'service',
    p_payload ->> 'campaign', p_payload ->> 'utm_source', p_payload ->> 'utm_medium',
    p_payload ->> 'utm_campaign', p_payload ->> 'utm_term', p_payload ->> 'utm_content',
    p_payload ->> 'message', v_consent_granted, v_consent_occurred_at,
    p_payload #>> '{consent,text}', v_occurred_at, v_metadata
  )
  ON CONFLICT (integration_id, idempotency_key_digest) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'created', 'event_id', v_event_id);
  END IF;

  SELECT event.id, event.request_digest
    INTO v_event_id, v_existing_request_digest
    FROM public.site_lead_events AS event
   WHERE event.integration_id = v_integration.id
     AND event.idempotency_key_digest = p_idempotency_key_digest;

  IF v_existing_request_digest = v_request_digest THEN
    RETURN jsonb_build_object('status', 'duplicate', 'event_id', v_event_id);
  END IF;

  RETURN jsonb_build_object('status', 'conflict', 'event_id', v_event_id);
END
$function$;

REVOKE ALL ON FUNCTION private.ingest_site_lead(bytea, bytea, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.ingest_site_lead(bytea, bytea, jsonb) FROM anon;
REVOKE ALL ON FUNCTION private.ingest_site_lead(bytea, bytea, jsonb) FROM authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
GRANT EXECUTE ON FUNCTION private.ingest_site_lead(bytea, bytea, jsonb) TO service_role;

-- PostgREST only exposes functions in configured API schemas. This narrow
-- adapter accepts fixed-size hex digests, never raw credentials, and delegates
-- tenant routing and persistence to the private implementation.
CREATE FUNCTION public.ingest_site_lead_from_edge(
  p_credential_digest_hex text,
  p_idempotency_key_digest_hex text,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $function$
BEGIN
  IF p_credential_digest_hex IS NULL
     OR p_credential_digest_hex !~ '^[0-9A-Fa-f]{64}$'
     OR p_idempotency_key_digest_hex IS NULL
     OR p_idempotency_key_digest_hex !~ '^[0-9A-Fa-f]{64}$' THEN
    RAISE EXCEPTION 'invalid site lead digest' USING ERRCODE = '22023';
  END IF;

  RETURN private.ingest_site_lead(
    decode(p_credential_digest_hex, 'hex'),
    decode(p_idempotency_key_digest_hex, 'hex'),
    p_payload
  );
END
$function$;

REVOKE ALL ON FUNCTION public.ingest_site_lead_from_edge(text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ingest_site_lead_from_edge(text, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.ingest_site_lead_from_edge(text, text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_site_lead_from_edge(text, text, jsonb) TO service_role;
